import { useEffect, useMemo, useState } from 'react';
import TopNav from './components/shared/TopNav';
import AppOverlays from './components/shared/AppOverlays';
import MyWayNavigator from './components/pages/routes/MyWayNavigator';
import { routeDataProvider } from './services/routeService';
import { getApiBaseUrl } from './services/config';
import type { Route } from './types/route';
import { buildRouteDetailUrl, getRouteIdFromSearch } from './utils/routeNavigation';
import './myway.css';
import LoadingScreen from './components/shared/LoadingScreen';
import { useLanguage } from './i18n/LanguageContext';

function MyWayApp() {
  const { t } = useLanguage();
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const routeId = useMemo(() => getRouteIdFromSearch(window.location.search), []);

  useEffect(() => {
    // Resolve and persist the API base URL on page entry, same as the route page flow.
    getApiBaseUrl();
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async (): Promise<void> => {
      if (!routeId) {
        setError(t('myway.routeIdRequired'));
        setIsLoading(false);
        return;
      }

      try {
        const result = await routeDataProvider.getRouteById(routeId);
        if (!mounted) {
          return;
        }

        if (!result) {
          setError(t('myway.routeNotFound'));
          setRoute(null);
          return;
        }

        setRoute(result);
        setError('');
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        if (loadError instanceof Error) {
          setError(loadError.message);
        } else {
          setError(t('myway.routeLoadError'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [routeId]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <main className="myway-page">
        <TopNav activeTopNav="routes" />
        <AppOverlays />

        <section className="myway-shell">
          <article className="myway-hero route-panel">
            <h1>{t('myway.start')}</h1>
            <p>{t('myway.description')}</p>
            {routeId ? (
              <button
                type="button"
                className="myway-back-button"
                onClick={() => {
                  window.location.href = buildRouteDetailUrl(routeId);
                }}
              >
                {t('myway.backDetails')}
              </button>
            ) : null}
          </article>

          {error ? <p className="status-message error">{error}</p> : null}

          {!error && route ? <MyWayNavigator route={route} /> : null}
        </section>
      </main>
    </>
  );
}

export default MyWayApp;
