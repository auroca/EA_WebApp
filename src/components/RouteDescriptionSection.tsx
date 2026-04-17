interface RouteDescriptionSectionProps {
  description: string;
}

function RouteDescriptionSection({ description }: RouteDescriptionSectionProps) {
  return (
    <section className="route-description-grid" aria-label="Route description and tips">
      <article className="route-panel">
        <h2>About this route</h2>
        <p>{description}</p>
      </article>
    </section>
  );
}

export default RouteDescriptionSection;