import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route, RouteZone } from '../../../types/route';
import { routeDataProvider } from '../../../services/routeService';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { TranslationKey } from '../../../i18n/translations';
import './GeneralRoutesMap.css';

interface GeneralRoutesMapProps {
  routes: Route[];
  onSelectRoute: (routeId: string) => void;
}

const ROUTE_ZONES: RouteZone[] = [
  {
    id: 'barcelona-centre',
    name: 'Barcelona centre',
    description: 'Central area of Barcelona',
    coordinates: [
      [2.1402, 41.3661],
      [2.2064, 41.3661],
      [2.2064, 41.4089],
      [2.1402, 41.4089],
      [2.1402, 41.3661]
    ]
  },
  {
    id: 'madrid-centre',
    name: 'Madrid centre',
    description: 'Central area of Madrid',
    coordinates: [
      [-3.7250, 40.4000],
      [-3.6750, 40.4000],
      [-3.6750, 40.4300],
      [-3.7250, 40.4300],
      [-3.7250, 40.4000]
    ]
  },
  {
    id: 'sevilla-centre',
    name: 'Seville centre',
    description: 'Central area of Seville',
    coordinates: [
      [-6.0100, 37.3700],
      [-5.9700, 37.3700],
      [-5.9700, 37.4000],
      [-6.0100, 37.4000],
      [-6.0100, 37.3700]
    ]
  }
];

const getRoutePoints = (route: Route) => {
  return route.points?.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) ?? [];
};

const zoneTranslationKeys: Record<string, { name: TranslationKey; description: TranslationKey }> = {
  'barcelona-centre': {
    name: 'routes.zone.barcelona.name',
    description: 'routes.zone.barcelona.description'
  },
  'madrid-centre': {
    name: 'routes.zone.madrid.name',
    description: 'routes.zone.madrid.description'
  },
  'sevilla-centre': {
    name: 'routes.zone.sevilla.name',
    description: 'routes.zone.sevilla.description'
  }
};

