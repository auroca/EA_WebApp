const DEFAULT_API_BASE_URL = 'http://localhost:1337';
const STORAGE_KEY = '__EA_API_BASE_URL__';

declare global {
  interface Window {
    __EA_API_URL__?: string;
  }
}

function resolveApiBaseUrl(): string {
  // Runtime override injected by the container via /env.js
  // The docker entrypoint will create `window.__EA_API_URL__` if provided.
  const runtime = window.__EA_API_URL__;

  if (runtime && runtime.trim().length > 0) {
    return runtime.trim().replace(/\/+$/, '');
  }

  // Build-time environment variable (Vite) as fallback
  const buildTime = import.meta.env?.VITE_API_URL;

  if (buildTime && buildTime.trim().length > 0) {
    return buildTime.trim().replace(/\/+$/, '');
  }

  return DEFAULT_API_BASE_URL;
}

export function getApiBaseUrl(): string {
  // Runtime/build configuration is the source of truth.
  const resolved = resolveApiBaseUrl();

  // Keep localStorage in sync for diagnostics and backward compatibility.
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      const normalizedStored = stored.trim().replace(/\/+$/, '');

      if (normalizedStored !== resolved) {
        localStorage.setItem(STORAGE_KEY, resolved);
        console.log('[API Base URL updated in localStorage]', {
          previous: normalizedStored,
          current: resolved
        });
      } else {
        console.log('[API Base URL from localStorage]', normalizedStored);
      }

      return resolved;
    }
  } catch (error) {
    console.warn('[localStorage access failed]', error);
  }

  // First time: store the resolved URL in localStorage.
  try {
    localStorage.setItem(STORAGE_KEY, resolved);
    console.log('[API Base URL Stored in localStorage]', resolved);
  } catch (error) {
    console.warn('[localStorage storage failed]', error);
  }

  return resolved;
}

export const GOOGLE_CLIENT_ID =
  '136495957431-f36ubav6rnlu1aultggn38u5a239masj.apps.googleusercontent.com';
