// Service Worker registration for PWA
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
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
