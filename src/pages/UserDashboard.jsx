/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
// UserDashboard.jsx
import React, { useState, useEffect, useRef } from 'react'  // Added useRef here
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { weatherService } from '../services/weather'
import { sosService } from '../services/sos'
import { supabase } from '../services/supabase'
import { useNavigate } from 'react-router-dom'
import { 
  MapPin, 
  Navigation, 
  Umbrella, 
  Thermometer, 
  Wind, 
  Eye,
  AlertTriangle,
  Star,
  Bell,
  Sun,
  Moon,
  Compass,
  Cloud,
  CloudRain,
  LogOut,
  User,
  MessageSquare,
  X,
  Save,
  Heart
} from 'lucide-react'
import WeatherMap from './WeatherMap'
import AirQualityMonitor from './AirQualityMonitor'
import VoiceWeatherAssistant from './VoiceWeatherAssistant'
import HelpAssistant from './HelpAssistant'
import NotificationCenter from './NotificationCenter'
import Chatbot from './Chatbot' // Added import

function UserDashboard() {
  const { user, signOut, profile, isAdmin } = useAuth()
  const { 
    fetchNotifications, 
    subscribeToNotifications,
    sendNotification 
  } = useNotifications()
  const navigate = useNavigate()
  const [currentWeather, setCurrentWeather] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [location, setLocation] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSOS, setShowSOS] = useState(false)
  const [showSOSFromMarked, setShowSOSFromMarked] = useState(false)
  const [selectedMarkedLocation, setSelectedMarkedLocation] = useState(null)
  const [airQuality, setAirQuality] = useState(null)
  const [offlineData, setOfflineData] = useState(null)
  const [error, setError] = useState(null)
  const [databaseAvailable, setDatabaseAvailable] = useState(true)
  const [sosAvailable, setSosAvailable] = useState(true)
  const [mapError, setMapError] = useState(null)
  const [activeTab, setActiveTab] = useState('weather')
  const [markedLocations, setMarkedLocations] = useState([])
  const [userSOSAlerts, setUserSOSAlerts] = useState([])
  const [adminNotifications, setAdminNotifications] = useState([])
  
  // New state for description modal
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [newLocationDescription, setNewLocationDescription] = useState('')
  const [pendingMarkedLocation, setPendingMarkedLocation] = useState(null)

  // Real-time SOS subscription reference
  const sosSubscriptionRef = useRef(null)

  useEffect(() => {
    initializeApp()
    setupOfflineSupport()
    
    const subscription = supabase
      .channel('announcements')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        () => fetchAnnouncements()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      // Cleanup SOS subscription
      if (sosSubscriptionRef.current) {
        sosSubscriptionRef.current.unsubscribe()
      }
    }
  }, [user?.id])

  // Add notification subscription
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id)
      const cleanup = subscribeToNotifications(user.id, 'user')
      return cleanup
    }
  }, [user?.id])

  // Add real-time SOS updates - FIXED VERSION
  useEffect(() => {
    if (!user?.id || !databaseAvailable) return

    const setupSOSSubscription = async () => {
      try {
        // First fetch existing alerts
        await fetchUserSOSAlerts()
        
        // Then set up real-time subscription
        const subscription = supabase
          .channel(`sos-alerts-user-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'sos_alerts',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('SOS alert update received:', payload)
              
              if (payload.eventType === 'INSERT') {
                setUserSOSAlerts(prev => [payload.new, ...prev])
                
                // Show notification for new alert
                showNotification('SOS Sent', 'Your emergency SOS has been sent to administrators')
              } else if (payload.eventType === 'UPDATE') {
                setUserSOSAlerts(prev =>
                  prev.map(alert =>
                    alert.id === payload.new.id ? payload.new : alert
                  )
                )
                
                // Show notification for admin response
                if (payload.new.admin_response && !payload.old?.admin_response) {
                  showNotification('SOS Response', `Admin responded: ${payload.new.admin_response}`)
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('SOS subscription status:', status)
          })

        // Store subscription for cleanup
        sosSubscriptionRef.current = subscription

      } catch (error) {
        console.error('Failed to set up SOS subscription:', error)
      }
    }

    setupSOSSubscription()

    // Cleanup function
    return () => {
      if (sosSubscriptionRef.current) {
        sosSubscriptionRef.current.unsubscribe()
        sosSubscriptionRef.current = null
      }
    }
  }, [user?.id, databaseAvailable])

  const setupOfflineSupport = () => {
    if ('caches' in window) {
      caches.open('weather-data').then(cache => {
        console.log('Offline cache ready')
      })
    }
  }

  const initializeApp = async () => {
    try {
      const cached = localStorage.getItem('cachedWeather')
      if (cached) {
        const data = JSON.parse(cached)
        setOfflineData(data)
      }

      // Load marked locations from localStorage
      const savedMarkedLocations = localStorage.getItem('markedLocations')
      if (savedMarkedLocations) {
        setMarkedLocations(JSON.parse(savedMarkedLocations))
      }

      // Load favorites from localStorage for offline support
      const savedFavorites = localStorage.getItem('userFavorites')
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites))
      }

      await checkDatabaseAvailability()

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            setLocation({ lat: latitude, lon: longitude })
            await fetchAllWeatherData(latitude, longitude)
          },
          async (error) => {
            console.error('Geolocation error:', error)
            if (offlineData) {
              setCurrentWeather(offlineData.current)
              setForecast(offlineData.forecast)
            } else {
              const defaultLocation = { lat: 40.7128, lon: -74.0060 }
              setLocation(defaultLocation)
              await fetchAllWeatherData(defaultLocation.lat, defaultLocation.lon)
            }
          }
        )
      }
    } catch (error) {
      console.error('Initialization error:', error)
      setError('Failed to initialize app')
    } finally {
      setLoading(false)
    }
  }

  const checkDatabaseAvailability = async () => {
    try {
      // Check if tables exist
      const { error: favoritesError } = await supabase
        .from('favorite_locations')
        .select('id')
        .limit(1)
      
      const { error: sosError } = await supabase
        .from('sos_alerts')
        .select('id')
        .limit(1)

      // If tables don't exist, mark features as unavailable but don't block the app
      if (favoritesError && favoritesError.code === '42P01') {
        console.warn('Favorite locations table not set up yet. Using localStorage fallback.')
      } else {
        // If table exists, fetch favorites
        await fetchFavorites()
      }

      if (sosError && (sosError.code === '42P01' || sosError.code === 'PGRST204')) {
        console.warn('SOS alerts table not set up yet. Feature will use localStorage.')
        setSosAvailable(false)
      } else {
        setSosAvailable(true)
      }

      // Always try to fetch announcements if table exists
      await fetchAnnouncements()
      
      setDatabaseAvailable(true)
    } catch (error) {
      console.warn('Database check failed, using localStorage fallback:', error)
      // Don't block the app if database is unavailable
      setDatabaseAvailable(false)
      setSosAvailable(false)
    }
  }

  const fetchUserSOSAlerts = async () => {
    if (!databaseAvailable) {
      // Fallback to localStorage if database is not available
      const savedAlerts = localStorage.getItem(`userSOSAlerts_${user?.id}`)
      if (savedAlerts) {
        setUserSOSAlerts(JSON.parse(savedAlerts))
      }
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.warn('SOS alerts fetch failed, using localStorage:', error.message)
        // Fallback to localStorage
        const savedAlerts = localStorage.getItem(`userSOSAlerts_${user?.id}`)
        if (savedAlerts) {
          setUserSOSAlerts(JSON.parse(savedAlerts))
        }
        return
      }
      setUserSOSAlerts(data || [])
      // Also save to localStorage for offline access
      localStorage.setItem(`userSOSAlerts_${user?.id}`, JSON.stringify(data || []))
    } catch (error) {
      console.warn('Failed to fetch SOS alerts, using localStorage:', error)
      const savedAlerts = localStorage.getItem(`userSOSAlerts_${user?.id}`)
      if (savedAlerts) {
        setUserSOSAlerts(JSON.parse(savedAlerts))
      }
    }
  }

  const fetchAllWeatherData = async (lat, lon) => {
    try {
      const [current, forecastData] = await Promise.all([
        weatherService.getCurrentWeather(lat, lon),
        weatherService.getForecast(lat, lon)
      ])
      
      setCurrentWeather(current)
      setForecast(forecastData)

      try {
        const airQualityData = await weatherService.getAirQuality(lat, lon)
        setAirQuality(airQualityData)
      } catch (airQualityError) {
        console.warn('Air quality data not available:', airQualityError)
      }

      const cacheData = {
        current,
        forecast: forecastData,
        timestamp: Date.now()
      }
      localStorage.setItem('cachedWeather', JSON.stringify(cacheData))
      setError(null)
    } catch (error) {
      console.error('Error fetching weather data:', error)
      setError('Failed to fetch weather data')
      if (offlineData) {
        setCurrentWeather(offlineData.current)
        setForecast(offlineData.forecast)
      }
    }
  }

  const fetchFavorites = async () => {
    if (!databaseAvailable || !user?.id) {
      // Fallback to localStorage
      const savedFavorites = localStorage.getItem(`userFavorites_${user?.id}`)
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites))
      }
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('favorite_locations')
        .select('*')
        .eq('user_id', user.id)
      
      if (error) {
        console.warn('Favorites fetch failed, using localStorage:', error.message)
        const savedFavorites = localStorage.getItem(`userFavorites_${user?.id}`)
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites))
        }
        return
      }
      setFavorites(data || [])
      // Save to localStorage for offline access
      localStorage.setItem(`userFavorites_${user?.id}`, JSON.stringify(data || []))
    } catch (error) {
      console.warn('Failed to fetch favorites, using localStorage:', error)
      const savedFavorites = localStorage.getItem(`userFavorites_${user?.id}`)
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites))
      }
    }
  }

  const fetchAnnouncements = async () => {
    if (!databaseAvailable) {
      // Fallback to localStorage
      const savedAnnouncements = localStorage.getItem('announcements')
      if (savedAnnouncements) {
        setAnnouncements(JSON.parse(savedAnnouncements))
      }
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (error) {
        console.warn('Announcements fetch failed, using localStorage:', error.message)
        const savedAnnouncements = localStorage.getItem('announcements')
        if (savedAnnouncements) {
          setAnnouncements(JSON.parse(savedAnnouncements))
        }
        return
      }
      setAnnouncements(data || [])
      // Save to localStorage for offline access
      localStorage.setItem('announcements', JSON.stringify(data || []))
    } catch (error) {
      console.warn('Failed to fetch announcements, using localStorage:', error)
      const savedAnnouncements = localStorage.getItem('announcements')
      if (savedAnnouncements) {
        setAnnouncements(JSON.parse(savedAnnouncements))
      }
    }
  }

  const addFavorite = async () => {
    if (!currentWeather || !user?.id) {
      alert('Cannot add favorite. Weather data or user not available.')
      return
    }
    
    const newFavorite = {
      user_id: user.id,
      location_name: currentWeather.name,
      latitude: currentWeather.coord?.lat || location?.lat,
      longitude: currentWeather.coord?.lon || location?.lon,
      weather_description: currentWeather.weather[0]?.description,
      temperature: currentWeather.main.temp,
      added_at: new Date().toISOString(),
      id: Date.now() // Temporary ID for localStorage
    }

    try {
      if (databaseAvailable) {
        const { error } = await supabase
          .from('favorite_locations')
          .insert({
            user_id: user.id,
            location_name: newFavorite.location_name,
            latitude: newFavorite.latitude,
            longitude: newFavorite.longitude
          })
        
        if (error) {
          console.warn('Failed to add favorite to database:', error.message)
          // Continue with localStorage fallback
        }
      }
      
      // Always add to localStorage for offline support
      const updatedFavorites = [...favorites, newFavorite]
      setFavorites(updatedFavorites)
      localStorage.setItem(`userFavorites_${user.id}`, JSON.stringify(updatedFavorites))
      
      // Show success message
      showNotification('Favorite Added', `${newFavorite.location_name} added to favorites`)
      
    } catch (error) {
      console.warn('Failed to add favorite:', error)
      // Still add to localStorage as fallback
      const updatedFavorites = [...favorites, newFavorite]
      setFavorites(updatedFavorites)
      localStorage.setItem(`userFavorites_${user.id}`, JSON.stringify(updatedFavorites))
      showNotification('Favorite Added', `${newFavorite.location_name} added to favorites (offline mode)`)
    }
  }

  const handleLocationMark = (locationData) => {
    const newMarkedLocation = {
      id: Date.now(),
      ...locationData,
      name: `Marked Location ${markedLocations.length + 1}`,
      description: '',
      createdAt: new Date().toISOString()
    }
    
    // Set pending location and open description modal
    setPendingMarkedLocation(newMarkedLocation)
    setShowDescriptionModal(true)
    setNewLocationDescription('')
  }

  const saveMarkedLocation = () => {
    if (!pendingMarkedLocation) return

    const markedLocationWithDescription = {
      ...pendingMarkedLocation,
      description: newLocationDescription
    }
    
    const updatedMarkedLocations = [...markedLocations, markedLocationWithDescription]
    setMarkedLocations(updatedMarkedLocations)
    localStorage.setItem('markedLocations', JSON.stringify(updatedMarkedLocations))
    
    // Show notification
    showNotification('Location Marked', 'Location has been saved to your marked locations')
    
    // Close modal and reset state
    setShowDescriptionModal(false)
    setPendingMarkedLocation(null)
    setNewLocationDescription('')
  }

  const cancelMarkedLocation = () => {
    setShowDescriptionModal(false)
    setPendingMarkedLocation(null)
    setNewLocationDescription('')
  }

  const sendSOS = async (useMarkedLocation = false, markedLocation = null) => {
    // First, check if we have location data
    if (!location && !useMarkedLocation) {
      alert('Location not available. Please enable location services.')
      return
    }

    // Get coordinates based on whether we're using marked location or current location
    const coords = useMarkedLocation 
      ? { lat: markedLocation.latitude, lon: markedLocation.longitude }
      : location

    if (!coords || !coords.lat || !coords.lon) {
      alert('Location coordinates are invalid. Please try again.')
      return
    }

    try {
      // Always create SOS alert locally first
      const newSOSAlert = {
        id: Date.now(),
        user_id: user.id,
        user_email: user.email,
        latitude: coords.lat,
        longitude: coords.lon,
        is_marked_location: useMarkedLocation,
        marked_location_name: useMarkedLocation ? markedLocation.name : null,
        marked_location_description: useMarkedLocation ? markedLocation.description : null,
        status: 'active',
        admin_response: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Try to send to database if available
      let result = { success: false }
      if (databaseAvailable) {
        try {
          result = await sosService.sendSOS(
            user.id,
            user.email,
            coords.lat,
            coords.lon,
            useMarkedLocation ? {
              name: markedLocation.name,
              description: markedLocation.description
            } : null
          )
        } catch (dbError) {
          console.warn('Database SOS failed, using localStorage:', dbError)
          // Continue with localStorage fallback
        }
      }

      // Update local state immediately
      setUserSOSAlerts(prev => [newSOSAlert, ...prev])
      
      // Save to localStorage for offline access
      const updatedAlerts = [newSOSAlert, ...userSOSAlerts]
      localStorage.setItem(`userSOSAlerts_${user.id}`, JSON.stringify(updatedAlerts))

      // Show success message
      alert('SOS Alert sent! Help is on the way.')

      // Send push notification
      showNotification('SOS Sent', 'Your emergency SOS has been sent to administrators')

      // Close modal
      setShowSOS(false)
      setShowSOSFromMarked(false)
      setSelectedMarkedLocation(null)

    } catch (error) {
      console.error('SOS failed:', error)
      alert(`SOS Alert failed: ${error.message}. Please try again or call emergency services directly.`)
    }
  }

  const showNotification = (title, body) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '/sos-icon.png'
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, {
              body: body,
              icon: '/sos-icon.png'
            })
          }
        })
      }
    }
  }

  const deleteMarkedLocation = (id) => {
    const updatedLocations = markedLocations.filter(loc => loc.id !== id)
    setMarkedLocations(updatedLocations)
    localStorage.setItem('markedLocations', JSON.stringify(updatedLocations))
    showNotification('Location Removed', 'Marked location has been deleted')
  }

  const getWeatherAlerts = () => {
    if (!currentWeather) return []
    
    const alerts = []
    const temp = currentWeather.main.temp
    const weather = currentWeather.weather[0].main
    const windSpeed = currentWeather.wind?.speed || 0

    if (weather.includes('Rain') || weather.includes('Storm')) {
      alerts.push({ 
        type: 'warning', 
        message: 'Rain or storm expected - carry umbrella',
        severity: 'moderate'
      })
    }
    if (temp > 35) {
      alerts.push({ 
        type: 'alert', 
        message: 'Extreme heat warning - stay hydrated',
        severity: 'high'
      })
    }
    if (temp < 0) {
      alerts.push({ 
        type: 'warning', 
        message: 'Freezing temperatures - dress warmly',
        severity: 'moderate'
      })
    }
    if (windSpeed > 10) {
      alerts.push({ 
        type: 'warning', 
        message: 'Strong winds expected - secure loose items',
        severity: 'moderate'
      })
    }

    return alerts
  }

  const getSunTimes = () => {
    if (!currentWeather?.sys) return null
    return {
      sunrise: new Date(currentWeather.sys.sunrise * 1000),
      sunset: new Date(currentWeather.sys.sunset * 1000)
    }
  }

  const renderAdminButton = () => {
    if (isAdmin()) {
      return (
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition duration-200"
        >
          <span>Admin Dashboard</span>
        </button>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading weather data...</div>
      </div>
    )
  }

  const weatherAlerts = getWeatherAlerts()
  const sunTimes = getSunTimes()

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Navigation className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">WeatherGuard Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Add notification center */}
              <NotificationCenter userId={user?.id} userType="user" />
              
              <div className="flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700 text-sm font-medium">
                  {isAdmin() ? 'Administrator' : 'User'}
                </span>
              </div>
              <span className="text-gray-700">{user?.email}</span>
              {renderAdminButton()}
              <button
                onClick={signOut}
                className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-8">
          <div className="flex border-b">
            {[
              { id: 'weather', name: 'Weather', icon: Sun },
              { id: 'alerts', name: 'Alerts', icon: Bell },
              { id: 'sos', name: 'Emergency SOS', icon: AlertTriangle },
              { id: 'marked', name: 'Marked Locations', icon: MapPin },
              { id: 'profile', name: 'Profile', icon: User }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error: </strong>{error}
          </div>
        )}
        
        {!databaseAvailable && (
          <div className="mb-6 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <strong>Note: </strong>Using offline mode. Some features may be limited.
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Weather Tab */}
          {activeTab === 'weather' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Weather Panel */}
              <div className="lg:col-span-3 space-y-6">
                {currentWeather && (
                  <>
                    {/* Current Weather */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <MapPin className="h-6 w-6 text-red-500" />
                            {currentWeather.name}, {currentWeather.sys?.country}
                            {offlineData && (
                              <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                Offline Data
                              </span>
                            )}
                          </h2>
                          <p className="text-gray-600">
                            {new Date().toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={addFavorite}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                            title="Add to favorites"
                          >
                            <Heart className="h-4 w-4" />
                            <span>Add Favorite</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={weatherService.getWeatherIcon(currentWeather.weather[0].icon)}
                            alt={currentWeather.weather[0].description}
                            className="w-24 h-24"
                          />
                          <div>
                            <p className="text-5xl font-bold text-gray-900">
                              {Math.round(currentWeather.main.temp)}°C
                            </p>
                            <p className="text-xl text-gray-600 capitalize">
                              {currentWeather.weather[0].description}
                            </p>
                          </div>
                        </div>
                        
                        {/* Sunrise/Sunset */}
                        {sunTimes && (
                          <div className="text-right space-y-2">
                            <div className="flex items-center gap-2 text-orange-600">
                              <Sun className="h-5 w-5" />
                              <span>Sunrise: {sunTimes.sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="flex items-center gap-2 text-purple-600">
                              <Moon className="h-5 w-5" />
                              <span>Sunset: {sunTimes.sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Thermometer className="h-5 w-5" />
                          <span>Feels like: {Math.round(currentWeather.main.feels_like)}°C</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Umbrella className="h-5 w-5" />
                          <span>Humidity: {currentWeather.main.humidity}%</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Wind className="h-5 w-5" />
                          <span>Wind: {currentWeather.wind?.speed || 0} m/s</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Eye className="h-5 w-5" />
                          <span>Pressure: {currentWeather.main.pressure} hPa</span>
                        </div>
                      </div>

                      {/* Weather Suggestion */}
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-blue-800 font-medium">
                          {weatherService.getWeatherSuggestion(currentWeather).suggestion}
                        </p>
                      </div>
                    </div>

                    {/* Weather Alerts */}
                    {weatherAlerts.length > 0 && (
                      <div className="bg-orange-100 border border-orange-400 rounded-2xl p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <h3 className="font-bold text-orange-800">Weather Alerts</h3>
                        </div>
                        <ul className="space-y-2">
                          {weatherAlerts.map((alert, index) => (
                            <li key={index} className="flex items-center space-x-2 text-orange-700">
                              <AlertTriangle className="h-4 w-4" />
                              <span>{alert.message}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 7-Day Forecast */}
                    {forecast && (
                      <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">7-Day Forecast</h3>
                        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                          {forecast.list
                            .filter((_, index) => index % 8 === 0)
                            .slice(0, 7)
                            .map((day, index) => (
                              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                                <p className="font-medium text-gray-900 mb-2">
                                  {index === 0 ? 'Today' : new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}
                                </p>
                                <p className="text-sm text-gray-500 mb-2">
                                  {new Date(day.dt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                                <img 
                                  src={weatherService.getWeatherIcon(day.weather[0].icon)}
                                  alt={day.weather[0].description}
                                  className="w-12 h-12 mx-auto mb-2"
                                />
                                <p className="text-gray-900 font-bold text-lg mb-1">{Math.round(day.main.temp)}°C</p>
                                <p className="text-sm text-gray-600 capitalize mb-3">
                                  {day.weather[0].description}
                                </p>
                                <div className="space-y-1 text-xs text-gray-500">
                                  <div className="flex justify-between">
                                    <span>High:</span>
                                    <span className="font-medium">{Math.round(day.main.temp_max)}°C</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Low:</span>
                                    <span className="font-medium">{Math.round(day.main.temp_min)}°C</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span>Rain:</span>
                                    <span className="font-medium flex items-center gap-1">
                                      <Umbrella className="h-3 w-3" />
                                      {day.pop ? Math.round(day.pop * 100) : 0}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Humidity:</span>
                                    <span className="font-medium">{day.main.humidity}%</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                        
                        {/* Fallback if we don't get 7 days from API */}
                        {forecast.list.filter((_, index) => index % 8 === 0).slice(0, 7).length < 7 && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-700 text-sm text-center">
                              Limited forecast data available. Showing {forecast.list.filter((_, index) => index % 8 === 0).slice(0, 7).length} days instead of 7.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Weather Map */}
                    <WeatherMap 
                      location={location} 
                      sosAlerts={userSOSAlerts}
                      onLocationMark={handleLocationMark}
                      markedLocations={markedLocations}
                    />

                    {/* Air Quality and Voice Assistant Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AirQualityMonitor location={location} airQuality={airQuality} />
                      <VoiceWeatherAssistant weatherData={currentWeather} />
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* SOS Button */}
                <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                  <button
                    onClick={() => setShowSOS(true)}
                    className="w-full bg-red-600 text-white py-4 px-6 rounded-lg hover:bg-red-700 font-bold text-lg transition duration-200 shadow-lg"
                    title="Send emergency SOS"
                  >
                    EMERGENCY SOS
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    Send your location to emergency services
                  </p>
                </div>

                {/* Recent SOS Alerts */}
                {userSOSAlerts.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Your SOS Alerts
                    </h3>
                    <div className="space-y-3 mt-4">
                      {userSOSAlerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className={`p-3 rounded-lg border ${
                          alert.status === 'active' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">
                                {new Date(alert.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-600">
                                {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}
                              </p>
                              {alert.admin_response && (
                                <p className="text-xs text-green-700 mt-1">
                                  <strong>Admin: </strong>{alert.admin_response}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              alert.status === 'active' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                            }`}>
                              {alert.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Favorites */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Favorite Locations
                  </h3>
                  <div className="space-y-3 mt-4">
                    {favorites.map((fav) => (
                      <div key={fav.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium block">{fav.location_name}</span>
                          <span className="text-xs text-gray-500">
                            {fav.temperature && `${Math.round(fav.temperature)}°C`}
                          </span>
                        </div>
                        <button
                          onClick={() => fetchAllWeatherData(fav.latitude, fav.longitude)}
                          className="text-blue-600 hover:text-blue-800 text-sm transition duration-200"
                        >
                          View
                        </button>
                      </div>
                    ))}
                    {favorites.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        Click "Add Favorite" to save locations
                      </p>
                    )}
                  </div>
                </div>

                {/* Announcements */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-500" />
                    Announcements
                  </h3>
                  <div className="space-y-4 mt-4">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-900">{announcement.title}</h4>
                        <p className="text-blue-800 text-sm mt-1">{announcement.content}</p>
                        <p className="text-blue-600 text-xs mt-2">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {announcements.length === 0 && (
                      <p className="text-gray-500 text-center py-4">
                        No announcements
                      </p>
                    )}
                  </div>
                </div>

                {/* Help Assistant */}
                <HelpAssistant />
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Latest Announcements</h2>
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900">{announcement.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        announcement.type === 'warning' ? 'bg-orange-200 text-orange-800' :
                        announcement.type === 'alert' ? 'bg-red-200 text-red-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {announcement.type?.toUpperCase() || 'INFO'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{announcement.content}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No announcements yet</p>
                )}
              </div>
            </div>
          )}

          {/* SOS Tab */}
          {activeTab === 'sos' && (
            <div className="space-y-6">
              {/* Current Location SOS */}
              <div className="text-center py-8 bg-white rounded-2xl shadow-lg">
                <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Emergency SOS</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  In case of emergency, press the SOS button to send your location to emergency services and administrators.
                </p>
                
                {location ? (
                  <div className="bg-green-50 p-4 rounded-lg max-w-md mx-auto mb-6">
                    <div className="flex items-center justify-center space-x-2 text-green-700">
                      <MapPin className="h-4 w-4" />
                      <span>Current Location: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}</span>
                    </div>
                </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg max-w-md mx-auto mb-6">
                    <p className="text-yellow-700">Location not available. Please enable location services.</p>
                  </div>
                )}

                <button
                  onClick={() => setShowSOS(true)}
                  className="bg-red-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors shadow-lg"
                >
                  SEND SOS FROM CURRENT LOCATION
                </button>
              </div>

              {/* SOS from Marked Locations */}
              {markedLocations.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Send SOS from Marked Locations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {markedLocations.map((markedLoc) => (
                      <div key={markedLoc.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900">{markedLoc.name}</h4>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            Marked
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {markedLoc.latitude.toFixed(4)}, {markedLoc.longitude.toFixed(4)}
                        </p>
                        {markedLoc.description && (
                          <p className="text-sm text-gray-700 mb-3">{markedLoc.description}</p>
                        )}
                        <button
                          onClick={() => {
                            setSelectedMarkedLocation(markedLoc)
                            setShowSOSFromMarked(true)
                          }}
                          className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
                        >
                          Send SOS from this Location
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Your SOS History */}
              {userSOSAlerts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Your SOS History</h3>
                  <div className="space-y-4">
                    {userSOSAlerts.map((alert) => (
                      <div key={alert.id} className={`p-4 border rounded-lg ${
                        alert.status === 'active' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-bold text-gray-900">
                                {alert.is_marked_location ? `SOS from ${alert.marked_location_name}` : 'SOS from Current Location'}
                              </h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                alert.status === 'active' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                              }`}>
                                {alert.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Location: {alert.latitude?.toFixed(4) || 'N/A'}, {alert.longitude?.toFixed(4) || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500">
                              Sent: {new Date(alert.created_at).toLocaleString()}
                            </p>
                            {alert.admin_response && (
                              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                <div className="flex items-center space-x-2 mb-1">
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                  <strong className="text-blue-800 text-sm">Admin Response:</strong>
                                </div>
                                <p className="text-blue-700 text-sm">{alert.admin_response}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-800 text-sm text-center">
                  <strong>Important:</strong> Only use SOS in real emergencies. Your location will be shared with emergency responders.
                </p>
              </div>
            </div>
          )}

          {/* Marked Locations Tab */}
          {activeTab === 'marked' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Your Marked Locations</h2>
                <p className="text-gray-600">{markedLocations.length} locations marked</p>
              </div>

              {markedLocations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {markedLocations.map((markedLoc) => (
                    <div key={markedLoc.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-gray-900">{markedLoc.name}</h3>
                        <button
                          onClick={() => deleteMarkedLocation(markedLoc.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{markedLoc.latitude.toFixed(4)}, {markedLoc.longitude.toFixed(4)}</span>
                        </div>
                        {markedLoc.description && (
                          <p className="text-gray-700">{markedLoc.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Marked on {new Date(markedLoc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedMarkedLocation(markedLoc)
                            setShowSOSFromMarked(true)
                          }}
                          className="flex-1 bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Send SOS
                        </button>
                        <button
                          onClick={() => {
                            // Center map on this location
                            setLocation({ lat: markedLoc.latitude, lon: markedLoc.longitude })
                            setActiveTab('weather')
                          }}
                          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          View on Map
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Marked Locations</h3>
                  <p className="text-gray-600 mb-4">
                    Mark locations on the map to quickly send SOS alerts from those locations.
                  </p>
                  <button
                    onClick={() => setActiveTab('weather')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to Map
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Your Profile</h2>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      isAdmin() 
                        ? 'bg-purple-200 text-purple-800' 
                        : 'bg-green-200 text-green-800'
                    }`}>
                      {isAdmin() ? 'admin' : 'user'}
                    </span>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                  <p className="text-gray-900">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statistics</label>
                  <div className="space-y-2 text-sm">
                    <p>Marked Locations: {markedLocations.length}</p>
                    <p>Favorite Locations: {favorites.length}</p>
                    <p>SOS Alerts Sent: {userSOSAlerts.length}</p>
                    <p>Active SOS Alerts: {userSOSAlerts.filter(a => a.status === 'active').length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chatbot Component */}
      <div className="fixed bottom-6 right-6 z-40">
        <Chatbot />
      </div>

      {/* Description Modal */}
      {showDescriptionModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="absolute inset-0 bg-linear-to-br from-blue-400/20 to-purple-600/20 backdrop-blur-sm" onClick={cancelMarkedLocation}></div>
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <MapPin className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Add Location Description</h3>
              </div>
              <button
                onClick={cancelMarkedLocation}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Add an optional description for your marked location to help identify it later.
              </p>
              
              {pendingMarkedLocation && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 font-medium">Location Coordinates:</p>
                  <p className="text-sm text-blue-600">
                    {pendingMarkedLocation.latitude.toFixed(6)}, {pendingMarkedLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={newLocationDescription}
                onChange={(e) => setNewLocationDescription(e.target.value)}
                rows="4"
                placeholder="E.g., Home, Work, Favorite hiking spot, Emergency meeting point..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                This description will help you identify this location when sending SOS alerts.
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={cancelMarkedLocation}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={saveMarkedLocation}
                className="flex-1 bg-linear-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center justify-center space-x-2 shadow-lg"
              >
                <Save className="h-4 w-4" />
                <span>Save Location</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal - Current Location */}
      {showSOS && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="absolute inset-0 bg-linear-to-br from-red-400/20 to-orange-600/20 backdrop-blur-sm" onClick={() => setShowSOS(false)}></div>
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-bold text-red-600">Emergency SOS</h3>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to send an emergency SOS alert from your current location? Your location will be shared with emergency services and administrators immediately.
            </p>
            {location && (
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-yellow-800 font-medium">Current Location:</p>
                <p className="text-sm text-yellow-600">
                  {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                </p>
              </div>
            )}
            <div className="flex space-x-4">
              <button
                onClick={() => setShowSOS(false)}         
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => sendSOS(false)}
                className="flex-1 bg-linear-to-r from-red-600 to-red-700 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-800 font-bold transition-all duration-200 shadow-lg"
              >
                SEND SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal - Marked Location */}
      {showSOSFromMarked && selectedMarkedLocation && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <div className="absolute inset-0 bg-linear-to-br from-red-400/20 to-orange-600/20 backdrop-blur-sm" onClick={() => {
            setShowSOSFromMarked(false)
            setSelectedMarkedLocation(null)
          }}></div>
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-bold text-red-600">SOS from Marked Location</h3>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to send an emergency SOS alert from your marked location?
            </p>
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <h4 className="font-bold text-gray-900 mb-2">{selectedMarkedLocation.name}</h4>
              <p className="text-sm text-gray-600 mb-2">
                Coordinates: {selectedMarkedLocation.latitude.toFixed(6)}, {selectedMarkedLocation.longitude.toFixed(6)}
              </p>
              {selectedMarkedLocation.description && (
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-medium">Description:</span> {selectedMarkedLocation.description}
                </p>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowSOSFromMarked(false)
                  setSelectedMarkedLocation(null)
                }}         
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => sendSOS(true, selectedMarkedLocation)}
                className="flex-1 bg-linear-to-r from-red-600 to-red-700 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-800 font-bold transition-all duration-200 shadow-lg"
              >
                SEND SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDashboard