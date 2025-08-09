'use client'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppContextProvider from '@/context/AppContextProvider'
import { UserProvider } from '@/context/UserContext'

// Optimized React Query configuration for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Increase stale time to reduce unnecessary refetches
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cache data for longer
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      // Retry less aggressively
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus for most queries
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect for cached data
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
})

export function Providers({ children, includeAppContext = true }: { children: React.ReactNode; includeAppContext?: boolean }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {includeAppContext ? (
          <AppContextProvider>{children}</AppContextProvider>
        ) : (
          <UserProvider>{children}</UserProvider>
        )}
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
