/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useNotifications } from '../context/NotificationContext'
import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  AlertTriangle, 
  MessageSquare, 
  BarChart3,
  MapPin,
  Bell,
  LogOut,
  Mail,
  CheckCircle,
  XCircle,
  Send,
  Shield,
  X,
  Navigation
} from 'lucide-react'
import NotificationCenter from './NotificationCenter'
import Chatbot from './Chatbot' // Added import
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Import leaflet images directly
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix for Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

function AdminDashboard() {
  const { admin, adminSignOut, isAuthenticated } = useAdminAuth()
  const { 
    fetchNotifications, 
    subscribeToNotifications,
    sendNotification 
  } = useNotifications()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('sos')
  const [sosAlerts, setSosAlerts] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [users, setUsers] = useState([])
  const [userRequests, setUserRequests] = useState([])
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', type: 'info' })
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [adminResponse, setAdminResponse] = useState('')
  const [selectedAlert, setSelectedAlert] = useState(null)
  
  // State for map modal
  const [showMapModal, setShowMapModal] = useState(false)
  const [mapLocation, setMapLocation] = useState(null)
  const [selectedAlertForMap, setSelectedAlertForMap] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)
  const [mapMarkers, setMapMarkers] = useState([])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/admin/login')
    }
  }, [isAuthenticated, navigate])

  // Fetch notifications on admin load
  useEffect(() => {
    if (admin?.id) {
      fetchNotifications(admin.id)
      const cleanup = subscribeToNotifications(admin.id, 'admin')
      return cleanup
    }
  }, [admin?.id, fetchNotifications, subscribeToNotifications])

  // Function to open map modal
  const openMapModal = (lat, lng, alertData = null) => {
    setMapLocation({ lat, lng })
    setSelectedAlertForMap(alertData)
    setShowMapModal(true)
  }

  // Initialize map when modal opens
  useEffect(() => {
    if (showMapModal && mapLocation) {
      // Clear existing map
      if (mapInstance) {
        mapInstance.remove()
        setMapInstance(null)
      }
      
      // Give time for modal to render
      setTimeout(() => {
        initializeMap()
      }, 100)
    }
  }, [showMapModal, mapLocation])

  const initializeMap = () => {
    if (!mapLocation || !showMapModal) return
    
    const mapContainer = document.getElementById('alert-map-container')
    if (!mapContainer) return
    
    // Initialize map
    const map = L.map('alert-map-container').setView([mapLocation.lat, mapLocation.lng], 13)
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    
    // Add marker for the alert location
    const customIcon = L.divIcon({
      html: `<div style="background-color: #dc2626; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: 'sos-marker'
    })
    
    const marker = L.marker([mapLocation.lat, mapLocation.lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(`
        <div style="padding: 8px;">
          <strong>🚨 SOS Alert Location</strong><br/>
          ${selectedAlertForMap ? `From: ${selectedAlertForMap.user_email}` : ''}<br/>
          Coordinates: ${mapLocation.lat.toFixed(6)}, ${mapLocation.lng.toFixed(6)}
        </div>
      `)
      .openPopup()
    
    // Store markers for cleanup
    const markers = [marker]
    
    // If this is a marked location, add additional info
    if (selectedAlertForMap?.is_marked_location) {
      const markedIcon = L.divIcon({
        html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.2);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: 'marked-location-marker'
      })
      
      const markedMarker = L.marker([mapLocation.lat, mapLocation.lng], { icon: markedIcon })
        .addTo(map)
        .bindPopup(`
          <div style="padding: 8px;">
            <strong>📍 Marked Location</strong><br/>
            ${selectedAlertForMap.marked_location_name ? `Name: ${selectedAlertForMap.marked_location_name}<br/>` : ''}
            ${selectedAlertForMap.marked_location_description ? `Description: ${selectedAlertForMap.marked_location_description}<br/>` : ''}
            Coordinates: ${mapLocation.lat.toFixed(6)}, ${mapLocation.lng.toFixed(6)}
          </div>
        `)
      
      markers.push(markedMarker)
    }
    
    // Add circle for better visibility
    L.circle([mapLocation.lat, mapLocation.lng], {
      color: selectedAlertForMap?.status === 'active' ? '#dc2626' : '#10b981',
      fillColor: selectedAlertForMap?.status === 'active' ? '#f87171' : '#a7f3d0',
      fillOpacity: 0.2,
      radius: 500
    }).addTo(map)
    
    setMapInstance(map)
    setMapMarkers(markers)
    
    // Fit bounds to marker with padding
    map.fitBounds([
      [mapLocation.lat - 0.01, mapLocation.lng - 0.01],
      [mapLocation.lat + 0.01, mapLocation.lng + 0.01]
    ])
  }

  // Cleanup map when modal closes
  useEffect(() => {
    if (!showMapModal && mapInstance) {
      mapMarkers.forEach(marker => marker.remove())
      mapInstance.remove()
      setMapInstance(null)
      setMapMarkers([])
    }
  }, [showMapModal])

  // Mock data functions (replace with actual API calls)
  const fetchSOSAlerts = async () => {
    // Mock data
    const mockAlerts = [
      {
        id: 1,
        user_email: 'user1@example.com',
        latitude: 40.7128,
        longitude: -74.0060,
        status: 'active',
        created_at: new Date().toISOString(),
        is_marked_location: true,
        marked_location_name: 'Central Park',
        marked_location_description: 'Near the fountain'
      },
      {
        id: 2,
        user_email: 'user2@example.com',
        latitude: 34.0522,
        longitude: -118.2437,
        status: 'resolved',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        admin_response: 'Help is on the way',
        responded_at: new Date().toISOString()
      }
    ]
    setSosAlerts(mockAlerts)
  }

  const fetchAnnouncements = async () => {
    const mockAnnouncements = [
      {
        id: 1,
        title: 'System Maintenance',
        content: 'Scheduled maintenance tonight from 2-4 AM',
        type: 'info',
        created_at: new Date().toISOString()
      }
    ]
    setAnnouncements(mockAnnouncements)
  }

  const fetchUsers = async () => {
    const mockUsers = [
      { id: 1, email: 'user1@example.com', role: 'user', created_at: new Date().toISOString() },
      { id: 2, email: 'user2@example.com', role: 'user', created_at: new Date().toISOString() }
    ]
    setUsers(mockUsers)
  }

  const fetchUserRequests = async () => {
    const mockRequests = [
      {
        id: 1,
        user_id: 1,
        message: 'Need access to premium features',
        type: 'feature_request',
        status: 'pending',
        created_at: new Date().toISOString(),
        profiles: { email: 'user1@example.com' }
      }
    ]
    setUserRequests(mockRequests)
  }

  const updateUnreadCount = () => {
    const unreadCount = userRequests.filter(request => request.status === 'pending').length
    setUnreadNotifications(unreadCount)
  }

  const createAnnouncement = async (e) => {
    e.preventDefault()
    // Mock implementation
    const newAnn = {
      id: announcements.length + 1,
      ...newAnnouncement,
      created_at: new Date().toISOString()
    }
    setAnnouncements([newAnn, ...announcements])
    setNewAnnouncement({ title: '', content: '', type: 'info' })
  }

  const resolveSOS = async (alertId) => {
    setSosAlerts(alerts => 
      alerts.map(alert => 
        alert.id === alertId ? { ...alert, status: 'resolved' } : alert
      )
    )
  }

  const sendAdminResponse = async (alertId) => {
    if (!adminResponse.trim()) return

    // In a real implementation, you would update the database here
    // For now, we'll simulate the update and notification
    
    // Update the alert in local state
    setSosAlerts(alerts =>
      alerts.map(alert =>
        alert.id === alertId
          ? {
              ...alert,
              admin_response: adminResponse,
              responded_at: new Date().toISOString(),
              status: 'responded'
            }
          : alert
      )
    )

    // Send notification to user (mock implementation)
    const alertToRespond = sosAlerts.find(a => a.id === alertId)
    if (alertToRespond) {
      try {
        // In real implementation, you would get the user_id from the alert
        // For now, we'll use a mock user ID
        const mockUserId = 1
        
        const notificationSent = await sendNotification({
          user_id: mockUserId,
          title: 'SOS Response Received',
          message: `Admin response: ${adminResponse}`,
          type: 'sos_response',
          is_read: false,
          related_entity_type: 'sos_alert',
          related_entity_id: alertId
        })

        if (notificationSent) {
          alert('Response sent to user successfully!')
        }
      } catch (error) {
        console.error('Error sending notification:', error)
        alert('Response recorded but notification failed')
      }
    }

    setAdminResponse('')
    setSelectedAlert(null)
  }

  const deleteAnnouncement = async (id) => {
    setAnnouncements(announcements.filter(ann => ann.id !== id))
  }

  const handleUserRequest = async (requestId, action) => {
    setUserRequests(requests =>
      requests.map(request =>
        request.id === requestId
          ? {
              ...request,
              status: action,
              resolved_at: new Date().toISOString()
            }
          : request
      )
    )
  }

  useEffect(() => {
    fetchSOSAlerts()
    fetchAnnouncements()
    fetchUsers()
    fetchUserRequests()
  }, [])

  useEffect(() => {
    updateUnreadCount()

  }, [updateUnreadCount, userRequests])

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome, {admin?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Replace existing Bell icon with NotificationCenter */}
              <NotificationCenter userId={admin?.id} userType="admin" />
              
              <span className="text-gray-700">{admin?.email}</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                <span>User Dashboard</span>
              </button>
              <button
                onClick={adminSignOut}
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
              { id: 'sos', name: 'SOS Alerts', icon: AlertTriangle, count: sosAlerts.filter(a => a.status === 'active').length },
              { id: 'announcements', name: 'Announcements', icon: Bell },
              { id: 'users', name: 'Users', icon: Users },
              { id: 'requests', name: 'User Requests', icon: Mail, count: unreadNotifications },
              { id: 'analytics', name: 'Analytics', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
                {tab.count > 0 && (
                  <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* SOS Alerts */}
          {activeTab === 'sos' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Emergency SOS Alerts</h2>
              <div className="space-y-4">
                {sosAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border ${
                    alert.status === 'active' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-bold text-gray-900">{alert.user_email}</h3>
                          {alert.is_marked_location && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              From Marked Location: {alert.marked_location_name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Location: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                        </p>
                        {alert.marked_location_description && (
                          <p className="text-sm text-gray-700 mt-2">
                            <strong>Location Description:</strong> {alert.marked_location_description}
                          </p>
                        )}
                        {alert.admin_response && (
                          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-center space-x-2 mb-1">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                              <strong className="text-blue-800">Your Response:</strong>
                            </div>
                            <p className="text-blue-700">{alert.admin_response}</p>
                            <p className="text-blue-600 text-xs mt-1">
                              Responded: {new Date(alert.responded_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => openMapModal(alert.latitude, alert.longitude, alert)}
                          className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition duration-200"
                        >
                          <MapPin className="h-4 w-4" />
                          <span>View Map</span>
                        </button>
                        {alert.status === 'active' && (
                          <>
                            <button
                              onClick={() => setSelectedAlert(alert)}
                              className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition duration-200"
                            >
                              <Send className="h-4 w-4" />
                              <span>Respond</span>
                            </button>
                            <button
                              onClick={() => resolveSOS(alert.id)}
                              className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition duration-200"
                            >
                              Resolve
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                      alert.status === 'active' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                    }`}>
                      {alert.status.toUpperCase()}
                    </div>
                  </div>
                ))}
                {sosAlerts.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No SOS alerts</p>
                )}
              </div>
            </div>
          )}

          {/* Announcements */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Create Announcement</h2>
                <form onSubmit={createAnnouncement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <textarea
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={newAnnouncement.type}
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="info">Information</option>
                      <option value="warning">Warning</option>
                      <option value="alert">Alert</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition duration-200"
                  >
                    Publish Announcement
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Announcements</h3>
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900">{announcement.title}</h4>
                          <p className="text-gray-600 mt-1">{announcement.content}</p>
                          <p className="text-sm text-gray-500 mt-2">
                            {new Date(announcement.created_at).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteAnnouncement(announcement.id)}
                          className="text-red-600 hover:text-red-800 transition duration-200"
                        >
                          Delete
                        </button>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                        announcement.type === 'warning' ? 'bg-orange-200 text-orange-800' :
                        announcement.type === 'alert' ? 'bg-red-200 text-red-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {announcement.type.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">User Management</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SOS Alerts
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' 
                              ? 'bg-purple-200 text-purple-800' 
                              : 'bg-green-200 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sosAlerts.filter(alert => alert.user_id === user.id).length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* User Requests */}
          {activeTab === 'requests' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">User Requests & Notifications</h2>
              <div className="space-y-4">
                {userRequests.map((request) => (
                  <div key={request.id} className={`p-4 rounded-lg border ${
                    request.status === 'pending' 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : request.status === 'approved'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-bold text-gray-900">{request.profiles?.email || 'Unknown User'}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            request.status === 'pending' 
                              ? 'bg-yellow-200 text-yellow-800'
                              : request.status === 'approved'
                              ? 'bg-green-200 text-green-800'
                              : 'bg-red-200 text-red-800'
                          }`}>
                            {request.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">{request.message}</p>
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>Type: <span className="font-medium capitalize">{request.type}</span></p>
                          <p>Submitted: {new Date(request.created_at).toLocaleString()}</p>
                          {request.resolved_at && (
                            <p>Resolved: {new Date(request.resolved_at).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      {request.status === 'pending' && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleUserRequest(request.id, 'approved')}
                            className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition duration-200"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleUserRequest(request.id, 'rejected')}
                            className="flex items-center space-x-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition duration-200"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {userRequests.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No user requests</p>
                )}
              </div>
            </div>
          )}

          {/* Analytics */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">System Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900">Total Users</h3>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{users.length}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-900">Active SOS Alerts</h3>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {sosAlerts.filter(a => a.status === 'active').length}
                  </p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900">Announcements</h3>
                  <p className="text-3xl font-bold text-green-600 mt-2">{announcements.length}</p>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-900">Pending Requests</h3>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {userRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900">Total Requests</h3>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{userRequests.length}</p>
                </div>
                <div className="bg-indigo-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-indigo-900">Resolved Today</h3>
                  <p className="text-3xl font-bold text-indigo-600 mt-2">
                    {userRequests.filter(r => 
                      r.status !== 'pending' && 
                      new Date(r.resolved_at).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-900">Marked Location SOS</h3>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {sosAlerts.filter(a => a.is_marked_location).length}
                  </p>
                </div>
                <div className="bg-teal-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-teal-900">Responded Alerts</h3>
                  <p className="text-3xl font-bold text-teal-600 mt-2">
                    {sosAlerts.filter(a => a.admin_response).length}
                  </p>
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

      {/* Admin Response Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-6 w-6 text-purple-600" />
              <h3 className="text-xl font-bold text-gray-900">Respond to SOS Alert</h3>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Responding to: <strong>{selectedAlert.user_email}</strong>
              </p>
              {selectedAlert.is_marked_location && (
                <p className="text-sm text-gray-600">
                  Marked Location: <strong>{selectedAlert.marked_location_name}</strong>
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Response
              </label>
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                rows="4"
                placeholder="Type your response to the user here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setSelectedAlert(null)
                  setAdminResponse('')
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => sendAdminResponse(selectedAlert.id)}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition duration-200"
                disabled={!adminResponse.trim()}
              >
                Send Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center gap-3">
                <MapPin className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">SOS Alert Location</h3>
                  {selectedAlertForMap && (
                    <p className="text-sm text-gray-600">
                      From: {selectedAlertForMap.user_email} • Status: {selectedAlertForMap.status}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition duration-200"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Location Details</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Latitude:</span> {mapLocation?.lat.toFixed(6)}</p>
                    <p><span className="font-medium">Longitude:</span> {mapLocation?.lng.toFixed(6)}</p>
                    {selectedAlertForMap?.is_marked_location && (
                      <>
                        <p><span className="font-medium">Marked Location:</span> {selectedAlertForMap.marked_location_name}</p>
                        {selectedAlertForMap.marked_location_description && (
                          <p><span className="font-medium">Description:</span> {selectedAlertForMap.marked_location_description}</p>
                        )}
                      </>
                    )}
                    <p><span className="font-medium">Alert Time:</span> {selectedAlertForMap ? new Date(selectedAlertForMap.created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Alert Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        selectedAlertForMap?.status === 'active' 
                          ? 'bg-red-200 text-red-800' 
                          : 'bg-green-200 text-green-800'
                      }`}>
                        {selectedAlertForMap?.status?.toUpperCase() || 'N/A'}
                      </span>
                    </p>
                    {selectedAlertForMap?.admin_response && (
                      <p><span className="font-medium">Admin Response:</span> {selectedAlertForMap.admin_response}</p>
                    )}
                    {selectedAlertForMap?.responded_at && (
                      <p><span className="font-medium">Responded At:</span> {new Date(selectedAlertForMap.responded_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="h-96 bg-gray-100 rounded-lg overflow-hidden">
                <div 
                  id="alert-map-container" 
                  className="w-full h-full"
                  style={{ minHeight: '384px' }}
                />
              </div>
              
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <span>SOS Alert Location</span>
                  </div>
                  {selectedAlertForMap?.is_marked_location && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      <span>Marked Location</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  <span>OpenStreetMap</span>
                </div>
              </div>
            </div>
            
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setShowMapModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard