import { useEffect, useState } from 'react';
import SearchArea from '../../shared/SearchArea';
import type { AccessibilityFilter } from '../../shared/SearchArea';
import SearchResults from '../../shared/SearchResults';
import TopNav from '../../shared/TopNav';
import GeneralRoutesMap from './GeneralRoutesMap';
import { routeDataProvider } from '../../../services/routeService';
import type { Route } from '../../../types/route';
import { sortRoutes, type SortOption } from '../../../utils/homeView';
import { isAuthenticated } from '../../../services/authService';
import { useLanguage } from '../../../i18n/LanguageContext';

const DEFAULT_PAGE_SIZE = 10;

interface RoutesPageProps {
  onNavigate: (path: string) => void;
}

function RoutesPage({ onNavigate }: RoutesPageProps) {
  const { t } = useLanguage();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [accessibilityFilter, setAccessibilityFilter] = useState<AccessibilityFilter>('all');
  const [showGeneralMap, setShowGeneralMap] = useState<boolean>(false);

  const normalizedSearchQuery = searchInput.trim().toLowerCase();
  const isSearchActive = isSearchFocused || searchInput.trim().length > 0;
  const hasActiveFilter = sortOption !== null || accessibilityFilter !== 'all';

  const filteredRoutes = routes.filter((route) => {
    if (accessibilityFilter !== 'all' && route.wheelchairAccessible !== (accessibilityFilter === 'yes')) {
      return false;
    }

    if (!normalizedSearchQuery) {
      return true;
    }

        const searchableTags = route.tags.join(' ').toLowerCase();

        return (
          route.city.toLowerCase().includes(normalizedSearchQuery) ||
          route.name.toLowerCase().includes(normalizedSearchQuery) ||
          route.description.toLowerCase().includes(normalizedSearchQuery) ||
          searchableTags.includes(normalizedSearchQuery)
        );
      });

  const sortedRoutes = sortRoutes(filteredRoutes, sortOption);
  const totalResults = sortedRoutes.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const visibleRoutes = sortedRoutes.slice(startIndex, endIndex);

  useEffect(() => {
    let mounted = true;

    const loadRoutes = async (): Promise<void> => {
      try {
        const result = await routeDataProvider.getHomeData();

        if (mounted) {
          setRoutes(result.routes);
          setError('');
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof Error) {
          setError(loadError.message);
        } else {
          setError(t('routes.loadError'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRoutes();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const clearSearch = (): void => {
    setSearchInput('');
    setSortOption(null);
    setAccessibilityFilter('all');
    setIsFilterOpen(false);
    setCurrentPage(1);
    setPageSize(DEFAULT_PAGE_SIZE);
  };

  const handleSelectSortOption = (option: SortOption): void => {
    setSortOption(option);
    setIsFilterOpen(false);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string): void => {
    setSearchInput(value);
    setCurrentPage(1);
  };

  const handleAccessibilityFilterChange = (value: AccessibilityFilter): void => {
    setAccessibilityFilter(value);
    setCurrentPage(1);
  };

  const handlePreviousPage = (): void => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleNextPage = (): void => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handlePageSizeChange = (nextPageSize: number): void => {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  };

  const canCreateRoute = isAuthenticated();

  return (
    <main className="home-page">
      <TopNav activeTopNav="routes" />

      <section className="home-content">
        <SearchArea
          searchInput={searchInput}
          isSearchActive={isSearchActive}
          hasActiveFilter={hasActiveFilter}
          isFilterOpen={isFilterOpen}
          sortOption={sortOption}
          accessibilityFilter={accessibilityFilter}
          onSearchChange={handleSearchChange}
          onSearchFocus={() => setIsSearchFocused(true)}
          onSearchBlur={() => setIsSearchFocused(false)}
          onToggleFilter={() => setIsFilterOpen((prev) => !prev)}
          onClearSearch={clearSearch}
          onSelectSortOption={handleSelectSortOption}
          onAccessibilityFilterChange={handleAccessibilityFilterChange}
        />

        <div className="routes-page-title-row">
          <h1>{t('routes.title')}</h1>

          <div className="routes-page-title-actions">
            <button className="routes-map-toggle-button" onClick={() => setShowGeneralMap((prev) => !prev)}>
              {showGeneralMap ? t('routes.hideZoneMap') : t('routes.generalMap')}
            </button>

            {canCreateRoute ? (
              <button className="create-route-primary-button" onClick={() => onNavigate('/routes/create')}>
                {t('routes.createRoute')}
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? <p className="status-message">{t('routes.loading')}</p> : null}
        {!isLoading && error ? <p className="status-message error">{error}</p> : null}

        {!isLoading && !error && showGeneralMap ? (
          <GeneralRoutesMap
              routes={routes}
             onSelectRoute={(routeId) => {
window.location.href = `/route.html?id=${encodeURIComponent(routeId)}`;           }}
            />
        ) : null}

        {!isLoading && !error ? (
          <SearchResults
            title=""
            routes={visibleRoutes}
            totalResults={totalResults}
            currentPage={safeCurrentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
            onPageSizeChange={handlePageSizeChange}
          />
        ) : null}
      </section>
    </main>
  );
}

export default RoutesPage;
