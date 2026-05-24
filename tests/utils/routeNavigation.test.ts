import { describe, expect, it } from 'vitest';
import {
  buildMyWayUrl,
  buildRouteDetailUrl,
  buildRouteSearchUrl,
  getRouteIdFromSearch,
  getSearchTextFromSearch
} from '../../src/utils/routeNavigation';

describe('routeNavigation', () => {
  it('builds encoded route URLs', () => {
    expect(buildRouteDetailUrl('ruta 1')).toBe('/route.html?id=ruta%201');
    expect(buildMyWayUrl('camí 2')).toBe('/myway.html?id=cam%C3%AD%202');
  });

  it('builds encoded search URLs', () => {
    expect(buildRouteSearchUrl('Barcelona Gothic Quarter')).toBe(
      '/route.html?search=Barcelona%20Gothic%20Quarter'
    );
  });

  it('reads and trims route query params', () => {
    expect(getRouteIdFromSearch('?id=%20abc%20')).toBe('abc');
    expect(getSearchTextFromSearch('?search=%20beach%20walk%20')).toBe('beach walk');
  });
});
