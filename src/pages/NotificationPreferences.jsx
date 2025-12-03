/* eslint-disable react-hooks/exhaustive-deps */
// components/NotificationPreferences.jsx
import React, { useState, useEffect } from 'react'
import { Bell, BellOff, Mail, Shield } from 'lucide-react'
import { supabase } from '../services/supabase'

function NotificationPreferences({ userId }) {
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    sos_alerts: true,
    weather_alerts: true,
    announcements: true,
    quiet_hours: { start: '22:00', end: '08:00', enabled: false }
  })

  useEffect(() => {
    fetchPreferences()
  }, [userId])

  const fetchPreferences = async () => {
    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
      // If user doesn't have preferences yet, create default ones
      if (error.code === 'PGRST116') {
        await createDefaultPreferences()
      }
    }
  }

  const createDefaultPreferences = async () => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: userId,
          preferences,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error creating default preferences:', error)
    }
  }

  const savePreferences = async () => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          preferences,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error
      alert('Preferences saved successfully!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Failed to save preferences')
    }
  }

  const testNotification = async () => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          title: '🔔 Test Notification',
          message: 'This is a test notification to verify your settings',
          type: 'system',
          is_read: false
        })

      if (error) throw error
      alert('Test notification sent! Check your notification center.')
    } catch (error) {
      console.error('Error sending test notification:', error)
      alert('Failed to send test notification')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6 text-blue-600" />
        <h3 className="text-xl font-bold text-gray-900">Notification Preferences</h3>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">Email Notifications</h4>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.email_notifications}
              onChange={(e) => setPreferences({
                ...preferences,
                email_notifications: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">Push Notifications</h4>
              <p className="text-sm text-gray-600">Browser push notifications</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.push_notifications}
              onChange={(e) => {
                if (e.target.checked && 'Notification' in window) {
                  Notification.requestPermission().then(permission => {
                    if (permission !== 'granted') {
                      setPreferences({
                        ...preferences,
                        push_notifications: false
                      })
                    }
                  })
                }
                setPreferences({
                  ...preferences,
                  push_notifications: e.target.checked
                })
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* SOS Alerts */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-red-600" />
            <div>
              <h4 className="font-medium text-gray-900">SOS Alerts</h4>
              <p className="text-sm text-gray-600">Emergency and response notifications</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.sos_alerts}
              onChange={(e) => setPreferences({
                ...preferences,
                sos_alerts: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Quiet Hours */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BellOff className="h-5 w-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Quiet Hours</h4>
                <p className="text-sm text-gray-600">Pause notifications during specific hours</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.quiet_hours.enabled}
                onChange={(e) => setPreferences({
                  ...preferences,
                  quiet_hours: {
                    ...preferences.quiet_hours,
                    enabled: e.target.checked
                  }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {preferences.quiet_hours.enabled && (
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm text-gray-600">Start Time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours.start}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    quiet_hours: {
                      ...preferences.quiet_hours,
                      start: e.target.value
                    }
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">End Time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours.end}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    quiet_hours: {
                      ...preferences.quiet_hours,
                      end: e.target.value
                    }
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={savePreferences}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Save Preferences
          </button>
          <button
            onClick={testNotification}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Send Test Notification
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationPreferences