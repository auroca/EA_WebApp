const DEFAULT_API_BASE_URL = '/api';
const STORAGE_KEY = '__EA_API_BASE_URL__';

function resolveApiBaseUrl(): string {
  // Runtime override injected by the container via /env.js
  // The docker entrypoint will create `window.__EA_API_URL__` if provided.
  const runtime = (window as any).__EA_API_URL__ as string | undefined;

  if (runtime && runtime.trim().length > 0) {
    return runtime.trim().replace(/\/+$/, '');
  }

  // Build-time environment variable (Vite) as fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildTime = (import.meta as any).env?.VITE_API_URL as string | undefined;

  if (buildTime && buildTime.trim().length > 0) {
    return buildTime.trim().replace(/\/+$/, '');
  }

  return DEFAULT_API_BASE_URL;
}

export function getApiBaseUrl(): string {
  // Check if URL is already stored in localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      console.log('[API Base URL from localStorage]', stored);
      return stored;
    }
  } catch (error) {
    console.warn('[localStorage access failed]', error);
  }

  // First time: resolve and store in localStorage
  const url = resolveApiBaseUrl();
  try {
    localStorage.setItem(STORAGE_KEY, url);
    console.log('[API Base URL Stored in localStorage]', url);
  } catch (error) {
    console.warn('[localStorage storage failed]', error);
  }
  return url;
}
