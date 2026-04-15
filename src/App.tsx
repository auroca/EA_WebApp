import { useEffect, useMemo, useState } from 'react';
import './index.css';
import FeaturedRoutesSection from './components/FeaturedRoutesSection';
import PopularRoutesSection from './components/PopularRoutesSection';
import SearchArea from './components/SearchArea';
import SearchResults from './components/SearchResults';
import TopNav from './components/TopNav';
import VisitedCitiesSection from './components/VisitedCitiesSection';
import { emptyHomeData, routeDataProvider } from './services/routeService';
import type { HomeRoutesData, Route } from './types/route';
import { sortRoutes, type SortOption, type TopNavKey } from './utils/homeView';

function App() {
  const activeTopNav: TopNavKey = 'home';
  const [homeData, setHomeData] = useState<HomeRoutesData>(emptyHomeData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption | null>(null);

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
        cityImage: chosenRoute.cover_image
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
  const visibleSearchResults = sortRoutes(searchResults, sortOption);

  const clearSearch = (): void => {
    setSearchInput('');
    setSortOption(null);
    setIsFilterOpen(false);
  };

  const handleSelectSortOption = (option: SortOption): void => {
    setSortOption(option);
    setIsFilterOpen(false);
  };

  useEffect(() => {
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
  }, []);

  return (
    <main className="home-page">
      <TopNav activeTopNav={activeTopNav} />

      <section className="home-content">
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

        {hasActiveSearch ? <SearchResults routes={visibleSearchResults} /> : null}

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
