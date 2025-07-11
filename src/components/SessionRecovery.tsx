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
      console.log('[SessionRecovery] Starting session recovery check...')
      console.log('[SessionRecovery] Current pathname:', pathname)
      
      // Skip session recovery for admin and login pages
      if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
        console.log('[SessionRecovery] Skipping session recovery for admin/login pages')
        return
      }
      
      // Check standalone mode
      const isStandalone = isStandaloneMode()
      logStandaloneStatus()
      
      // For debugging: run in both standalone and browser mode
      console.log('[SessionRecovery] Standalone mode:', isStandalone)
      
      // Always check for guest sessions (not just standalone mode for debugging)
      console.log('[SessionRecovery] Checking for existing session...')
      
      try {
        // Check if we have a Supabase session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[SessionRecovery] Error getting Supabase session:', error)
        }

        if (!session) {
          console.log('[SessionRecovery] No Supabase session found, attempting guest session recovery...')
          
          // Try multiple recovery methods
          console.log('[SessionRecovery] Attempting standard getGuestSession...')
          const standardSession = getGuestSession()
          console.log('[SessionRecovery] Standard session result:', standardSession)
          
          console.log('[SessionRecovery] Attempting enhanced recovery...')
          const recoveredSession = recoverGuestSessionInStandalone()
          console.log('[SessionRecovery] Enhanced recovery result:', recoveredSession)
          
          // Check localStorage directly for debugging
          const directCheck = {
            guest_user_id: localStorage.getItem('guest_user_id'),
            guest_first_name: localStorage.getItem('guest_first_name'),
            guest_stay_id: localStorage.getItem('guest_stay_id')
          }
          console.log('[SessionRecovery] Direct localStorage check:', directCheck)
          
          const sessionToUse = recoveredSession || standardSession
          
          if (sessionToUse || directCheck.guest_user_id) {
            console.log('[SessionRecovery] Found session data, proceeding with redirect...')
            console.log('[SessionRecovery] Session to use:', sessionToUse)
            
            // If we're on a registration page, always redirect to menu
            if (pathname.startsWith('/register/')) {
              console.log('[SessionRecovery] On registration page with existing session, redirecting to menu')
              setTimeout(() => {
                router.replace('/menu')
              }, 500) // Add slight delay for debugging
              return
            }
            
            // For other pages, only redirect if we're on root
            if (pathname === '/' || pathname === '') {
              console.log('[SessionRecovery] On root page with recovered session, redirecting to menu')
              setTimeout(() => {
                router.replace('/menu')
              }, 500)
              return
            }
            
            console.log('[SessionRecovery] Guest session recovered but staying on current page:', pathname)
          } else {
            console.log('[SessionRecovery] No guest session could be recovered, user may need to re-register')
          }
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
