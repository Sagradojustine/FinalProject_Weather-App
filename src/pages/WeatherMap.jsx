/* eslint-disable no-unused-vars */
// WeatherMap.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Navigation, AlertTriangle, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../services/supabase' // Adjust this import based on your project structure

function WeatherMap({ location, sosAlerts = [], onLocationMark, markedLocations = [], userId }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([]) // Store marker references for cleanup
  const [mapLoaded, setMapLoaded] = useState(false)
  const [markerMode, setMarkerMode] = useState(false)
  const [clickedLocation, setClickedLocation] = useState(null)
  const [savedLocations, setSavedLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [locationName, setLocationName] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showSavedLocationsModal, setShowSavedLocationsModal] = useState(false)

  useEffect(() => {
    setMapLoaded(true)
    if (userId) {
      fetchSavedLocations()
    }
  }, [userId])

  // Fetch saved locations from Supabase
  const fetchSavedLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      if (data) {
        setSavedLocations(data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  // Save location to Supabase
  const saveLocation = async (locationData) => {
    if (!userId) {
      alert('Please log in to save locations')
      return
    }

    try {
      setLoading(true)
      
      const newLocation = {
        user_id: userId,
        name: locationData.name || `Location ${Date.now()}`,
        country: locationData.country || '',
        lat: locationData.latitude,
        lon: locationData.longitude,
        is_default: false,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('locations')
        .insert([newLocation])
        .select()
        .single()

      if (error) throw error

      if (data) {
        setSavedLocations(prev => [data, ...prev])
        setShowSaveModal(false)
        setLocationName('')
        setClickedLocation(null)
        setMarkerMode(false)
        
        // Add the new location to the map
        if (mapInstanceRef.current) {
          addMarkerToMap(data)
        }
        
        alert('Location saved successfully!')
      }
    } catch (error) {
      console.error('Error saving location:', error)
      alert('Failed to save location')
    } finally {
      setLoading(false)
    }
  }

  // Delete location from Supabase
  const deleteLocation = async (locationId) => {
    if (!confirm('Are you sure you want to delete this location?')) return

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId)
        .eq('user_id', userId)

      if (error) throw error

      // Remove from local state
      setSavedLocations(prev => prev.filter(loc => loc.id !== locationId))
      
      // Remove marker from map
      removeMarkerFromMap(locationId)
      
      alert('Location deleted successfully!')
    } catch (error) {
      console.error('Error deleting location:', error)
      alert('Failed to delete location')
    }
  }

  // Add a marker to the map
  const addMarkerToMap = (locationData) => {
    const L = window.L
    if (!L || !mapInstanceRef.current) return

    const createCustomIcon = (color) => {
      return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
    }

    const marker = L.marker([locationData.lat, locationData.lon], {
      icon: createCustomIcon('#10b981') // Green color for saved locations
    })
      .addTo(mapInstanceRef.current)
      .bindPopup(`
        <div class="p-2">
          <strong>📍 ${locationData.name}</strong><br/>
          ${locationData.country ? `Country: ${locationData.country}<br/>` : ''}
          Lat: ${locationData.lat.toFixed(4)}<br/>
          Lon: ${locationData.lon.toFixed(4)}<br/>
          <small>Saved on: ${new Date(locationData.created_at).toLocaleDateString()}</small>
          <div class="mt-2">
            <button 
              onclick="window.dispatchEvent(new CustomEvent('deleteLocation', { detail: '${locationData.id}' }))"
              class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      `)

    // Store with reference to location ID for easy removal
    markersRef.current.push({
      marker,
      locationId: locationData.id,
      type: 'saved'
    })
  }

  // Remove marker from map
  const removeMarkerFromMap = (locationId) => {
    const index = markersRef.current.findIndex(m => m.locationId === locationId)
    if (index !== -1 && markersRef.current[index].marker.remove) {
      markersRef.current[index].marker.remove()
      markersRef.current.splice(index, 1)
    }
  }

  const cleanupMarkers = useCallback(() => {
    // Remove all markers from the map
    markersRef.current.forEach(item => {
      if (item.marker && item.marker.remove) {
        item.marker.remove()
      }
    })
    markersRef.current = []
  }, [])

  useEffect(() => {
    if (!mapLoaded || !location || !mapRef.current) return

    const initMap = async () => {
      const L = await import('leaflet')
      
      // Fix for default markers in React
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })

      // Custom icons
      const createCustomIcon = (color) => {
        return L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
      }

      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        cleanupMarkers()
      }

      // Initialize map
      const map = L.map(mapRef.current).setView([location.lat, location.lon], 10)
      mapInstanceRef.current = map

      // Add tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)

      // Add user location marker
      const userMarker = L.marker([location.lat, location.lon])
        .addTo(map)
        .bindPopup(`
          <div class="p-2">
            <strong>Your Location</strong><br/>
            Lat: ${location.lat.toFixed(4)}<br/>
            Lon: ${location.lon.toFixed(4)}
          </div>
        `)
      
      markersRef.current.push({ marker: userMarker, type: 'user' })

      // Add marked locations from props
      markedLocations.forEach((markedLoc, index) => {
        const marker = L.marker([markedLoc.latitude, markedLoc.longitude], {
          icon: createCustomIcon(markedLoc.type === 'high_risk' ? '#ef4444' : '#3b82f6')
        })
          .addTo(map)
          .bindPopup(`
            <div class="p-2">
              <strong>${markedLoc.type === 'high_risk' ? '🚨 High Risk Area' : '📍 Marked Location'}</strong><br/>
              ${markedLoc.name || `Location ${index + 1}`}<br/>
              Lat: ${markedLoc.latitude.toFixed(4)}<br/>
              Lon: ${markedLoc.longitude.toFixed(4)}<br/>
              ${markedLoc.description ? `Desc: ${markedLoc.description}` : ''}
            </div>
          `)
        
        markersRef.current.push({ marker, type: 'marked' })
      })

      // Add SOS alert markers
      sosAlerts.forEach((alert, index) => {
        const marker = L.marker([alert.latitude, alert.longitude], {
          icon: createCustomIcon('#dc2626')
        })
          .addTo(map)
          .bindPopup(`
            <div class="p-2">
              <strong>🚨 SOS Alert #${index + 1}</strong><br/>
              Status: ${alert.status}<br/>
              ${alert.admin_response ? `Admin Response: ${alert.admin_response}` : 'Awaiting response'}<br/>
              Lat: ${alert.latitude.toFixed(4)}<br/>
              Lon: ${alert.longitude.toFixed(4)}<br/>
              <small>${new Date(alert.created_at).toLocaleString()}</small>
            </div>
          `)
        
        markersRef.current.push({ marker, type: 'sos' })
      })

      // Add saved locations from Supabase
      savedLocations.forEach((savedLoc) => {
        const marker = L.marker([savedLoc.lat, savedLoc.lon], {
          icon: createCustomIcon('#10b981')
        })
          .addTo(map)
          .bindPopup(`
            <div class="p-2">
              <strong>📍 ${savedLoc.name}</strong><br/>
              ${savedLoc.country ? `Country: ${savedLoc.country}<br/>` : ''}
              Lat: ${savedLoc.lat.toFixed(4)}<br/>
              Lon: ${savedLoc.lon.toFixed(4)}<br/>
              <small>Saved on: ${new Date(savedLoc.created_at).toLocaleDateString()}</small>
              <div class="mt-2">
                <button 
                  onclick="window.dispatchEvent(new CustomEvent('deleteLocation', { detail: '${savedLoc.id}' }))"
                  class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          `)
        
        markersRef.current.push({ marker, locationId: savedLoc.id, type: 'saved' })
      })

      // Click handler for marking locations
      const handleMapClick = (e) => {
        if (markerMode) {
          const newLocation = {
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          }
          
          setClickedLocation(newLocation)
          setShowSaveModal(true)
          
          // Add temporary marker
          const tempMarker = L.marker([e.latlng.lat, e.latlng.lng], {
            icon: createCustomIcon('#8b5cf6') // Purple for temporary
          })
            .addTo(map)
            .bindPopup(`
              <div class="p-2">
                <strong>📍 New Location</strong><br/>
                Click to save this location
              </div>
            `)
          
          markersRef.current.push({ marker: tempMarker, type: 'temporary' })
          
          // Use setTimeout to prevent immediate popup opening interfering with click
          setTimeout(() => {
            tempMarker.openPopup()
          }, 100)
          
          // Reset marker mode
          setMarkerMode(false)
        }
      }

      // Handle popup close events
      const handlePopupClose = () => {
        // Remove temporary markers
        const tempIndex = markersRef.current.findIndex(m => m.type === 'temporary')
        if (tempIndex !== -1) {
          markersRef.current[tempIndex].marker.remove()
          markersRef.current.splice(tempIndex, 1)
        }
      }

      map.on('click', handleMapClick)
      map.on('popupclose', handlePopupClose)

      // Adjust map view to fit all markers
      const allMarkers = markersRef.current.filter(m => m.marker && m.marker.getLatLng).map(m => m.marker)
      if (allMarkers.length > 0) {
        const group = L.featureGroup(allMarkers)
        map.fitBounds(group.getBounds().pad(0.1))
      }

      // Prevent map clicks from propagating when clicking on controls
      const mapContainer = mapRef.current
      const stopPropagation = (e) => {
        e.stopPropagation()
      }

      // Add event listeners to buttons to prevent map click interference
      const buttons = mapContainer.querySelectorAll('button')
      buttons.forEach(button => {
        button.addEventListener('click', stopPropagation)
      })

      // Listen for delete events from popups
      const handleDeleteLocation = (e) => {
        deleteLocation(e.detail)
      }

      window.addEventListener('deleteLocation', handleDeleteLocation)

      return () => {
        map.off('click', handleMapClick)
        map.off('popupclose', handlePopupClose)
        window.removeEventListener('deleteLocation', handleDeleteLocation)
        
        buttons.forEach(button => {
          button.removeEventListener('click', stopPropagation)
        })
      }
    }

    initMap()

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        cleanupMarkers()
      }
    }
  }, [mapLoaded, location, sosAlerts, markedLocations, markerMode, savedLocations, cleanupMarkers])

  const handleMarkerModeToggle = useCallback(() => {
    setMarkerMode(prev => !prev)
    // Clear any clicked location state
    setClickedLocation(null)
    setShowSaveModal(false)
  }, [])

  const handleSaveLocation = () => {
    if (!locationName.trim()) {
      alert('Please enter a location name')
      return
    }

    const locationData = {
      ...clickedLocation,
      name: locationName,
      country: '' // You can add country detection here if needed
    }

    saveLocation(locationData)
  }

  if (!location) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-500" />
          Weather Map
        </h3>
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <p className="text-gray-500">Location data not available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-500" />
          Interactive Weather Map
        </h3>
        <div className="flex gap-2">
          {userId && (
            <>
              <button
                onClick={handleMarkerModeToggle}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                  markerMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {markerMode ? 'Cancel Marking' : 'Mark Location'}
              </button>
              {savedLocations.length > 0 && (
                <button
                  onClick={() => setShowSavedLocationsModal(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition duration-200"
                >
                  View Saved Locations
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
        {mapLoaded ? (
          <>
            <div 
              ref={mapRef} 
              className="w-full h-full"
            />
            {markerMode && (
              <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-[1000] shadow-lg">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Click on map to mark location
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading map...</p>
          </div>
        )}
        
        {/* Map overlay with info */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg z-[1000] shadow-lg">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
              {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
            </span>
          </div>
          {sosAlerts.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-red-600">
                {sosAlerts.length} SOS Alert(s)
              </span>
            </div>
          )}
          {markedLocations.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-600">
                {markedLocations.length} Marked Location(s)
              </span>
            </div>
          )}
          {savedLocations.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">
                {savedLocations.length} Saved Location(s)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Your Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>SOS Alerts</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
          <span>Marked Locations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Saved Locations</span>
        </div>
      </div>

      {markerMode && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Click anywhere on the map to save a location. You'll be prompted to give it a name.
          </p>
        </div>
      )}

      {/* Save Location Modal */}
      {showSaveModal && clickedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Save Location</h3>
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setClickedLocation(null)
                  setLocationName('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter a name for this location"
                  disabled={loading}
                  autoFocus
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Coordinates</span>
                </div>
                <div className="text-gray-700">
                  Latitude: <span className="font-mono">{clickedLocation.latitude.toFixed(6)}</span>
                </div>
                <div className="text-gray-700">
                  Longitude: <span className="font-mono">{clickedLocation.longitude.toFixed(6)}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSaveLocation}
                  disabled={loading || !locationName.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 font-medium"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Save Location'}
                </button>
                <button
                  onClick={() => {
                    setShowSaveModal(false)
                    setClickedLocation(null)
                    setLocationName('')
                  }}
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200 font-medium"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Locations Modal */}
      {showSavedLocationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Your Saved Locations ({savedLocations.length})
              </h3>
              <button
                onClick={() => setShowSavedLocationsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {savedLocations.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No saved locations yet.</p>
                  <p className="text-sm text-gray-400 mt-2">Use the "Mark Location" button to save locations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedLocations.map((loc) => (
                    <div key={loc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="font-semibold text-gray-900">{loc.name}</div>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          <span className="font-mono">{loc.lat.toFixed(6)}, {loc.lon.toFixed(6)}</span>
                          {loc.country && <span className="ml-2">• {loc.country}</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          Saved on {new Date(loc.created_at).toLocaleDateString()} at {new Date(loc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteLocation(loc.id)}
                        className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition duration-200"
                        title="Delete location"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t p-4">
              <button
                onClick={() => {
                  setShowSavedLocationsModal(false)
                  handleMarkerModeToggle()
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-medium"
              >
                <Plus className="h-5 w-5 inline mr-2" />
                Mark New Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeatherMap
