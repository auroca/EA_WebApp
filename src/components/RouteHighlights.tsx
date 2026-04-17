interface RouteHighlightsProps {
  tags: string[];
}

function RouteHighlights({ tags }: RouteHighlightsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <section className="route-panel route-highlights" aria-label="Route tags">
      <h2>Route tags</h2>
      <div className="route-highlight-list">
        {tags.map((tag, index) => (
          <article key={tag} className="route-highlight-item">
            <span className="route-highlight-index">{String(index + 1).padStart(2, '0')}</span>
            <p>{tag}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RouteHighlights;