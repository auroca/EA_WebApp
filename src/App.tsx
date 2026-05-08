import { useEffect, useMemo, useState } from 'react';
import './index.css';
import AuthPage from './components/pages/auth/AuthPage';
import FavoritesPage from './components/pages/favorites/FavoritesPage';
import FeaturedRoutesSection from './components/pages/home/FeaturedRoutesSection';
import PopularRoutesSection from './components/pages/home/PopularRoutesSection';
import ProfilePage from './components/pages/profile/ProfilePage';
import RoutesPage from './components/pages/routes/RoutesPage';
import SearchArea from './components/shared/SearchArea';
import SearchResults from './components/shared/SearchResults';
import TopNav from './components/shared/TopNav';
import VisitedCitiesSection from './components/pages/home/VisitedCitiesSection';
import { emptyHomeData, routeDataProvider } from './services/routeService';
import type { AuthMode } from './types/auth';
import type { HomeRoutesData, Route } from './types/route';
import { getRouteImage, sortRoutes, type SortOption, type TopNavKey } from './utils/homeView';
import AccessibilityPanel from './components/shared/AccessibilityPanel';

const DEFAULT_SEARCH_PAGE_SIZE = 10;

const getCurrentPath = (): string => {
  const path = window.location.pathname.trim();

  if (path === '' || path === '/' || path === '/index.html') {
    return '/';
  }

  return path;
};

function App() {
  const [currentPath, setCurrentPath] = useState<string>(getCurrentPath());
  const activeTopNav: TopNavKey = 'home';
  const [homeData, setHomeData] = useState<HomeRoutesData>(emptyHomeData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [searchPage, setSearchPage] = useState<number>(1);
  const [searchPageSize, setSearchPageSize] = useState<number>(DEFAULT_SEARCH_PAGE_SIZE);

  const isSearchActive = isSearchFocused || searchInput.trim().length > 0;
  const newestRoutes = homeData.routes.slice(-3);
  const routesById = new Map(homeData.routes.map((route) => [route._id, route]));
  const configuredPopularRoutes = homeData.popularRouteIds
    .map((routeId) => routesById.get(routeId))
    .filter((route): route is Route => Boolean(route));

  const popularRoutes =
    configuredPopularRoutes.length > 0
      ? configuredPopularRoutes.slice(0, 5)
      : homeData.routes.slice(0, 5);

  const nearbyLocations = useMemo(() => {
    const groupedByCity = new Map<string, Route[]>();

    for (const route of homeData.routes) {
      const cityKey = `${route.city}-${route.country}`;
      const current = groupedByCity.get(cityKey) ?? [];
      current.push(route);
      groupedByCity.set(cityKey, current);
    }

    return [...groupedByCity.entries()].map(([cityKey, routes]) => {
      const randomIndex = Math.floor(Math.random() * routes.length);
      const chosenRoute = routes[randomIndex];

      return {
        id: cityKey,
        city: chosenRoute.city,
        country: chosenRoute.country,
        cityImage: getRouteImage(chosenRoute)
      };
    });
  }, [homeData.routes]);

  const normalizedSearchQuery = searchInput.trim().toLowerCase();
  const hasActiveSearch = normalizedSearchQuery.length > 0;
  const hasActiveFilter = sortOption !== null;

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

  const sortedSearchResults = sortRoutes(searchResults, sortOption);
  const totalResults = sortedSearchResults.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / searchPageSize));
  const safeCurrentPage = Math.min(searchPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * searchPageSize;
  const endIndex = startIndex + searchPageSize;
  const visibleSearchResults = sortedSearchResults.slice(startIndex, endIndex);

  const clearSearch = (): void => {
    setSearchInput('');
    setSortOption(null);
    setIsFilterOpen(false);
    setSearchPage(1);
    setSearchPageSize(DEFAULT_SEARCH_PAGE_SIZE);
  };

  const handleSelectSortOption = (option: SortOption): void => {
    setSortOption(option);
    setIsFilterOpen(false);
    setSearchPage(1);
  };

  const handleSearchChange = (value: string): void => {
    setSearchInput(value);
    setSearchPage(1);
  };

  const handlePreviousPage = (): void => {
    setSearchPage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleNextPage = (): void => {
    setSearchPage((prev) => Math.min(totalPages, prev + 1));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handlePageSizeChange = (pageSize: number): void => {
    setSearchPageSize(pageSize);
    setSearchPage(1);
  };

  const navigateTo = (path: string): void => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  useEffect(() => {
    const handlePopState = (): void => {
      setCurrentPath(getCurrentPath());
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (currentPath !== '/') {
      return;
    }

    let mounted = true;

    const loadHomeData = async (): Promise<void> => {
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
          setError('Unable to load home information.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadHomeData();

    return () => {
      mounted = false;
    };
  }, [currentPath]);

  useEffect(() => {
    setSearchPage(1);
  }, [normalizedSearchQuery]);

  useEffect(() => {
    if (searchPage > totalPages) {
      setSearchPage(totalPages);
    }
  }, [searchPage, totalPages]);

  if (currentPath === '/login') {
    return <AuthPage mode={'login' as AuthMode} onNavigate={navigateTo} />;
  }

  if (currentPath === '/register') {
    return <AuthPage mode={'register' as AuthMode} onNavigate={navigateTo} />;
  }

  if (currentPath === '/profile') {
    return (
      <>
        <ProfilePage onNavigate={navigateTo} />
        <AccessibilityPanel />
      </>
    );
  }

  if (currentPath === '/favorites') {
    return (
      <>
        <FavoritesPage />
        <AccessibilityPanel />
      </>
    );
  }

  if (currentPath === '/routes') {
    return (
      <>
        <RoutesPage />
        <AccessibilityPanel />
      </>
    );
  }

  return (
    <main className="home-page">
      <TopNav activeTopNav={activeTopNav} />
      <AccessibilityPanel />

      <section className="home-content">
        <SearchArea
          searchInput={searchInput}
          isSearchActive={isSearchActive}
          hasActiveFilter={hasActiveFilter}
          isFilterOpen={isFilterOpen}
          sortOption={sortOption}
          onSearchChange={handleSearchChange}
          onSearchFocus={() => setIsSearchFocused(true)}
          onSearchBlur={() => setIsSearchFocused(false)}
          onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
          onClearSearch={clearSearch}
          onSelectSortOption={handleSelectSortOption}
        />

        {hasActiveSearch ? (
          <SearchResults
            routes={visibleSearchResults}
            totalResults={totalResults}
            currentPage={safeCurrentPage}
            pageSize={searchPageSize}
            totalPages={totalPages}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
            onPageSizeChange={handlePageSizeChange}
          />
        ) : null}

        {isLoading ? <p className="status-message">Loading home content...</p> : null}
        {!isLoading && error ? <p className="status-message error">{error}</p> : null}

        {!isLoading && !error && !hasActiveSearch ? (
          <>
            <FeaturedRoutesSection routes={newestRoutes} />
            <VisitedCitiesSection nearbyLocations={nearbyLocations} />
            <PopularRoutesSection routes={popularRoutes} />
          </>
        ) : null}
      </section>
    </main>
  );
}

export default App;