'use client'

'use client'

import { usePathname } from 'next/navigation'
import './globals.css'
import { Providers } from './providers'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import AddToHomeScreen from '@/components/pwa/AddToHomeScreen'
import PWAProvider from '@/components/pwa/PWAProvider'
import { SessionRecovery } from '@/components/SessionRecovery'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/login');

  return (
    <html lang="en">
      <body>
        <GoogleAnalytics />
        <PWAProvider>
          <Providers>
            {!isAdminPath ? (
              <SessionRecovery>{children}</SessionRecovery>
            ) : (
              children
            )}
          </Providers>
          {/* <AddToHomeScreen /> */}
        </PWAProvider>
      </body>
    </html>
  )
}
