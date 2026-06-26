'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudFog, 
  Search, 
  Compass, 
  Wind, 
  Droplets, 
  Thermometer, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { 
  searchLocations, 
  fetchWeather, 
  parseWeatherCode,
  generateTraceId
} from '../utils/weather';
import type { 
  GeocodingResult, 
  WeatherData 
} from '../utils/weather';

// Standard component to render map load placeholder
function MapLoading() {
  return (
    <div className="map-placeholder" style={{ 
      height: '380px', 
      background: 'var(--color-blue-50)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      borderRadius: 'var(--radius-md)' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-blue-500)' }}>
        <RefreshCw className="animate-spin" size={20} />
        <span style={{ fontWeight: 600 }}>Initializing Interactive Map...</span>
      </div>
    </div>
  );
}

// Dynamically load Map component to bypass SSR reference error on 'window'
const WeatherMap = dynamic(() => import('./WeatherMap'), {
  ssr: false,
  loading: MapLoading,
});

// Default Location: Kyoto, Japan (Warm, historic, natural vibes)
const DEFAULT_LOCATION: GeocodingResult = {
  id: 1857910,
  name: 'Kyoto',
  latitude: 35.0116,
  longitude: 135.7681,
  country: 'Japan',
  admin1: 'Kyoto Prefecture'
};

// Map custom icon strings to Lucide Icon elements
const WeatherIconMap = {
  Sun: Sun,
  CloudSun: CloudSun,
  Cloud: Cloud,
  CloudRain: CloudRain,
  CloudSnow: CloudSnow,
  CloudLightning: CloudLightning,
  CloudFog: CloudFog
};

