import type { HomeRoutesData, PaginationMeta, Route, RouteCreateInput, RoutePageData } from '../types/route';
import { authenticatedFetch } from './apiClient';
import { getApiBaseUrl } from './config';
import { getStoredToken } from './authService';

type PropertyMap = Record<string, string>;

export interface RouteDataProvider {
  getHomeData(): Promise<HomeRoutesData>;
  getRoutePage(options: RoutePageOptions): Promise<RoutePageData>;
  getRouteById(routeId: string): Promise<Route | null>;
  createRoute(input: RouteCreateInput): Promise<Route>;
  deleteRoute(routeId: string): Promise<void>;
}

export interface RoutePageOptions {
  page: number;
  limit: number;
}

interface GroupedItem {
  index: number;
  field: string;
  value: string;
}

const emptyHomeData: HomeRoutesData = {
  routes: [],
  popularRouteIds: []
};

const emptyRoutePageData: RoutePageData = {
  routes: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  }
};

function parseProperties(content: string): PropertyMap {
  const result: PropertyMap = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#') || line.startsWith('!')) {
      continue;
    }

    const separatorIndex = line.search(/[=:]/);
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function collectGroupedItems(prefix: string, map: PropertyMap): GroupedItem[] {
  const pattern = new RegExp(`^${prefix}\\.(\\d+)\\.([a-zA-Z0-9_]+)$`);
  const groups: GroupedItem[] = [];

  for (const [key, value] of Object.entries(map)) {
    const match = key.match(pattern);
    if (!match) {
      continue;
    }

    groups.push({
      index: Number(match[1]),
      field: match[2],
      value
    });
  }

  return groups;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value || value === 'undefined') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTags(rawValue: string | undefined): string[] {
  if (!rawValue || rawValue === '[]') {
    return [];
  }

  return rawValue
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseStringArray(rawValue: string | undefined): string[] {
  if (!rawValue || rawValue === '[]') {
    return [];
  }

  return rawValue
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((item) => item.trim().replace(/^'/, '').replace(/'$/, '').replace(/^"/, '').replace(/"$/, ''))
    .filter(Boolean);
}

function sanitizeDifficulty(value: string | undefined): Route['difficulty'] {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }

  return 'medium';
}

function mapRoutesFromProperties(map: PropertyMap): Route[] {
  const grouped = collectGroupedItems('route', map);
  const byIndex = new Map<number, Partial<Route>>();

  for (const item of grouped) {
    const current = byIndex.get(item.index) ?? { tags: [] };

    if (item.field === '_id') {
      current._id = item.value;
    }
    if (item.field === 'name') {
      current.name = item.value;
    }
    if (item.field === 'description') {
      current.description = item.value;
    }
    if (item.field === 'cover_image') {
      current.cover_image = item.value;
    }
    if (item.field === 'images') {
      current.images = parseStringArray(item.value);
    }
    if (item.field === 'userId') {
      current.userId = item.value;
    }
    if (item.field === 'difficulty') {
      current.difficulty = sanitizeDifficulty(item.value);
    }
    if (item.field === 'city') {
      current.city = item.value;
    }
    if (item.field === 'country') {
      current.country = item.value;
    }
    if (item.field === 'distance') {
      current.distance = parseOptionalNumber(item.value);
    }
    if (item.field === 'duration') {
      current.duration = parseOptionalNumber(item.value);
    }
    if (item.field === 'tags') {
      current.tags = parseTags(item.value);
    }

    byIndex.set(item.index, current);
  }

  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map((entry) => {
      const item = entry[1];
      const firstImage = item.images?.[0]?.trim() ?? '';

      return {
        ...item,
        cover_image: item.cover_image && item.cover_image.trim().length > 0 ? item.cover_image : firstImage
      };
    })
    .filter(
      (item): item is Route =>
        Boolean(
          item._id &&
            item.name &&
            item.description &&
            item.images &&
            item.userId &&
            item.difficulty &&
            item.city &&
            item.country &&
            item.tags
        )
    );
}

