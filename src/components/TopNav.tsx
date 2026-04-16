import { useEffect, useRef, useState } from 'react';
import { getStoredUser, isAuthenticated, logoutUser } from '../services/authService';
import { getTopNavIconPath, topNavItems, type TopNavKey } from '../utils/homeView';

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

  const handleLogout = async (): Promise<void> => {
    await logoutUser();
    setMenuOpen(false);
    setLoggedIn(false);
    window.location.href = '/';
  };

  return (
    <nav className="top-nav">
      <a className="top-nav-brand" href="/" aria-label="Go to home">
        <img src="/resources/logos/logo_horizontal.png" alt="Trip2Guide" />
      </a>

      <div className="top-nav-menu">
        {topNavItems
          .filter((item) => item.key !== 'user')
          .map((item) => {
            const isSelected = item.key === activeTopNav;

            return (
              <button
                key={item.key}
                type="button"
                className={isSelected ? 'nav-item nav-item-active' : 'nav-item'}
                aria-label={item.label}
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
            <span className="nav-label">User</span>
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