// services/weather.js
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY
const BASE_URL = import.meta.env.VITE_WEATHER_API_URL

// Fix: Import from './notification' instead of './notificationService'
import { notificationService } from './notification'

export const weatherService = {
  async getCurrentWeather(lat, lon) {
    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    )
    if (!response.ok) throw new Error('Weather data fetch failed')
    return response.json()
  },

  async getForecast(lat, lon) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&cnt=56`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch forecast data')
      }
      
      const data = await response.json()
      
      // Ensure we have enough data for 7 days
      if (data.list && data.list.length < 40) {
        console.warn('Limited forecast data received:', data.list.length, 'readings')
      }
      
      return data
    } catch (error) {
      console.error('Error fetching forecast:', error)
      throw error
    }
  },

  async getAirQuality(lat, lon) {
    const response = await fetch(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    )
    if (!response.ok) throw new Error('Air quality data fetch failed')
    return response.json()
  },

  getWeatherIcon(iconCode) {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
  },

  getAQIDescription(aqi) {
    const levels = {
      1: { level: 'Good', description: 'Air quality is satisfactory' },
      2: { level: 'Fair', description: 'Air quality is acceptable' },
      3: { level: 'Moderate', description: 'Air quality is moderate' },
      4: { level: 'Poor', description: 'Air quality is poor' },
      5: { level: 'Very Poor', description: 'Air quality is very poor' }
    }
    return levels[aqi] || levels[1]
  },

  getWeatherSuggestion(weatherData) {
    const temp = weatherData.main.temp
    const weather = weatherData.weather[0].main
    const windSpeed = weatherData.wind.speed

    if (weather.includes('Rain') || weather.includes('Drizzle')) {
      return { suggestion: 'Carry an umbrella or raincoat today' }
    } else if (weather.includes('Snow')) {
      return { suggestion: 'Wear warm clothes and be careful on roads' }
    } else if (temp > 30) {
      return { suggestion: 'Stay hydrated and avoid prolonged sun exposure' }
    } else if (temp < 5) {
      return { suggestion: 'Dress in warm layers and protect from cold' }
    } else if (windSpeed > 8) {
      return { suggestion: 'Windy conditions - secure loose items' }
    } else {
      return { suggestion: 'Perfect weather for outdoor activities' }
    }
  },

  // New method for weather alerts
  async checkAndSendWeatherAlerts(userId, weatherData) {
    const alerts = []
    
    if (weatherData.main.temp > 35) {
      alerts.push({
        title: '🌡️ Extreme Heat Warning',
        description: 'Temperatures above 35°C detected. Stay hydrated and avoid prolonged sun exposure.',
        severity: 'high'
      })
    }
    
    if (weatherData.main.temp < 0) {
      alerts.push({
        title: '❄️ Freezing Temperature Alert',
        description: 'Freezing temperatures detected. Dress warmly and watch for ice.',
        severity: 'moderate'
      })
    }
    
    if (weatherData.weather[0].main.includes('Storm')) {
      alerts.push({
        title: '⛈️ Storm Warning',
        description: 'Severe storm conditions detected. Seek shelter immediately.',
        severity: 'high'
      })
    }
    
    if (weatherData.wind?.speed > 20) {
      alerts.push({
        title: '💨 High Wind Warning',
        description: 'High wind speeds detected. Secure loose objects and exercise caution.',
        severity: 'moderate'
      })
    }

    // Send alerts as notifications
    for (const alert of alerts) {
      await notificationService.sendWeatherAlert(userId, alert)
    }

    return alerts
  }
}