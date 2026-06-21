import { FormEvent, useState } from 'react';
import TopNav from '../../shared/TopNav';
import { routeDataProvider } from '../../../services/routeService';
import type { RouteCreateInput, RoutePointCreateInput } from '../../../types/route';
import PointMapPicker from './PointMapPicker';
import CountryCombobox from './CountryCombobox';
import { isCountryName } from './countries';
import ImageUrlPicker from './ImageUrlPicker';
import { useLanguage } from '../../../i18n/LanguageContext';

interface CreateRoutePageProps {
  onNavigate: (path: string) => void;
}

type PointForm = {
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  image: string;
};

const emptyPoint = (): PointForm => ({
  name: '',
  description: '',
  latitude: '',
  longitude: '',
  image: ''
});

function CreateRoutePage({ onNavigate }: CreateRoutePageProps) {
  const { t } = useLanguage();
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [difficulty, setDifficulty] = useState<RouteCreateInput['difficulty']>('medium');
  const [wheelchairAccessible, setWheelchairAccessible] = useState<boolean>(false);
  const [tags, setTags] = useState<string>('');
  const [points, setPoints] = useState<PointForm[]>([emptyPoint()]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const updatePoint = (index: number, field: keyof PointForm, value: string): void => {
    setPoints((current) =>
      current.map((point, pointIndex) =>
        pointIndex === index
          ? {
              ...point,
              [field]: value
            }
          : point
      )
    );
  };

  const addPoint = (): void => {
    setPoints((current) => [...current, emptyPoint()]);
  };

  const removePoint = (index: number): void => {
    setPoints((current) => current.filter((_, pointIndex) => pointIndex !== index));
  };

  const buildPayload = (): RouteCreateInput => {
    const parsedPoints: RoutePointCreateInput[] = points.map((point, index) => ({
      name: point.name.trim(),
      description: point.description.trim(),
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      image: point.image.trim(),
      index
    }));

    return {
      name: name.trim(),
      description: description.trim(),
      cover_image: coverImage.trim(),
      city: city.trim(),
      country: country.trim(),
      distance: Number(distance),
      duration: Number(duration),
      difficulty,
      wheelchairAccessible,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      points: parsedPoints
    };
  };

  const validateForm = (): string => {
    if (!name.trim() || !description.trim() || !coverImage.trim() || !city.trim() || !country.trim()) {
      return t('createRoute.validation.info');
    }

    if (!isCountryName(country)) {
      return t('createRoute.validation.country');
    }

    if (!Number.isFinite(Number(distance)) || Number(distance) <= 0) {
      return t('createRoute.validation.distance');
    }

    if (!Number.isFinite(Number(duration)) || Number(duration) <= 0) {
      return t('createRoute.validation.duration');
    }

    if (points.length === 0) {
      return t('createRoute.validation.points');
    }

    for (const point of points) {
      if (!point.name.trim()) {
        return t('createRoute.validation.pointName');
      }

      if (!Number.isFinite(Number(point.latitude)) || !Number.isFinite(Number(point.longitude))) {
        return t('createRoute.validation.coordinates');
      }
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const createdRoute = await routeDataProvider.createRoute(buildPayload());
      window.location.href = `/route.html?id=${encodeURIComponent(createdRoute._id)}`;
    } catch (saveError) {
      if (saveError instanceof Error) {
        setError(saveError.message);
      } else {
        setError(t('createRoute.validation.unable'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="route-page">
      <TopNav activeTopNav="routes" />

      <section className="route-shell">
        <div className="create-route-header">
          <div>
            <p className="create-route-eyebrow">{t('routes.title')}</p>
            <h1>{t('createRoute.title')}</h1>
          </div>

          <button type="button" className="create-route-secondary-button" onClick={() => onNavigate('/routes')}>
            {t('createRoute.backToRoutes')}
          </button>
        </div>

        <form className="create-route-form" onSubmit={handleSubmit}>
          <div className="create-route-card">
            <h2>{t('createRoute.info')}</h2>

            <label>
              {t('common.name')}
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label>
              {t('common.description')}
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>

            <ImageUrlPicker
              id="create-route-cover-image"
              label={t('profile.coverImageUrl')}
              value={coverImage}
              onChange={setCoverImage}
              initialSearch={[name, city, country].filter(Boolean).join(' ')}
            />

            <div className="create-route-grid">
              <label>
                {t('common.city')}
                <input value={city} onChange={(event) => setCity(event.target.value)} />
              </label>

              <CountryCombobox value={country} onChange={setCountry} />

              <label>
                {t('common.distance')} km
                <input value={distance} onChange={(event) => setDistance(event.target.value)} />
              </label>

              <label>
                {t('common.duration')} min
                <input value={duration} onChange={(event) => setDuration(event.target.value)} />
              </label>

              <label>
                {t('common.difficulty.label')}
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as RouteCreateInput['difficulty'])}>
                  <option value="easy">{t('common.difficulty.easy')}</option>
                  <option value="medium">{t('common.difficulty.medium')}</option>
                  <option value="hard">{t('common.difficulty.hard')}</option>
                </select>
              </label>

              <label>
                {t('common.accessible')}
                <select
                  value={wheelchairAccessible ? 'yes' : 'no'}
                  onChange={(event) => setWheelchairAccessible(event.target.value === 'yes')}
                >
                  <option value="no">{t('common.no')}</option>
                  <option value="yes">{t('common.yes')}</option>
                </select>
              </label>

              <label>
                Tags
                <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder={t('createRoute.tagsPlaceholder')} />
              </label>
            </div>
          </div>

          <div className="create-route-card">
            <div className="create-route-points-title">
              <h2>{t('createRoute.points')}</h2>
              <button type="button" className="create-route-secondary-button" onClick={addPoint}>
                {t('createRoute.addPoint')}
              </button>
            </div>

            <div className="create-route-points">
              {points.map((point, index) => (
                <div className="create-route-point-card" key={`point-${index}`}>
                  <div className="create-route-point-card-header">
                    <h3>{t('createRoute.point', { number: index + 1 })}</h3>

                    {points.length > 1 ? (
                      <button type="button" className="create-route-danger-button" onClick={() => removePoint(index)}>
                        {t('createRoute.remove')}
                      </button>
                    ) : null}
                  </div>

                  <label>
                    {t('common.name')}
                    <input value={point.name} onChange={(event) => updatePoint(index, 'name', event.target.value)} />
                  </label>

                  <label>
                    {t('common.description')}
                    <textarea value={point.description} onChange={(event) => updatePoint(index, 'description', event.target.value)} />
                  </label>

                  <div className="create-route-coordinate-row">
                    <label>
                      {t('map.latitude')}
                      <input value={point.latitude} onChange={(event) => updatePoint(index, 'latitude', event.target.value)} />
                    </label>

                    <label>
                      {t('map.longitude')}
                      <input value={point.longitude} onChange={(event) => updatePoint(index, 'longitude', event.target.value)} />
                    </label>

                    <PointMapPicker
                      latitude={point.latitude}
                      longitude={point.longitude}
                      pointNumber={index + 1}
                      onSelect={(selectedLatitude, selectedLongitude) => {
                        updatePoint(index, 'latitude', selectedLatitude);
                        updatePoint(index, 'longitude', selectedLongitude);
                      }}
                    />
                  </div>

                  <ImageUrlPicker
                    id={`create-route-point-image-${index}`}
                    label={t('createRoute.imageUrl')}
                    value={point.image}
                    onChange={(selectedImage) => updatePoint(index, 'image', selectedImage)}
                    initialSearch={[point.name, city, country].filter(Boolean).join(' ')}
                  />
                </div>
              ))}
            </div>
          </div>

          {error ? <p className="status-message error">{error}</p> : null}

          <div className="create-route-actions">
            <button type="button" className="create-route-secondary-button" onClick={() => onNavigate('/routes')}>
              {t('createRoute.cancel')}
            </button>

            <button type="submit" className="create-route-primary-button" disabled={isSaving}>
              {isSaving ? t('createRoute.creating') : t('createRoute.create')}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default CreateRoutePage;
