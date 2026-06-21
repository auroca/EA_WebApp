import { useLanguage } from '../../i18n/LanguageContext';

function LoadingScreen() {
  const { t } = useLanguage();

  return (
    <div className="app-loading-screen" role="status" aria-live="polite">
      <div className="app-loading-content">
        <img
          className="app-loading-logo"
          src="/resources/logos/logo_horizontal.png"
          alt="Trip2Guide"
        />
        <span className="app-loading-spinner" aria-hidden="true" />
        <p className="app-loading-text">{t('loading.routes')}</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
