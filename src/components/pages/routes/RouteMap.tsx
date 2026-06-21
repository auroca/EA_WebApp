import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route, Point } from '../../../types/route';
import { routeDataProvider } from '../../../services/routeService';
import { pointService } from '../../../services/pointService';
import { buildMyWayUrl } from '../../../utils/routeNavigation';
import { useLanguage } from '../../../i18n/LanguageContext';
import './RouteMap.css';

interface RouteMapProps {
  route: Route;
}

interface MapMarker {
  marker: L.Marker;
  popup: L.Popup;
}

const RouteMap: React.FC<RouteMapProps> = ({ route }) => {
  const { t } = useLanguage();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, MapMarker>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(!route.points || route.points.length === 0);
  const [error, setError] = useState<string>('');
  const [points, setPoints] = useState<Point[]>(route.points || []);

  useEffect(() => {
    if (route.points && route.points.length > 0) {
      setPoints(route.points);
      setIsLoading(false);
      return;
    }

    const loadRouteDetails = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const detailedRoute = await routeDataProvider.getRouteById(route._id);

        if (detailedRoute && detailedRoute.points) {
          setPoints(detailedRoute.points);
          setError('');
        } else {
          setError(t('routeDetail.noPoints'));
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t('routeDetail.loadDetailsError'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadRouteDetails();
  }, [route, t]);

  useEffect(() => {
    if (isLoading || !mapContainer.current || map.current) {
      return;
    }

    if (points.length === 0) {
      return;
    }

    map.current = L.map(mapContainer.current, {
      center: [points[0].latitude, points[0].longitude],
      zoom: 13,
      scrollWheelZoom: true
    });

    const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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

    const trafficLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM',
      maxZoom: 17
    });

    const pedestrianLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors, HOT',
      maxZoom: 19
    });

    satelliteLayer.addTo(map.current);

    const baseLayers: Record<string, L.TileLayer> = {
      Standard: standardLayer,
      Satellite: satelliteLayer,
      Traffic: trafficLayer,
      Pedestrian: pedestrianLayer
    };

    L.control.layers(baseLayers, undefined, { position: 'topright', collapsed: false }).addTo(map.current);

    points.forEach((point, idx) => {
      if (!map.current) return;

      const pointOrder = idx + 1;

      const markerIcon = L.divIcon({
        html: `<div class="point-marker-icon">${pointOrder}</div>`,
        className: 'route-point-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const marker = L.marker([point.latitude, point.longitude], {
        icon: markerIcon
      }).addTo(map.current);

      const popupContent = document.createElement('div');
      popupContent.className = 'point-popup-content';
      popupContent.innerHTML = `
        <h3>${point.name}</h3>
        ${point.description ? `<p class="point-popup-description">${point.description}</p>` : ''}
        <p class="point-popup-index">Point ${pointOrder}</p>
      `;

      const popup = L.popup().setContent(popupContent);
      marker.bindPopup(popup);

      marker.on('click', async () => {
        try {
          const detailedPoint = await pointService.getPointById(point._id);

          if (detailedPoint) {
            const enhancedPopupContent = document.createElement('div');
            enhancedPopupContent.className = 'point-popup-content';

            let html = `<h3>${detailedPoint.name}</h3>`;

            if (detailedPoint.image) {
              html += `<img src="${detailedPoint.image}" alt="${detailedPoint.name}" class="point-popup-image" />`;
            }

            if (detailedPoint.description && detailedPoint.description.trim().length > 0) {
              html += `<p class="point-popup-description">${detailedPoint.description}</p>`;
            }

            html += `<p class="point-popup-index">Point ${pointOrder}</p>`;

            enhancedPopupContent.innerHTML = html;
            marker.setPopupContent(enhancedPopupContent);
          }
        } catch (err) {
          console.error('Failed to load point details:', err);
        }
      });

      markersRef.current.set(point._id, { marker, popup });
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude] as [number, number]));
      map.current.fitBounds(bounds, { padding: [50, 50] });

      setTimeout(() => {
        if (!map.current) return;
        try {
          map.current.invalidateSize(true);
        } catch (_error) {
          // ignore
        }
      }, 0);
    }

    const deferred = setTimeout(() => {
      if (!map.current) return;
      try {
        map.current.invalidateSize(true);
      } catch (_error) {
        // ignore
      }
    }, 200);

    const deferred2 = setTimeout(() => {
      if (!map.current) return;
      try {
        map.current.invalidateSize(true);
      } catch (_error) {
        // ignore
      }
    }, 500);

    map.current.whenReady(() => {
      if (!map.current) return;
      try {
        map.current.invalidateSize(true);
      } catch (_error) {
        // ignore
      }
    });

    let ro: ResizeObserver | null = null;
    const observedContainer = mapContainer.current;

    try {
      ro = new ResizeObserver(() => {
        if (!map.current) return;
        requestAnimationFrame(() => {
          try {
            if (map.current) {
              map.current.invalidateSize(true);
            }
          } catch (_error) {
            // ignore
          }
        });
      });

      if (observedContainer) {
        ro.observe(observedContainer);
      }
    } catch (_error) {
      // ResizeObserver not supported - ignore
    }

    return () => {
      clearTimeout(deferred);
      clearTimeout(deferred2);
      if (ro && observedContainer) {
        try {
          ro.unobserve(observedContainer);
        } catch (_error) {
          // ignore
        }
      }
    };
  }, [points, isLoading]);

  if (error) {
    return (
      <div className="route-map-section">
        <h2>{t('routeDetail.map')}</h2>
        <div className="route-map-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="route-map-section">
      <div className="route-map-header">
        <h2>{t('routeDetail.map')}</h2>
        <button
          type="button"
          className="start-route-button"
          onClick={() => {
            window.location.href = buildMyWayUrl(route._id);
          }}
        >
          {t('myway.start')}
        </button>
      </div>
      {isLoading ? (
        <div className="route-map-loading">{t('routeDetail.loadingMap')}</div>
      ) : (
        <div className="route-map-container">
          <div className="map-wrapper" ref={mapContainer} />
        </div>
      )}
    </div>
  );
};

export default RouteMap;
