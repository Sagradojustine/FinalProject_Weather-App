// services/notification.js
import { supabase } from './supabase'

class NotificationService {
  constructor() {
    this.channel = null
  }

  // Create notification for a user
  async createNotification(userId, notificationData) {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .insert([{
          user_id: userId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type || 'info',
          is_read: false,
          related_entity_type: notificationData.relatedEntityType,
          related_entity_id: notificationData.relatedEntityId,
          created_at: new Date().toISOString()
        }])
        .select()

      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Error creating notification:', error)
      return null
    }
  }

  // Create notification for all users (admin broadcast)
  async broadcastToAllUsers(notificationData) {
    try {
      // First, get all user IDs
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')

      if (usersError) throw usersError

      // Create notifications for each user
      const notifications = users.map(user => ({
        user_id: user.id,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        is_read: false,
        related_entity_type: notificationData.relatedEntityType,
        related_entity_id: notificationData.relatedEntityId,
        created_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('user_notifications')
        .insert(notifications)
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error broadcasting notification:', error)
      return []
    }
  }

  // Create admin notification
  async createAdminNotification(notificationData) {
    try {
      // Get all admin users
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (adminsError) throw adminsError

      // Create notifications for each admin
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        is_read: false,
        related_entity_type: notificationData.relatedEntityType,
        related_entity_id: notificationData.relatedEntityId,
        created_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('user_notifications')
        .insert(notifications)
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating admin notification:', error)
      return []
    }
  }

  // Get notifications for a user
  async getUserNotifications(userId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()

      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return null
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return []
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  // Get unread count
  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  // Subscribe to notifications
  subscribeToNotifications(userId, callback) {
    if (this.channel) {
      supabase.removeChannel(this.channel)
    }

    this.channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    return this.channel
  }

  // Unsubscribe from notifications
  unsubscribe() {
    if (this.channel) {
      supabase.removeChannel(this.channel)
      this.channel = null
    }
  }

  // Additional notification methods

  // Send announcement notification to all users
  // eslint-disable-next-line no-unused-vars
  async sendAnnouncementToAll(title, content, adminId) {
    try {
      // Get all user IDs
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
      
      if (usersError) throw usersError

      // Create notifications for each user
      const notifications = users.map(user => ({
        user_id: user.id,
        title: `📢 ${title}`,
        message: content,
        type: 'announcement',
        is_read: false,
        related_entity_type: 'announcement',
        created_at: new Date().toISOString()
      }))

      // Insert in batches of 50
      const batchSize = 50
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize)
        const { error } = await supabase
          .from('user_notifications')
          .insert(batch)
        
        if (error) throw error
      }

      return true
    } catch (error) {
      console.error('Error sending announcement notifications:', error)
      return false
    }
  }

  // Send weather alert notification
  async sendWeatherAlert(userId, alertData) {
    try {
      const notification = {
        user_id: userId,
        title: `🌩️ ${alertData.title}`,
        message: alertData.description,
        type: 'weather_alert',
        is_read: false,
        related_entity_type: 'weather_alert',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('user_notifications')
        .insert([notification])
        .select()

      if (error) throw error
      return data?.[0]
    } catch (error) {
      console.error('Error sending weather alert:', error)
      return null
    }
  }

  // Get notification statistics
  async getNotificationStats(userId) {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const stats = {
        total: data.length,
        unread: data.filter(n => !n.is_read).length,
        byType: {
          announcement: data.filter(n => n.type === 'announcement').length,
          sos_alert: data.filter(n => n.type === 'sos_alert').length,
          sos_response: data.filter(n => n.type === 'sos_response').length,
          weather_alert: data.filter(n => n.type === 'weather_alert').length
        },
        recent: data.slice(0, 5)
      }

      return stats
    } catch (error) {
      console.error('Error getting notification stats:', error)
      return null
    }
  }

  // Clear old notifications (older than 30 days)
  async clearOldNotifications(userId) {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', thirtyDaysAgo.toISOString())
        .eq('is_read', true)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error clearing old notifications:', error)
      return false
    }
  }
}

export const notificationService = new NotificationService()