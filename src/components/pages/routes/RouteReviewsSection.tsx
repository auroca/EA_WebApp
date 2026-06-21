import { FormEvent, useEffect, useMemo, useState } from "react";
import { getStoredUser, isAuthenticated } from "../../../services/authService";
import { reviewService } from "../../../services/reviewService";
import type { Review } from "../../../types/review";
import { useLanguage } from "../../../i18n/LanguageContext";
import type { TranslationKey } from "../../../i18n/translations";

interface RouteReviewsSectionProps {
  routeId: string;
  ratingAverage?: number;
}

const ratingLabels = ["scenery", "signage", "accessibility", "safety"];
const ratingLabelKeys: Record<string, TranslationKey> = {
  accessibility: "routeDetail.reviewRating.accessibility",
  safety: "routeDetail.reviewRating.safety",
  scenery: "routeDetail.reviewRating.scenery",
  signage: "routeDetail.reviewRating.signage",
};

function RouteReviewsSection({
  routeId,
  ratingAverage,
}: RouteReviewsSectionProps) {
  const { t } = useLanguage();
  const currentUserId = getStoredUser()?._id;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [ratings, setRatings] = useState<Record<string, number>>({
    scenery: 5,
    signage: 5,
    accessibility: 5,
    safety: 5,
  });

  const liveRatingAverage = useMemo(() => {
    if (reviews.length === 0) {
      return typeof ratingAverage === "number" && Number.isFinite(ratingAverage)
        ? ratingAverage
        : 0;
    }

    return (
      reviews.reduce((sum, review) => sum + review.averageRating, 0) /
      reviews.length
    );
  }, [reviews, ratingAverage]);

  const routeRatingLabel = liveRatingAverage.toFixed(1);

  const currentUserReview = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return reviews.find((review) => review.userId === currentUserId) ?? null;
  }, [currentUserId, reviews]);

  useEffect(() => {
    let mounted = true;

    const loadReviews = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const result = await reviewService.getReviewsByRoute(routeId);

        if (mounted) {
          setReviews(result);
          setError("");
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : t("routeDetail.loadingReviews"),
        );
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
      [label]: Number(value),
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!title.trim()) {
      setError(t("routeDetail.reviewRequiredTitle"));
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const createdReview = await reviewService.createReview({
        routeId,
        title: title.trim(),
        comment: comment.trim() || undefined,
        ratings: ratingLabels.map((label) => ({
          label,
          score: ratings[label],
        })),
      });

      setReviews((current) => [createdReview, ...current]);
      setTitle("");
      setComment("");
      setRatings({
        scenery: 5,
        signage: 5,
        accessibility: 5,
        safety: 5,
      });
      setIsReviewFormOpen(false);
      setSuccessMessage(t("routeDetail.reviewPublished"));
    } catch (submitError) {
      setError(
          submitError instanceof Error
          ? submitError.message
          : t("routeDetail.publishReview"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="route-panel route-reviews-section"
      aria-label={t("routeDetail.reviews")}
    >
      <div className="route-reviews-header">
        <div>
          <h2>{t("routeDetail.reviews")}</h2>
          <p>
            {reviews.length === 0
              ? t("routeDetail.noReviews")
              : t("routeDetail.reviewsCount", {
                  count: reviews.length,
                  plural: reviews.length === 1 ? "" : "s",
                })}
          </p>
        </div>

        {reviews.length > 0 ? (
          <div className="route-reviews-average" aria-label={t("routeDetail.averageRating")}>
            <strong>{routeRatingLabel}</strong>
            <span>/ 5</span>
          </div>
        ) : null}
      </div>

      {isLoading ? <p className="status-message">{t("routeDetail.loadingReviews")}</p> : null}

      {!isLoading && isAuthenticated() && currentUserReview ? (
        <div className="route-review-own-notice">
          <strong>{t("routeDetail.yourReview")}</strong>
          <span>
            {t("routeDetail.reviewAlreadyPublished", {
              title: currentUserReview.title,
            })}
          </span>
        </div>
      ) : null}

      {!isLoading && isAuthenticated() && !currentUserReview ? (
        <button
          type="button"
          className="route-review-toggle"
          aria-expanded={isReviewFormOpen}
          onClick={() => {
            setIsReviewFormOpen((current) => !current);
            setError("");
            setSuccessMessage("");
          }}
        >
          {isReviewFormOpen ? t("routeDetail.cancelReview") : t("routeDetail.addReview")}
        </button>
      ) : null}

      {!isLoading &&
      isAuthenticated() &&
      !currentUserReview &&
      isReviewFormOpen ? (
        <form className="route-review-form" onSubmit={handleSubmit}>
          <h3>{t("routeDetail.addYourReview")}</h3>

          <label>
            {t("common.title")}
            <input
              type="text"
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("routeDetail.reviewTitlePlaceholder")}
            />
          </label>

          <label>
            {t("routeDetail.comment")}
            <textarea
              value={comment}
              maxLength={600}
              onChange={(event) => setComment(event.target.value)}
              placeholder={t("routeDetail.reviewCommentPlaceholder")}
            />
          </label>

          <div className="route-review-rating-grid">
            {ratingLabels.map((label) => (
              <label key={label}>
                {t(ratingLabelKeys[label])}
                <select
                  value={ratings[label]}
                  onChange={(event) =>
                    handleRatingChange(label, event.target.value)
                  }
                >
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
            {isSubmitting ? t("routeDetail.publishingReview") : t("routeDetail.publishReview")}
          </button>

          {successMessage ? (
            <p className="route-review-success">{successMessage}</p>
          ) : null}
        </form>
      ) : null}

      {!isLoading && !isAuthenticated() ? (
        <p className="route-review-login-message">
          {t("routeDetail.loginToReview")}
        </p>
      ) : null}

      {error ? <p className="status-message error">{error}</p> : null}

      {!isLoading && reviews.length > 0 ? (
        <div className="route-review-list">
          {reviews.map((review) => (
            <article
              key={review._id}
              className={`route-review-card${review.userId === currentUserId ? " route-review-card--mine" : ""}`}
            >
              <div className="route-review-card-header">
                <div>
                  {review.userId === currentUserId ? (
                    <span className="route-review-mine-label">{t("routeDetail.yourReview")}</span>
                  ) : null}
                  <h3>{review.title}</h3>
                </div>
                <span>{review.averageRating.toFixed(1)} / 5</span>
              </div>

              {review.comment ? <p>{review.comment}</p> : null}

              <div className="route-review-ratings">
                {review.ratings.map((rating) => (
                  <span key={`${review._id}-${rating.label}`}>
                    {t(ratingLabelKeys[rating.label] ?? "routeDetail.rating")}: {rating.score}/5
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
