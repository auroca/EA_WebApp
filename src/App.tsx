import { useEffect, useMemo, useState } from 'react';
import './index.css';
import AuthPage from './components/pages/auth/AuthPage';
import FavoritesPage from './components/pages/favorites/FavoritesPage';
import ChatPage from './components/pages/chat/ChatPage';
import FeaturedRoutesSection from './components/pages/home/FeaturedRoutesSection';
import PopularRoutesSection from './components/pages/home/PopularRoutesSection';
import ProfilePage from './components/pages/profile/ProfilePage';
import RoutesPage from './components/pages/routes/RoutesPage';
import CreateRoutePage from './components/pages/routes/CreateRoutePage';
import SearchArea from './components/shared/SearchArea';
import SearchResults from './components/shared/SearchResults';
import TopNav from './components/shared/TopNav';
import VisitedCitiesSection from './components/pages/home/VisitedCitiesSection';
import { emptyHomeData, routeDataProvider } from './services/routeService';
import type { AuthMode } from './types/auth';
import type { HomeRoutesData, Route } from './types/route';
import { getRouteImage, sortRoutes, type SortOption, type TopNavKey } from './utils/homeView';
import AccessibilityPanel from './components/shared/AccessibilityPanel';
import { getStoredSession, isAuthenticated } from './services/authService';
import { registerPushNotificationsForUser } from './services/notificationService';

declare global {
  interface Window {
    _mtm?: Array<Record<string, unknown>>;
  }
}

const DEFAULT_SEARCH_PAGE_SIZE = 10;

interface WebPushToast {
  title: string;
  body: string;
  data: Record<string, string>;
}

const normalizePath = (path: string): string => {
  const cleanPath = path.trim();

  if (cleanPath === '' || cleanPath === '/' || cleanPath === '/index.html') {
    return '/';
  }

  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    return cleanPath.slice(0, -1);
  }

  return cleanPath;
};

const getCurrentPath = (): string => normalizePath(window.location.pathname);

function App() {
  useEffect(() => {
    if (document.getElementById('matomo-tag-manager')) {
      return;
    }

    const _mtm = (window._mtm = window._mtm || []);

    _mtm.push({
      'mtm.startTime': new Date().getTime(),
      event: 'mtm.Start'
    });

    const script = document.createElement('script');
    script.id = 'matomo-tag-manager';
    script.async = true;
    script.src =
      'https://cdn.matomo.cloud/jairolopez.matomo.cloud/container_nXVcsiT4_dev_b970ac5fc8f6d44e08172a65.js';

    document.head.appendChild(script);
  }, []);


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
  const [webPushToast, setWebPushToast] = useState<WebPushToast | null>(null);

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
    const nextPath = normalizePath(path);

    if (getCurrentPath() !== nextPath) {
      window.history.pushState({}, '', nextPath);
      setCurrentPath(nextPath);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const getNotificationPath = (data: Record<string, string>): string => {
    if (data.type === 'chat' && data.chatId) {
      return `/chats?chatId=${encodeURIComponent(data.chatId)}`;
    }

    if (data.type === 'route' && data.routeId) {
      return `/route.html?id=${encodeURIComponent(data.routeId)}`;
    }

    return '/';
  };

  const renderWebPushToast = () => {
    if (!webPushToast) {
      return null;
    }

    return (
      <button
        type="button"
        className="web-push-toast"
        onClick={() => {
          const path = getNotificationPath(webPushToast.data);

          if (path.startsWith('/route.html') || path.includes('?')) {
            window.location.href = path;
            return;
          }

          navigateTo(path);
          setWebPushToast(null);
        }}
      >
        <span className="web-push-toast-title">{webPushToast.title}</span>
        {webPushToast.body ? <span className="web-push-toast-body">{webPushToast.body}</span> : null}
      </button>
    );
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
    const session = getStoredSession();

    if (!session) {
      return;
    }

    void registerPushNotificationsForUser(session.user, session.token, {
      requestPermission: false,
    }).catch((pushError) => {
      console.warn('[Web push registration failed]', pushError);
    });
  }, []);

  useEffect(() => {
    const handlePushNotification = (event: Event): void => {
      const detail = (event as CustomEvent<WebPushToast>).detail;

      if (!detail) {
        return;
      }

      setWebPushToast(detail);
      window.setTimeout(() => setWebPushToast(null), 7000);
    };

    window.addEventListener('trip2guide:push-notification', handlePushNotification);

    return () => {
      window.removeEventListener('trip2guide:push-notification', handlePushNotification);
    };
  }, []);

  useEffect(() => {
    if (currentPath !== '/') {
      return;
    }

    let mounted = true;

    const loadHomeData = async (): Promise<void> => {
      try {
        setIsLoading(true);
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
        {renderWebPushToast()}
      </>
    );
  }

  if (currentPath === '/favorites') {
    return (
      <>
        <FavoritesPage />
        <AccessibilityPanel />
        {renderWebPushToast()}
      </>
    );
  }

  if (currentPath === '/chats') {
    return (
      <>
        <ChatPage />
        <AccessibilityPanel />
        {renderWebPushToast()}
      </>
    );
  }

  if (currentPath === '/routes/create') {
    if (!isAuthenticated()) {
      window.location.href = `/login?redirect=${encodeURIComponent('/routes/create')}`;
      return null;
    }

    return (
      <>
        <CreateRoutePage onNavigate={navigateTo} />
        <AccessibilityPanel />
        {renderWebPushToast()}
      </>
    );
  }

  if (currentPath === '/routes') {
    return (
      <>
        <RoutesPage onNavigate={navigateTo} />
        <AccessibilityPanel />
        {renderWebPushToast()}
      </>
    );
  }

  return (
    <main className="home-page">
      <TopNav activeTopNav={activeTopNav} />
      <AccessibilityPanel />
      {renderWebPushToast()}

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
