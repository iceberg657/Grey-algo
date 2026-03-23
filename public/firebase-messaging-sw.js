
// Firebase Messaging background handler
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "apex-trader-ba1e1",
  appId: "1:575788712704:web:ff276e65d51675f20029e5",
  apiKey: "AIzaSyBo3LgFwAnj-9Q0Sw5ABf-X5sw0exNmH9o",
  authDomain: "apex-trader-ba1e1.firebaseapp.com",
  storageBucket: "apex-trader-ba1e1.firebasestorage.app",
  messagingSenderId: "575788712704"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  const notificationTitle = payload.notification.title || 'GreyAlpha Update';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Do nothing, let the browser handle the request
});
