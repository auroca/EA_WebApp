function LoadingScreen() {
  return (
    <div className="app-loading-screen" role="status" aria-live="polite">
      <div className="app-loading-content">
        <img
          className="app-loading-logo"
          src="/resources/logos/logo_horizontal.png"
          alt="Trip2Guide"
        />
        <span className="app-loading-spinner" aria-hidden="true" />
        <p className="app-loading-text">We are preparing amazing routes just for you</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
