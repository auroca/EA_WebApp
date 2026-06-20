import { authenticatedFetch } from './apiClient';
import type { AuthUser } from '../types/auth';
import type { Route } from '../types/route';

export interface UpdateUserPayload {
  name: string;
  surname: string;
  username: string;
  email: string;
  password?: string;
  enabled: boolean;
  role: string;
}

export interface UpdateRoutePayload {
  name: string;
  description: string;
  cover_image: string;
  images: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  city: string;
  country: string;
  distance?: number;
  duration?: number;
  tags: string[];
}

const parseApiError = async (response: Response, fallback: string): Promise<string> => {
  try {
    const errorData = await response.json();

    return (
      errorData?.message ||
      errorData?.error?.message ||
      errorData?.error?.details?.[0]?.message ||
      fallback
    );
  } catch {
    return fallback;
  }
};

const normalizeUserFromApi = (payload: unknown): AuthUser => {
  const candidate = payload as Record<string, unknown>;

  return {
    _id: String(candidate._id ?? ''),
    name: String(candidate.name ?? ''),
    surname: String(candidate.surname ?? ''),
    username: String(candidate.username ?? ''),
    email: String(candidate.email ?? ''),
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : undefined,
    role: typeof candidate.role === 'string' ? candidate.role : undefined,
    favoriteRoutes: Array.isArray(candidate.favoriteRoutes)
      ? candidate.favoriteRoutes
          .map((item) => {
            if (typeof item === 'string') return item;

            if (
              item &&
              typeof item === 'object' &&
              typeof (item as { _id?: unknown })._id === 'string'
            ) {
              return (item as { _id: string })._id;
            }

            return '';
          })
          .filter((item) => item.length > 0)
      : []
  };
};

const normalizeRouteFromApi = (payload: unknown): Route | null => {
  if (!payload || typeof payload !== 'object') return null;

  const candidate = payload as Record<string, unknown>;

  const images = Array.isArray(candidate.images)
    ? candidate.images.filter((item): item is string => typeof item === 'string')
    : [];

  const tags = Array.isArray(candidate.tags)
    ? candidate.tags.filter((item): item is string => typeof item === 'string')
    : [];

  const difficulty =
    candidate.difficulty === 'easy' ||
    candidate.difficulty === 'medium' ||
    candidate.difficulty === 'hard'
      ? candidate.difficulty
      : 'medium';

  return {
    _id: String(candidate._id ?? ''),
    name: String(candidate.name ?? ''),
    description: String(candidate.description ?? ''),
    cover_image: String(candidate.cover_image ?? images[0] ?? ''),
    images,
    city_image:
      typeof candidate.city_image === 'string' && candidate.city_image.trim().length > 0
        ? candidate.city_image
        : undefined,
    userId: String(candidate.userId ?? ''),
    difficulty,
    city: String(candidate.city ?? ''),
    country: String(candidate.country ?? ''),
    distance: typeof candidate.distance === 'number' ? candidate.distance : undefined,
    duration: typeof candidate.duration === 'number' ? candidate.duration : undefined,
    tags
  };
};

const normalizeRoutesFromApi = (payload: unknown): Route[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeRouteFromApi(item))
      .filter((item): item is Route => item !== null);
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
    return (payload as { data: unknown[] }).data
      .map((item) => normalizeRouteFromApi(item))
      .filter((item): item is Route => item !== null);
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { routes?: unknown[] }).routes)) {
    return (payload as { routes: unknown[] }).routes
      .map((item) => normalizeRouteFromApi(item))
      .filter((item): item is Route => item !== null);
  }

  return [];
};

export const getUserById = async (userId: string): Promise<AuthUser> => {
  const response = await authenticatedFetch(`/users/${userId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) throw new Error(await parseApiError(response, 'Unable to load the user.'));

  return normalizeUserFromApi(await response.json());
};

export const updateUserById = async (
  userId: string,
  payload: UpdateUserPayload
): Promise<AuthUser> => {
  const response = await authenticatedFetch(`/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(await parseApiError(response, 'Unable to update the user.'));

  return normalizeUserFromApi(await response.json());
};

export const deleteUserById = async (userId: string): Promise<void> => {
  const response = await authenticatedFetch(`/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Unable to delete the account.'));
  }
};

export const getRoutesByUserId = async (userId: string): Promise<Route[]> => {
  const searchParams = new URLSearchParams();
  searchParams.append('filter[userId]', userId);

  const response = await authenticatedFetch(`/routes?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) throw new Error(await parseApiError(response, 'Unable to load user routes.'));

  return normalizeRoutesFromApi(await response.json());
};

export const updateRouteById = async (
  routeId: string,
  payload: UpdateRoutePayload
): Promise<Route> => {
  const {
    name,
    description,
    cover_image,
    images,
    difficulty,
    city,
    country,
    distance,
    duration,
    tags
  } = payload;

  const cleanPayload: UpdateRoutePayload = {
    name,
    description,
    cover_image,
    images,
    difficulty,
    city,
    country,
    tags
  };

  if (distance !== undefined) {
    cleanPayload.distance = distance;
  }

  if (duration !== undefined) {
    cleanPayload.duration = duration;
  }

  const response = await authenticatedFetch(`/routes/${routeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPayload)
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Unable to update the route.'));
  }

  const updatedRoute = normalizeRouteFromApi(await response.json());

  if (!updatedRoute) {
    throw new Error('Invalid route response from server.');
  }

  return updatedRoute;
};

export const getFavoriteRoutesByUserId = async (userId: string): Promise<Route[]> => {
  const response = await authenticatedFetch(`/users/${userId}/favorites`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Unable to load favorite routes.'));
  }

  return normalizeRoutesFromApi(await response.json());
};

export const addFavoriteRouteByUserId = async (
  userId: string,
  routeId: string
): Promise<Route[]> => {
  const response = await authenticatedFetch(`/users/${userId}/favorites/${routeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Unable to add favorite route.'));
  }

  return normalizeRoutesFromApi(await response.json());
};

export const removeFavoriteRouteByUserId = async (
  userId: string,
  routeId: string
): Promise<Route[]> => {
  const response = await authenticatedFetch(`/users/${userId}/favorites/${routeId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Unable to remove favorite route.'));
  }

  return normalizeRoutesFromApi(await response.json());
};

export const toggleFavoriteRouteByUserId = async (
  userId: string,
  routeId: string
): Promise<Route[]> => {
  const response = await authenticatedFetch(`/users/${userId}/favorites/${routeId}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Unable to toggle favorite route.'));
  }

  return normalizeRoutesFromApi(await response.json());
};