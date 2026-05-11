import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route, Point } from '../../../types/route';
import { routeDataProvider } from '../../../services/routeService';
import { pointService } from '../../../services/pointService';
import { buildMyWayUrl } from '../../../utils/routeNavigation';
import './RouteMap.css';

interface RouteMapProps {
  route: Route;
}

interface MapMarker {
  marker: L.Marker;
  popup: L.Popup;
}

const RouteMap: React.FC<RouteMapProps> = ({ route }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, MapMarker>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(!route.points || route.points.length === 0);
  const [error, setError] = useState<string>('');
  const [points, setPoints] = useState<Point[]>(route.points || []);

  // Load route details if points are not available
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
          setError('No route points available');
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unable to load route details');
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadRouteDetails();
  }, [route]);

  // Initialize map
  useEffect(() => {
    if (isLoading || !mapContainer.current || map.current) {
      return;
    }

    if (points.length === 0) {
      return;
    }

    // Initialize Leaflet map
    map.current = L.map(mapContainer.current, {
      center: [points[0].latitude, points[0].longitude],
      zoom: 13,
      scrollWheelZoom: true
    });

    // Base layers (no API keys required)
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

    // Default view can be changed by users with the control on top-right.
    satelliteLayer.addTo(map.current);

    const baseLayers: Record<string, L.TileLayer> = {
      Standard: standardLayer,
      Satellite: satelliteLayer,
      Traffic: trafficLayer,
      Pedestrian: pedestrianLayer
    };

    L.control.layers(baseLayers, undefined, { position: 'topright', collapsed: false }).addTo(map.current);

    // Add markers for each point
    points.forEach((point, idx) => {
      if (!map.current) return;

      const pointOrder = point.index > 0 ? point.index : idx + 1;

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

      // Create popup content with basic info
      const popupContent = document.createElement('div');
      popupContent.className = 'point-popup-content';
      popupContent.innerHTML = `
        <h3>${point.name}</h3>
        ${point.description ? `<p class="point-popup-description">${point.description}</p>` : ''}
        <p class="point-popup-index">Point ${pointOrder}</p>
      `;

      const popup = L.popup().setContent(popupContent);
      marker.bindPopup(popup);

      // Load full point details on marker click
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

            const detailedOrder = detailedPoint.index > 0 ? detailedPoint.index : pointOrder;
            html += `<p class="point-popup-index">Point ${detailedOrder}</p>`;

            enhancedPopupContent.innerHTML = html;
            marker.setPopupContent(enhancedPopupContent);
          }
        } catch (err) {
          console.error('Failed to load point details:', err);
        }
      });

      markersRef.current.set(point._id, { marker, popup });
    });

    // Adjust map bounds to fit all markers
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude] as [number, number]));
      map.current.fitBounds(bounds, { padding: [50, 50] });
      // Immediate invalidate
      setTimeout(() => {
        if (!map.current) return;
        try {
          map.current.invalidateSize(true);
        } catch (e) {
          // ignore
        }
      }, 0);
    }

    // Retries and whenReady
    const deferred = setTimeout(() => {
      if (!map.current) return;
      try {
        map.current.invalidateSize(true);
      } catch (e) {
        // ignore
      }
    }, 200);

    const deferred2 = setTimeout(() => {
      if (!map.current) return;
      try {
        map.current.invalidateSize(true);
      } catch (e) {
        // ignore
      }
    }, 500);

    map.current.whenReady(() => {
      if (!map.current) return;
      try {
        map.current.invalidateSize(true);
      } catch (e) {
        // ignore
      }
    });

    // ResizeObserver to handle layout changes
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => {
        if (!map.current) return;
        requestAnimationFrame(() => {
          try {
            map.current && map.current.invalidateSize(true);
          } catch (e) {
            // ignore
          }
        });
      });

      if (mapContainer.current) {
        ro.observe(mapContainer.current);
      }
    } catch (err) {
      // ResizeObserver not supported - ignore
    }

    return () => {
      clearTimeout(deferred);
      clearTimeout(deferred2);
      if (ro && mapContainer.current) {
        try {
          ro.unobserve(mapContainer.current);
        } catch (e) {
          // ignore
        }
      }
      // Don't remove map on unmount to preserve state
      // (could call map.current?.remove() if desired)
    };
  }, [points, isLoading]);

  if (error) {
    return (
      <div className="route-map-section">
        <h2>Map of the route</h2>
        <div className="route-map-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="route-map-section">
      <div className="route-map-header">
        <h2>Map of the route</h2>
        <button
          type="button"
          className="start-route-button"
          onClick={() => {
            window.location.href = buildMyWayUrl(route._id);
          }}
        >
          Start Route
        </button>
      </div>
      {isLoading ? (
        <div className="route-map-loading">Loading map...</div>
      ) : (
        <div className="route-map-container">
          <div className="map-wrapper" ref={mapContainer} />
        </div>
      )}
    </div>
  );
};

export default RouteMap;
