import type { CreatedUser, LoginResponse, RegisterPayload } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'trip2guide_token';

export const registerUser = async (payload: RegisterPayload): Promise<CreatedUser> => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let message = 'No se ha podido registrar el usuario.';

    try {
      const errorData = await response.json();

      if (errorData?.message) {
        message = errorData.message;
      }

      if (errorData?.error?.details?.[0]?.message) {
        message = errorData.error.details[0].message;
      }
    } catch {
      // sin cambios
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
    body: JSON.stringify({
      email: email.trim(),
      password
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.message || data?.error?.details?.[0]?.message || 'Credenciales incorrectas.';
    throw new Error(message);
  }

  localStorage.setItem(TOKEN_KEY, data.token);

  return data as LoginResponse;
};

export const logoutUser = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};