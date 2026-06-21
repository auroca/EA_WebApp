import { FaStar } from 'react-icons/fa';
import { useLanguage } from '../../../i18n/LanguageContext';

interface RouteQuickFactsProps {
  distance?: number;
  duration?: number;
  ratingAverage?: number;
  reviewsCount?: number;
}

function RouteQuickFacts({ distance, duration, ratingAverage, reviewsCount }: RouteQuickFactsProps) {
  const { t } = useLanguage();
  const formattedRating =
    typeof ratingAverage === 'number' && Number.isFinite(ratingAverage)
      ? ratingAverage.toFixed(1)
      : t('routeDetail.notRated');

  return (
    <section className="route-facts" aria-label={t('routeDetail.quickFacts')}>
      <article className="route-fact-card">
        <p>{t('common.distance')}</p>
        <h3>{typeof distance === 'number' ? `${distance} km` : t('common.notSpecified')}</h3>
      </article>

      <article className="route-fact-card">
        <p>{t('common.duration')}</p>
        <h3>{typeof duration === 'number' ? `${duration} min` : t('common.notSpecified')}</h3>
      </article>

      <article className="route-fact-card route-fact-card--rating">
        <p>{t('routeDetail.rating')}</p>
        <h3>
          <FaStar aria-hidden="true" />
          <span>{formattedRating}</span>
          {typeof ratingAverage === 'number' && Number.isFinite(ratingAverage) ? <small>/ 5</small> : null}
        </h3>
        {typeof reviewsCount === 'number' && Number.isFinite(reviewsCount) ? (
          <span className="route-fact-card__meta">
            {t('routeDetail.reviewsCount', { count: reviewsCount, plural: reviewsCount === 1 ? '' : 's' })}
          </span>
        ) : null}
      </article>
    </section>
  );
}

export default RouteQuickFacts;
