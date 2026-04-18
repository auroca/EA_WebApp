import { getStoredToken, logoutUser } from './authService';

const API_URL = import.meta.env.VITE_API_URL;

export const authenticatedFetch = async (
  input: string,
  init: RequestInit = {}
): Promise<Response> => {
  const token = getStoredToken();

  const headers: HeadersInit = {
    ...(init.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(`${API_URL}${input}`, {
    ...init,
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    await logoutUser();
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
    throw new Error('Session expired. Please log in again.');
  }

  return response;
};