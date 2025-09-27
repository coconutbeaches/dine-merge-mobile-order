import { getCLS, getFCP, getFID, getLCP, getTTFB, Metric } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

// Analytics endpoint (you can customize this)
const vitalsUrl = '/api/web-vitals';

// Helper to send analytics
function sendToAnalytics(metric: Metric) {
  const body = {
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
  }

  // Send to Sentry
  if (typeof window !== 'undefined' && window.Sentry) {
    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `${metric.name}: ${metric.value}`,
      level: metric.rating === 'poor' ? 'warning' : 'info',
      data: body,
    });

    // For poor performance, create a Sentry event
    if (metric.rating === 'poor') {
      Sentry.captureMessage(`Poor Web Vital: ${metric.name}`, {
        level: 'warning',
        tags: {
          'web-vital': metric.name,
          'web-vital-rating': metric.rating,
        },
        contexts: {
          webVital: body,
        },
      });
    }
  }

  // Send to analytics endpoint (if you have one)
  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, JSON.stringify(body));
  } else {
    fetch(vitalsUrl, {
      body: JSON.stringify(body),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(console.error);
  }

  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
}

// Report all Web Vitals
export function reportWebVitals() {
  getCLS(sendToAnalytics);
  getFCP(sendToAnalytics);
  getFID(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

// Custom performance monitoring
export function measureApiCall(endpoint: string, startTime: number) {
  const duration = performance.now() - startTime;
  
  const metric: Partial<Metric> = {
    name: 'api-call',
    value: duration,
    rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs-improvement' : 'poor',
    navigationType: 'navigate',
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(`[API Performance] ${endpoint}: ${duration.toFixed(2)}ms`);
  }

  // Send to Sentry
  if (duration > 3000) {
    Sentry.captureMessage(`Slow API call: ${endpoint}`, {
      level: 'warning',
      tags: {
        endpoint,
        duration: Math.round(duration),
      },
    });
  }

  // Send to analytics
  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsUrl, JSON.stringify({
      name: 'api-call',
      endpoint,
      duration,
      timestamp: Date.now(),
    }));
  }
}

// Performance observer for long tasks
export function observeLongTasks() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('[Long Task Detected]', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name,
          });

          // Report to Sentry if task is very long
          if (entry.duration > 200) {
            Sentry.captureMessage('Long task detected', {
              level: 'warning',
              extra: {
                duration: entry.duration,
                startTime: entry.startTime,
              },
            });
          }
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (error) {
    console.error('Failed to observe long tasks:', error);
  }
}

// Monitor First Input Delay manually
export function monitorFirstInputDelay() {
  let firstInputDelay = 0;
  let firstInputTimeStamp = 0;

  function onInput(event: Event) {
    // Only count the first input
    if (firstInputTimeStamp) return;

    firstInputTimeStamp = event.timeStamp;
    firstInputDelay = performance.now() - event.timeStamp;

    if (firstInputDelay > 100) {
      console.warn('[First Input Delay]', firstInputDelay);
      
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `High First Input Delay: ${firstInputDelay}ms`,
        level: 'warning',
      });
    }

    // Remove listeners after first input
    ['click', 'keydown', 'touchstart'].forEach(type => {
      document.removeEventListener(type, onInput, { capture: true });
    });
  }

  ['click', 'keydown', 'touchstart'].forEach(type => {
    document.addEventListener(type, onInput, { 
      capture: true,
      once: true,
      passive: true 
    });
  });
}

// Initialize all monitoring
export function initializePerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Report Web Vitals
  reportWebVitals();

  // Observe long tasks
  observeLongTasks();

  // Monitor first input delay
  monitorFirstInputDelay();

  // Log initial page load performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (perfData) {
        const pageLoadTime = perfData.loadEventEnd - perfData.fetchStart;
        const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart;
        const tcpTime = perfData.connectEnd - perfData.connectStart;
        const requestTime = perfData.responseEnd - perfData.requestStart;
        const domProcessingTime = perfData.domComplete - perfData.domInteractive;

        console.log('[Page Load Performance]', {
          pageLoadTime,
          dnsTime,
          tcpTime,
          requestTime,
          domProcessingTime,
        });

        // Report slow page loads
        if (pageLoadTime > 5000) {
          Sentry.captureMessage('Slow page load detected', {
            level: 'warning',
            extra: {
              pageLoadTime,
              url: window.location.href,
            },
          });
        }
      }
    }, 0);
  });
}