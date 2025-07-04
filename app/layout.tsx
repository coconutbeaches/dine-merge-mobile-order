import './globals.css';
import { ReactNode } from 'react';
import { Providers } from './provider';

export const metadata = {
  title: 'Dine Merge Mobile Order',
  description: 'Online ordering for hotel guests and walk-in visitors',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-black">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
