import type { Route } from '../../../types/route';
import { FaStar, FaWheelchair } from 'react-icons/fa';
import {
  getDifficultyBadgePath,
  getFeaturedOverlayText,
  getRouteImage,
  toTitleCase
} from '../../../utils/homeView';
import { buildRouteDetailUrl } from '../../../utils/routeNavigation';

interface FeaturedRoutesSectionProps {
  routes: Route[];
}

function FeaturedRoutesSection({ routes }: FeaturedRoutesSectionProps) {
  return (
    <section className="content-block" aria-label="Featured routes">
      <header className="block-head">
        <h2>Featured routes</h2>
      </header>

      <div className="scroll-strip featured-strip">
        {routes.map((route, index) => {
          const featuredLabel = getFeaturedOverlayText(index);
          const formattedRating =
            typeof route.ratingAverage === 'number' && Number.isFinite(route.ratingAverage)
              ? route.ratingAverage.toFixed(1)
              : '-';

          return (
            <article className="featured-item" key={route._id}>
              <a className="route-card-link" href={buildRouteDetailUrl(route._id)}>
                <div
                  className="featured-card"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(5, 8, 18, 0.16) 22%, rgba(5, 8, 18, 0.72) 100%), url(${getRouteImage(route)})`
                  }}
                >
                  <h3>{featuredLabel}</h3>
                </div>

                <h4>{route.name}</h4>
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
                  <span>{toTitleCase(route.difficulty)}</span>
                  {route.wheelchairAccessible ? (
                    <span className="route-card-accessible" aria-label="Wheelchair accessible">
                      <FaWheelchair aria-hidden="true" />
                      Accessible
                    </span>
                  ) : null}
                  <span className="route-card-rating" aria-label={`Average rating ${formattedRating}`}>
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

export default FeaturedRoutesSection;
