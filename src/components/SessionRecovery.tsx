'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

  useEffect(() => {
    const handleSessionRecovery = async () => {
      // Only run in standalone mode
      if (!isStandaloneMode()) {
        return
      }

      logStandaloneStatus()
      console.log('[SessionRecovery] PWA standalone mode detected, checking session...')

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
            
            // Redirect to menu with recovered session
            console.log('[SessionRecovery] Redirecting to menu with recovered guest session')
            router.replace('/menu')
            return
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
  }, [router])

  return <>{children}</>
}
