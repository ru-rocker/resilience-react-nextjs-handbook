import { z } from 'zod';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import pLimit from 'p-limit';

// Geocoding Schema for validating locations
export const GeocodingResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional(),
  admin1: z.string().optional(),
});

export const GeocodingResponseSchema = z.object({
  results: z.array(GeocodingResultSchema).optional(),
});

// Weather API response schemas
export const CurrentWeatherSchema = z.object({
  temperature_2m: z.number(),
  relative_humidity_2m: z.number(),
  apparent_temperature: z.number(),
  is_day: z.union([z.literal(0), z.literal(1)]),
  precipitation: z.number(),
  rain: z.number(),
  showers: z.number(),
  snowfall: z.number(),
  weather_code: z.number(),
  wind_speed_10m: z.number(),
});

export const WeatherResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  current: CurrentWeatherSchema,
});

export type GeocodingResult = z.infer<typeof GeocodingResultSchema>;
export type WeatherData = z.infer<typeof WeatherResponseSchema>;

// Map WMO Weather Codes to labels and icon names
export function parseWeatherCode(code: number): {
  label: string;
  icon: 'Sun' | 'CloudSun' | 'Cloud' | 'CloudRain' | 'CloudSnow' | 'CloudLightning' | 'CloudFog';
} {
  if (code === 0) return { label: 'Clear Sky', icon: 'Sun' };
  if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', icon: 'CloudSun' };
  if (code === 45 || code === 48) return { label: 'Foggy', icon: 'CloudFog' };
  if ((code >= 51 && code <= 55) || (code >= 80 && code <= 82)) return { label: 'Drizzle / Showers', icon: 'CloudRain' };
  if (code >= 61 && code <= 65) return { label: 'Rainy', icon: 'CloudRain' };
  if (code >= 71 && code <= 77) return { label: 'Snowy', icon: 'CloudSnow' };
  if (code >= 95 && code <= 99) return { label: 'Thunderstorm', icon: 'CloudLightning' };

  return { label: 'Cloudy', icon: 'Cloud' };
}

// Local client-side Trace ID generator for log correlation
export function generateTraceId(): string {
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Math fallback for environment compatibilities
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Create a dedicated Axios instance for Nominatim Geocoding API
const nominatimClient = axios.create({
  baseURL: 'https://nominatim.openstreetmap.org',
  headers: {
    'User-Agent': 'ResilientWeatherMapDashboard/1.0',
  },
  timeout: 5000,
});

// Configure Axios Retry on the Nominatim client
axiosRetry(nominatimClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Only retry on network errors or transient 5xx server errors
    // Skip retrying if aborted (axios sets error.code to 'ERR_CANCELED')
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      return false;
    }
    const status = error.response?.status;
    return !status || status >= 500;
  },
});

// Create a concurrency limiter (bulkhead) for geocoding
// OS Nominatim requests a limit of 1 request per second or strictly throttled concurrency
const geocodeLimit = pLimit(2);

// Shared fetchWithRetry utility for resilience (retained for fetchWeather)
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config: {
    retries?: number;
    delay?: number;
    backoff?: number;
  } = {}
): Promise<Response> {
  const { retries = 3, delay = 300, backoff = 2 } = config;
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url, options);

      // Only retry on transient server-side errors (5xx)
      const isTransientError = !response.ok && response.status >= 500;

      if (!isTransientError || attempt >= retries) {
        return response;
      }

      const currentDelay = delay * Math.pow(backoff, attempt);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      attempt++;
    } catch (error: any) {
      // Do NOT retry if request was explicitly aborted
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      if (attempt >= retries) {
        throw error;
      }

      const currentDelay = delay * Math.pow(backoff, attempt);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      attempt++;
    }
  }
}

// Search locations using OpenStreetMap Nominatim Geocoding API for neighborhood-level details
export async function searchLocations(
  query: string,
  options?: RequestInit & { traceId?: string }
): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];

  const { traceId, signal } = options || {};

  // Wrap the call in geocodeLimit to enforce the concurrency bulkhead
  return geocodeLimit(async () => {
    try {
      const response = await nominatimClient.get('/search', {
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1,
        },
        signal: signal || undefined, // Forward the AbortSignal
      });

      const NominatimResponseSchema = z.array(z.object({
        place_id: z.number(),
        display_name: z.string(),
        lat: z.string(),
        lon: z.string(),
        address: z.object({
          suburb: z.string().optional(),
          city: z.string().optional(),
          county: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
        }).optional(),
      }));

      const parsed = NominatimResponseSchema.parse(response.data);

      // Adapt to GeocodingResult format expected by the frontend
      return parsed.map((item) => {
        const addr = item.address;
        const resolvedName = addr?.suburb || addr?.city || addr?.county || item.display_name.split(',')[0];
        return {
          id: item.place_id,
          name: resolvedName,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          country: addr?.country || '',
          admin1: addr?.state || ''
        };
      });
    } catch (error) {
      if (axios.isCancel(error)) {
        // Do not log user cancellations
        return [];
      }
      console.error(`[TraceID: ${traceId || 'N/A'}] Failed to geocode location:`, error);
      return [];
    }
  });
}

// Fetch weather details by coordinates
export async function fetchWeather(
  lat: number,
  lon: number,
  options?: RequestInit & { traceId?: string }
): Promise<WeatherData> {
  const { traceId, ...fetchOptions } = options || {};
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&timezone=auto`;

  const res = await fetchWithRetry(url, fetchOptions);
  if (!res.ok) throw new Error('Weather service unavailable');

  const data = await res.json();
  return WeatherResponseSchema.parse(data);
}
