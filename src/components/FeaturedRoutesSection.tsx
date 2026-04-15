import type { Route } from '../types/route';
import {
  getDifficultyBadgePath,
  getFeaturedOverlayText,
  getRouteImage,
  toTitleCase
} from '../utils/homeView';

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

          return (
            <article className="featured-item" key={route._id}>
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
                {toTitleCase(route.difficulty)} · {route.city}, {route.country}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default FeaturedRoutesSection;
