import { useEffect, useState } from 'react';
import { FaHeart, FaRegHeart, FaStar, FaWheelchair } from 'react-icons/fa';
import { getStoredUser, isAuthenticated, saveStoredSessionUser } from '../../services/authService';
import { toggleFavoriteRouteByUserId } from '../../services/profileService';
import type { Route } from '../../types/route';
import { getDifficultyBadgePath, getRouteImage } from '../../utils/homeView';
import { buildRouteDetailUrl } from '../../utils/routeNavigation';
import { useLanguage } from '../../i18n/LanguageContext';
import type { TranslationKey } from '../../i18n/translations';

interface SearchResultsProps {
  title?: string;
  routes: Route[];
  totalResults: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
}

const difficultyKeys: Record<Route['difficulty'], TranslationKey> = {
  easy: 'common.difficulty.easy',
  medium: 'common.difficulty.medium',
  hard: 'common.difficulty.hard'
};

function SearchResults({
  title = 'Search results',
  routes,
  totalResults,
  currentPage,
  pageSize,
  totalPages,
  onPreviousPage,
  onNextPage,
  onPageSizeChange
}: SearchResultsProps) {
  const { t } = useLanguage();
  const storedUser = getStoredUser();
  const [favoriteIds, setFavoriteIds] = useState<string[]>(storedUser?.favoriteRoutes ?? []);
  const startResult = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endResult = Math.min(currentPage * pageSize, totalResults);

  useEffect(() => {
    setFavoriteIds(getStoredUser()?.favoriteRoutes ?? []);
  }, []);

  const handleToggleFavorite = async (
    event: React.MouseEvent<HTMLButtonElement>,
    routeId: string
  ): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated() || !storedUser?._id) {
      return;
    }

    try {
      const updatedFavorites = await toggleFavoriteRouteByUserId(storedUser._id, routeId);
      const updatedFavoriteIds = updatedFavorites.map((route) => route._id);

      setFavoriteIds(updatedFavoriteIds);
      saveStoredSessionUser({
        ...storedUser,
        favoriteRoutes: updatedFavoriteIds
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <section className="search-results" aria-label={t('search.results')}>
      <header className="block-head">
        <h2>{title === 'Search results' ? t('search.results') : title}</h2>
      </header>

      {totalResults > 0 ? (
        <div className="search-results-toolbar">
          <div className="search-results-summary">
            {t('search.showing', { start: startResult, end: endResult, total: totalResults })}
          </div>

          <label className="search-results-size" htmlFor="search-results-page-size">
            {t('search.show')}
            <select
              id="search-results-page-size"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            {t('search.perPage')}
          </label>

          <div className="search-results-pagination" aria-label={t('search.results')}>
            <button
              type="button"
              className="search-results-page-button"
              onClick={onPreviousPage}
              disabled={currentPage <= 1}
            >
              {t('common.back')}
            </button>
            <span className="search-results-page-indicator">
              {t('search.page', { current: currentPage, total: totalPages })}
            </span>
            <button
              type="button"
              className="search-results-page-button"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      ) : null}

      {routes.length === 0 ? (
        <p className="status-message">{t('search.noResults')}</p>
      ) : (
        <div className="search-results-list">
          {routes.map((route) => {
            const isFavorite = favoriteIds.includes(route._id);
            const formattedRating =
              typeof route.ratingAverage === 'number' && Number.isFinite(route.ratingAverage)
                ? route.ratingAverage.toFixed(1)
                : '-';

            return (
              <article className="search-result-item" key={route._id}>
                <button
                  type="button"
                  className="search-result-favorite-button"
                  onClick={(event) => {
                    void handleToggleFavorite(event, route._id);
                  }}
                  aria-label={isFavorite ? t('common.removeFavorite') : t('common.addFavorite')}
                >
                  {isFavorite ? <FaHeart /> : <FaRegHeart />}
                </button>

                <a className="search-result-link" href={buildRouteDetailUrl(route._id)}>
                  <img src={getRouteImage(route)} alt={route.name} loading="lazy" />
                  <div className="search-result-content">
                    <h3>{route.name}</h3>
                    <div className="search-result-meta">
                      <img
                        className="difficulty-badge"
                        src={getDifficultyBadgePath(route.difficulty)}
                        alt=""
                        aria-hidden="true"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                      <span>{t(difficultyKeys[route.difficulty])}</span>
                      {route.wheelchairAccessible ? (
                        <span className="route-card-accessible" aria-label={t('common.accessible')}>
                          <FaWheelchair aria-hidden="true" />
                          {t('common.accessible')}
                        </span>
                      ) : null}
                      <span className="route-card-rating" aria-label={t('common.averageRating', { rating: formattedRating })}>
                        <FaStar aria-hidden="true" />
                        {formattedRating}
                      </span>
                    </div>
                    <p>{route.description}</p>
                    <span>
                      {route.city}, {route.country}
                    </span>
                  </div>
                </a>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SearchResults;
