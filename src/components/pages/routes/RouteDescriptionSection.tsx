import { useLanguage } from '../../../i18n/LanguageContext';

interface RouteDescriptionSectionProps {
  description: string;
}

function RouteDescriptionSection({ description }: RouteDescriptionSectionProps) {
  const { t } = useLanguage();

  return (
    <section className="route-description-grid" aria-label={t('common.description')}>
      <article className="route-panel">
        <h2>{t('routeDetail.about')}</h2>
        <p>{description}</p>
      </article>
    </section>
  );
}

export default RouteDescriptionSection;
