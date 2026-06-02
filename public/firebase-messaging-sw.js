/* eslint-disable no-undef */
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyCpGTN-szabp8Kl7cb83FhFofO58PIUdACE",
  authDomain: "trip2guide-f57a5.firebaseapp.com",
  projectId: "trip2guide-f57a5",
  storageBucket: "trip2guide-f57a5.firebasestorage.app",
  messagingSenderId: "54298529279",
  appId: "1:54298529279:web:01bd57cfe88afe33a96bca",
  measurementId: "G-6PJJ0MEGJ1",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Trip2Guide";

  const options = {
    body: payload.notification?.body || "",
    data: payload.data || {},
    icon: "/resources/logos/logo.png",
    badge: "/resources/logos/logo.png",
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = "/";

  if (data.type === "chat" && data.chatId) {
    url = "/chats";
  }

  if (data.type === "route" && data.routeId) {
    url = `/route.html?id=${encodeURIComponent(data.routeId)}`;
  }

  event.waitUntil(clients.openWindow(url));
});
