import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import SearchClearButton from '../../shared/SearchClearButton';

interface PointMapPickerProps {
  latitude: string;
  longitude: string;
  pointNumber: number;
  onSelect: (latitude: string, longitude: string) => void;
}

interface LocationSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_POSITION: L.LatLngTuple = [41.3874, 2.1686];

const markerIcon = L.icon({
  iconUrl: '/resources/icons/marker/marker.png',
  iconRetinaUrl: '/resources/icons/marker/marker.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const getInitialPosition = (latitude: string, longitude: string): L.LatLngTuple => {
  if (!latitude.trim() || !longitude.trim()) {
    return DEFAULT_POSITION;
  }

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (
    Number.isFinite(parsedLatitude) &&
    Number.isFinite(parsedLongitude) &&
    parsedLatitude >= -90 &&
    parsedLatitude <= 90 &&
    parsedLongitude >= -180 &&
    parsedLongitude <= 180
  ) {
    return [parsedLatitude, parsedLongitude];
  }

  return DEFAULT_POSITION;
};

function PointMapPicker({ latitude, longitude, pointNumber, onSelect }: PointMapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);
  const shouldSearchRef = useRef<boolean>(false);
  const initialPosition = useRef<L.LatLngTuple>(DEFAULT_POSITION);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedPosition, setSelectedPosition] = useState<L.LatLngTuple>(DEFAULT_POSITION);
  const [searchText, setSearchText] = useState<string>('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');

  const closePicker = (): void => {
    searchControllerRef.current?.abort();
    setIsOpen(false);
  };

  const openPicker = (): void => {
    const nextInitialPosition = getInitialPosition(latitude, longitude);
    initialPosition.current = nextInitialPosition;
    setSelectedPosition(nextInitialPosition);
    setSearchText('');
    setSearchResults([]);
    setSearchError('');
    shouldSearchRef.current = false;
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen || !mapContainer.current) {
      return;
    }

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    });
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
      }
    );
    const map = L.map(mapContainer.current, {
      center: initialPosition.current,
      zoom: 15,
      layers: [streetLayer],
      scrollWheelZoom: true
    });
    const marker = L.marker(initialPosition.current, {
      draggable: true,
      icon: markerIcon
    }).addTo(map);
    mapRef.current = map;
    markerRef.current = marker;

    const updateSelectedPosition = (position: L.LatLng): void => {
      const nextPosition: L.LatLngTuple = [position.lat, position.lng];
      marker.setLatLng(nextPosition);
      setSelectedPosition(nextPosition);
    };

    marker.on('dragend', () => {
      updateSelectedPosition(marker.getLatLng());
    });
    map.on('click', (event: L.LeafletMouseEvent) => {
      updateSelectedPosition(event.latlng);
    });

    L.control
      .layers(
        {
          Streets: streetLayer,
          Satellite: satelliteLayer
        },
        undefined,
        { position: 'topright' }
      )
      .addTo(map);

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize(true);
    }, 0);

    return () => {
      window.clearTimeout(resizeTimer);
      mapRef.current = null;
      markerRef.current = null;
      map.remove();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closePicker();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const confirmSelection = (): void => {
    onSelect(selectedPosition[0].toFixed(6), selectedPosition[1].toFixed(6));
    closePicker();
  };

  const searchLocation = useCallback(async (query: string): Promise<void> => {
    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;
    setIsSearching(true);
    setSearchError('');

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '6',
        'accept-language': 'en'
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Location search failed.');
      }

      const results = (await response.json()) as LocationSearchResult[];
      setSearchResults(results);

      if (results.length === 0) {
        setSearchError('No matching places found.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setSearchResults([]);
      setSearchError('Unable to search locations right now.');
    } finally {
      if (searchControllerRef.current === controller) {
        setIsSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !shouldSearchRef.current) {
      return;
    }

    const query = searchText.trim();

    searchControllerRef.current?.abort();

    if (query.length < 3) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchError('');
      return;
    }

    const searchTimer = window.setTimeout(() => {
      void searchLocation(query);
    }, 450);

    return () => {
      window.clearTimeout(searchTimer);
    };
  }, [isOpen, searchLocation, searchText]);

  const selectSearchResult = (result: LocationSearchResult): void => {
    const latitudeResult = Number(result.lat);
    const longitudeResult = Number(result.lon);

    if (!Number.isFinite(latitudeResult) || !Number.isFinite(longitudeResult)) {
      return;
    }

    const nextPosition: L.LatLngTuple = [latitudeResult, longitudeResult];
    searchControllerRef.current?.abort();
    markerRef.current?.setLatLng(nextPosition);
    mapRef.current?.setView(nextPosition, 15, { animate: true });
    setSelectedPosition(nextPosition);
    shouldSearchRef.current = false;
    setSearchText(result.display_name);
    setSearchResults([]);
    setSearchError('');
    setIsSearching(false);
  };

  return (
    <>
      <button type="button" className="create-route-map-button" onClick={openPicker}>
        Select coordinates on map
      </button>

      {isOpen ? (
        <div className="point-map-modal-backdrop" role="presentation" onMouseDown={closePicker}>
          <section
            className="point-map-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`point-map-title-${pointNumber}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="point-map-modal-header">
              <div>
                <h3 id={`point-map-title-${pointNumber}`}>Choose point {pointNumber} coordinates</h3>
                <p>Drag the marker or click the map. Use the layer control to switch views.</p>
              </div>

              <button type="button" className="point-map-close-button" aria-label="Close map" onClick={closePicker}>
                &times;
              </button>
            </div>

            <div className="point-map-search">
              <input
                type="text"
                value={searchText}
                onChange={(event) => {
                  shouldSearchRef.current = true;
                  setSearchText(event.target.value);
                }}
                placeholder="Type a municipality or place"
                aria-label="Search municipality or place"
                autoComplete="off"
              />
              {searchText ? (
                <SearchClearButton
                  className="point-map-search-clear"
                  onClick={() => {
                    searchControllerRef.current?.abort();
                    shouldSearchRef.current = false;
                    setSearchText('');
                    setSearchResults([]);
                    setSearchError('');
                    setIsSearching(false);
                  }}
                />
              ) : null}

              {isSearching ? <p className="point-map-search-status neutral">Searching places...</p> : null}
              {!isSearching && searchError ? <p className="point-map-search-status">{searchError}</p> : null}

              {searchResults.length > 0 ? (
                <div className="point-map-search-results" aria-label="Location search results">
                  {searchResults.map((result) => (
                    <button type="button" key={result.place_id} onClick={() => selectSearchResult(result)}>
                      {result.display_name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="point-map-canvas" ref={mapContainer} />

            <div className="point-map-selection">
              <span>Latitude: {selectedPosition[0].toFixed(6)}</span>
              <span>Longitude: {selectedPosition[1].toFixed(6)}</span>
            </div>

            <div className="point-map-actions">
              <button type="button" className="create-route-secondary-button" onClick={closePicker}>
                Cancel
              </button>
              <button type="button" className="create-route-primary-button" onClick={confirmSelection}>
                Use coordinates
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default PointMapPicker;
