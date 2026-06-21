import { useState } from 'react';
import { FaHeart, FaRegHeart, FaStar, FaWheelchair } from 'react-icons/fa';
import type { Route } from '../../../types/route';
import { getDifficultyBadgePath, getRouteImage } from '../../../utils/homeView';
import { buildRouteDetailUrl } from '../../../utils/routeNavigation';
import { getStoredUser, isAuthenticated, saveStoredSessionUser } from '../../../services/authService';
import { toggleFavoriteRouteByUserId } from '../../../services/profileService';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { TranslationKey } from '../../../i18n/translations';

interface PopularRoutesSectionProps {
  routes: Route[];
}

const difficultyKeys: Record<Route['difficulty'], TranslationKey> = {
  easy: 'common.difficulty.easy',
  medium: 'common.difficulty.medium',
  hard: 'common.difficulty.hard'
};

function PopularRoutesSection({ routes }: PopularRoutesSectionProps) {
  const { t } = useLanguage();
  const storedUser = getStoredUser();
  const canUseFavorites = isAuthenticated() && Boolean(storedUser?._id);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(storedUser?.favoriteRoutes ?? []);

  const handleToggleFavorite = async (event: React.MouseEvent<HTMLButtonElement>, routeId: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUseFavorites || !storedUser?._id) {
      return;
    }

    try {
      const updatedFavorites = await toggleFavoriteRouteByUserId(storedUser._id, routeId);
      const updatedFavoriteIds = updatedFavorites.map((route) => route._id);

      setFavoriteIds(updatedFavoriteIds);
      saveStoredSessionUser({
        ...storedUser,
        favoriteRoutes: updatedFavoriteIds,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <section className="content-block" aria-label={t('home.popularRoutes')}>
      <header className="block-head">
        <h2>{t('home.popularRoutes')}</h2>
      </header>

      <div className="scroll-strip popular-strip">
        {routes.map((route) => {
          const isFavorite = favoriteIds.includes(route._id);
          const formattedRating =
            typeof route.ratingAverage === 'number' && Number.isFinite(route.ratingAverage)
              ? route.ratingAverage.toFixed(1)
              : '-';

          return (
            <article className="popular-card" key={route._id}>
              <a className="route-card-link" href={buildRouteDetailUrl(route._id)}>
                {canUseFavorites ? (
                  <button
                    type="button"
                    className="popular-card-favorite-button"
                    onClick={(event) => handleToggleFavorite(event, route._id)}
                    aria-label={isFavorite ? t('common.removeFavorite') : t('common.addFavorite')}
                  >
                    {isFavorite ? <FaHeart /> : <FaRegHeart />}
                  </button>
                ) : null}

                <img src={getRouteImage(route)} alt={route.name} loading="lazy" />
                <h3>{route.name}</h3>
                <p>
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
                  <span>· {route.city}, {route.country}</span>
                </p>
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default PopularRoutesSection;
