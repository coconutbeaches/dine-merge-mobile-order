// Service Worker registration for PWA
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const isAdminRoute = window.location.pathname.startsWith('/admin');

    if (isAdminRoute) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          return Promise.all(registrations.map((registration) => registration.unregister()));
        })
        .catch((error) => {
          console.log('Service Worker unregister failed:', error);
        });
      return;
    }

    // Only register in production or when explicitly enabled
    const isDev = process.env.NODE_ENV === 'development';
    const enableSW = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';
    
    if (isDev && !enableSW) {
      console.log('Service Worker registration skipped in development');
      return;
    }
    
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is available
                  console.log('New service worker available');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
          // Don't throw or crash the app if service worker fails
        });
    });
  }
}

// Check if app is running as PWA
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

// Check if device supports PWA installation
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Check for Android Chrome
  const isAndroidChrome = /Android/.test(navigator.userAgent) && 
                         /Chrome/.test(navigator.userAgent);
  
  return isIOS || isAndroidChrome;
}
