import { getAdminSession } from './supabase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function apiRequest(method: string, endpoint: string, body?: unknown) {
  const session = await getAdminSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(json.error || `Request failed: ${response.status}`);
  return json.success ? json.data : json;
}

export const adminApi = {
  get:   (endpoint: string) => apiRequest('GET', endpoint),
  post:  (endpoint: string, body?: unknown) => apiRequest('POST', endpoint, body),
  patch: (endpoint: string, body?: unknown) => apiRequest('PATCH', endpoint, body),
  delete:(endpoint: string) => apiRequest('DELETE', endpoint),
};
export default adminApi;
