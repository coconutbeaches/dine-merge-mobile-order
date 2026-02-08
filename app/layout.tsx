import { headers } from 'next/headers'
import './globals.css'
import { Providers } from './providers'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import AddToHomeScreen from '@/components/pwa/AddToHomeScreen'
import PWAProvider from '@/components/pwa/PWAProvider'
import { SessionRecovery } from '@/components/SessionRecovery'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers()
  const pathname = headerList.get('x-matched-path') ?? ''
  const isAdminPath = pathname.startsWith('/admin')
  const isLoginPath = pathname.startsWith('/login')
  const skipSessionRecovery = isAdminPath || isLoginPath

  return (
    <html lang="en">
      <body>
        <GoogleAnalytics />
        <PWAProvider>
          <Providers includeAppContext={true}>
            {!skipSessionRecovery ? (
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
