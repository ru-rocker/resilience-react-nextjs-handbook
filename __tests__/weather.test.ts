import { parseWeatherCode, searchLocations, fetchWeather, fetchWithRetry } from '../app/utils/weather';
import { ZodError } from 'zod';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Axios
const mockAxiosGet = jest.fn();
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  const mockInstance = {
    get: (...args: any[]) => mockAxiosGet(...args),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: {
      adapter: jest.fn(),
    },
  };
  return {
    ...actualAxios,
    create: jest.fn(() => mockInstance),
  };
});

describe('Weather Utility Tests', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockAxiosGet.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('parseWeatherCode', () => {
    it('should map WMO code 0 to Clear Sky and Sun icon', () => {
      const result = parseWeatherCode(0);
      expect(result).toEqual({ label: 'Clear Sky', icon: 'Sun' });
    });

    it('should map WMO code 2 to Partly Cloudy and CloudSun icon', () => {
      const result = parseWeatherCode(2);
      expect(result).toEqual({ label: 'Partly Cloudy', icon: 'CloudSun' });
    });

    it('should map WMO code 45 to Foggy and CloudFog icon', () => {
      const result = parseWeatherCode(45);
      expect(result).toEqual({ label: 'Foggy', icon: 'CloudFog' });
    });

    it('should map WMO code 63 to Rainy and CloudRain icon', () => {
      const result = parseWeatherCode(63);
      expect(result).toEqual({ label: 'Rainy', icon: 'CloudRain' });
    });

    it('should map WMO code 95 to Thunderstorm and CloudLightning icon', () => {
      const result = parseWeatherCode(95);
      expect(result).toEqual({ label: 'Thunderstorm', icon: 'CloudLightning' });
    });

    it('should fall back to Cloudy default for unknown codes', () => {
      const result = parseWeatherCode(9999);
      expect(result).toEqual({ label: 'Cloudy', icon: 'Cloud' });
    });
  });

  describe('searchLocations', () => {
    it('should fetch and validate valid location results', async () => {
      const mockResult = [
        {
          place_id: 1,
          display_name: 'Kyoto, Japan',
          lat: '35.0',
          lon: '135.0',
          address: {
            city: 'Kyoto',
            state: 'Kyoto Prefecture',
            country: 'Japan'
          }
        }
      ];

      mockAxiosGet.mockResolvedValueOnce({
        data: mockResult,
      });

      const results = await searchLocations('Kyoto');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Kyoto');
      expect(results[0].latitude).toBe(35.0);
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    });

    it('should return an empty list if search query is too short', async () => {
      const results = await searchLocations('K');
      expect(results).toHaveLength(0);
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it('should return empty list and log error on schema validation failure', async () => {
      const malformedResult = [
        {
          place_id: 'not-a-number', // Zod type violation
          display_name: 'Broken Location',
          lat: '35.0',
          lon: '135.0'
        }
      ];

      mockAxiosGet.mockResolvedValueOnce({
        data: malformedResult,
      });

      const results = await searchLocations('Broken');
      expect(results).toHaveLength(0);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle API network failures gracefully', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('Network error or transient failure'));

      const results = await searchLocations('Kyoto');
      expect(results).toHaveLength(0);
      expect(console.error).toHaveBeenCalled();
    });

    it('should respect the concurrency limit of 2 requests', async () => {
      let activeCount = 0;
      let maxActiveCount = 0;

      mockAxiosGet.mockImplementation(async () => {
        activeCount++;
        maxActiveCount = Math.max(maxActiveCount, activeCount);
        // Delay to simulate in-flight requests
        await new Promise((resolve) => setTimeout(resolve, 30));
        activeCount--;
        return { data: [] };
      });

      // Fire 3 requests in parallel
      await Promise.all([
        searchLocations('Kyoto1'),
        searchLocations('Kyoto2'),
        searchLocations('Kyoto3')
      ]);

      expect(maxActiveCount).toBeLessThanOrEqual(2);
    });
  });

  describe('fetchWeather', () => {
    const validWeatherResponse = {
      latitude: 35.0,
      longitude: 135.0,
      timezone: 'Asia/Tokyo',
      current: {
        temperature_2m: 22.5,
        relative_humidity_2m: 60,
        apparent_temperature: 21.0,
        is_day: 1,
        precipitation: 0.0,
        rain: 0.0,
        showers: 0.0,
        snowfall: 0.0,
        weather_code: 0,
        wind_speed_10m: 10.5
      }
    };

    it('should fetch and validate weather data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => validWeatherResponse,
      });

      const data = await fetchWeather(35.0, 135.0);
      expect(data.current.temperature_2m).toBe(22.5);
      expect(data.current.weather_code).toBe(0);
    });

    it('should fail validation and throw error on malformed weather response', async () => {
      const invalidWeatherResponse = {
        latitude: 35.0,
        longitude: 135.0,
        timezone: 'Asia/Tokyo',
        current: {
          temperature_2m: 'invalid-string-temp', // Zod validation failure
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidWeatherResponse,
      });

      await expect(fetchWeather(35.0, 135.0)).rejects.toThrow(ZodError);
    });

    it('should throw error on connection/HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(fetchWeather(35.0, 135.0)).rejects.toThrow('Weather service unavailable');
    });
  });

  describe('fetchWithRetry', () => {
    it('should resolve immediately if response is ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const response = await fetchWithRetry('https://example.com');
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient server errors (>= 500) and eventually succeed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const response = await fetchWithRetry('https://example.com', undefined, {
        delay: 5,
        retries: 2,
      });
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on client errors (4xx) and return immediately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const response = await fetchWithRetry('https://example.com', undefined, {
        delay: 5,
        retries: 2,
      });
      expect(response.status).toBe(404);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fail after exhausting all retries', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const response = await fetchWithRetry('https://example.com', undefined, {
        delay: 5,
        retries: 3,
      });
      expect(response.status).toBe(500);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should throw immediately and not retry if request is aborted', async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(
        fetchWithRetry('https://example.com', undefined, { delay: 5, retries: 3 })
      ).rejects.toThrow('The user aborted a request.');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
