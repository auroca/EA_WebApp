import { useEffect, useRef, useState } from 'react';
import { getStoredSession, getStoredUser, isAuthenticated, logoutUser } from '../../services/authService';
import { registerPushNotificationsForUser } from '../../services/notificationService';
import { getTopNavIconPath, topNavItems, type TopNavKey } from '../../utils/homeView';

interface TopNavProps {
  activeTopNav: TopNavKey;
}

function TopNav({ activeTopNav }: TopNavProps) {
  const [loggedIn, setLoggedIn] = useState<boolean>(isAuthenticated());
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<
    'idle' | 'saving' | 'enabled' | 'blocked' | 'error'
  >('idle');
  const [notificationMessage, setNotificationMessage] = useState<string>('');
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

  useEffect(() => {
    if (!('Notification' in window)) {
      setNotificationStatus('blocked');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotificationStatus('enabled');
      setNotificationMessage('Click to sync this browser.');
    }

    if (Notification.permission === 'denied') {
      setNotificationStatus('blocked');
      setNotificationMessage('Reset the permission in Chrome and try again.');
    }
  }, []);

  const navigateFull = (path: string): void => {
    setMenuOpen(false);

    if (window.location.pathname !== path) {
      window.location.href = path;
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleLogout = async (): Promise<void> => {
    await logoutUser();
    setMenuOpen(false);
    setLoggedIn(false);
    window.location.href = '/';
  };

  const handleEnableNotifications = async (): Promise<void> => {
    const session = getStoredSession();

    if (!session) {
      return;
    }

    setNotificationStatus('saving');
    setNotificationMessage('');

    try {
      await registerPushNotificationsForUser(session.user, session.token);
      setNotificationStatus('enabled');
      setNotificationMessage('Token saved for this browser.');
    } catch (error) {
      console.warn('[Web push registration failed]', error);
      setNotificationStatus(Notification.permission === 'denied' ? 'blocked' : 'error');
      setNotificationMessage(error instanceof Error ? error.message : 'Unable to enable notifications.');
    }
  };

  const notificationButtonLabel = (() => {
    if (notificationStatus === 'saving') return 'Enabling...';
    if (notificationStatus === 'enabled') return 'Sync notifications';
    if (notificationStatus === 'blocked') return 'Notifications blocked';
    if (notificationStatus === 'error') return 'Try notifications again';
    return 'Enable notifications';
  })();

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
          .filter((item) => item.key !== 'user' && (loggedIn || (item.key !== 'chats' && item.key !== 'favorites')))
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
                  <img className="nav-icon" src={getTopNavIconPath(item.icon, isSelected)} alt="" aria-hidden="true" />
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
                  onClick={() => navigateFull('/routes')}
                >
                  <img className="nav-icon" src={getTopNavIconPath(item.icon, isSelected)} alt="" aria-hidden="true" />
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
                  onClick={() => navigateFull('/favorites')}
                >
                  <img className="nav-icon" src={getTopNavIconPath(item.icon, isSelected)} alt="" aria-hidden="true" />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            }

            if (item.key === 'chats') {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={className}
                  aria-label={item.label}
                  onClick={() => navigateFull('/chats')}
                >
                  <img className="nav-icon" src={getTopNavIconPath(item.icon, isSelected)} alt="" aria-hidden="true" />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            }

            return (
              <button key={item.key} type="button" className={className} aria-label={item.label}>
                <img className="nav-icon" src={getTopNavIconPath(item.icon, isSelected)} alt="" aria-hidden="true" />
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
            <img className="nav-icon" src={getTopNavIconPath('user', menuOpen)} alt="" aria-hidden="true" />
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

              <button type="button" className="user-dropdown-button" onClick={() => navigateFull('/profile')}>
                View profile
              </button>

              <button
                type="button"
                className="user-dropdown-button"
                onClick={() => {
                  void handleEnableNotifications();
                }}
                disabled={notificationStatus === 'saving'}
              >
                {notificationButtonLabel}
              </button>

              {notificationMessage ? (
                <p className="top-nav-user-menu-hint">{notificationMessage}</p>
              ) : null}

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