function readStringField(block: string, field: string): string | undefined {
  const match = block.match(new RegExp(`${field}\\s*:\\s*'((?:\\\\'|[^'])*)'`));
  if (!match) {
    return undefined;
  }

  return match[1].replace(/\\'/g, "'").trim();
}

function readNumberField(block: string, field: string): number | undefined {
  const match = block.match(new RegExp(`${field}\\s*:\\s*([^,\\n}]+)`));
  if (!match) {
    return undefined;
  }

  return parseOptionalNumber(match[1].trim());
}

function readTagsField(block: string): string[] {
  const match = block.match(/tags\s*:\s*\[([^\]]*)\]/);
  if (!match) {
    return [];
  }

  const rawTags = match[1].trim();
  if (!rawTags) {
    return [];
  }

  return rawTags
    .split(',')
    .map((tag) => tag.trim().replace(/^'/, '').replace(/'$/, '').replace(/\\'/g, "'"))
    .filter(Boolean);
}

function readImagesField(block: string): string[] {
  const match = block.match(/images\s*:\s*\[([^\]]*)\]/);
  if (!match) {
    return [];
  }

  const rawImages = match[1].trim();
  if (!rawImages) {
    return [];
  }

  return rawImages
    .split(',')
    .map((image) => image.trim().replace(/^'/, '').replace(/'$/, '').replace(/"/g, '"').replace(/\\'/g, "'"))
    .filter(Boolean);
}

function mapRoutesFromObjectLiteral(content: string): Route[] {
  const objectBlocks = content.match(/\{[\s\S]*?\}/g) ?? [];

  return objectBlocks
    .map((block) => {
      const candidate = {
        _id: readStringField(block, '_id'),
        name: readStringField(block, 'name'),
        description: readStringField(block, 'description'),
        cover_image: readStringField(block, 'cover_image'),
        images: readImagesField(block),
        city_image: readStringField(block, 'city_image'),
        userId: readStringField(block, 'userId'),
        difficulty: readStringField(block, 'difficulty'),
        city: readStringField(block, 'city'),
        country: readStringField(block, 'country'),
        distance: readNumberField(block, 'distance'),
        duration: readNumberField(block, 'duration'),
        tags: readTagsField(block)
      };

      return normalizeRouteItem(candidate);
    })
    .filter((item): item is Route => item !== null);
}

function normalizeRouteItem(item: unknown): Route | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const candidate = item as Record<string, unknown>;
  const images = Array.isArray(candidate.images)
    ? candidate.images.filter((image): image is string => typeof image === 'string')
    : [];
  const coverImageFromImages = images[0]?.trim() ?? '';
  const tagsSource = Array.isArray(candidate.tags) ? candidate.tags : [];
  const tags = tagsSource
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);

  let points: Route['points'];
  if (Array.isArray(candidate.points)) {
    points = candidate.points
      .filter((point): point is Record<string, unknown> => typeof point === 'object' && point !== null)
      .map((point, idx) => ({
        _id: typeof point._id === 'string' ? point._id : String(point._id ?? ''),
        name: typeof point.name === 'string' && point.name.trim().length > 0 ? point.name : `Point ${idx + 1}`,
        description: typeof point.description === 'string' ? point.description : undefined,
        latitude: typeof point.latitude === 'number' ? point.latitude : 0,
        longitude: typeof point.longitude === 'number' ? point.longitude : 0,
        image: typeof point.image === 'string' ? point.image : undefined,
        routeId:
          typeof point.routeId === 'string' && point.routeId.trim().length > 0
            ? point.routeId
            : typeof candidate._id === 'string'
              ? candidate._id
              : '',
        index: typeof point.index === 'number' && point.index >= 0 ? point.index : idx,
        createdAt: typeof point.createdAt === 'string' ? point.createdAt : undefined,
        updatedAt: typeof point.updatedAt === 'string' ? point.updatedAt : undefined
      }))
      .filter(
        (point) =>
          point._id &&
          point.name &&
          Number.isFinite(point.latitude) &&
          Number.isFinite(point.longitude)
      );
  }

  const normalized: Route = {
    _id: typeof candidate._id === 'string' ? candidate._id : String(candidate._id ?? ''),
    name: typeof candidate.name === 'string' ? candidate.name : '',
    description: typeof candidate.description === 'string' ? candidate.description : '',
    cover_image:
      typeof candidate.cover_image === 'string' && candidate.cover_image.trim().length > 0
        ? candidate.cover_image
        : coverImageFromImages,
    images,
    city_image:
      typeof candidate.city_image === 'string' && candidate.city_image.trim().length > 0
        ? candidate.city_image
        : undefined,
    userId: typeof candidate.userId === 'string' ? candidate.userId : String(candidate.userId ?? ''),
    difficulty: sanitizeDifficulty(
      typeof candidate.difficulty === 'string' ? candidate.difficulty : undefined
    ),
    city: typeof candidate.city === 'string' ? candidate.city : '',
    country: typeof candidate.country === 'string' ? candidate.country : '',
    distance: typeof candidate.distance === 'number' ? candidate.distance : undefined,
    duration: typeof candidate.duration === 'number' ? candidate.duration : undefined,
    tags,
    points
  };

  if (
    !normalized._id ||
    !normalized.name ||
    !normalized.description ||
    !normalized.userId ||
    !normalized.city ||
    !normalized.country
  ) {
    return null;
  }

  return normalized;
}

