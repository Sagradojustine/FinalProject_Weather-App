// services/sosService.js
import { supabase } from './supabase';

export const sosService = {
  // Send SOS alert
  async sendSOS(userId, userEmail, latitude, longitude, markedLocation = null) {
    try {
      const sosData = {
        user_id: userId,
        user_email: userEmail,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        status: 'active',
        is_marked_location: !!markedLocation,
        marked_location_name: markedLocation?.name || null,
        marked_location_description: markedLocation?.description || null
      };

      const { data, error } = await supabase
        .from('sos_alerts')
        .insert(sosData)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error sending SOS:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all SOS alerts for admin
  async getSOSAlerts(status = null) {
    try {
      let query = supabase
        .from('sos_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching SOS alerts:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user's SOS alerts
  async getUserSOSAlerts(userId) {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching user SOS alerts:', error);
      return { success: false, error: error.message };
    }
  },

  // Admin responds to SOS
  async respondToSOS(alertId, adminId, response) {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .update({
          admin_response: response,
          admin_id: adminId,
          responded_at: new Date().toISOString(),
          status: 'responded'
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error responding to SOS:', error);
      return { success: false, error: error.message };
    }
  },

  // Resolve SOS
  async resolveSOS(alertId) {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error resolving SOS:', error);
      return { success: false, error: error.message };
    }
  },

  // Get SOS statistics
  async getSOSStats() {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('status, created_at');

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter(alert => alert.status === 'active').length,
        responded: data.filter(alert => alert.status === 'responded').length,
        resolved: data.filter(alert => alert.status === 'resolved').length,
        today: data.filter(alert => {
          const today = new Date().toDateString();
          const alertDate = new Date(alert.created_at).toDateString();
          return today === alertDate;
        }).length,
        marked_location: data.filter(alert => alert.is_marked_location).length
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching SOS stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Subscribe to SOS alerts in real-time
  subscribeToSOSAlerts(callback) {
    return supabase
      .channel('sos_alerts_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sos_alerts'
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  },

  // Subscribe to user's SOS alerts
  subscribeToUserSOSAlerts(userId, callback) {
    return supabase
      .channel(`user_sos_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sos_alerts',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  }
};