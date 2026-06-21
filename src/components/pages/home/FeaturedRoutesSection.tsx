import type { Route } from '../../../types/route';
import { FaStar, FaWheelchair } from 'react-icons/fa';
import {
  getDifficultyBadgePath,
  getFeaturedOverlayKey,
  getRouteImage,
} from '../../../utils/homeView';
import { buildRouteDetailUrl } from '../../../utils/routeNavigation';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { TranslationKey } from '../../../i18n/translations';

interface FeaturedRoutesSectionProps {
  routes: Route[];
}

const difficultyKeys: Record<Route['difficulty'], TranslationKey> = {
  easy: 'common.difficulty.easy',
  medium: 'common.difficulty.medium',
  hard: 'common.difficulty.hard'
};

function FeaturedRoutesSection({ routes }: FeaturedRoutesSectionProps) {
  const { t } = useLanguage();

  return (
    <section className="content-block" aria-label={t('home.featuredRoutes')}>
      <header className="block-head">
        <h2>{t('home.featuredRoutes')}</h2>
      </header>

      <div className="scroll-strip featured-strip">
        {routes.map((route, index) => {
          const featuredLabel = t(getFeaturedOverlayKey(index));
          const formattedRating =
            typeof route.ratingAverage === 'number' && Number.isFinite(route.ratingAverage)
              ? route.ratingAverage.toFixed(1)
              : '-';

          return (
            <article className="featured-item" key={route._id}>
              <a className="route-card-link" href={buildRouteDetailUrl(route._id)}>
                <div
                  className="featured-card"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(5, 8, 18, 0.16) 22%, rgba(5, 8, 18, 0.72) 100%), url(${getRouteImage(route)})`
                  }}
                >
                  <h3>{featuredLabel}</h3>
                </div>

                <h4>{route.name}</h4>
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
                  <span>{t(difficultyKeys[route.difficulty])}</span>
                  {route.wheelchairAccessible ? (
                    <span className="route-card-accessible" aria-label={t('common.accessible')}>
                      <FaWheelchair aria-hidden="true" />
                      {t('common.accessible')}
                    </span>
                  ) : null}
                  <span className="route-card-rating" aria-label={t('common.averageRating', { rating: formattedRating })}>
                    <FaStar aria-hidden="true" />
                    {formattedRating}
                  </span>
                  <span>· {route.city}, {route.country}</span>
                </p>
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default FeaturedRoutesSection;
