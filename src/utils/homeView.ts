import type { Route } from '../types/route';

export type TopNavKey = 'home' | 'routes' | 'chats' | 'favorites' | 'user';

export type SortOption =
  | 'difficulty-asc'
  | 'difficulty-desc'
  | 'duration-asc'
  | 'duration-desc'
  | 'distance-asc'
  | 'distance-desc';

export interface TopNavItem {
  key: TopNavKey;
  icon: string;
}

export const topNavItems: TopNavItem[] = [
  { key: 'home', icon: 'home' },
  { key: 'routes', icon: 'routes' },
  { key: 'chats', icon: 'chats' },
  { key: 'favorites', icon: 'favorites' },
  { key: 'user', icon: 'user' }
];

export function getTopNavIconPath(iconName: string, isSelected: boolean): string {
  const variant = isSelected ? 'selected' : 'non_selected';
  return `/resources/icons/${variant}/${iconName}.png`;
}

export function toTitleCase(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function getRouteImage(route: Route): string {
  const routeWithCover = route as Route & {
    cover_image?: string;
    coverImageUrl?: string;
    coverImage?: string;
    image?: string;
  };

  return (
    routeWithCover.cover_image?.trim() ||
    routeWithCover.coverImageUrl?.trim() ||
    routeWithCover.coverImage?.trim() ||
    routeWithCover.image?.trim() ||
    route.images?.[0]?.trim() ||
    ''
  );
}

export function getDifficultyBadgePath(difficulty: Route['difficulty']): string {
  return `/resources/icons/badges/${difficulty.toLowerCase()}.png`;
}

export function getFeaturedOverlayKey(index: number): 'home.featuredDay' | 'home.featuredWeek' | 'home.featuredMonth' | 'home.featuredRoute' {
  if (index === 0) {
    return 'home.featuredDay';
  }

  if (index === 1) {
    return 'home.featuredWeek';
  }

  if (index === 2) {
    return 'home.featuredMonth';
  }

  return 'home.featuredRoute';
}

function compareDifficulty(a: Route['difficulty'], b: Route['difficulty'], asc: boolean): number {
  const rank: Record<Route['difficulty'], number> = {
    easy: 1,
    medium: 2,
    hard: 3
  };

  return asc ? rank[a] - rank[b] : rank[b] - rank[a];
}

function compareOptionalNumber(a: number | undefined, b: number | undefined, asc: boolean): number {
  const aUndefined = typeof a !== 'number';
  const bUndefined = typeof b !== 'number';

  if (aUndefined && bUndefined) {
    return 0;
  }

  if (aUndefined) {
    return 1;
  }

  if (bUndefined) {
    return -1;
  }

  return asc ? a - b : b - a;
}

export function sortRoutes(routes: Route[], option: SortOption | null): Route[] {
  if (!option) {
    return routes;
  }

  const sorted = [...routes];

  if (option === 'difficulty-asc') {
    return sorted.sort((a, b) => compareDifficulty(a.difficulty, b.difficulty, true));
  }

  if (option === 'difficulty-desc') {
    return sorted.sort((a, b) => compareDifficulty(a.difficulty, b.difficulty, false));
  }

  if (option === 'duration-asc') {
    return sorted.sort((a, b) => compareOptionalNumber(a.duration, b.duration, true));
  }

  if (option === 'duration-desc') {
    return sorted.sort((a, b) => compareOptionalNumber(a.duration, b.duration, false));
  }

  if (option === 'distance-asc') {
    return sorted.sort((a, b) => compareOptionalNumber(a.distance, b.distance, true));
  }

  return sorted.sort((a, b) => compareOptionalNumber(a.distance, b.distance, false));
}
