import { useEffect, useRef, useState } from 'react';
import { getStoredSession, getStoredUser, isAuthenticated, logoutUser } from '../../services/authService';
import { registerPushNotificationsForUser } from '../../services/notificationService';
import { getMyAchievements } from '../../services/achievementService';
import { getAllChats } from '../../services/chatService';
import { getOrCreateChatSocket } from '../../services/chatSocket';
import { CHAT_UNREAD_UPDATED_EVENT } from '../../services/chatUnreadService';
import type { ChatMessageEvent } from '../../types/chat';
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
  const [notificationStatus, setNotificationStatus] = useState<
    'idle' | 'saving' | 'enabled' | 'blocked' | 'error'
  >('idle');
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [hasNewAchievements, setHasNewAchievements] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);

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
    if (!loggedIn) {
      setChatUnreadCount(0);
      return;
    }

    let mounted = true;
    const session = getStoredSession();

    const loadUnreadCount = async (): Promise<void> => {
      try {
        const chats = await getAllChats();
        const total = chats.reduce((sum, chat) => sum + (chat.unreadCount ?? 0), 0);

        if (mounted) {
          setChatUnreadCount(total);
        }
      } catch {
        if (mounted) {
          setChatUnreadCount(0);
        }
      }
    };

    const handleUnreadUpdated = (event: Event): void => {
      const detail = (event as CustomEvent<{ total?: number }>).detail;

      if (typeof detail?.total === 'number') {
        setChatUnreadCount(Math.max(0, detail.total));
        return;
      }

      void loadUnreadCount();
    };

    const handlePushNotification = (): void => {
      void loadUnreadCount();
    };

    void loadUnreadCount();

    window.addEventListener(CHAT_UNREAD_UPDATED_EVENT, handleUnreadUpdated);
    window.addEventListener('trip2guide:push-notification', handlePushNotification);
    window.addEventListener('focus', loadUnreadCount);

    const socket = session?.token ? getOrCreateChatSocket(session.token) : null;
    const handleSocketMessage = (event: ChatMessageEvent): void => {
      const sentByCurrentUser = event.user_id === session?.user._id || event.username === session?.user.username;

      if (!sentByCurrentUser) {
        setChatUnreadCount((current) => current + 1);
      }

      window.setTimeout(() => {
        void loadUnreadCount();
      }, 600);
    };

    socket?.on('chat:message', handleSocketMessage);

    return () => {
      mounted = false;
      window.removeEventListener(CHAT_UNREAD_UPDATED_EVENT, handleUnreadUpdated);
      window.removeEventListener('trip2guide:push-notification', handlePushNotification);
      window.removeEventListener('focus', loadUnreadCount);
      socket?.off('chat:message', handleSocketMessage);
    };
  }, [loggedIn]);

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
                  {chatUnreadCount > 0 ? (
                    <span className="nav-unread-badge" aria-label={`${chatUnreadCount} unread chat messages`}>
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                    </span>
                  ) : null}
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

            <span className="top-nav-user-name">
              {user?.username ?? 'User'}

              {hasNewAchievements ? (
                <span className="new-achievement-badge">New achievement</span>
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
                <span>View profile</span>
                {hasNewAchievements ? <span className="new-achievement-badge">New achievement</span> : null}
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
