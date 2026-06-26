'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { WeatherData } from '../utils/weather';

// Senior React pattern: Helper component to handle center changes dynamically
function ChangeMapView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 10);
  }, [center, map]);
  return null;
}

interface WeatherMapProps {
  latitude: number;
  longitude: number;
  cityName: string;
  weatherData: WeatherData;
}

export default function WeatherMap({ latitude, longitude, cityName, weatherData }: WeatherMapProps) {
  const centerPosition: [number, number] = [latitude, longitude];
  const temp = Math.round(weatherData.current.temperature_2m);
  
  // Custom Leaflet DivIcon: Renders temperature directly on the map marker
  const customIcon = L.divIcon({
    html: `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        background: var(--color-blue-800); 
        color: white; 
        border: 2px solid var(--color-yellow-500); 
        border-radius: 12px; 
        padding: 4px 8px; 
        font-weight: 700; 
        font-size: 12px; 
        white-space: nowrap; 
        box-shadow: 0 4px 12px rgba(31, 38, 135, 0.25);
      ">
        <span style="color: var(--color-yellow-500); font-size: 10px; margin-right: 3px;">●</span>
        <span>${cityName}: ${temp}°C</span>
      </div>
    `,
    className: 'custom-weather-marker',
    iconSize: [120, 24],
    iconAnchor: [60, 12],
  });

  return (
    <div style={{ height: '100%', width: '100%', minHeight: '380px' }}>
      <MapContainer
        center={centerPosition}
        zoom={10}
        scrollWheelZoom={true}
        className="leaflet-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={centerPosition} icon={customIcon}>
          <Popup className="custom-map-popup">
            <div style={{ padding: '4px' }}>
              <h4 style={{ fontWeight: 700, color: 'var(--color-blue-800)', marginBottom: '4px' }}>
                {cityName}
              </h4>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Temp: <strong>{weatherData.current.temperature_2m}°C</strong>
              </p>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Feels Like: <strong>{weatherData.current.apparent_temperature}°C</strong>
              </p>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Humidity: <strong>{weatherData.current.relative_humidity_2m}%</strong>
              </p>
              <p style={{ fontSize: '13px', margin: 0 }}>
                Wind Speed: <strong>{weatherData.current.wind_speed_10m} km/h</strong>
              </p>
            </div>
          </Popup>
        </Marker>
        <ChangeMapView center={centerPosition} />
      </MapContainer>
    </div>
  );
}
