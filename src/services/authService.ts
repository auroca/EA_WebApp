import type { AuthUser, CreatedUser, LoginResponse, RegisterPayload, StoredSession } from '../types/auth';
import { getApiBaseUrl } from './config';
import { GOOGLE_CLIENT_ID} from './config';

const SESSION_KEY = 'trip2guide_session';

const normalizeFavoriteRoutes = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      if (item && typeof item === 'object' && typeof (item as { _id?: unknown })._id === 'string') {
        return (item as { _id: string })._id;
      }

      return '';
    })
    .filter((item) => item.length > 0);
};

const loadFavoriteRouteIds = async (userId: string, token: string): Promise<string[]> => {
  const API_URL = getApiBaseUrl();
  const response = await fetch(`${API_URL}/users/${userId}/favorites`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return normalizeFavoriteRoutes(data);
};

export const registerUser = async (payload: RegisterPayload): Promise<CreatedUser> => {
  const API_URL = getApiBaseUrl();
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let message = 'Unable to register the user.';

    try {
      const errorData = await response.json();

      if (errorData?.message) {
        message = errorData.message;
      }

      if (errorData?.error?.details?.[0]?.message) {
        message = errorData.error.details[0].message;
      }
    } catch {
      // Keep the generic message when the error payload cannot be parsed.
    }

    throw new Error(message);
  }

  return (await response.json()) as CreatedUser;
};

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const API_URL = getApiBaseUrl();
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
      email: email.trim(),
      password
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.message || data?.error?.details?.[0]?.message || 'Invalid credentials.';
    throw new Error(message);
  }

  const favoriteRoutes = data.user?._id
    ? await loadFavoriteRouteIds(data.user._id, data.accessToken)
    : normalizeFavoriteRoutes(data.user?.favoriteRoutes);

  const normalizedUser: AuthUser = {
    ...data.user,
    favoriteRoutes
  };

  const session: StoredSession = {
    token: data.accessToken,
    user: normalizedUser
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  console.log('[Login Token Stored in localStorage]', data.accessToken);

  return {
    token: data.accessToken,
    user: normalizedUser
  };
};

const saveLoginSession = async (data: any): Promise<LoginResponse> => {
  const favoriteRoutes = data.user?._id
    ? await loadFavoriteRouteIds(data.user._id, data.accessToken)
    : normalizeFavoriteRoutes(data.user?.favoriteRoutes);

  const normalizedUser: AuthUser = {
    ...data.user,
    favoriteRoutes
  };

  const session: StoredSession = {
    token: data.accessToken,
    user: normalizedUser
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return {
    token: data.accessToken,
    user: normalizedUser
  };
};

export const loginWithGoogle = async (accessToken: string): Promise<LoginResponse> => {
  const API_URL = getApiBaseUrl();

  const response = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ accessToken })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Google login failed.');
  }

  return saveLoginSession(data);
};

export const getCreatorStats = async (): Promise<{
  routesCreated: number;
  pointsCreated: number;
}> => {
  const token = getStoredToken();

  if (!token) {
    throw new Error('User is not authenticated.');
  }

  const API_URL = getApiBaseUrl();

  const response = await fetch(`${API_URL}/auth/me/creator-stats`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Unable to load creator statistics.');
  }

  return data;
};

export const getGoogleClientId = () => GOOGLE_CLIENT_ID;

export const logoutUser = async (): Promise<void> => {
  try {
    const API_URL = getApiBaseUrl();
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } finally {
    localStorage.removeItem(SESSION_KEY);
  }
};

export const getStoredSession = (): StoredSession | null => {
  const rawSession = localStorage.getItem(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as StoredSession;
  } catch {
    return null;
  }
};

export const getStoredToken = (): string | null => {
  return getStoredSession()?.token ?? null;
};

export const getStoredUser = () => {
  return getStoredSession()?.user ?? null;
};

export const saveStoredSessionUser = (user: AuthUser): void => {
  const session = getStoredSession();

  if (!session) {
    return;
  }

  const updatedSession: StoredSession = {
    ...session,
    user
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
};

export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};