function _mapHomeData(content: string): HomeRoutesData {
  const objectLiteralRoutes = mapRoutesFromObjectLiteral(content);
  if (objectLiteralRoutes.length > 0) {
    return {
      routes: objectLiteralRoutes,
      popularRouteIds: []
    };
  }

  const propertyMap = parseProperties(content);

  return {
    routes: mapRoutesFromProperties(propertyMap),
    popularRouteIds: []
  };
}

function mapHomeDataFromApi(payload: unknown): HomeRoutesData {
  if (Array.isArray(payload)) {
    return {
      routes: payload.map((item) => normalizeRouteItem(item)).filter((item): item is Route => item !== null),
      popularRouteIds: []
    };
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    const data = (payload as { data: unknown[] }).data;

    return {
      routes: data.map((item) => normalizeRouteItem(item)).filter((item): item is Route => item !== null),
      popularRouteIds: []
    };
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { routes?: unknown }).routes)) {
    const data = (payload as { routes: unknown[] }).routes;
    const rawPopularRouteIds = (payload as { popularRouteIds?: unknown }).popularRouteIds;
    const popularRouteIds = Array.isArray(rawPopularRouteIds)
      ? rawPopularRouteIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    return {
      routes: data.map((item) => normalizeRouteItem(item)).filter((item): item is Route => item !== null),
      popularRouteIds
    };
  }

  return emptyHomeData;
}

function mapRoutePageFromApi(payload: unknown, page: number, limit: number): RoutePageData {
  if (Array.isArray(payload)) {
    return {
      routes: payload.map((item) => normalizeRouteItem(item)).filter((item): item is Route => item !== null),
      pagination: {
        page,
        limit,
        total: payload.length,
        totalPages: 1
      }
    };
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    const data = (payload as { data: unknown[] }).data;
    const rawPagination = (payload as { pagination?: Partial<PaginationMeta> }).pagination;
    const total = typeof rawPagination?.total === 'number' ? rawPagination.total : data.length;
    const totalPages =
      typeof rawPagination?.totalPages === 'number'
        ? rawPagination.totalPages
        : Math.max(1, Math.ceil(total / limit));

    return {
      routes: data.map((item) => normalizeRouteItem(item)).filter((item): item is Route => item !== null),
      pagination: {
        page: typeof rawPagination?.page === 'number' ? rawPagination.page : page,
        limit: typeof rawPagination?.limit === 'number' ? rawPagination.limit : limit,
        total,
        totalPages
      }
    };
  }

  return emptyRoutePageData;
}

function mapRouteFromApi(payload: unknown): Route | null {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return normalizeRouteItem((payload as { data: unknown }).data);
  }

  return normalizeRouteItem(payload);
}

export class ApiRouteDataProvider implements RouteDataProvider {
  constructor() {}

  async getHomeData(): Promise<HomeRoutesData> {
    const response = await authenticatedFetch(`/routes`);

    if (!response.ok) {
      throw new Error('Unable to load route information from the server');
    }

    return mapHomeDataFromApi(await response.json());
  }

  async getRoutePage(options: RoutePageOptions): Promise<RoutePageData> {
    const searchParams = new URLSearchParams({
      limit: String(options.limit),
      page: String(options.page)
    });

    const response = await authenticatedFetch(`/routes?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error('Unable to load route page from the server');
    }

    return mapRoutePageFromApi(await response.json(), options.page, options.limit);
  }

  async getRouteById(routeId: string): Promise<Route | null> {
    const path = `/routes/${encodeURIComponent(routeId)}`;
    const apiUrl = getApiBaseUrl();
    const token = getStoredToken();
    const fullUrl = `${apiUrl}${path}`;
    console.log('[Route Detail Request]', {
      path,
      fullUrl,
      token: token ? `Bearer ${token.substring(0, 20)}...` : 'No token'
    });
    const response = await authenticatedFetch(path);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Unable to load route details from the server');
    }

    return mapRouteFromApi(await response.json());
  }

  async createRoute(input: RouteCreateInput): Promise<Route> {
    const response = await authenticatedFetch('/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error('Unable to create route on the server');
    }

    const route = mapRouteFromApi(await response.json());

    if (!route) {
      throw new Error('Unable to read created route from the server');
    }

    return route;
  }

  async deleteRoute(routeId: string): Promise<void> {
    const response = await authenticatedFetch(`/routes/${encodeURIComponent(routeId)}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Unable to delete route from the server');
    }
  }
}

export function getConfiguredRouteDataProvider(): RouteDataProvider {
  return new ApiRouteDataProvider();
}

export const routeDataProvider = getConfiguredRouteDataProvider();
export { emptyHomeData };
