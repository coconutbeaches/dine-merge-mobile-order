const STATIC_CACHE_NAME = 'coconut-beach-static-v2';
const DYNAMIC_CACHE_NAME = 'coconut-beach-dynamic-v2';
const CACHE_PREFIX = 'coconut-beach-';

// Restrict cache usage for authenticated and sensitive routes.
const NEVER_CACHE_PATH_PREFIXES = [
  '/admin',
  '/login',
  '/debug-auth',
  '/debug-admin-auth',
  '/api',
  '/_next',
  '/__nextjs_',
  '/rest/v1',
  '/auth/v1',
];

// Navigation paths we explicitly allow for offline fallback.
const NAVIGATION_CACHE_ALLOWLIST = ['/', '/menu'];

// Essential static assets for basic offline experience.
const urlsToCache = ['/', '/manifest.json', '/favicon.ico', '/CoconutBeachLogo.png'];

function matchesPathPrefix(pathname, prefixes) {
  return prefixes.some(function(prefix) {
    return pathname.startsWith(prefix);
  });
}

function shouldHandleRequest(request, requestUrl) {
  if (request.method !== 'GET') return false;
  if (requestUrl.origin !== self.location.origin) return false;
  if (matchesPathPrefix(requestUrl.pathname, NEVER_CACHE_PATH_PREFIXES)) return false;
  return true;
}

function shouldCacheResponse(request, response, requestUrl) {
  if (!response || response.status !== 200) return false;

  const cacheControl = (response.headers.get('Cache-Control') || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) return false;

  if (request.mode === 'navigate') {
    return NAVIGATION_CACHE_ALLOWLIST.includes(requestUrl.pathname);
  }

  const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
  if (contentType.includes('text/html')) return false;

  return true;
}

// Install event - cache essential static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('Service Worker cache installation failed:', error);
      }),
  );

  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (
            cacheName.startsWith(CACHE_PREFIX) &&
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== DYNAMIC_CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        }),
      );
    }),
  );

  self.clients.claim();
});

// Fetch event - network-first strategy with constrained cache fallback
self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);
  if (!shouldHandleRequest(event.request, requestUrl)) return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (shouldCacheResponse(event.request, response, requestUrl)) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone).catch(function(error) {
              console.log('Failed to cache response:', error);
            });
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }

          if (
            event.request.mode === 'navigate' &&
            NAVIGATION_CACHE_ALLOWLIST.includes(requestUrl.pathname)
          ) {
            return (
              caches.match('/') ||
              new Response(
                '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } },
              )
            );
          }

          return new Response('Network error', {
            status: 408,
            statusText: 'Network error',
          });
        });
      }),
  );
});
