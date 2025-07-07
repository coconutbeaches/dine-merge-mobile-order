'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/pwa'

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker on client side
    registerServiceWorker()
  }, [])

  return <>{children}</>
}
