/* eslint-disable react-hooks/immutability */
// components/NotificationCenter.jsx
import React, { useState } from 'react'
import { Bell, X, Check, AlertTriangle, MessageSquare, Info } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'

function NotificationCenter({ userId, userType = 'user' }) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  } = useNotifications()

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'admin_alert':
      case 'sos_alert':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'sos_response':
        return <MessageSquare className="h-5 w-5 text-green-500" />
      case 'announcement':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'admin_alert':
      case 'sos_alert':
        return 'bg-red-50 border-red-200'
      case 'sos_response':
        return 'bg-green-50 border-green-200'
      case 'announcement':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    // Handle navigation based on notification type
    switch (notification.related_entity_type) {
      case 'sos_alert':
        if (userType === 'admin') {
          window.location.href = `/admin/sos-alerts?id=${notification.related_entity_id}`
        }
        break
      case 'announcement':
        window.location.href = '/announcements'
        break
      default:
        break
    }
  }

  const handleOpenNotifications = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      fetchNotifications(userId, userType)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpenNotifications}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">
                {userType === 'admin' ? 'Admin Notifications' : 'Notifications'}
              </h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead(userId, userType)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${
                    !notification.is_read ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'
                  } ${getNotificationColor(notification.type)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {userType === 'admin' ? 'No admin notifications' : 'No notifications'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationCenter