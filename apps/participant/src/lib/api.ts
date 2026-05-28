declare const process: any;
import { getAuthHeaders } from './supabase';

// EXPO_PUBLIC_API_URL defaults to localhost (or 10.0.2.2 for Android emulator)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001/api';

/** Check basic network connectivity before making requests */
async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(`${BASE_URL}/../api/health`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

class NetworkError extends Error {
  isNetworkError = true;
  constructor(message: string = 'No internet connection. Please check your network.') {
    super(message);
    this.name = 'NetworkError';
  }
}

async function apiRequest(method: string, endpoint: string, body?: any) {
  const authHeaders = await getAuthHeaders();

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.error || `API request failed with status ${response.status}`);
    }

    // Backend returns consistent JSON: { success: true, data: {} }
    return json.success ? json.data : json;
  } catch (err: any) {
    // Detect network failures (no response received at all)
    if (
      err.name === 'TypeError' && (
        err.message?.includes('Network request failed') ||
        err.message?.includes('Failed to fetch')
      )
    ) {
      throw new NetworkError();
    }
    console.error(`[API Error] ${method} ${endpoint}:`, err.message || err);
    throw err;
  }
}

export const api = {
  get: (endpoint: string) => apiRequest('GET', endpoint),
  post: (endpoint: string, body?: any) => apiRequest('POST', endpoint, body),
  patch: (endpoint: string, body?: any) => apiRequest('PATCH', endpoint, body),
  delete: (endpoint: string) => apiRequest('DELETE', endpoint),
};
export default api;
export { NetworkError };
