import type { Route } from '../types/route';
import { getDifficultyBadgePath, toTitleCase } from '../utils/homeView';
import { buildRouteDetailUrl } from '../utils/routeNavigation';

interface SearchResultsProps {
  routes: Route[];
}

function SearchResults({ routes }: SearchResultsProps) {
  return (
    <section className="search-results" aria-label="Search results">
      <header className="block-head">
        <h2>Search results</h2>
      </header>

      {routes.length === 0 ? (
        <p className="status-message">No matching routes found.</p>
      ) : (
        <div className="search-results-list">
          {routes.map((route) => (
            <article className="search-result-item" key={route._id}>
              <a className="search-result-link" href={buildRouteDetailUrl(route._id)}>
                <img src={route.cover_image} alt={route.name} loading="lazy" />
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
                    <span>{toTitleCase(route.difficulty)}</span>
                  </div>
                  <p>{route.description}</p>
                  <span>
                    {route.city}, {route.country}
                  </span>
                </div>
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default SearchResults;
