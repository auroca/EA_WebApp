import type { Point } from '../types/route';
import { authenticatedFetch } from './apiClient';
import { getApiBaseUrl } from './config';
import { getStoredToken } from './authService';

export interface PointService {
  getPointById(pointId: string): Promise<Point | null>;
}

function mapPointFromApi(payload: unknown): Point | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const point = payload as Record<string, unknown>;

  const normalized: Point = {
    _id: typeof point._id === 'string' ? point._id : '',
    name: typeof point.name === 'string' ? point.name : '',
    description: typeof point.description === 'string' ? point.description : undefined,
    latitude: typeof point.latitude === 'number' ? point.latitude : 0,
    longitude: typeof point.longitude === 'number' ? point.longitude : 0,
    image: typeof point.image === 'string' ? point.image : undefined,
    routeId: typeof point.routeId === 'string' ? point.routeId : '',
    index: typeof point.index === 'number' ? point.index : 0,
    createdAt: typeof point.createdAt === 'string' ? point.createdAt : undefined,
    updatedAt: typeof point.updatedAt === 'string' ? point.updatedAt : undefined
  };

  if (!normalized._id || !normalized.name || !normalized.routeId) {
    return null;
  }

  return normalized;
}

class ApiPointService implements PointService {
  async getPointById(pointId: string): Promise<Point | null> {
    const path = `/points/${encodeURIComponent(pointId)}`;
    const apiUrl = getApiBaseUrl();
    const token = getStoredToken();
    const fullUrl = `${apiUrl}${path}`;
    console.log('[Point Detail Request]', {
      path,
      fullUrl,
      token: token ? `Bearer ${token.substring(0, 20)}...` : 'No token'
    });
    const response = await authenticatedFetch(path);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Unable to load point details from the server');
    }

    const data = await response.json();
    if (data && typeof data === 'object' && 'data' in data) {
      return mapPointFromApi((data as { data: unknown }).data);
    }

    return mapPointFromApi(data);
  }
}

export const pointService = new ApiPointService();
