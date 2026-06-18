export interface Point {
  _id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  image?: string;
  routeId: string;
  index: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Route {
  _id: string;
  name: string;
  description: string;
  cover_image: string;
  images: string[];
  city_image?: string;
  userId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  city: string;
  country: string;
  distance?: number;
  duration?: number;
  ratingAverage?: number;
  reviewsCount?: number;
  tags: string[];
  points?: Point[];
}

export interface RoutePointCreateInput {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  image?: string;
  index: number;
}

export interface RouteCreateInput {
  name: string;
  description: string;
  cover_image: string;
  city: string;
  country: string;
  distance: number;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  points: RoutePointCreateInput[];
}

export interface HomeRoutesData {
  routes: Route[];
  popularRouteIds: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RoutePageData {
  routes: Route[];
  pagination: PaginationMeta;
}

export type PolygonCoordinate = [number, number];

export interface RouteZone {
  id: string;
  name: string;
  description: string;
  coordinates: PolygonCoordinate[];
}
