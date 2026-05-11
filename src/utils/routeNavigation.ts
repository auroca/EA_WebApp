export function buildRouteDetailUrl(routeId: string): string {
  return `/route.html?id=${encodeURIComponent(routeId)}`;
}

export function buildRouteSearchUrl(searchText: string): string {
  return `/route.html?search=${encodeURIComponent(searchText)}`;
}

export function buildMyWayUrl(routeId: string): string {
  return `/myway.html?id=${encodeURIComponent(routeId)}`;
}

export function getRouteIdFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  return (params.get('id') ?? '').trim();
}

export function getSearchTextFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  return (params.get('search') ?? '').trim();
}