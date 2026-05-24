import { describe, expect, it } from 'vitest';
import type { Route } from '../../src/types/route';
import {
  getDifficultyBadgePath,
  getFeaturedOverlayText,
  getRouteImage,
  getTopNavIconPath,
  sortRoutes,
  toTitleCase
} from '../../src/utils/homeView';

const createRoute = (overrides: Partial<Route>): Route => ({
  _id: 'route-id',
  name: 'Route',
  description: 'Description',
  cover_image: '',
  images: [],
  userId: 'user-id',
  difficulty: 'easy',
  city: 'Barcelona',
  country: 'Spain',
  tags: [],
  ...overrides
});

describe('homeView utilities', () => {
  it('builds asset paths and display labels', () => {
    expect(getTopNavIconPath('home', true)).toBe('/resources/icons/selected/home.png');
    expect(getTopNavIconPath('home', false)).toBe('/resources/icons/non_selected/home.png');
    expect(getDifficultyBadgePath('medium')).toBe('/resources/icons/badges/medium.png');
    expect(toTitleCase('HARD')).toBe('Hard');
  });

  it('gets route images and featured labels', () => {
    expect(getRouteImage(createRoute({ images: [' route.jpg '] }))).toBe('route.jpg');
    expect(getRouteImage(createRoute({ images: [] }))).toBe('');
    expect(getFeaturedOverlayText(0)).toBe('Featured route of the day');
    expect(getFeaturedOverlayText(3)).toBe('Featured route');
  });

  it('sorts routes without mutating the original list', () => {
    const routes = [
      createRoute({ _id: 'hard', difficulty: 'hard', duration: 30, distance: 6 }),
      createRoute({ _id: 'easy', difficulty: 'easy', duration: 10, distance: 2 }),
      createRoute({ _id: 'medium', difficulty: 'medium', duration: undefined, distance: 4 })
    ];

    expect(sortRoutes(routes, 'difficulty-asc').map((route) => route._id)).toEqual([
      'easy',
      'medium',
      'hard'
    ]);
    expect(sortRoutes(routes, 'duration-desc').map((route) => route._id)).toEqual([
      'hard',
      'easy',
      'medium'
    ]);
    expect(routes.map((route) => route._id)).toEqual(['hard', 'easy', 'medium']);
  });
});
