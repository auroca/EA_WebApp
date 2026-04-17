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
