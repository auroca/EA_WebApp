import { getDifficultyBadgePath } from '../../../utils/homeView';
import type { Route } from '../../../types/route';
import { FaWheelchair } from 'react-icons/fa';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { TranslationKey } from '../../../i18n/translations';

interface RouteHeroSectionProps {
  name: string;
  coverImage: string;
  city: string;
  country: string;
  difficulty: Route['difficulty'];
  wheelchairAccessible: boolean;
  distance?: number;
  duration?: number;
  tags: string[];
}

const difficultyLabelKeys: Record<Route['difficulty'], TranslationKey> = {
  easy: 'common.difficulty.easy',
  medium: 'common.difficulty.medium',
  hard: 'common.difficulty.hard'
};

function RouteHeroSection({
  name,
  coverImage,
  city,
  country,
  difficulty,
  wheelchairAccessible,
  distance,
  duration,
  tags
}: RouteHeroSectionProps) {
  const { t } = useLanguage();

  return (
    <section className="route-hero-block">
      <header
        className="route-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8, 15, 26, 0.2) 20%, rgba(8, 15, 26, 0.76) 100%), url(${coverImage})`
        }}
      >
        <div className="route-hero-main">
          <h1>{name}</h1>
          <p className="route-hero-subtitle">
            {city}, {country}
          </p>

          <div className="route-hero-meta" role="list" aria-label={t('routeDetail.quickFacts')}>
            {typeof distance === 'number' ? <span role="listitem">{distance} km</span> : null}
            {typeof duration === 'number' ? <span role="listitem">{duration} min</span> : null}
          </div>
        </div>

        {tags.length > 0 ? (
          <div className="route-tag-cloud" aria-label={t('routeDetail.tags')}>
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="route-badge-row">
        <div className="route-difficulty-row" aria-label={t('common.difficulty.label')}>
          <img
            className="difficulty-badge"
            src={getDifficultyBadgePath(difficulty)}
            alt=""
            aria-hidden="true"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
          <span>{t(difficultyLabelKeys[difficulty])}</span>
        </div>

        {wheelchairAccessible ? (
          <div className="route-accessible-row" aria-label={t('common.accessible')}>
            <FaWheelchair aria-hidden="true" />
            <span>{t('common.accessible')}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default RouteHeroSection;
