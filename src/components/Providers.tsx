'use client';

import { AppProvider } from '@/contexts/AppContext';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <Toaster />
      {children}
    </AppProvider>
  );
}