const GeneralRoutesMap: React.FC<GeneralRoutesMapProps> = ({ routes, onSelectRoute }) => {
  const { t } = useLanguage();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);
  const zoneLayerGroup = useRef<L.LayerGroup | null>(null);

  const [selectedZone, setSelectedZone] = useState<RouteZone | null>(null);
  const [zoneRoutes, setZoneRoutes] = useState<Route[]>([]);
  const [isLoadingZone, setIsLoadingZone] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const routesToRender = selectedZone ? zoneRoutes : routes;

  useEffect(() => {
    if (!mapContainer.current || map.current) {
      return;
    }

    map.current = L.map(mapContainer.current, {
      center: [40.15, -3.7],
      zoom: 6,
      scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map.current);

    layerGroup.current = L.layerGroup().addTo(map.current);
    zoneLayerGroup.current = L.layerGroup().addTo(map.current);

    setTimeout(() => {
      map.current?.invalidateSize(true);
    }, 100);
  }, []);

  useEffect(() => {
    if (!map.current || !zoneLayerGroup.current) {
      return;
    }

    zoneLayerGroup.current.clearLayers();

    if (!selectedZone) {
      map.current.setView([40.15, -3.7], 6);
      return;
    }

    const polygonLatLngs = selectedZone.coordinates.map(
      ([longitude, latitude]) => [latitude, longitude] as [number, number]
    );

    const polygon = L.polygon(polygonLatLngs, {
      weight: 4,
      fillOpacity: 0.28
    });

    const zoneKeys = zoneTranslationKeys[selectedZone.id];
    const zoneName = zoneKeys ? t(zoneKeys.name) : selectedZone.name;
    const zoneDescription = zoneKeys ? t(zoneKeys.description) : selectedZone.description;

    polygon.bindPopup(`
      <div class="general-zone-popup">
        <h3>${zoneName}</h3>
        <p>${zoneDescription}</p>
        <p>${t('routes.zonePopupHelp')}</p>
      </div>
    `);

    polygon.addTo(zoneLayerGroup.current as L.LayerGroup);

    map.current.fitBounds(L.latLngBounds(polygonLatLngs), { padding: [40, 40] });
  }, [selectedZone, t]);

  useEffect(() => {
    if (!map.current || !layerGroup.current) {
      return;
    }

    layerGroup.current.clearLayers();

    const boundsPoints: [number, number][] = [];

    routesToRender.forEach((route) => {
      const points = getRoutePoints(route);

      if (points.length === 0) {
        return;
      }

      const latLngs = points.map((point) => [point.latitude, point.longitude] as [number, number]);

      latLngs.forEach((latLng) => boundsPoints.push(latLng));

      const firstPoint = points[0];

      const markerIcon = L.icon({
        iconUrl: '/resources/icons/marker/marker.png',
        iconRetinaUrl: '/resources/icons/marker/marker.png',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      });

      const marker = L.marker([firstPoint.latitude, firstPoint.longitude], {
        icon: markerIcon
      }).addTo(layerGroup.current as L.LayerGroup);

      marker.bindPopup(`
        <div class="general-route-popup">
          <h3>${route.name}</h3>
          <p>${route.city}, ${route.country}</p>
          <p>${route.description}</p>
          <button class="general-route-popup-button" data-route-id="${route._id}">
            ${t('routes.viewRoute')}
          </button>
        </div>
      `);

      marker.on('popupopen', () => {
        const button = document.querySelector<HTMLButtonElement>(
          `.general-route-popup-button[data-route-id="${route._id}"]`
        );

        if (button) {
          button.onclick = () => onSelectRoute(route._id);
        }
      });
    });

    if (boundsPoints.length > 0 && selectedZone) {
      map.current.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40] });
    }
  }, [routesToRender, selectedZone, onSelectRoute, t]);

  useEffect(() => {
    if (!selectedZone) {
      setZoneRoutes([]);
      return;
    }

    let mounted = true;

    const loadRoutesInsideZone = async (): Promise<void> => {
      try {
        setIsLoadingZone(true);
        setError('');

        const result = await routeDataProvider.getRoutesInsidePolygon(selectedZone.coordinates);

        if (mounted) {
          setZoneRoutes(result);
        }
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof Error) {
          setError(loadError.message);
        } else {
          setError(t('routes.zoneLoadError'));
        }
      } finally {
        if (mounted) {
          setIsLoadingZone(false);
        }
      }
    };

    void loadRoutesInsideZone();

    return () => {
      mounted = false;
    };
  }, [selectedZone, t]);

  return (
    <section className="general-routes-map-section">
      <div className="general-routes-map-header">
        <div>
          <h2>{t('routes.generalMap')}</h2>
          <p>{t('routes.mapHelp')}</p>
        </div>

        {selectedZone ? (
          <button
            type="button"
            className="general-map-clear-button"
            onClick={() => {
              setSelectedZone(null);
              setZoneRoutes([]);
              setError('');
            }}
          >
            {t('routes.seeAllZones')}
          </button>
        ) : null}
      </div>

      <div className="general-routes-map-layout">
        <div className="general-routes-map-wrapper" ref={mapContainer} />

        <aside className="general-routes-map-panel">
          <h3>
            {selectedZone
              ? t(zoneTranslationKeys[selectedZone.id]?.name ?? 'routes.availableZones')
              : t('routes.availableZones')}
          </h3>

          {!selectedZone ? (
            <div className="general-zone-list">
              {ROUTE_ZONES.map((zone) => (
                <button key={zone.id} type="button" onClick={() => setSelectedZone(zone)}>
                  <strong>{t(zoneTranslationKeys[zone.id]?.name ?? 'routes.availableZones')}</strong>
                  <span>{t(zoneTranslationKeys[zone.id]?.description ?? 'routes.mapHelp')}</span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedZone && isLoadingZone ? (
            <p className="general-map-status">{t('routes.searchingZone')}</p>
          ) : null}

          {selectedZone && error ? <p className="general-map-status error">{error}</p> : null}

          {selectedZone && !isLoadingZone && !error ? (
            <div className="general-zone-results">
              <p>
                {t('routes.zoneResults', { count: zoneRoutes.length })}
              </p>

              {zoneRoutes.map((route) => (
                <button key={route._id} type="button" onClick={() => onSelectRoute(route._id)}>
                  <strong>{route.name}</strong>
                  <span>
                    {route.city}, {route.country}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

export default GeneralRoutesMap;
