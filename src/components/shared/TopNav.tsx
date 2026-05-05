import { useEffect, useRef, useState } from 'react';
import { getStoredUser, isAuthenticated, logoutUser } from '../../services/authService';
import { getTopNavIconPath, topNavItems, type TopNavKey } from '../../utils/homeView';

interface TopNavProps {
  activeTopNav: TopNavKey;
}

function TopNav({ activeTopNav }: TopNavProps) {
  const [loggedIn, setLoggedIn] = useState<boolean>(isAuthenticated());
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const user = getStoredUser();

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent): void => {
      if (!dropdownRef.current) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  const navigateTo = (path: string): void => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    setMenuOpen(false);
  };

  const navigateFull = (path: string): void => {
    // Perform a full page redirect to match site-wide logo behavior
    if (window.location.pathname !== path) {
      window.location.href = path;
    }

    setMenuOpen(false);
  };

  const handleLogout = async (): Promise<void> => {
    await logoutUser();
    setMenuOpen(false);
    setLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <nav className="top-nav">
      <button
        type="button"
        className="top-nav-brand"
        aria-label="Go to home"
        onClick={() => navigateFull('/')}
      >
        <img src="/resources/logos/logo_horizontal.png" alt="Trip2Guide" />
      </button>

      <div className="top-nav-menu">
        {topNavItems
          .filter((item) => item.key !== 'user')
          .map((item) => {
            const isSelected = item.key === activeTopNav;
            const className = isSelected ? 'nav-item nav-item-active' : 'nav-item';

            if (item.key === 'home') {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={className}
                  aria-label={item.label}
                  onClick={() => navigateFull('/')}
                >
                  <img
                    className="nav-icon"
                    src={getTopNavIconPath(item.icon, isSelected)}
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            }

            if (item.key === 'routes') {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={className}
                  aria-label={item.label}
                  onClick={() => navigateTo('/routes')}
                >
                  <img
                    className="nav-icon"
                    src={getTopNavIconPath(item.icon, isSelected)}
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            }

            if (item.key === 'favorites') {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={className}
                  aria-label={item.label}
                  onClick={() => navigateTo('/favorites')}
                >
                  <img
                    className="nav-icon"
                    src={getTopNavIconPath(item.icon, isSelected)}
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            }

            return (
              <button key={item.key} type="button" className={className} aria-label={item.label}>
                <img
                  className="nav-icon"
                  src={getTopNavIconPath(item.icon, isSelected)}
                  alt=""
                  aria-hidden="true"
                />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
      </div>

      {!loggedIn ? (
        <div className="top-nav-auth">
          <a className="top-nav-auth-link" href="/login">
            Login
          </a>
          <a className="top-nav-auth-link top-nav-auth-link-primary" href="/register">
            Register
          </a>
        </div>
      ) : (
        <div className="top-nav-user" ref={dropdownRef}>
          <button
            type="button"
            className={menuOpen ? 'top-nav-user-button top-nav-user-button-active' : 'top-nav-user-button'}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Open user menu"
          >
            <img
              className="nav-icon"
              src={getTopNavIconPath('user', menuOpen)}
              alt=""
              aria-hidden="true"
            />
            <span className="nav-label">{user?.username ?? 'User'}</span>
          </button>

          {menuOpen ? (
            <div className="top-nav-user-menu">
              <div className="top-nav-user-menu-row">
                <span className="top-nav-user-menu-label">Email</span>
                <span className="top-nav-user-menu-value">{user?.email ?? '-'}</span>
              </div>

              <div className="top-nav-user-menu-row">
                <span className="top-nav-user-menu-label">Username</span>
                <span className="top-nav-user-menu-value">{user?.username ?? '-'}</span>
              </div>

              <button
                type="button"
                className="user-dropdown-button"
                onClick={() => navigateTo('/profile')}
              >
                View profile
              </button>

              <button
                type="button"
                className="top-nav-user-logout"
                onClick={() => {
                  void handleLogout();
                }}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      )}
    </nav>
  );
}

export default TopNav;