import { useState } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import type { Route } from '../../../types/route';
import { getDifficultyBadgePath, getRouteImage, toTitleCase } from '../../../utils/homeView';
import { buildRouteDetailUrl } from '../../../utils/routeNavigation';
import { getStoredUser, isAuthenticated, saveStoredSessionUser } from '../../../services/authService';
import { toggleFavoriteRouteByUserId } from '../../../services/profileService';

interface PopularRoutesSectionProps {
  routes: Route[];
}

function PopularRoutesSection({ routes }: PopularRoutesSectionProps) {
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
    <section className="content-block" aria-label="Top 5 popular routes">
      <header className="block-head">
        <h2>Top 5 popular routes</h2>
      </header>

      <div className="scroll-strip popular-strip">
        {routes.map((route) => {
          const isFavorite = favoriteIds.includes(route._id);

          return (
            <article className="popular-card" key={route._id}>
              <a className="route-card-link" href={buildRouteDetailUrl(route._id)}>
                {canUseFavorites ? (
                  <button
                    type="button"
                    className="popular-card-favorite-button"
                    onClick={(event) => handleToggleFavorite(event, route._id)}
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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
                  {toTitleCase(route.difficulty)} · {route.city}, {route.country}
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