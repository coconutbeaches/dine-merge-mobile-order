const CACHE_NAME = 'coconut-beach-v1';
const DYNAMIC_CACHE_NAME = 'coconut-beach-dynamic-v1';

const NETWORK_TIMEOUT = 5000;
// Essential static assets that exist and are important for offline functionality
const urlsToCache = [
  '/manifest.json',
  '/favicon.ico',
  '/CoconutBeachLogo.png'
];

// Install event - cache essential static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        // Only cache assets that we know exist
        return cache.addAll(urlsToCache.filter(url => {
          // Skip caching if we can't verify the asset exists
          return true; // For now, trust that these basic assets exist
        }));
      })
      .catch(function(error) {
        console.log('Service Worker cache installation failed:', error);
        // Don't prevent installation if caching fails
      })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Immediately take control of all clients
  self.clients.claim();
});

// Fetch event - network-first strategy with cache fallback
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip requests to external APIs or non-same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Skip admin routes to avoid caching or delaying admin navigation
  if (requestUrl.pathname.startsWith('/admin')) {
    return;
  }

  // Skip requests to Next.js internal routes
  if (event.request.url.includes('/_next/') || 
      event.request.url.includes('/api/') ||
      event.request.url.includes('/__nextjs_') ||
      event.request.url.includes('/rest/v1/')) {
    return;
  }

  const shouldCacheResponse = () => {
    if (event.request.mode === 'navigate') {
      return false;
    }

    if (event.request.destination) {
      return ['style', 'script', 'image', 'font'].includes(event.request.destination);
    }

    return /\.(?:css|js|mjs|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|otf)$/i.test(requestUrl.pathname);
  };
  
  event.respondWith(
    // Try network first with timeout to avoid long waits on slow connections
    Promise.race([
      fetch(event.request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT)
      )
    ])
      .then(function(response) {
        // If network request succeeded, cache the response for next time
        if (response.status === 200 && shouldCacheResponse()) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseClone);
            })
            .catch(function(error) {
              console.log('Failed to cache response:', error);
            });
        }
        return response;
      })
      .catch(function() {
        // Network failed, try cache
        return caches.match(event.request)
          .then(function(response) {
            if (response) {
              return response;
            }
            
            // If it's a navigation request and we don't have it cached,
            // try to serve a basic offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/') || 
                     new Response('<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>', {
                       headers: { 'Content-Type': 'text/html' }
                     });
            }
            
            // For other requests, just fail
            return new Response('Network error', {
              status: 408,
              statusText: 'Network error'
            });
          });
      })
  );
});
