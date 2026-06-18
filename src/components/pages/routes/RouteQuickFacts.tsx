import { FaStar } from 'react-icons/fa';

interface RouteQuickFactsProps {
  distance?: number;
  duration?: number;
  ratingAverage?: number;
  reviewsCount?: number;
}

function RouteQuickFacts({ distance, duration, ratingAverage, reviewsCount }: RouteQuickFactsProps) {
  const formattedRating =
    typeof ratingAverage === 'number' && Number.isFinite(ratingAverage)
      ? ratingAverage.toFixed(1)
      : 'Not rated';

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

      <article className="route-fact-card route-fact-card--rating">
        <p>Rating</p>
        <h3>
          <FaStar aria-hidden="true" />
          <span>{formattedRating}</span>
          {typeof ratingAverage === 'number' && Number.isFinite(ratingAverage) ? <small>/ 5</small> : null}
        </h3>
        {typeof reviewsCount === 'number' && Number.isFinite(reviewsCount) ? (
          <span className="route-fact-card__meta">
            {reviewsCount} review{reviewsCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </article>
    </section>
  );
}

export default RouteQuickFacts;
