import type { HomeRoutesData, Route } from '../types/route';

const DEFAULT_PROPERTIES_URL = '/resources/routes.properties';
const DEFAULT_POPULAR_PROPERTIES_URL = '/resources/popular.properties';
const DEFAULT_API_BASE_URL = '/api';

type PropertyMap = Record<string, string>;

export interface RouteDataProvider {
  getHomeData(): Promise<HomeRoutesData>;
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

function parsePopularRouteIds(content: string): string[] {
  const uniqueIds = new Set<string>();
  const idMatches = content.match(/'([^']+)'|"([^"]+)"/g) ?? [];

  for (const rawMatch of idMatches) {
    const normalized = rawMatch.replace(/^['"]|['"]$/g, '').trim();
    if (normalized) {
      uniqueIds.add(normalized);
    }
  }

  return [...uniqueIds];
}

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
    .map((entry) => entry[1])
    .filter(
      (item): item is Route =>
        Boolean(
          item._id &&
            item.name &&
            item.description &&
            item.cover_image &&
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
    .map((image) => image.trim().replace(/^'/, '').replace(/'$/, '').replace(/\"/g, '"').replace(/\\'/g, "'"))
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
  const tagsSource = Array.isArray(candidate.tags) ? candidate.tags : [];
  const tags = tagsSource
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const normalized: Route = {
    _id: typeof candidate._id === 'string' ? candidate._id : '',
    name: typeof candidate.name === 'string' ? candidate.name : '',
    description: typeof candidate.description === 'string' ? candidate.description : '',
    cover_image:
      typeof candidate.cover_image === 'string' && candidate.cover_image.trim().length > 0
        ? candidate.cover_image
        : '',
    images: Array.isArray(candidate.images)
      ? candidate.images.filter((image): image is string => typeof image === 'string')
      : [],
    city_image:
      typeof candidate.city_image === 'string' && candidate.city_image.trim().length > 0
        ? candidate.city_image
        : undefined,
    userId: typeof candidate.userId === 'string' ? candidate.userId : '',
    difficulty: sanitizeDifficulty(
      typeof candidate.difficulty === 'string' ? candidate.difficulty : undefined
    ),
    city: typeof candidate.city === 'string' ? candidate.city : '',
    country: typeof candidate.country === 'string' ? candidate.country : '',
    distance: typeof candidate.distance === 'number' ? candidate.distance : undefined,
    duration: typeof candidate.duration === 'number' ? candidate.duration : undefined,
    tags
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

function mapHomeData(content: string): HomeRoutesData {
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

export class PropertiesRouteDataProvider implements RouteDataProvider {
  constructor(
    private readonly resourceUrl: string = DEFAULT_PROPERTIES_URL,
    private readonly popularResourceUrl: string = DEFAULT_POPULAR_PROPERTIES_URL
  ) {}

  async getHomeData(): Promise<HomeRoutesData> {
    const [routesResponse, popularResponse] = await Promise.all([
      fetch(this.resourceUrl),
      fetch(this.popularResourceUrl)
    ]);

    if (!routesResponse.ok) {
      throw new Error('Unable to load routes.properties');
    }

    const routesContent = await routesResponse.text();
    const homeData = mapHomeData(routesContent);

    if (popularResponse.ok) {
      const popularContent = await popularResponse.text();
      homeData.popularRouteIds = parsePopularRouteIds(popularContent);
    }

    return homeData;
  }
}

export class ApiRouteDataProvider implements RouteDataProvider {
  constructor(private readonly baseUrl: string = DEFAULT_API_BASE_URL) {}

  async getHomeData(): Promise<HomeRoutesData> {
    const response = await fetch(`${this.baseUrl}/routes`);

    if (!response.ok) {
      throw new Error('Unable to load route information from the server');
    }

    return mapHomeDataFromApi(await response.json());
  }
}

export function getConfiguredRouteDataProvider(): RouteDataProvider {
  const source = import.meta.env.VITE_ROUTE_DATA_SOURCE;

  if (source === 'api') {
    return new ApiRouteDataProvider(import.meta.env.VITE_ROUTE_API_BASE_URL ?? DEFAULT_API_BASE_URL);
  }

  return new PropertiesRouteDataProvider(
    import.meta.env.VITE_ROUTE_PROPERTIES_URL ?? DEFAULT_PROPERTIES_URL
  );
}

export const routeDataProvider = getConfiguredRouteDataProvider();
export { emptyHomeData };
