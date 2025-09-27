import * as Sentry from '@sentry/nextjs';

// Initialize Sentry for server-side error tracking
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Server-specific options
  autoSessionTracking: true,
  
  // Integrations
  integrations: [
    // Capture console errors
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
  ],
  
  // Filtering
  ignoreErrors: [
    // Ignore non-critical database errors
    /ECONNREFUSED/,
    /ETIMEDOUT/,
  ],
  
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DEV_ENABLED) {
      return null;
    }
    
    // Add additional context
    if (event.contexts) {
      event.contexts.app = {
        ...event.contexts.app,
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
        node_version: process.version,
      };
    }
    
    return event;
  },
});