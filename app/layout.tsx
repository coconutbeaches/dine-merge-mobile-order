import './globals.css'
import { Providers } from './providers'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'

export const metadata = {
  title: 'Coconut Beach - Online Ordering',
  description: 'Welcome to Coconut Beach! Order delicious Thai food online for hotel guests and walk-in visitors.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GoogleAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
