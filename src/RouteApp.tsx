import { useEffect, useMemo, useState } from 'react';
import SearchArea from './components/SearchArea';
import SearchResults from './components/SearchResults';
import TopNav from './components/TopNav';
import RouteDescriptionSection from './components/RouteDescriptionSection';
import RouteGallery from './components/RouteGallery';
import RouteHeroSection from './components/RouteHeroSection';
import RouteHighlights from './components/RouteHighlights';
import RouteQuickFacts from './components/RouteQuickFacts';
import { isAuthenticated } from './services/authService';
import { emptyHomeData, routeDataProvider } from './services/routeService';
import type { HomeRoutesData, Route } from './types/route';
import { sortRoutes, type SortOption } from './utils/homeView';
import { getRouteIdFromSearch, getSearchTextFromSearch } from './utils/routeNavigation';

function RouteApp() {
  const [homeData, setHomeData] = useState<HomeRoutesData>(emptyHomeData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>(() =>
    getSearchTextFromSearch(window.location.search)
  );
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption | null>(null);

  const routeId = getRouteIdFromSearch(window.location.search);
  const requiresAuthForDetail = routeId.length > 0;
  const isSearchActive = isSearchFocused || searchInput.trim().length > 0;
  const normalizedSearchQuery = searchInput.trim().toLowerCase();
  const hasActiveSearch = normalizedSearchQuery.length > 0;
  const hasActiveFilter = sortOption !== null;
  const isRouteListMode = !routeId && !hasActiveSearch;

  const searchResults = normalizedSearchQuery
    ? homeData.routes.filter((route) => {
        const searchableTags = route.tags.join(' ').toLowerCase();
        return (
          route.city.toLowerCase().includes(normalizedSearchQuery) ||
          route.name.toLowerCase().includes(normalizedSearchQuery) ||
          route.description.toLowerCase().includes(normalizedSearchQuery) ||
          searchableTags.includes(normalizedSearchQuery)
        );
      })
    : [];

  const routeListResults = sortRoutes(homeData.routes, sortOption);
  const visibleSearchResults = sortRoutes(searchResults, sortOption);
  const selectedRoute: Route | null = useMemo(
    () => homeData.routes.find((route) => route._id === routeId) ?? null,
    [homeData.routes, routeId]
  );

  useEffect(() => {
    if (!requiresAuthForDetail || isAuthenticated()) {
      return;
    }

    const currentLocation = `${window.location.pathname}${window.location.search}`;
    const redirectTarget = encodeURIComponent(currentLocation);
    window.location.href = `/login?redirect=${redirectTarget}`;
  }, [requiresAuthForDetail]);

  useEffect(() => {
    let mounted = true;

    const loadRouteData = async (): Promise<void> => {
      try {
        const result = await routeDataProvider.getHomeData();

        if (mounted) {
          setHomeData(result);
          setError('');
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof Error) {
          setError(loadError.message);
        } else {
          setError('Unable to load route information.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRouteData();

    return () => {
      mounted = false;
    };
  }, []);

  const clearSearch = (): void => {
    setSearchInput('');
    setSortOption(null);
    setIsFilterOpen(false);
  };

  const handleSelectSortOption = (option: SortOption): void => {
    setSortOption(option);
    setIsFilterOpen(false);
  };

  return (
    <main className="route-page">
      <TopNav activeTopNav="routes" />

      <section className="route-shell">
        <SearchArea
          searchInput={searchInput}
          isSearchActive={isSearchActive}
          hasActiveFilter={hasActiveFilter}
          isFilterOpen={isFilterOpen}
          sortOption={sortOption}
          onSearchChange={setSearchInput}
          onSearchFocus={() => setIsSearchFocused(true)}
          onSearchBlur={() => setIsSearchFocused(false)}
          onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
          onClearSearch={clearSearch}
          onSelectSortOption={handleSelectSortOption}
        />

        {!isLoading && !error && isRouteListMode ? <SearchResults routes={routeListResults} /> : null}

        {hasActiveSearch ? <SearchResults routes={visibleSearchResults} /> : null}

        {isLoading ? <p className="status-message">Loading route information...</p> : null}
        {!isLoading && error ? <p className="status-message error">{error}</p> : null}

        {!isLoading && !error && routeId && !selectedRoute ? (
          <p className="status-message error">Route not found.</p>
        ) : null}

        {!isLoading && !error && selectedRoute ? (
          <>
            <RouteHeroSection
              name={selectedRoute.name}
              coverImage={selectedRoute.cover_image}
              city={selectedRoute.city}
              country={selectedRoute.country}
              difficulty={selectedRoute.difficulty}
              distance={selectedRoute.distance}
              duration={selectedRoute.duration}
              tags={selectedRoute.tags}
            />

            <RouteQuickFacts
              distance={selectedRoute.distance}
              duration={selectedRoute.duration}
            />

            <RouteDescriptionSection description={selectedRoute.description} />

            <RouteHighlights tags={selectedRoute.tags} />

            <RouteGallery
              routeName={selectedRoute.name}
              coverImage={selectedRoute.cover_image}
              galleryItems={selectedRoute.images}
            />
          </>
        ) : null}
      </section>
    </main>
  );
}

export default RouteApp;