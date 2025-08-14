export const metadata = {
  title: 'Coconut Beach - Online Ordering',
  description: 'Welcome to Coconut Beach! Order delicious Thai food online for hotel guests and walk-in visitors.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Coconut Beach',
    startupImage: [
      {
        url: '/icons/icon-192x192.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)'
      }
    ]
  },
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', type: 'image/png', sizes: '72x72', url: '/icons/icon-72x72.png' },
      { rel: 'icon', type: 'image/png', sizes: '96x96', url: '/icons/icon-96x96.png' },
      { rel: 'icon', type: 'image/png', sizes: '128x128', url: '/icons/icon-128x128.png' },
      { rel: 'icon', type: 'image/png', sizes: '144x144', url: '/icons/icon-144x144.png' },
      { rel: 'icon', type: 'image/png', sizes: '192x192', url: '/icons/icon-192x192.png' },
      { rel: 'icon', type: 'image/png', sizes: '384x384', url: '/icons/icon-384x384.png' },
      { rel: 'icon', type: 'image/png', sizes: '512x512', url: '/icons/icon-512x512.png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Coconut Beach'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff'
};