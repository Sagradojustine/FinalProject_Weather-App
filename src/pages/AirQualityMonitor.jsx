/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react'
import { weatherService } from '../services/weather'
import { Wind, Activity, Heart, Eye } from 'lucide-react'

function AirQualityMonitor({ location, airQuality: externalAirQuality }) {
  const [internalAirQuality, setInternalAirQuality] = useState(null)
  const [loading, setLoading] = useState(false)

  // Use external air quality if provided, otherwise use internal state
  const airQuality = externalAirQuality || internalAirQuality

  const fetchAirQuality = useCallback(async () => {
    if (!location) return
    
    setLoading(true)
    try {
      const data = await weatherService.getAirQuality(location.lat, location.lon)
      setInternalAirQuality(data)
    } catch (error) {
      console.error('Error fetching air quality:', error)
    } finally {
      setLoading(false)
    }
  }, [location])

  useEffect(() => {
    if (location && !airQuality) {
      fetchAirQuality()
    }
  }, [location, airQuality, fetchAirQuality])

  if (!location) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Air Quality</h3>
        <p className="text-gray-500">Location data required</p>
      </div>
    )
  }

  if (loading && !airQuality) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Air Quality</h3>
        <p className="text-gray-500">Loading air quality data...</p>
      </div>
    )
  }

  const aqi = airQuality?.list?.[0]?.main?.aqi || 1
  const aqiInfo = weatherService.getAQIDescription(aqi)
  const components = airQuality?.list?.[0]?.components || {}

  const getAQIColor = (level) => {
    const colors = {
      1: 'bg-green-500',
      2: 'bg-yellow-500',
      3: 'bg-orange-500',
      4: 'bg-red-500',
      5: 'bg-purple-500'
    }
    return colors[level] || 'bg-green-500'
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Air Quality Index</h3>
      
      {/* AQI Level */}
      <div className={`${getAQIColor(aqi)} text-white p-4 rounded-lg mb-4`}>
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xl font-bold">{aqiInfo.level}</h4>
            <p className="text-sm opacity-90">{aqiInfo.description}</p>
          </div>
          <Activity className="h-8 w-8 opacity-90" />
        </div>
      </div>

      {/* Pollution Components */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-gray-600" />
            <span className="text-sm">CO</span>
          </div>
          <span className="font-medium">{components.co?.toFixed(1) || '0'} μg/m³</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-gray-600" />
            <span className="text-sm">NO₂</span>
          </div>
          <span className="font-medium">{components.no2?.toFixed(1) || '0'} μg/m³</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-gray-600" />
            <span className="text-sm">O₃</span>
          </div>
          <span className="font-medium">{components.o3?.toFixed(1) || '0'} μg/m³</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-gray-600" />
            <span className="text-sm">PM2.5</span>
          </div>
          <span className="font-medium">{components.pm2_5?.toFixed(1) || '0'} μg/m³</span>
        </div>
      </div>

      {/* Health Recommendations */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          {aqi <= 2 
            ? 'Air quality is good. Perfect for outdoor activities.' 
            : 'Consider reducing prolonged outdoor exertion.'}
        </p>
      </div>

      {/* Data source indicator */}
      {externalAirQuality && (
        <div className="mt-2 text-xs text-gray-500 text-right">
          Data provided by parent component
        </div>
      )}
    </div>
  )
}

export default AirQualityMonitor