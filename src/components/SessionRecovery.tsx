'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isStandaloneMode, logStandaloneStatus, getGuestSession, recoverGuestSessionInStandalone } from '@/utils/guestSession'
import { supabase } from '@/integrations/supabase/client'
import { useAppContext } from '@/context/AppContext'

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
  const { currentUser, isLoading: isUserContextLoading } = useAppContext()

  useEffect(() => {
    const handleSessionRecovery = async () => {

      // Skip session recovery for admin and login pages
      if (pathname.startsWith('/admin') || pathname.startsWith('/login')) {
        return;
      }

      // If user context is still loading, wait for it
      if (isUserContextLoading) {
        return;
      }

      // If an admin user is logged in, skip all guest session logic
      if (currentUser?.role === 'admin') {
        return;
      }
      
      // Check standalone mode
      const isStandalone = isStandaloneMode()
      logStandaloneStatus()
      
      // Always check for guest sessions (not just standalone mode for debugging)
      
      try {
        // Check if we have a Supabase session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[SessionRecovery] Error getting Supabase session:', error)
        }

        if (!session) {
          
          // Try multiple recovery methods
          const standardSession = getGuestSession()
          
          const recoveredSession = recoverGuestSessionInStandalone()
          
          // Check localStorage directly for debugging
          const directCheck = {
            guest_user_id: localStorage.getItem('guest_user_id'),
            guest_first_name: localStorage.getItem('guest_first_name'),
            guest_stay_id: localStorage.getItem('guest_stay_id')
          }
          
          const sessionToUse = recoveredSession || standardSession
          
          if (sessionToUse || directCheck.guest_user_id) {
            
            // If we're on a registration page, always redirect to menu
            if (pathname.startsWith('/register/')) {
              setTimeout(() => {
                router.replace('/menu')
              }, 500) // Add slight delay for debugging
              return
            }
            
            // For other pages, only redirect if we're on root
            if (pathname === '/' || pathname === '') {
              setTimeout(() => {
                router.replace('/menu')
              }, 500)
              return
            }
            
          } else {
            
          }
        } else {
          
        }
      } catch (error) {
        console.error('[SessionRecovery] Error during session recovery:', error)
      }
    }

    // Run session recovery check after a brief delay to ensure DOM is ready
    const timeoutId = setTimeout(handleSessionRecovery, 100)
    
    return () => clearTimeout(timeoutId)
  }, [router, pathname, currentUser, isUserContextLoading])

  return <>{children}</>
}
