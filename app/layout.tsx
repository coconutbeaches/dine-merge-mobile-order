import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Dine Merge Mobile Order',
  description: 'Online ordering for hotel guests and walk-in visitors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
