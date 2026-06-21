import { useEffect, useState } from 'react';
import SearchArea from '../../shared/SearchArea';
import type { AccessibilityFilter } from '../../shared/SearchArea';
import SearchResults from '../../shared/SearchResults';
import TopNav from '../../shared/TopNav';
import { getStoredUser, isAuthenticated } from '../../../services/authService';
import { getFavoriteRoutesByUserId } from '../../../services/profileService';
import type { Route } from '../../../types/route';
import { sortRoutes, type SortOption } from '../../../utils/homeView';
import { useLanguage } from '../../../i18n/LanguageContext';

const DEFAULT_PAGE_SIZE = 10;

function FavoritesPage() {
  const { t } = useLanguage();
  const [favoriteRoutes, setFavoriteRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [accessibilityFilter, setAccessibilityFilter] = useState<AccessibilityFilter>('all');

  const user = getStoredUser();
  const normalizedSearchQuery = searchInput.trim().toLowerCase();
  const isSearchActive = isSearchFocused || searchInput.trim().length > 0;
  const hasActiveFilter = sortOption !== null || accessibilityFilter !== 'all';

  const filteredFavoriteRoutes = favoriteRoutes.filter((route) => {
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

  const sortedFavoriteRoutes = sortRoutes(filteredFavoriteRoutes, sortOption);
  const totalResults = sortedFavoriteRoutes.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const visibleFavoriteRoutes = sortedFavoriteRoutes.slice(startIndex, endIndex);

  useEffect(() => {
    if (!isAuthenticated() || !user?._id) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    let mounted = true;

    const loadFavoriteRoutes = async (): Promise<void> => {
      try {
        const routes = await getFavoriteRoutesByUserId(user._id);

        if (mounted) {
          setFavoriteRoutes(routes);
          setError('');
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof Error) {
          setError(loadError.message);
        } else {
          setError(t('favorites.loadError'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadFavoriteRoutes();

    return () => {
      mounted = false;
    };
  }, [user?._id]);

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

  return (
    <main className="home-page">
      <TopNav activeTopNav={'favorites'} />

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

        {isLoading ? <p className="status-message">{t('favorites.loading')}</p> : null}
        {!isLoading && error ? <p className="status-message error">{error}</p> : null}

        {!isLoading && !error ? (
          <SearchResults
            title={t('favorites.title')}
            routes={visibleFavoriteRoutes}
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

export default FavoritesPage;
