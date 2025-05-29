import './globals.css';
import { Metadata, Viewport } from 'next';
import { Noto_Sans, Prompt } from 'next/font/google';
import { ReduxProvider } from '@/store/provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'react-hot-toast';

// Load fonts with supported subsets only
const notoSans = Noto_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans',
});

const prompt = Prompt({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-prompt',
});

// App metadata
export const metadata: Metadata = {
  title: {
    default: 'Coconut Beach Restaurant',
    template: '%s | Coconut Beach Restaurant',
  },
  description: 'Mobile restaurant ordering system for Coconut Beach Restaurant',
  keywords: ['restaurant', 'food ordering', 'coconut beach', 'mobile ordering'],
  authors: [{ name: 'Coconut Beach Restaurant' }],
  creator: 'Coconut Beach Restaurant',
  publisher: 'Coconut Beach Restaurant',
  formatDetection: {
    telephone: true,
    email: false,
    address: false,
    date: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://coconut-beach.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Coconut Beach Restaurant',
    description: 'Mobile restaurant ordering system for Coconut Beach Restaurant',
    siteName: 'Coconut Beach Restaurant',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Coconut Beach Restaurant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coconut Beach Restaurant',
    description: 'Mobile restaurant ordering system for Coconut Beach Restaurant',
    images: ['/images/twitter-image.jpg'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/safari-pinned-tab.svg',
      },
    ],
  },
  category: 'food',
  applicationName: 'Coconut Beach Restaurant',
};

// Viewport configuration optimized for mobile
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#10B981',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${notoSans.variable} ${prompt.variable}`}>
      <body className="min-h-screen bg-coconut-light text-coconut-dark font-sans antialiased overflow-x-hidden">
        <ReduxProvider>
          <ThemeProvider>
            <div className="flex flex-col min-h-screen">
              {/* Skip to content for accessibility */}
              <a 
                href="#main-content" 
                className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-primary-500 focus:text-white focus:z-50"
              >
                Skip to content
              </a>
              
              {/* Main content */}
              <main id="main-content" className="flex-grow">
                {children}
              </main>
              
              {/* Toast notifications */}
              <Toaster 
                position="bottom-center"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#333',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '16px',
                    maxWidth: '90%',
                    margin: '0 auto 16px',
                  },
                }}
              />
            </div>
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
