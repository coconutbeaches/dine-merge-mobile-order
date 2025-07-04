'use client'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppContextProvider from '@/context/AppContextProvider'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContextProvider>
          {children}
          <Toaster />
          <Sonner />
        </AppContextProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
