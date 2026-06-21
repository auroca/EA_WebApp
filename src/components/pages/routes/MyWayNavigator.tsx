import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route, Point } from '../../../types/route';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { TranslationKey } from '../../../i18n/translations';
import './RouteMap.css';

type TransportMode = 'walking' | 'driving' | 'cycling' | 'transit';

interface MyWayNavigatorProps {
  route: Route;
}

interface UserPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface OsrmRouteResponse {
  code: string;
  routes?: Array<{
    geometry?: {
      coordinates: number[][];
    };
  }>;
}

const TRANSPORT_LABEL_KEYS: Record<TransportMode, TranslationKey> = {
  walking: 'myway.mode.walking',
  driving: 'myway.mode.driving',
  cycling: 'myway.mode.cycling',
  transit: 'myway.mode.transit'
};

const TRANSPORT_SPEED_KMH: Record<TransportMode, number> = {
  walking: 5,
  driving: 32,
  cycling: 15,
  transit: 22
};

const ROUTE_COLORS: Record<TransportMode, string> = {
  walking: '#1f7a5b',
  driving: '#0f4c81',
  cycling: '#8a5b1f',
  transit: '#5b3ea8'
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceMeters(from: [number, number], to: [number, number]): number {
  const earthRadius = 6371000;
  const dLat = toRadians(to[0] - from[0]);
  const dLon = toRadians(to[1] - from[1]);
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(from: [number, number], to: [number, number]): number {
  const lat1 = toRadians(from[0]);
  const lat2 = toRadians(to[0]);
  const dLon = toRadians(to[1] - from[1]);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function bearingToDirection(value: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(value / 45) % 8;
  return directions[index];
}

function signedDeltaAngle(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function getTurnAction(delta: number, t: (key: TranslationKey) => string): string {
  const abs = Math.abs(delta);

  if (abs < 20) {
    return t('myway.turn.straight');
  }

  if (abs < 45) {
    return delta > 0 ? t('myway.turn.slightRight') : t('myway.turn.slightLeft');
  }

  if (abs < 120) {
    return delta > 0 ? t('myway.turn.right') : t('myway.turn.left');
  }

  return delta > 0 ? t('myway.turn.sharpRight') : t('myway.turn.sharpLeft');
}

function getNearestPathIndex(path: [number, number][], current: [number, number]): number {
  if (path.length === 0) {
    return 0;
  }

  let nearestIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < path.length; i += 1) {
    const distance = distanceMeters(current, path[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

function formatDistance(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }

  return `${Math.round(value)} m`;
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) {
    return '< 1 min';
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remMin = Math.round(minutes % 60);
  return `${hours}h ${remMin}m`;
}

function getSortedPoints(route: Route): Point[] {
  const source = route.points ?? [];

  return [...source]
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .sort((a, b) => {
      const ai = typeof a.index === 'number' ? a.index : 0;
      const bi = typeof b.index === 'number' ? b.index : 0;
      return ai - bi;
    });
}

function getOsrmProfile(mode: TransportMode): 'driving' | 'foot' | 'bike' {
  if (mode === 'walking') {
    return 'foot';
  }

  if (mode === 'cycling') {
    return 'bike';
  }

  return 'driving';
}

async function fetchStreetGeometry(points: Point[], mode: TransportMode): Promise<[number, number][]> {
  if (points.length < 2) {
    return points.map((point) => [point.latitude, point.longitude] as [number, number]);
  }

  const profile = getOsrmProfile(mode);
  const coordinates = points.map((point) => `${point.longitude},${point.latitude}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson`;

  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error('Unable to fetch street geometry.');
  }

  const data = (await response.json()) as OsrmRouteResponse;
  const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;

  if (!routeCoordinates || routeCoordinates.length === 0) {
    throw new Error('Street geometry is empty.');
  }

  return routeCoordinates
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map((pair) => [pair[1], pair[0]] as [number, number]);
}

function MyWayNavigator({ route }: MyWayNavigatorProps) {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const accuracyRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const recenterDoneRef = useRef<boolean>(false);

  const points = useMemo(() => getSortedPoints(route), [route]);
  const [mode, setMode] = useState<TransportMode>('walking');
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [geoError, setGeoError] = useState<string>('');
  const [visitedPointIds, setVisitedPointIds] = useState<string[]>([]);
  const [streetPath, setStreetPath] = useState<[number, number][]>([]);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  const modeButtons: TransportMode[] = ['walking', 'driving', 'cycling', 'transit'];

  useEffect(() => {
    let mounted = true;

    const loadStreetPath = async (): Promise<void> => {
      try {
        const result = await fetchStreetGeometry(points, mode);
        if (mounted) {
          setStreetPath(result);
        }
      } catch {
        if (mounted) {
          setStreetPath(points.map((point) => [point.latitude, point.longitude] as [number, number]));
        }
      }
    };

    void loadStreetPath();

    return () => {
      mounted = false;
    };
  }, [mode, points]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || points.length === 0) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [points[0].latitude, points[0].longitude],
      zoom: 15,
      scrollWheelZoom: true
    });

    mapRef.current = map;

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

    standardLayer.addTo(map);

    L.control
      .layers(
        {
          [t('myway.layer.standard')]: standardLayer,
          [t('myway.layer.satellite')]: satelliteLayer,
          [t('myway.layer.traffic')]: trafficLayer,
          [t('myway.layer.pedestrian')]: pedestrianLayer
        },
        undefined,
        { position: 'topright', collapsed: false }
      )
      .addTo(map);

    points.forEach((point, idx) => {
      const pointOrder = idx + 1;

      const marker = L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          html: `<div class="point-marker-icon">${pointOrder}</div>`,
          className: 'route-point-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        })
      });

      marker
        .bindPopup(
          `<div class="point-popup-content"><h3>${point.name}</h3><p class="point-popup-index">${t('myway.point', { number: pointOrder })}</p></div>`
        )
        .addTo(map);
    });

    const latLngs = points.map((point) => [point.latitude, point.longitude] as [number, number]);
    const polyline = L.polyline(latLngs, {
      color: ROUTE_COLORS.walking,
      weight: 5,
      opacity: 0.92
    }).addTo(map);

    polylineRef.current = polyline;

    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [50, 50] });

    setTimeout(() => {
      map.invalidateSize(true);
    }, 0);

    return () => {
      map.remove();
      mapRef.current = null;
      polylineRef.current = null;
      userMarkerRef.current = null;
      accuracyRef.current = null;
      recenterDoneRef.current = false;
    };
  }, [points, t]);

  useEffect(() => {
    if (!polylineRef.current) {
      return;
    }

    polylineRef.current.setStyle({ color: ROUTE_COLORS[mode] });

    if (streetPath.length > 1) {
      polylineRef.current.setLatLngs(streetPath);
    } else {
      polylineRef.current.setLatLngs(points.map((point) => [point.latitude, point.longitude] as [number, number]));
    }

    if (mapRef.current && streetPath.length > 1) {
      const bounds = L.latLngBounds(streetPath);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [mode, points, streetPath]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    setTimeout(() => {
      if (!mapRef.current) {
        return;
      }

      mapRef.current.invalidateSize(true);
      if (isNavigating && userPosition) {
        mapRef.current.setView([userPosition.latitude, userPosition.longitude], 17);
      }
    }, 0);
  }, [isNavigating, userPosition]);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoError(t('myway.geo.unsupported'));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setGeoError('');
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError(t('myway.geo.denied'));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError(t('myway.geo.unavailable'));
        } else if (error.code === error.TIMEOUT) {
          setGeoError(t('myway.geo.timeout'));
        } else {
          setGeoError(t('myway.geo.unknown'));
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [t]);

  useEffect(() => {
    if (!mapRef.current || !userPosition) {
      return;
    }

    const latLng: [number, number] = [userPosition.latitude, userPosition.longitude];

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.circleMarker(latLng, {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: '#1f6dff',
        fillOpacity: 1
      })
        .bindPopup(t('myway.currentPosition'))
        .addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng(latLng);
    }

    if (!accuracyRef.current) {
      accuracyRef.current = L.circle(latLng, {
        radius: userPosition.accuracy,
        color: '#1f6dff',
        weight: 1,
        fillColor: '#76a7ff',
        fillOpacity: 0.2
      }).addTo(mapRef.current);
    } else {
      accuracyRef.current.setLatLng(latLng);
      accuracyRef.current.setRadius(userPosition.accuracy);
    }

    if (!recenterDoneRef.current) {
      mapRef.current.setView(latLng, 16);
      recenterDoneRef.current = true;
    }

    const nearestUnvisited = points
      .filter((point) => !visitedPointIds.includes(point._id))
      .map((point) => ({
        point,
        distance: distanceMeters(latLng, [point.latitude, point.longitude])
      }))
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearestUnvisited && nearestUnvisited.distance < 20) {
      setVisitedPointIds((current) => {
        if (current.includes(nearestUnvisited.point._id)) {
          return current;
        }

        return [...current, nearestUnvisited.point._id];
      });
    }
  }, [points, userPosition, visitedPointIds]);

  const guidance = useMemo(() => {
    if (points.length === 0) {
      return {
        title: t('myway.noRoutePoints.title'),
        message: t('myway.noRoutePoints.message')
      };
    }

    if (!userPosition) {
      return {
        title: t('myway.waitingGps.title'),
        message: t('myway.waitingGps.message')
      };
    }

    const current: [number, number] = [userPosition.latitude, userPosition.longitude];
    const remainingPoints = points.filter((point) => !visitedPointIds.includes(point._id));

    if (remainingPoints.length === 0) {
      return {
        title: t('myway.completed.title'),
        message: t('myway.completed.message')
      };
    }

    const nextPoint = remainingPoints[0];
    const toNext = distanceMeters(current, [nextPoint.latitude, nextPoint.longitude]);
    const nextDirection = bearingToDirection(bearing(current, [nextPoint.latitude, nextPoint.longitude]));

    let remainingMeters = toNext;
    for (let idx = 0; idx < remainingPoints.length - 1; idx += 1) {
      const from = remainingPoints[idx];
      const to = remainingPoints[idx + 1];
      remainingMeters += distanceMeters([from.latitude, from.longitude], [to.latitude, to.longitude]);
    }

    const speed = TRANSPORT_SPEED_KMH[mode];
    const etaMinutes = (remainingMeters / 1000 / speed) * 60;

    return {
      title: t('myway.nextPoint', { name: nextPoint.name }),
      message: t('myway.remainingRoute', {
        direction: nextDirection,
        distance: formatDistance(toNext),
        remaining: formatDistance(remainingMeters),
        eta: formatDuration(etaMinutes),
        mode: t(TRANSPORT_LABEL_KEYS[mode]).toLowerCase()
      })
    };
  }, [mode, points, t, userPosition, visitedPointIds]);

  const nextPointSummary = useMemo(() => {
    if (!userPosition) {
      return null;
    }

    const current: [number, number] = [userPosition.latitude, userPosition.longitude];
    const remainingPoints = points.filter((point) => !visitedPointIds.includes(point._id));

    if (remainingPoints.length === 0) {
      return {
        distanceText: '0 m',
        etaText: '< 1 min'
      };
    }

    const nextPoint = remainingPoints[0];
    const distance = distanceMeters(current, [nextPoint.latitude, nextPoint.longitude]);
    const etaMinutes = (distance / 1000 / TRANSPORT_SPEED_KMH[mode]) * 60;

    return {
      distanceText: formatDistance(distance),
      etaText: formatDuration(etaMinutes)
    };
  }, [mode, points, userPosition, visitedPointIds]);

  const turnInstruction = useMemo(() => {
    if (!userPosition) {
      return t('myway.enableLocation');
    }

    const current: [number, number] = [userPosition.latitude, userPosition.longitude];
    const path = streetPath.length > 1 ? streetPath : points.map((point) => [point.latitude, point.longitude] as [number, number]);

    if (path.length < 2) {
      return t('myway.insufficientPath');
    }

    const nearestIndex = getNearestPathIndex(path, current);
    const i1 = Math.min(nearestIndex, path.length - 2);

    const firstBearing = bearing(path[i1], path[i1 + 1]);

    if (i1 + 2 >= path.length) {
      return t('myway.straightTowards', { direction: bearingToDirection(firstBearing) });
    }

    const secondBearing = bearing(path[i1 + 1], path[i1 + 2]);
    const delta = signedDeltaAngle(firstBearing, secondBearing);
    const action = getTurnAction(delta, t);

    return `${action}. ${t('myway.continueTowards', { direction: bearingToDirection(firstBearing) })}`;
  }, [points, streetPath, t, userPosition]);

  return (
    <section className="route-panel">
      {!isNavigating ? (
        <>
          <div className="myway-toolbar">
            <div className="myway-mode-group" role="group" aria-label={t('myway.transportMode')}>
              {modeButtons.map((value) => {
                const active = value === mode;
                return (
                  <button
                    key={value}
                    type="button"
                    className={`myway-mode-button${active ? ' myway-mode-button-active' : ''}`}
                    onClick={() => setMode(value)}
                  >
                    {t(TRANSPORT_LABEL_KEYS[value])}
                  </button>
                );
              })}
            </div>

            <button type="button" className="myway-start-button" onClick={() => setIsNavigating(true)}>
              {t('myway.startButton')}
            </button>
          </div>

          {geoError ? <span className="status-message error">{geoError}</span> : null}

          <div className="myway-instructions" aria-live="polite">
            <h3>{guidance.title}</h3>
            <p>{guidance.message}</p>
          </div>
        </>
      ) : null}

      <div className="myway-map-shell">
        {isNavigating ? (
          <div className="myway-nav-overlay" aria-live="polite">
            <p>{turnInstruction}</p>
            <button type="button" className="myway-cancel-button" onClick={() => setIsNavigating(false)}>
              {t('myway.cancelNavigation')}
            </button>
          </div>
        ) : null}

        <div ref={mapContainerRef} className={`myway-map${isNavigating ? ' myway-map-active' : ''}`} />
      </div>

      {isNavigating ? (
        <p className="myway-next-point-summary">
          {t('myway.nextPointDistance', {
            distance: nextPointSummary?.distanceText ?? '--',
            eta: nextPointSummary?.etaText ?? '--'
          })}
        </p>
      ) : null}
    </section>
  );
}

export default MyWayNavigator;
