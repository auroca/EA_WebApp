export function buildRouteDetailUrl(routeId: string): string {
  return `/route.html?routeId=${encodeURIComponent(routeId)}`;
}

export function buildRouteSearchUrl(searchText: string): string {
  return `/route.html?search=${encodeURIComponent(searchText)}`;
}

export function buildMyWayUrl(routeId: string): string {
  return `/myway.html?id=${encodeURIComponent(routeId)}`;
}

export function getRouteIdFromSearch(search: string): string {
  const params = new URLSearchParams(search);

  const routeId = params.get('routeId');
  if (routeId && routeId.trim().length > 0) {
    return routeId.trim();
  }

  const id = params.get('id');
  if (id && id.trim().length > 0) {
    return id.trim();
  }

  return '';
}

export function getSearchTextFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  return (params.get('search') ?? '').trim();
}