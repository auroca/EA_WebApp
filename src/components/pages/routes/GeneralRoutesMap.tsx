import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route, RouteZone } from '../../../types/route';
import { routeDataProvider } from '../../../services/routeService';
import './GeneralRoutesMap.css';

interface GeneralRoutesMapProps {
  routes: Route[];
  onSelectRoute: (routeId: string) => void;
}

const ROUTE_ZONES: RouteZone[] = [
  {
    id: 'barcelona-centre',
    name: 'Barcelona centre',
    description: 'Zona central de Barcelona',
    coordinates: [
      [2.1402, 41.3661],
      [2.2064, 41.3661],
      [2.2064, 41.4089],
      [2.1402, 41.4089],
      [2.1402, 41.3661]
    ]
  },
  {
    id: 'montjuic',
    name: 'Montjuïc',
    description: 'Zona de Montjuïc',
    coordinates: [
      [2.1375, 41.3501],
      [2.1818, 41.3501],
      [2.1818, 41.3748],
      [2.1375, 41.3748],
      [2.1375, 41.3501]
    ]
  },
  {
    id: 'collserola',
    name: 'Collserola',
    description: 'Zona de montaña de Collserola',
    coordinates: [
      [2.0707, 41.4021],
      [2.1591, 41.4021],
      [2.1591, 41.4684],
      [2.0707, 41.4684],
      [2.0707, 41.4021]
    ]
  }
];

const getRoutePoints = (route: Route) => {
  return route.points?.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) ?? [];
};

const GeneralRoutesMap: React.FC<GeneralRoutesMapProps> = ({ routes, onSelectRoute }) => {
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
      center: [41.3874, 2.1686],
      zoom: 12,
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

    const zonesToRender = selectedZone ? [selectedZone] : ROUTE_ZONES;

zonesToRender.forEach((zone) => {
  const polygonLatLngs = zone.coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);

  const polygon = L.polygon(polygonLatLngs, {
    weight: 4,
    fillOpacity: selectedZone ? 0.28 : 0.12
  });

  polygon.bindPopup(`
    <div class="general-zone-popup">
      <h3>${zone.name}</h3>
      <p>${zone.description}</p>
      <p>Click to view routes inside this area.</p>
    </div>
  `);

  polygon.on('click', () => {
    setSelectedZone(zone);
  });

  polygon.addTo(zoneLayerGroup.current as L.LayerGroup);
});
  }, [selectedZone]);

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
  popupAnchor: [0, -40],
});

const marker = L.marker([firstPoint.latitude, firstPoint.longitude], {
  icon: markerIcon,
}).addTo(layerGroup.current as L.LayerGroup);
      marker.bindPopup(`
        <div class="general-route-popup">
          <h3>${route.name}</h3>
          <p>${route.city}, ${route.country}</p>
          <p>${route.description}</p>
          <button class="general-route-popup-button" data-route-id="${route._id}">
            View route
          </button>
        </div>
      `);

      marker.on('popupopen', () => {
        const button = document.querySelector<HTMLButtonElement>(`.general-route-popup-button[data-route-id="${route._id}"]`);

        if (button) {
          button.onclick = () => onSelectRoute(route._id);
        }
      });
    });

    if (boundsPoints.length > 0) {
      map.current.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40] });
    }
  }, [routesToRender, onSelectRoute]);

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
          setError('Unable to load routes inside selected zone.');
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
  }, [selectedZone]);

  return (
    <section className="general-routes-map-section">
      <div className="general-routes-map-header">
        <div>
          <h2>General route map with zones</h2>
          <p>Select a polygon to search for routes inside that zone.</p>
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
            See all zones
          </button>
        ) : null}
      </div>

      <div className="general-routes-map-layout">
        <div className="general-routes-map-wrapper" ref={mapContainer} />

        <aside className="general-routes-map-panel">
          <h3>{selectedZone ? selectedZone.name : 'Available Zones'}</h3>

          {!selectedZone ? (
            <div className="general-zone-list">
              {ROUTE_ZONES.map((zone) => (
                <button key={zone.id} type="button" onClick={() => setSelectedZone(zone)}>
                  <strong>{zone.name}</strong>
                  <span>{zone.description}</span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedZone && isLoadingZone ? <p className="general-map-status">Searching for routes inside the polygon...</p> : null}
          {selectedZone && error ? <p className="general-map-status error">{error}</p> : null}

          {selectedZone && !isLoadingZone && !error ? (
            <div className="general-zone-results">
              <p>
                {zoneRoutes.length} route{zoneRoutes.length === 1 ? '' : 's'} found inside the polygon.
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