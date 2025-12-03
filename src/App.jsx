import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext'
import { NotificationProvider } from './context/NotificationContext'
import UserLogin from './pages/UserLogin'
import UserRegister from './pages/UserRegister'
import AdminLogin from './pages/AdminLogin'
import AdminRegister from './pages/AdminRegister'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import './index.css'

// Import additional components
import AirQualityMonitor from './pages/AirQualityMonitor'
import HelpAssistant from './pages/HelpAssistant'
import VoiceWeatherAssistant from './pages/VoiceWeatherAssistant'
import WeatherMap from './pages/WeatherMap'
import Chatbot from './pages/Chatbot'

// Import weather service
import { weatherService } from './services/weather'

function App() {
  const [location, setLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [airQualityData, setAirQualityData] = useState(null);
  const [mapAlerts, setMapAlerts] = useState([]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          setLocation(newLocation);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to a location if permission denied
          setLocation({ lat: 40.7128, lon: -74.0060 }); // NYC
        }
      );
    }
  }, []);

  // Fetch weather and air quality data
  useEffect(() => {
    if (location) {
      fetchWeatherData();
      fetchAirQualityData();
    }
  }, [location]);

  const fetchWeatherData = async () => {
    try {
      const data = await weatherService.getCurrentWeather(location.lat, location.lon);
      setWeatherData(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  const fetchAirQualityData = async () => {
    try {
      const data = await weatherService.getAirQuality(location.lat, location.lon);
      setAirQualityData(data);
    } catch (error) {
      console.error('Error fetching air quality:', error);
    }
  };

  // Example map alerts (you would fetch these from your API)
  useEffect(() => {
    // Simulated alerts
    const simulatedAlerts = [
      {
        type: 'Storm Warning',
        location: 'Northern Region',
        description: 'Heavy rainfall expected in the next 2 hours',
        severity: 'high'
      },
      {
        type: 'Air Quality Alert',
        location: 'Downtown Area',
        description: 'High PM2.5 levels detected',
        severity: 'medium'
      }
    ];
    setMapAlerts(simulatedAlerts);
  }, []);

  return (
    <AuthProvider>
      <AdminAuthProvider>
        <NotificationProvider>
          <Router>
            <AppContent 
              location={location}
              weatherData={weatherData}
              airQualityData={airQualityData}
              mapAlerts={mapAlerts}
            />
          </Router>
        </NotificationProvider>
      </AdminAuthProvider>
    </AuthProvider>
  )
}

function AppContent({ location, weatherData, airQualityData, mapAlerts }) {
  const { user, loading, getUserRole } = useAuth()
  const { isAuthenticated, checkAdminAuth } = useAdminAuth()

  // Check admin auth on app load
  React.useEffect(() => {
    checkAdminAuth()
  }, [checkAdminAuth])

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  const getRedirectPath = () => {
    if (!user) {
      return '/user/login'
    }
    
    const userRole = getUserRole()
    console.log('Current user role:', userRole, 'Redirecting to:', userRole === 'admin' ? '/admin/dashboard' : '/dashboard')
    
    if (userRole === 'admin') {
      return '/admin/dashboard'
    } else {
      return '/dashboard'
    }
  }

  const renderUserLoginRoute = () => {
    if (!user) {
      return <UserLogin />
    } else {
      return <Navigate to={getRedirectPath()} replace />
    }
  }

  const renderUserRegisterRoute = () => {
    if (!user) {
      return <UserRegister />
    } else {
      return <Navigate to={getRedirectPath()} replace />
    }
  }

  const renderAdminLoginRoute = () => {
    if (isAuthenticated()) {
      return <Navigate to="/admin/dashboard" replace />
    }
    return <AdminLogin />
  }

  const renderAdminRegisterRoute = () => {
    if (isAuthenticated()) {
      return <Navigate to="/admin/dashboard" replace />
    }
    return <AdminRegister />
  }

  const renderDashboardRoute = () => {
    if (user) {
      const userRole = getUserRole()
      if (userRole === 'admin') {
        return <Navigate to="/admin/dashboard" replace />
      }
      return <UserDashboard />
    } else {
      return <Navigate to="/user/login" replace />
    }
  }

  const renderAdminRoute = () => {
    if (isAuthenticated()) {
      return <AdminDashboard />
    } else {
      return <Navigate to="/admin/login" replace />
    }
  }

  const renderAirQualityRoute = () => {
    if (user) {
      return <AirQualityMonitor 
        location={location} 
        airQuality={airQualityData} 
      />
    } else {
      return <Navigate to="/user/login" replace />
    }
  }

  const renderHelpAssistantRoute = () => {
    if (user) {
      return <HelpAssistant />
    } else {
      return <Navigate to="/user/login" replace />
    }
  }

  const renderVoiceWeatherRoute = () => {
    if (user) {
      return <VoiceWeatherAssistant />
    } else {
      return <Navigate to="/user/login" replace />
    }
  }

  const renderWeatherMapRoute = () => {
    if (user) {
      return <WeatherMap 
        location={location}
        sosAlerts={mapAlerts}
      />
    } else {
      return <Navigate to="/user/login" replace />
    }
  }

  const renderRootRoute = () => {
    return <Navigate to={getRedirectPath()} replace />
  }

  const renderFallbackRoute = () => {
    return <Navigate to="/user/login" replace />
  }

  return (
    <>
      <Routes>
        {/* Public Routes - User Auth */}
        <Route path="/user/login" element={renderUserLoginRoute()} />
        <Route path="/user/register" element={renderUserRegisterRoute()} />
        
        {/* Public Routes - Admin Auth */}
        <Route path="/admin/login" element={renderAdminLoginRoute()} />
        <Route path="/admin/register" element={renderAdminRegisterRoute()} />
        
        {/* User Routes - accessible to all authenticated users */}
        <Route path="/dashboard" element={renderDashboardRoute()} />
        <Route path="/air-quality" element={renderAirQualityRoute()} />
        <Route path="/help-assistant" element={renderHelpAssistantRoute()} />
        <Route path="/voice-weather" element={renderVoiceWeatherRoute()} />
        <Route path="/weather-map" element={renderWeatherMapRoute()} />
        
        {/* Admin Routes - separate authentication */}
        <Route path="/admin/dashboard" element={renderAdminRoute()} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* Root path redirect */}
        <Route path="/" element={renderRootRoute()} />
        
        {/* Fallback route for undefined paths */}
        <Route path="*" element={renderFallbackRoute()} />
      </Routes>
      
      {/* Global Chatbot component - conditionally render if user is authenticated */}
      {user && (
        <Chatbot 
          weatherData={weatherData}
          airQualityData={airQualityData}
          mapAlertData={mapAlerts}
          locationData={location}
        />
      )}
    </>
  )
}

export default App