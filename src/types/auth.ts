export type AuthMode = 'login' | 'register';

export interface RegisterPayload {
  name: string;
  surname: string;
  username: string;
  email: string;
  password: string;
}

export interface CreatedUser {
  _id: string;
  name: string;
  surname: string;
  username: string;
  email: string;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser {
  _id: string;
  name: string;
  surname: string;
  username: string;
  email: string;
  enabled?: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}