'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isStandaloneMode, logStandaloneStatus, getGuestSession, recoverGuestSessionInStandalone } from '@/utils/guestSession'
import { supabase } from '@/integrations/supabase/client'

interface SessionRecoveryProps {
  children: React.ReactNode
}

/**
 * SessionRecovery component handles session persistence issues in PWA standalone mode.
 * When the app is launched from the home screen, it checks for existing guest sessions
 * and ensures they're properly restored.
 */
export function SessionRecovery({ children }: SessionRecoveryProps) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleSessionRecovery = async () => {
      // Only run in standalone mode
      if (!isStandaloneMode()) {
        return
      }

      logStandaloneStatus()
      console.log('[SessionRecovery] PWA standalone mode detected, checking session...')
      console.log('[SessionRecovery] Current pathname:', pathname)

      try {
        // Check if we have a Supabase session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[SessionRecovery] Error getting Supabase session:', error)
        }

        if (!session) {
          console.log('[SessionRecovery] No Supabase session found, attempting guest session recovery...')
          
          // Attempt to recover guest session using the enhanced recovery function
          const recoveredSession = recoverGuestSessionInStandalone()
          
          if (recoveredSession) {
            console.log('[SessionRecovery] Successfully recovered guest session:', recoveredSession)
            
            // If we're on a registration page, always redirect to menu
            if (pathname.startsWith('/register/')) {
              console.log('[SessionRecovery] On registration page with existing session, redirecting to menu')
              router.replace('/menu')
              return
            }
            
            // For other pages, only redirect if we're on root or the session is different
            if (pathname === '/' || pathname === '') {
              console.log('[SessionRecovery] On root page with recovered session, redirecting to menu')
              router.replace('/menu')
              return
            }
            
            console.log('[SessionRecovery] Guest session recovered but staying on current page:', pathname)
          }
          
          console.log('[SessionRecovery] No guest session could be recovered, user may need to re-register')
          // Could potentially redirect to registration page or show a prompt
        } else {
          console.log('[SessionRecovery] Supabase session found:', session.user?.id)
        }
      } catch (error) {
        console.error('[SessionRecovery] Error during session recovery:', error)
      }
    }

    // Run session recovery check after a brief delay to ensure DOM is ready
    const timeoutId = setTimeout(handleSessionRecovery, 100)
    
    return () => clearTimeout(timeoutId)
  }, [router, pathname])

  return <>{children}</>
}
