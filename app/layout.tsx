import './globals.css';
import { ReactNode } from 'react';
import { AppProvider } from '../src/contexts/AppContext';
import { Toaster } from '../src/components/ui/toaster';

export const metadata = {
  title: 'Dine Merge Mobile Order',
  description: 'Online ordering for hotel guests and walk-in visitors',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Toaster />
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
