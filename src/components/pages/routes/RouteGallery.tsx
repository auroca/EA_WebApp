interface RouteGalleryProps {
  routeName: string;
  coverImage: string;
  galleryItems: string[];
}

function RouteGallery({ routeName, coverImage, galleryItems }: RouteGalleryProps) {
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
    <section className="route-panel route-gallery" aria-label="Route gallery">
      <h2>Route gallery</h2>

      <div className="route-gallery-grid">
        {images.map((image, index) => (
          <article key={image} className="route-gallery-tile">
            <img src={image} alt={`${routeName} image ${index + 1}`} loading="lazy" />
          </article>
        ))}
      </div>
    </section>
  );
}

export default RouteGallery;