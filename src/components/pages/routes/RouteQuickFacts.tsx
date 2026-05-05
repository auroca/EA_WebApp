interface RouteQuickFactsProps {
  distance?: number;
  duration?: number;
}

function RouteQuickFacts({ distance, duration }: RouteQuickFactsProps) {
  return (
    <section className="route-facts" aria-label="Route quick facts">
      <article className="route-fact-card">
        <p>Distance</p>
        <h3>{typeof distance === 'number' ? `${distance} km` : 'Not specified'}</h3>
      </article>

      <article className="route-fact-card">
        <p>Duration</p>
        <h3>{typeof duration === 'number' ? `${duration} min` : 'Not specified'}</h3>
      </article>
    </section>
  );
}

export default RouteQuickFacts;