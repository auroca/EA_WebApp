import type { AuthUser } from '../types/auth';
import { getApiBaseUrl } from './config';
import { listenForegroundMessages, requestWebPushToken } from './firebase';

const WEB_PUSH_TOKEN_KEY = 'trip2guide_web_push_token';
let foregroundListenerConfigured = false;

const sendFcmTokenToBackend = async (
  userId: string,
  authToken: string,
  fcmToken: string,
): Promise<void> => {
  const API_URL = getApiBaseUrl();
  const response = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/fcm-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    credentials: 'include',
    body: JSON.stringify({
      token: fcmToken,
      platform: 'web',
    }),
  });

  if (!response.ok) {
    throw new Error('Unable to register web push token.');
  }
};

const removeFcmTokenFromBackend = async (
  userId: string,
  authToken: string,
  fcmToken: string,
): Promise<void> => {
  const API_URL = getApiBaseUrl();
  const response = await fetch(`${API_URL}/users/${encodeURIComponent(userId)}/fcm-token`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    credentials: 'include',
    body: JSON.stringify({
      token: fcmToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Unable to unregister web push token.');
  }
};

const getNotificationUrl = (data: Record<string, string>): string => {
  if (data.type === 'chat' && data.chatId) {
    return `/chats?chatId=${encodeURIComponent(data.chatId)}`;
  }

  if (data.type === 'route' && data.routeId) {
    return `/route.html?id=${encodeURIComponent(data.routeId)}`;
  }

  return '/';
};

const showForegroundNotification = (payload: {
  title: string;
  body: string;
  data: Record<string, string>;
}): void => {
  window.dispatchEvent(
    new CustomEvent('trip2guide:push-notification', {
      detail: payload,
    }),
  );

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(payload.title || 'Trip2Guide', {
    body: payload.body,
    data: payload.data,
  });

  notification.onclick = (): void => {
    window.focus();
    window.location.href = getNotificationUrl(payload.data);
    notification.close();
  };
};

export const configureForegroundPushNotifications = async (): Promise<void> => {
  if (foregroundListenerConfigured) {
    return;
  }

  foregroundListenerConfigured = true;
  await listenForegroundMessages(showForegroundNotification);
};

export const registerPushNotificationsForUser = async (
  user: AuthUser,
  authToken: string,
  options: { requestPermission?: boolean } = {},
): Promise<void> => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support web notifications.');
  }

  const fcmToken = await requestWebPushToken(options.requestPermission ?? true);

  if (!fcmToken) {
    throw new Error(`Web push token was not generated. Notification permission is ${Notification.permission}.`);
  }

  await sendFcmTokenToBackend(user._id, authToken, fcmToken);
  localStorage.setItem(WEB_PUSH_TOKEN_KEY, fcmToken);
  await configureForegroundPushNotifications();
};

export const unregisterPushNotificationsForUser = async (
  user: AuthUser,
  authToken: string,
): Promise<void> => {
  const fcmToken = localStorage.getItem(WEB_PUSH_TOKEN_KEY);

  if (!fcmToken) {
    return;
  }

  await removeFcmTokenFromBackend(user._id, authToken, fcmToken);
  localStorage.removeItem(WEB_PUSH_TOKEN_KEY);
};
