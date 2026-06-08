import { useEffect, useRef, useState } from 'react';
import { getStoredUser, isAuthenticated, logoutUser } from '../../services/authService';
import { getMyAchievements } from '../../services/achievementService';
import { getTopNavIconPath, topNavItems, type TopNavKey } from '../../utils/homeView';

interface TopNavProps {
  activeTopNav: TopNavKey;
}

const getSeenAchievementsKey = (): string => {
  const user = getStoredUser();
  return `seenAchievements:${user?._id ?? 'guest'}`;
};

const getSeenAchievementCodes = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(getSeenAchievementsKey()) ?? '[]') as string[];
  } catch {
    return [];
  }
};

function TopNav({ activeTopNav }: TopNavProps) {
  const [loggedIn, setLoggedIn] = useState<boolean>(isAuthenticated());
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [hasNewAchievements, setHasNewAchievements] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const user = getStoredUser();

  useEffect(() => {
    const checkNewAchievements = async (): Promise<void> => {
      if (!isAuthenticated()) {
        setHasNewAchievements(false);
        return;
      }

      try {
        const achievements = await getMyAchievements();
        const unlockedCodes = achievements
          .filter((achievement) => achievement.unlocked)
          .map((achievement) => achievement.code);

        const seenCodes = getSeenAchievementCodes();

        setHasNewAchievements(unlockedCodes.some((code) => !seenCodes.includes(code)));
      } catch {
        setHasNewAchievements(false);
      }
    };

    void checkNewAchievements();

    const intervalId = window.setInterval(() => {
      void checkNewAchievements();
    }, 5000);

    window.addEventListener('focus', checkNewAchievements);
    window.addEventListener('achievements-seen-updated', checkNewAchievements);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', checkNewAchievements);
      window.removeEventListener('achievements-seen-updated', checkNewAchievements);
    };
  }, []);

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

            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              {user?.username ?? 'User'}

              {hasNewAchievements ? (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-12px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '999px',
                    backgroundColor: 'red',
                    zIndex: 9999
                  }}
                />
              ) : null}
            </span>
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