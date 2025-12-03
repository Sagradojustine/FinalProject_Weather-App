/* eslint-disable no-unused-vars */
// components/RealTimeSOSMap.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { sosService } from '../services/sos';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RealTimeSOSMap = ({ isAdmin = false }) => {
  const [sosAlerts, setSOSAlerts] = useState([]);
  const [center, setCenter] = useState([40.7128, -74.0060]); // Default to NYC

  useEffect(() => {
    

    // Subscribe to real-time updates
    const unsubscribe = sosService.subscribeToSOSAlerts((payload) => {
      if (payload.eventType === 'INSERT') {
        setSOSAlerts(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setSOSAlerts(prev =>
          prev.map(alert =>
            alert.id === payload.new.id ? payload.new : alert
          )
        );
      } else if (payload.eventType === 'DELETE') {
        setSOSAlerts(prev =>
          prev.filter(alert => alert.id !== payload.old.id)
        );
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchSOSAlerts = async () => {
    const result = await sosService.getSOSAlerts('active');
    if (result.success) {
      setSOSAlerts(result.data);
    }
  };

  // Custom icons
  const activeSOSIcon = L.divIcon({
    html: `<div class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></div>
           <div class="relative inline-flex rounded-full h-6 w-6 bg-red-600 text-white items-center justify-center">
             <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
             </svg>
           </div>`,
    className: 'relative flex items-center justify-center',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const respondedSOSIcon = L.divIcon({
    html: `<div class="relative inline-flex rounded-full h-6 w-6 bg-blue-600 text-white items-center justify-center">
             <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>`,
    className: 'flex items-center justify-center',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  return (
    <div className="rounded-lg overflow-hidden shadow-lg h-[500px]">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {sosAlerts.map((alert) => (
          <React.Fragment key={alert.id}>
            <Marker
              position={[alert.latitude, alert.longitude]}
              icon={alert.status === 'active' ? activeSOSIcon : respondedSOSIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg mb-2">
                    {alert.status === 'active' ? '🚨 SOS Alert' : '✅ Responded SOS'}
                  </h3>
                  <p><strong>User:</strong> {alert.user_email}</p>
                  <p><strong>Time:</strong> {new Date(alert.created_at).toLocaleString()}</p>
                  <p><strong>Status:</strong> {alert.status}</p>
                  {alert.is_marked_location && (
                    <p><strong>Marked Location:</strong> {alert.marked_location_name}</p>
                  )}
                  {alert.admin_response && (
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-sm"><strong>Response:</strong> {alert.admin_response}</p>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
            
            {/* Add radius circle for active alerts */}
            {alert.status === 'active' && (
              <Circle
                center={[alert.latitude, alert.longitude]}
                radius={500} // 500 meters
                pathOptions={{
                  fillColor: '#ef4444',
                  color: '#dc2626',
                  fillOpacity: 0.2
                }}
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>
      
      <div className="bg-white p-3 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
              <span className="text-sm">Active SOS: {sosAlerts.filter(a => a.status === 'active').length}</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
              <span className="text-sm">Responded: {sosAlerts.filter(a => a.status === 'responded').length}</span>
            </div>
          </div>
          <button
            onClick={fetchSOSAlerts}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealTimeSOSMap;