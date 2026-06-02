import { initializeApp } from "firebase/app";
import {
  type Messaging,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCpGTN-szabp8Kl7cb83FhFofO58PIUdACE",
  authDomain: "trip2guide-f57a5.firebaseapp.com",
  projectId: "trip2guide-f57a5",
  storageBucket: "trip2guide-f57a5.firebasestorage.app",
  messagingSenderId: "54298529279",
  appId: "1:54298529279:web:01bd57cfe88afe33a96bca",
  measurementId: "G-6PJJ0MEGJ1",
};

const VAPID_KEY =
  "BM0PbTWUuLYjFGB7gHN6Yyc8qcGDN-wY3DIgcrZzn4mjYMSvk7K9pZeX8CMNch2n5gRUUkKGQ0cuJ8tqBwrQFzA";

const app = initializeApp(firebaseConfig);

let messagingPromise: Promise<Messaging | null> | null = null;
let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  const supported = await isSupported();

  if (!supported) {
    return null;
  }

  return getMessaging(app);
};

export const getFirebaseMessagingInstance = async (): Promise<Messaging | null> => {
  if (!messagingPromise) {
    messagingPromise = getFirebaseMessaging();
  }

  return messagingPromise;
};

export const getFirebaseMessagingServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  if (!serviceWorkerRegistrationPromise) {
    serviceWorkerRegistrationPromise = navigator.serviceWorker.register("/firebase-messaging-sw.js");
  }

  return serviceWorkerRegistrationPromise;
};

export const requestWebPushToken = async (requestPermission = true): Promise<string | null> => {
  const messaging = await getFirebaseMessagingInstance();

  if (!messaging) {
    return null;
  }

  const permission =
    Notification.permission === "granted" || !requestPermission
      ? Notification.permission
      : await Notification.requestPermission();

  if (permission !== "granted") {
    return null;
  }

  const serviceWorkerRegistration = await getFirebaseMessagingServiceWorker();

  if (!serviceWorkerRegistration) {
    return null;
  }

  return getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration,
  });
};

export const listenForegroundMessages = async (
  onNotification: (payload: {
    title: string;
    body: string;
    data: Record<string, string>;
  }) => void,
): Promise<void> => {
  const messaging = await getFirebaseMessagingInstance();

  if (!messaging) {
    return;
  }

  onMessage(messaging, (payload) => {
    onNotification({
      title: payload.notification?.title ?? "Notificacion",
      body: payload.notification?.body ?? "",
      data: payload.data ?? {},
    });
  });
};
