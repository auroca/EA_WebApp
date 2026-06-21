import { useLanguage } from '../../../i18n/LanguageContext';

interface RouteGalleryProps {
  routeName: string;
  coverImage: string;
  galleryItems: string[];
}

function RouteGallery({ routeName, coverImage, galleryItems }: RouteGalleryProps) {
  const { t } = useLanguage();
  const images = [coverImage, ...galleryItems].filter((image, index, source) => {
    if (!image) {
      return false;
    }

    return source.indexOf(image) === index;
  });

  if (images.length === 0) {
    return null;
  }

  return (
    <section className="route-panel route-gallery" aria-label={t('routeDetail.gallery')}>
      <h2>{t('routeDetail.gallery')}</h2>

      <div className="route-gallery-grid">
        {images.map((image, index) => (
          <article key={image} className="route-gallery-tile">
            <img src={image} alt={t('routeDetail.galleryImage', { route: routeName, index: index + 1 })} loading="lazy" />
          </article>
        ))}
      </div>
    </section>
  );
}

export default RouteGallery;
