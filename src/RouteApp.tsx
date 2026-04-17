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
import type { HomeRoutesData, Route, RoutePageData } from './types/route';
import { getRouteImage, sortRoutes, type SortOption } from './utils/homeView';
import { getRouteIdFromSearch, getSearchTextFromSearch } from './utils/routeNavigation';

function RouteApp() {
  const initialRouteId = getRouteIdFromSearch(window.location.search);
  const initialSearchText = getSearchTextFromSearch(window.location.search);
  const initialIsRouteListMode = initialRouteId.length === 0 && initialSearchText.trim().length === 0;
  const initialIsRouteDetailOrSearch = !initialIsRouteListMode;

  const [fullRouteData, setFullRouteData] = useState<HomeRoutesData>(emptyHomeData);
  const [routePageData, setRoutePageData] = useState<RoutePageData>({
    routes: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1
    }
  });
  const [isListLoading, setIsListLoading] = useState<boolean>(initialIsRouteListMode);
  const [isFullRoutesLoading, setIsFullRoutesLoading] = useState<boolean>(initialIsRouteDetailOrSearch);
  const [error, setError] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>(() =>
    initialSearchText
  );
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [listPage, setListPage] = useState<number>(1);
  const [listPageSize, setListPageSize] = useState<number>(10);
  const [searchPage, setSearchPage] = useState<number>(1);
  const [searchPageSize, setSearchPageSize] = useState<number>(10);

  const routeId = initialRouteId;
  const requiresAuthForDetail = routeId.length > 0;
  const isSearchActive = isSearchFocused || searchInput.trim().length > 0;
  const normalizedSearchQuery = searchInput.trim().toLowerCase();
  const hasActiveSearch = normalizedSearchQuery.length > 0;
  const hasActiveFilter = sortOption !== null;
  const isRouteListMode = !routeId && !hasActiveSearch;

  const searchResults = normalizedSearchQuery
    ? fullRouteData.routes.filter((route) => {
        const searchableTags = route.tags.join(' ').toLowerCase();
        return (
          route.city.toLowerCase().includes(normalizedSearchQuery) ||
          route.name.toLowerCase().includes(normalizedSearchQuery) ||
          route.description.toLowerCase().includes(normalizedSearchQuery) ||
          searchableTags.includes(normalizedSearchQuery)
        );
      })
    : [];

  const routeListResults = sortRoutes(routePageData.routes, sortOption);
  const visibleSearchResults = sortRoutes(searchResults, sortOption);
  const totalRouteListResults = routePageData.pagination.total;
  const totalRouteListPages = routePageData.pagination.totalPages;
  const safeListPage = Math.min(routePageData.pagination.page, totalRouteListPages);
  const pagedRouteListResults = routeListResults;
  const totalSearchResults = visibleSearchResults.length;
  const totalSearchPages = Math.max(1, Math.ceil(totalSearchResults / searchPageSize));
  const safeSearchPage = Math.min(searchPage, totalSearchPages);
  const pagedSearchResults = visibleSearchResults.slice(
    (safeSearchPage - 1) * searchPageSize,
    safeSearchPage * searchPageSize
  );
  const selectedRoute: Route | null = useMemo(
    () => fullRouteData.routes.find((route) => route._id === routeId) ?? null,
    [fullRouteData.routes, routeId]
  );

  useEffect(() => {
    setListPage(1);
    setSearchPage(1);
  }, [normalizedSearchQuery, sortOption, listPageSize, searchPageSize]);

  useEffect(() => {
    if (searchPage > totalSearchPages) {
      setSearchPage(totalSearchPages);
    }
  }, [searchPage, totalSearchPages]);

  useEffect(() => {
    if (!isRouteListMode) {
      return;
    }

    let mounted = true;

    const loadRoutePage = async (): Promise<void> => {
      setIsListLoading(true);
      try {
        const result = await routeDataProvider.getRoutePage({
          page: listPage,
          limit: listPageSize
        });

        if (mounted) {
          setRoutePageData(result);
          setError('');
          setIsListLoading(false);
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof Error) {
          setError(loadError.message);
        } else {
          setError('Unable to load route list.');
        }
      } finally {
        if (mounted) {
          setIsListLoading(false);
        }
      }
    };

    void loadRoutePage();

    return () => {
      mounted = false;
    };
  }, [isRouteListMode, listPage, listPageSize]);

  useEffect(() => {
    if (!hasActiveSearch && !routeId) {
      return;
    }

    if (fullRouteData.routes.length > 0) {
      return;
    }

    let mounted = true;

    const loadFullRoutes = async (): Promise<void> => {
      setIsFullRoutesLoading(true);
      try {
        const result = await routeDataProvider.getHomeData();

        if (mounted) {
          setFullRouteData(result);
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
          setIsFullRoutesLoading(false);
        }
      }
    };

    void loadFullRoutes();

    return () => {
      mounted = false;
    };
  }, [fullRouteData.routes.length, hasActiveSearch, routeId]);

  useEffect(() => {
    if (!requiresAuthForDetail || isAuthenticated()) {
      return;
    }

    const currentLocation = `${window.location.pathname}${window.location.search}`;
    const redirectTarget = encodeURIComponent(currentLocation);
    window.location.href = `/login?redirect=${redirectTarget}`;
  }, [requiresAuthForDetail]);

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

        {!error && isRouteListMode && !isListLoading ? (
          <SearchResults
            title="Routes"
            routes={pagedRouteListResults}
            totalResults={totalRouteListResults}
            currentPage={safeListPage}
            pageSize={listPageSize}
            totalPages={totalRouteListPages}
            onPreviousPage={() => setListPage((current) => Math.max(1, current - 1))}
            onNextPage={() => setListPage((current) => Math.min(totalRouteListPages, current + 1))}
            onPageSizeChange={(value) => setListPageSize(value)}
          />
        ) : null}

        {hasActiveSearch ? (
          <SearchResults
            routes={pagedSearchResults}
            totalResults={totalSearchResults}
            currentPage={safeSearchPage}
            pageSize={searchPageSize}
            totalPages={totalSearchPages}
            onPreviousPage={() => setSearchPage((current) => Math.max(1, current - 1))}
            onNextPage={() => setSearchPage((current) => Math.min(totalSearchPages, current + 1))}
            onPageSizeChange={(value) => setSearchPageSize(value)}
          />
        ) : null}

        {(isRouteListMode && isListLoading) || (!isRouteListMode && isFullRoutesLoading) ? (
          <p className="status-message">Loading route information...</p>
        ) : null}
        {!isFullRoutesLoading && error ? (
          <p className="status-message error">{error}</p>
        ) : null}

        {!isFullRoutesLoading && routeId && !selectedRoute ? (
          <p className="status-message error">Route not found.</p>
        ) : null}

        {!isFullRoutesLoading && selectedRoute ? (
          <>
            <RouteHeroSection
              name={selectedRoute.name}
              coverImage={getRouteImage(selectedRoute)}
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
              coverImage={getRouteImage(selectedRoute)}
              galleryItems={selectedRoute.images}
            />
          </>
        ) : null}
      </section>
    </main>
  );
}

export default RouteApp;