// Enhanced Service Worker for Dine Merge Mobile Order
const CACHE_VERSION = 'v2';
const CACHE_NAME = `coconut-beach-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `coconut-beach-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `coconut-beach-images-${CACHE_VERSION}`;
const API_CACHE_NAME = `coconut-beach-api-${CACHE_VERSION}`;

// Cache configuration
const CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxItems: 50,
  maxImageItems: 100,
};

// Essential static assets - updated list
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/CoconutBeachLogo.png',
  '/menu',
  '/cart',
  '/offline.html', // We'll create this
];

// API endpoints to cache
const API_ENDPOINTS_TO_CACHE = [
  '/rest/v1/products',
  '/rest/v1/categories',
];

// Install event - cache essential static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing enhanced service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => {
          // Filter out offline.html if it doesn't exist yet
          if (url === '/offline.html') {
            return false;
          }
          return true;
        }));
      })
      .then(() => {
        console.log('[ServiceWorker] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Cache installation failed:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating enhanced service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName !== IMAGE_CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName.startsWith('coconut-beach-')) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Old caches cleaned up');
      return self.clients.claim();
    })
  );
});

// Fetch event - intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Skip non-same-origin requests unless they're images
  if (!url.href.startsWith(self.location.origin) && !isImageRequest(request)) {
    return;
  }
  
  // Apply different strategies based on request type
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE_NAME));
  } else if (isApiRequest(request)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE_NAME, 5000));
  } else if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
  } else {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE_NAME, 3000));
  }
});

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync event:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/CoconutBeachLogo.png',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Order',
      },
      {
        action: 'close',
        title: 'Close',
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Coconut Beach', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event.action);
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/order-history')
    );
  }
});

// Helper Functions

function isImageRequest(request) {
  const url = new URL(request.url);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
  return imageExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext)) ||
         request.destination === 'image';
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/api/') || 
         url.pathname.includes('/rest/v1/') ||
         url.pathname.includes('/supabase/');
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/_next/static/') ||
         url.pathname.includes('/static/') ||
         STATIC_ASSETS.includes(url.pathname);
}

// Cache-first strategy (for static assets and images)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Update cache in background
      fetch(request).then(response => {
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
      }).catch(() => {});
      
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Cache-first strategy failed:', error);
    return createOfflineResponse();
  }
}

// Network-first with cache fallback (for dynamic content)
async function networkFirstWithCache(request, cacheName, timeout = 5000) {
  try {
    const cache = await caches.open(cacheName);
    
    // Try network with timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), timeout);
    });
    
    try {
      const networkResponse = await Promise.race([networkPromise, timeoutPromise]);
      
      if (networkResponse.status === 200) {
        // Clean up old cache entries if needed
        await cleanupCache(cache, cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // Network failed or timed out, try cache
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        console.log('[ServiceWorker] Serving from cache due to network failure');
        return cachedResponse;
      }
      throw error;
    }
  } catch (error) {
    console.error('[ServiceWorker] Network-first strategy failed:', error);
    
    // For navigation requests, show offline page
    if (request.mode === 'navigate') {
      return createOfflineResponse();
    }
    
    // For API requests, return error response
    if (isApiRequest(request)) {
      return new Response(JSON.stringify({ 
        error: 'Offline', 
        message: 'The app is currently offline. Please check your connection.' 
      }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Network error', { status: 408 });
  }
}

// Sync offline orders
async function syncOfflineOrders() {
  try {
    // Get offline orders from IndexedDB or localStorage
    const offlineOrders = await getOfflineOrders();
    
    if (offlineOrders && offlineOrders.length > 0) {
      console.log(`[ServiceWorker] Syncing ${offlineOrders.length} offline orders`);
      
      for (const order of offlineOrders) {
        try {
          const response = await fetch('/api/orders/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
          });
          
          if (response.ok) {
            await removeOfflineOrder(order.id);
            console.log(`[ServiceWorker] Order ${order.id} synced successfully`);
          }
        } catch (error) {
          console.error(`[ServiceWorker] Failed to sync order ${order.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
  }
}

// Get offline orders (placeholder - implement with IndexedDB)
async function getOfflineOrders() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

// Remove synced offline order (placeholder)
async function removeOfflineOrder(orderId) {
  // This would typically use IndexedDB
  console.log(`[ServiceWorker] Removing synced order: ${orderId}`);
}

// Clean up old cache entries
async function cleanupCache(cache, cacheName) {
  if (cacheName === IMAGE_CACHE_NAME) {
    const keys = await cache.keys();
    if (keys.length > CACHE_CONFIG.maxImageItems) {
      // Delete oldest entries
      const toDelete = keys.slice(0, keys.length - CACHE_CONFIG.maxImageItems);
      await Promise.all(toDelete.map(key => cache.delete(key)));
    }
  } else if (cacheName === DYNAMIC_CACHE_NAME) {
    const keys = await cache.keys();
    if (keys.length > CACHE_CONFIG.maxItems) {
      const toDelete = keys.slice(0, keys.length - CACHE_CONFIG.maxItems);
      await Promise.all(toDelete.map(key => cache.delete(key)));
    }
  }
}

// Create offline response
function createOfflineResponse() {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Coconut Beach</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 20px;
        }
        h1 { font-size: 2.5em; margin-bottom: 0.5em; }
        p { font-size: 1.2em; opacity: 0.9; max-width: 500px; }
        button {
          margin-top: 2em;
          padding: 12px 24px;
          font-size: 1.1em;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        button:hover { transform: scale(1.05); }
        .icon { font-size: 4em; margin-bottom: 0.5em; }
      </style>
    </head>
    <body>
      <div class="icon">📵</div>
      <h1>You're Offline</h1>
      <p>It looks like you've lost your internet connection. Please check your connection and try again.</p>
      <p>Your cart and preferences have been saved and will be available when you're back online.</p>
      <button onclick="window.location.reload()">Try Again</button>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
    status: 200
  });
}

console.log('[ServiceWorker] Enhanced service worker loaded');