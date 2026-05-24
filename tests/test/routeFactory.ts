import type { Route } from '../../src/types/route';

export function createRoute(overrides: Partial<Route> = {}): Route {
  return {
    _id: 'route-1',
    name: 'Gothic Quarter Walk',
    description: 'A route through historic streets.',
    cover_image: '/images/gothic.jpg',
    images: ['/images/gothic.jpg'],
    userId: 'user-1',
    difficulty: 'easy',
    city: 'Barcelona',
    country: 'Spain',
    distance: 4,
    duration: 90,
    tags: ['history', 'city'],
    ...overrides
  };
}
