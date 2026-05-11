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
  tags: string[];
  points?: Point[];
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
