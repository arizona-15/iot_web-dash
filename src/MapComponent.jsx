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
  const position1 = [2.345570, 99.068080]; 
  const position2 = [2.346837, 99.044691]; 
  
  const centerPosition = [2.3462035, 99.0563855];

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
          {/* Layer Peta (OpenStreetMap) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marker 1 */}
          <Marker position={position1}>
            <Popup>
              <b>Node 1</b><br />Lumban Silintong.
            </Popup>
          </Marker>

          {/* Marker 2: titik ke-2 */}
          <Marker position={position2}>
            <Popup>
              <b>Node 2</b><br />Lumban Bul-bul.
            </Popup>
          </Marker>

        </MapContainer>
      </div>
    </div>
  );
};

export default MapComponent;