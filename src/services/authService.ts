import type { CreatedUser, LoginResponse, RegisterPayload, StoredSession } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL;
const SESSION_KEY = 'trip2guide_session';

export const registerUser = async (payload: RegisterPayload): Promise<CreatedUser> => {
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
    }

    throw new Error(message);
  }

  return (await response.json()) as CreatedUser;
};

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
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

  const session: StoredSession = {
    token: data.accessToken,
    user: data.user
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return {
    token: data.accessToken,
    user: data.user
  };
};

export const logoutUser = async (): Promise<void> => {
  try {
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

export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};