import { getSession } from './supabase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function apiRequest(method: string, endpoint: string, body?: any) {
  const session = await getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    // Check if empty response (e.g. DELETE returns no body)
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(json.error || `Request failed with status ${response.status}`);
    }

    return json.success ? json.data : json;
  } catch (err: any) {
    console.error(`[API Client Error] ${method} ${endpoint}:`, err.message || err);
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
