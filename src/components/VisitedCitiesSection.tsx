import { buildRouteSearchUrl } from '../utils/routeNavigation';

interface NearbyLocation {
  id: string;
  city: string;
  country: string;
  cityImage: string;
}

interface VisitedCitiesSectionProps {
  nearbyLocations: NearbyLocation[];
}

function VisitedCitiesSection({ nearbyLocations }: VisitedCitiesSectionProps) {
  return (
    <section className="content-block" aria-label="Top most visited cities">
      <header className="block-head">
        <h2>Top most visited cities</h2>
      </header>

      <div className="scroll-strip category-strip">
        {nearbyLocations.map((location) => (
          <article className="category-card" key={location.id}>
            <a className="category-link" href={buildRouteSearchUrl(location.city)}>
              <div className="category-image-wrap">
                <img src={location.cityImage} alt={location.city} loading="lazy" />
              </div>
              <h3>{location.city}</h3>
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

export default VisitedCitiesSection;
