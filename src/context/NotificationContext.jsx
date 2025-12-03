/* eslint-disable react-refresh/only-export-components */
// context/NotificationContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const activeSubscriptions = useRef([]);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const fetchNotifications = async (userId, userType = 'user') => {
    try {
      let data = [];
      let error = null;

      if (userType === 'admin') {
        // For admin, fetch notifications where:
        // 1. type is in ['admin_alert', 'system', 'sos_response']
        // OR 2. notifications sent specifically to this admin
        
        // First approach: Using raw SQL query for flexibility
        const { data: sqlData, error: sqlError } = await supabase
          .from('notifications')
          .select('*')
          .or(`type.in.(admin_alert,system,sos_response),metadata->>admin_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(50);

        data = sqlData;
        error = sqlError;

        // Fallback: If the above doesn't work, use two separate queries
        if (error) {
          // Get admin-specific notifications
          const { data: adminNotifications } = await supabase
            .from('notifications')
            .select('*')
            .in('type', ['admin_alert', 'system', 'sos_response'])
            .order('created_at', { ascending: false });

          // Get notifications specifically for this admin
          const { data: adminSpecific } = await supabase
            .from('notifications')
            .select('*')
            .contains('metadata', { admin_id: userId })
            .order('created_at', { ascending: false });

          // Combine and deduplicate
          const allNotifications = [...(adminNotifications || []), ...(adminSpecific || [])];
          const uniqueNotifications = Array.from(
            new Map(allNotifications.map(notif => [notif.id, notif])).values()
          );
          
          data = uniqueNotifications.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          ).slice(0, 50);
        }
      } else {
        // For regular users, fetch by user_id
        const { data: userData, error: userError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        data = userData;
        error = userError;
      }

      if (error) throw error;

      setNotifications(data || []);
      const unread = data?.filter(n => !n.is_read).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to basic admin query if there's an error
      if (userType === 'admin') {
        await fetchBasicAdminNotifications();
      }
    }
  };

  const fetchBasicAdminNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .in('type', ['admin_alert', 'system', 'sos_response'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching basic admin notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (userId, userType = 'user') => {
    try {
      let query = supabase
        .from('notifications')
        .update({ is_read: true });

      // For admin users, mark all admin alerts and system notifications
      if (userType === 'admin') {
        // Using raw SQL to handle the complex condition
        const { error } = await supabase.rpc('mark_admin_notifications_read');
        
        if (error) throw error;
      } else {
        // For regular users, mark by user_id
        const { error } = await query
          .eq('user_id', userId)
          .eq('is_read', false);

        if (error) throw error;
      }

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const sendNotification = async (notificationData) => {
    try {
      // If sending to admin, we need to handle it differently since admin doesn't have UUID
      if (notificationData.user_id && notificationData.user_id.startsWith('admin-')) {
        // Store admin ID in metadata instead of user_id
        const { data, error } = await supabase
          .from('notifications')
          .insert([{
            ...notificationData,
            user_id: null, // Don't set user_id for admin
            metadata: { admin_id: notificationData.user_id }
          }])
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      } else {
        // Regular user notification
        const { data, error } = await supabase
          .from('notifications')
          .insert([notificationData])
          .select()
          .single();

        if (error) throw error;
        return { success: true, data };
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  };

  const subscribeToNotifications = (userId, userType = 'user') => {
    if (!userId) return;

    // Clean up existing subscriptions
    activeSubscriptions.current.forEach(sub => {
      try {
        supabase.removeChannel(sub);
      } catch (e) {
        console.error('Error unsubscribing:', e);
      }
    });
    activeSubscriptions.current = [];

    // Admin subscription
    if (userType === 'admin') {
      const adminSubscription = supabase
        .channel(`admin_notifications_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `type=in.(admin_alert,system,sos_response)`
          },
          (payload) => {
            const newNotification = payload.new;
            addNotification(newNotification);
            showBrowserNotification(newNotification);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Admin notification subscription active');
          }
        });

      // Subscribe to SOS alerts
      const sosSubscription = supabase
        .channel(`sos_alerts_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sos_alerts'
          },
          async (payload) => {
            const sosAlert = payload.new;
            
            // Get user email
            const { data: userData } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', sosAlert.user_id)
              .single();

            // Create admin notification
            await sendNotification({
              user_id: userId,
              title: '🚨 New SOS Alert',
              message: `New emergency SOS from ${userData?.email || 'Unknown User'}`,
              type: 'admin_alert',
              is_read: false,
              related_entity_type: 'sos_alert',
              related_entity_id: sosAlert.id
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('SOS alert subscription active');
          }
        });

      activeSubscriptions.current = [adminSubscription, sosSubscription];
    } else {
      // Regular user subscription
      const subscription = supabase
        .channel(`user_notifications_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const newNotification = payload.new;
            addNotification(newNotification);
            showBrowserNotification(newNotification);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('User notification subscription active');
          }
        });

      activeSubscriptions.current = [subscription];
    }

    // Cleanup function
    return () => {
      activeSubscriptions.current.forEach(sub => {
        try {
          supabase.removeChannel(sub);
        } catch (e) {
          console.error('Error unsubscribing:', e);
        }
      });
      activeSubscriptions.current = [];
    };
  };

  const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title || 'New Notification', {
          body: notification.message || '',
          icon: '/sos-icon.png',
          tag: notification.id
        });
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  };

  const clearAllNotifications = async (userId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup on unmount
    return () => {
      activeSubscriptions.current.forEach(sub => {
        try {
          supabase.removeChannel(sub);
        } catch (e) {
          console.error('Error unsubscribing on cleanup:', e);
        }
      });
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      sendNotification,
      subscribeToNotifications,
      clearAllNotifications,
      addNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};