import { FormEvent, useEffect, useMemo, useState } from 'react';
import { isAuthenticated } from '../../../services/authService';
import { reviewService } from '../../../services/reviewService';
import type { Review, ReviewRating } from '../../../types/review';

interface RouteReviewsSectionProps {
  routeId: string;
}

const ratingLabels = ['scenery', 'signage', 'accessibility', 'safety'];

const getAverageScore = (ratings: ReviewRating[]): number => {
  if (ratings.length === 0) {
    return 0;
  }

  const total = ratings.reduce((sum, rating) => sum + rating.score, 0);
  return total / ratings.length;
};

function RouteReviewsSection({ routeId }: RouteReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [ratings, setRatings] = useState<Record<string, number>>({
    scenery: 5,
    signage: 5,
    accessibility: 5,
    safety: 5
  });

  const averageRouteRating = useMemo(() => {
    const allRatings = reviews.flatMap((review) => review.ratings);

    if (allRatings.length === 0) {
      return 0;
    }

    return getAverageScore(allRatings);
  }, [reviews]);

  useEffect(() => {
    let mounted = true;

    const loadReviews = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const result = await reviewService.getReviewsByRoute(routeId);

        if (mounted) {
          setReviews(result);
          setError('');
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to load reviews.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadReviews();

    return () => {
      mounted = false;
    };
  }, [routeId]);

  const handleRatingChange = (label: string, value: string): void => {
    setRatings((current) => ({
      ...current,
      [label]: Number(value)
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!title.trim()) {
      setError('Please add a review title.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const createdReview = await reviewService.createReview({
        routeId,
        title: title.trim(),
        comment: comment.trim() || undefined,
        ratings: ratingLabels.map((label) => ({
          label,
          score: ratings[label]
        }))
      });

      setReviews((current) => [createdReview, ...current]);
      setTitle('');
      setComment('');
      setRatings({
        scenery: 5,
        signage: 5,
        accessibility: 5,
        safety: 5
      });
      setSuccessMessage('Review published successfully.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to publish review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="route-panel route-reviews-section" aria-label="Route reviews">
      <div className="route-reviews-header">
        <div>
          <h2>Reviews</h2>
          <p>
            {reviews.length === 0
              ? 'No reviews yet.'
              : `${reviews.length} review${reviews.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {reviews.length > 0 ? (
          <div className="route-reviews-average" aria-label="Average rating">
            <strong>{averageRouteRating.toFixed(1)}</strong>
            <span>/ 5</span>
          </div>
        ) : null}
      </div>

      {isLoading ? <p className="status-message">Loading reviews...</p> : null}

      {!isLoading && isAuthenticated() ? (
        <form className="route-review-form" onSubmit={handleSubmit}>
          <h3>Add your review</h3>

          <label>
            Title
            <input
              type="text"
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Amazing views"
            />
          </label>

          <label>
            Comment
            <textarea
              value={comment}
              maxLength={600}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Tell other travellers what you liked about this route..."
            />
          </label>

          <div className="route-review-rating-grid">
            {ratingLabels.map((label) => (
              <label key={label}>
                {label}
                <select value={ratings[label]} onChange={(event) => handleRatingChange(label, event.target.value)}>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </label>
            ))}
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : 'Publish review'}
          </button>

          {successMessage ? <p className="route-review-success">{successMessage}</p> : null}
        </form>
      ) : null}

      {!isLoading && !isAuthenticated() ? (
        <p className="route-review-login-message">Log in to publish a review.</p>
      ) : null}

      {error ? <p className="status-message error">{error}</p> : null}

      {!isLoading && reviews.length > 0 ? (
        <div className="route-review-list">
          {reviews.map((review) => (
            <article key={review._id} className="route-review-card">
              <div className="route-review-card-header">
                <h3>{review.title}</h3>
                <span>{getAverageScore(review.ratings).toFixed(1)} / 5</span>
              </div>

              {review.comment ? <p>{review.comment}</p> : null}

              <div className="route-review-ratings">
                {review.ratings.map((rating) => (
                  <span key={`${review._id}-${rating.label}`}>
                    {rating.label}: {rating.score}/5
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default RouteReviewsSection;