import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapComponent = () => {
  const position1 = [2.378355, 99.116135]; 
  const position2 = [2.379148, 99.124579]; 
  
  const centerPosition = [2.3787515, 99.120357];

  return (
    <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col">
      <h3 className="text-gray-800 font-bold mb-4 ml-2">Location (GPS)</h3>
      
      {/* Container Peta */}
      <div className="flex-1 w-full rounded-2xl overflow-hidden relative z-0" style={{ height: '300px' }}>
        <MapContainer 
            center={centerPosition} 
            zoom={14} 
            scrollWheelZoom={false} 
            style={{ height: '100%', width: '100%' }}
        >
          {/* Layer Peta (OpenStreetMap - Tampilan mirip Google Maps) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marker 1: Pantai Hatulian */}
          <Marker position={position1}>
            <Popup>
              <b>Node 1</b><br />Hatulian Beach.
            </Popup>
          </Marker>

          {/* Marker 2: Pantai Pardinggaran */}
          <Marker position={position2}>
            <Popup>
              <b>Node 2</b><br />Pardinggaran Beach.
            </Popup>
          </Marker>

        </MapContainer>
      </div>
    </div>
  );
};

export default MapComponent;