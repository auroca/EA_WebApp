import type { Route } from '../types/route';
import { getDifficultyBadgePath, getRouteImage, toTitleCase } from '../utils/homeView';

interface PopularRoutesSectionProps {
  routes: Route[];
}

function PopularRoutesSection({ routes }: PopularRoutesSectionProps) {
  return (
    <section className="content-block" aria-label="Top 5 popular routes">
      <header className="block-head">
        <h2>Top 5 popular routes</h2>
      </header>

      <div className="scroll-strip popular-strip">
        {routes.map((route) => (
          <article className="popular-card" key={route._id}>
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
          </article>
        ))}
      </div>
    </section>
  );
}

export default PopularRoutesSection;
