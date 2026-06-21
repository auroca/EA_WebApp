import { FormEvent, useState } from 'react';
import TopNav from '../../shared/TopNav';
import { routeDataProvider } from '../../../services/routeService';
import type { RouteCreateInput, RoutePointCreateInput } from '../../../types/route';
import PointMapPicker from './PointMapPicker';
import CountryCombobox from './CountryCombobox';
import { isCountryName } from './countries';
import ImageUrlPicker from './ImageUrlPicker';

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
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [difficulty, setDifficulty] = useState<RouteCreateInput['difficulty']>('medium');
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
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      points: parsedPoints
    };
  };

  const validateForm = (): string => {
    if (!name.trim() || !description.trim() || !coverImage.trim() || !city.trim() || !country.trim()) {
      return 'Complete the route information.';
    }

    if (!isCountryName(country)) {
      return 'Select a country from the list.';
    }

    if (!Number.isFinite(Number(distance)) || Number(distance) <= 0) {
      return 'Distance must be a valid number.';
    }

    if (!Number.isFinite(Number(duration)) || Number(duration) <= 0) {
      return 'Duration must be a valid number.';
    }

    if (points.length === 0) {
      return 'Add at least one point.';
    }

    for (const point of points) {
      if (!point.name.trim()) {
        return 'Every point needs a name.';
      }

      if (!Number.isFinite(Number(point.latitude)) || !Number.isFinite(Number(point.longitude))) {
        return 'Every point needs valid coordinates.';
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
        setError('Unable to create route.');
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
            <p className="create-route-eyebrow">Routes</p>
            <h1>Create your own route</h1>
          </div>

          <button type="button" className="create-route-secondary-button" onClick={() => onNavigate('/routes')}>
            Back to routes
          </button>
        </div>

        <form className="create-route-form" onSubmit={handleSubmit}>
          <div className="create-route-card">
            <h2>Route information</h2>

            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <label>
              Description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>

            <ImageUrlPicker
              id="create-route-cover-image"
              label="Cover image URL"
              value={coverImage}
              onChange={setCoverImage}
              initialSearch={[name, city, country].filter(Boolean).join(' ')}
            />

            <div className="create-route-grid">
              <label>
                City
                <input value={city} onChange={(event) => setCity(event.target.value)} />
              </label>

              <CountryCombobox value={country} onChange={setCountry} />

              <label>
                Distance km
                <input value={distance} onChange={(event) => setDistance(event.target.value)} />
              </label>

              <label>
                Duration min
                <input value={duration} onChange={(event) => setDuration(event.target.value)} />
              </label>

              <label>
                Difficulty
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as RouteCreateInput['difficulty'])}>
                  <option value="easy">easy</option>
                  <option value="medium">medium</option>
                  <option value="hard">hard</option>
                </select>
              </label>

              <label>
                Tags
                <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="nature, beach, city" />
              </label>
            </div>
          </div>

          <div className="create-route-card">
            <div className="create-route-points-title">
              <h2>Route points</h2>
              <button type="button" className="create-route-secondary-button" onClick={addPoint}>
                Add point
              </button>
            </div>

            <div className="create-route-points">
              {points.map((point, index) => (
                <div className="create-route-point-card" key={`point-${index}`}>
                  <div className="create-route-point-card-header">
                    <h3>Point {index + 1}</h3>

                    {points.length > 1 ? (
                      <button type="button" className="create-route-danger-button" onClick={() => removePoint(index)}>
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <label>
                    Name
                    <input value={point.name} onChange={(event) => updatePoint(index, 'name', event.target.value)} />
                  </label>

                  <label>
                    Description
                    <textarea value={point.description} onChange={(event) => updatePoint(index, 'description', event.target.value)} />
                  </label>

                  <div className="create-route-coordinate-row">
                    <label>
                      Latitude
                      <input value={point.latitude} onChange={(event) => updatePoint(index, 'latitude', event.target.value)} />
                    </label>

                    <label>
                      Longitude
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
                    label="Image URL"
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
              Cancel
            </button>

            <button type="submit" className="create-route-primary-button" disabled={isSaving}>
              {isSaving ? 'Creating route...' : 'Create route'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default CreateRoutePage;