export default function WeatherDashboard() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [location, setLocation] = useState<GeocodingResult>(DEFAULT_LOCATION);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // Core weather fetch operation
  const loadWeatherData = async (loc: GeocodingResult) => {
    setLoading(true);
    setError(null);
    const traceId = generateTraceId();
    try {
      const data = await fetchWeather(loc.latitude, loc.longitude, { traceId });
      setWeather(data);
    } catch (err) {
      console.error(`[TraceID: ${traceId}] Failed to load weather data:`, err);
      setError('Could not fetch weather data. Please check your network connection or try again.');
    } finally {
      setLoading(false);
    }
  };

  // Run on initial mount: attempt browser geolocation, fallback to Kyoto
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          const userLocation: GeocodingResult = {
            id: Date.now(),
            name: 'My Location',
            latitude: lat,
            longitude: lon,
            country: 'Detected',
            admin1: ''
          };
          
          setLocation(userLocation);
          loadWeatherData(userLocation);
        },
        (err) => {
          console.warn('Geolocation access denied/failed, falling back to Kyoto:', err);
          loadWeatherData(location);
        }
      );
    } else {
      loadWeatherData(location);
    }
  }, []);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    const traceId = generateTraceId();
    try {
      const results = await searchLocations(query, { traceId });
      setSearchResults(results);
      if (results.length === 0) {
        setError(`No locations found matching "${query}"`);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error(`[TraceID: ${traceId}] Search failed:`, err);
      setError('Failed to search locations. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Location selection handler
  const selectLocation = (loc: GeocodingResult) => {
    setLocation(loc);
    setSearchResults([]);
    setQuery('');
    loadWeatherData(loc);
  };

  // Autocomplete debouncing: search automatically after typing 3+ characters
  useEffect(() => {
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    let active = true;

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      setError(null);
      const traceId = generateTraceId();
      try {
        const results = await searchLocations(query, { traceId });
        if (active) {
          setSearchResults(results);
          if (results.length === 0) {
            setError(`No locations found matching "${query}"`);
          }
        }
      } catch (err) {
        if (active) {
          console.error(`[TraceID: ${traceId}] Autocomplete search failed:`, err);
          setError('Failed to search locations. Please try again.');
        }
      } finally {
        if (active) {
          setSearching(false);
        }
      }
    }, 400); // 400ms delay to prevent rate-limiting blocks

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [query]);

  // Weather variables
  const weatherDetails = weather ? parseWeatherCode(weather.current.weather_code) : null;
  const ActiveIcon = weatherDetails ? WeatherIconMap[weatherDetails.icon] : Cloud;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      
      {/* Header Panel */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-blue-800)', fontWeight: 800 }}>
            Hale & Earth
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            A premium, warm, and resilient weather exploration dashboard.
          </p>
        </div>
        
        {/* Search Bar Container */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', position: 'relative', width: '380px', maxWidth: '100%' }}>
          <div style={{ flexGrow: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search cities (e.g., Rome, Tokyo)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '40px' }}
            />
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-secondary)' 
              }} 
            />
          </div>
          <button type="submit" className="btn-primary" disabled={searching}>
            {searching ? <RefreshCw className="animate-spin" size={18} /> : 'Search'}
          </button>

          {/* Search Suggestion Dropdown */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid var(--color-blue-100)',
              zIndex: 999,
              marginTop: '6px',
              overflow: 'hidden'
            }}>
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => selectLocation(result)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-blue-50)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <strong style={{ color: 'var(--color-blue-800)' }}>{result.name}</strong>
                  {result.admin1 ? `, ${result.admin1}` : ''}
                  {result.country ? ` (${result.country})` : ''}
                </button>
              ))}
            </div>
          )}
        </form>
      </header>

      {/* Error Message Boundary */}
      {error && (
        <div className="glass-panel" style={{ 
          padding: '16px 24px', 
          marginBottom: '24px', 
          borderColor: 'var(--color-yellow-500)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(254, 243, 199, 0.4)'
        }}>
          <AlertTriangle size={20} style={{ color: 'var(--color-yellow-600)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Main Grid Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(12, 1fr)', 
        gap: '24px' 
      }}>
        
        {/* Left Side: Current Weather Details (4 Columns) */}
        <section className="glass-panel" style={{ 
          gridColumn: 'span 4', 
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '450px'
        }}>
          {loading ? (
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--color-blue-500)' }} />
              <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Updating Forecast...</p>
            </div>
          ) : weather && weatherDetails ? (
            <>
              {/* Location and Main Weather Condition */}
              <div>
                <span style={{ 
                  backgroundColor: 'var(--color-yellow-100)', 
                  color: 'var(--color-yellow-600)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  letterSpacing: '0.05em',
                  display: 'inline-block',
                  marginBottom: '16px'
                }}>
                  Current Forecast
                </span>
                
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-blue-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={24} style={{ color: 'var(--color-blue-500)' }} />
                  {location.name}
                </h2>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                  {location.admin1 ? `${location.admin1}, ` : ''}{location.country}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-yellow-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-yellow-600)',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
                  }}>
                    <ActiveIcon size={32} />
                  </div>
                  <div>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-blue-800)', lineHeight: 1 }}>
                      {Math.round(weather.current.temperature_2m)}°C
                    </span>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem', marginTop: '4px' }}>
                      {weatherDetails.label}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid of Weather Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                
                <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Thermometer size={20} style={{ color: 'var(--color-blue-500)' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Feels Like</span>
                    <strong style={{ fontSize: '14px' }}>{Math.round(weather.current.apparent_temperature)}°C</strong>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Droplets size={20} style={{ color: 'var(--color-blue-500)' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Humidity</span>
                    <strong style={{ fontSize: '14px' }}>{weather.current.relative_humidity_2m}%</strong>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', gridColumn: 'span 2' }}>
                  <Wind size={20} style={{ color: 'var(--color-blue-500)' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Wind Speed</span>
                    <strong style={{ fontSize: '14px' }}>{weather.current.wind_speed_10m} km/h</strong>
                  </div>
                </div>
                
              </div>
            </>
          ) : (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>No weather data loaded.</p>
            </div>
          )}
        </section>

        {/* Right Side: Leaflet Map (8 Columns) */}
        <section className="glass-panel" style={{ 
          gridColumn: 'span 8', 
          padding: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '450px'
        }}>
          {weather ? (
            <WeatherMap 
              latitude={location.latitude} 
              longitude={location.longitude} 
              cityName={location.name}
              weatherData={weather}
            />
          ) : (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-blue-50)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--color-blue-500)', fontWeight: 600 }}>Map coordinates pending...</p>
            </div>
          )}
        </section>
        
      </div>
    </div>
  );
}
