'use client'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { saveGuestSession, hasGuestSession } from '@/utils/guestSession'

// Safari iOS compatibility checks
const isSafariIOS = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent;
  return /iP(ad|od|hone)/i.test(userAgent) && /WebKit/i.test(userAgent) && !/CriOS/i.test(userAgent);
};

// iOS Safari specific fixes
const applySafariIOSFixes = () => {
  if (typeof window === 'undefined') return;
  
  // Fix viewport scaling issues on iOS Safari
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport && isSafariIOS()) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  }
  
  // Prevent iOS Safari zoom on input focus
  if (isSafariIOS()) {
    document.addEventListener('focusin', (e) => {
      if (e.target instanceof HTMLInputElement) {
        setTimeout(() => {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
        }, 300);
      }
    });
  }
};

interface RegisterPageProps {
  params: { stay_id: string };
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const [stay_id, setStayId] = useState<string>('')
  const [firstName, setFirstName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Apply Safari iOS fixes on component mount
  useEffect(() => {
    applySafariIOSFixes();
  }, []);

  // Handle params extraction with Safari compatibility
  useEffect(() => {
    const extractParams = async () => {
      try {
        let extractedStayId = '';
        
        // Try multiple methods for extracting stay_id for Safari compatibility
        if (params && typeof params === 'object') {
          // Method 1: Direct access (for newer browsers)
          if ('stay_id' in params) {
            extractedStayId = params.stay_id;
          }
          // Method 2: Await if it's a Promise (Next.js 15)
          else if (typeof params.then === 'function') {
            const resolvedParams = await params;
            extractedStayId = resolvedParams.stay_id || '';
          }
        }
        
        // Method 3: Fallback to URL parsing (Safari compatibility)
        if (!extractedStayId && typeof window !== 'undefined') {
          const pathParts = window.location.pathname.split('/');
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart !== 'register') {
            extractedStayId = decodeURIComponent(lastPart);
          }
        }
        
        console.log('Extracted stay_id:', extractedStayId); // Debug logging for Safari
        setStayId(extractedStayId || '');
      } catch (error) {
        console.error('Error resolving params:', error);
        // Final fallback: try to extract from URL
        try {
          if (typeof window !== 'undefined') {
            const pathParts = window.location.pathname.split('/');
            const stayIdFromUrl = pathParts[pathParts.length - 1];
            const decoded = decodeURIComponent(stayIdFromUrl || '');
            console.log('Fallback stay_id:', decoded); // Debug logging
            setStayId(decoded);
          }
        } catch (urlError) {
          console.error('Error extracting from URL:', urlError);
          setStayId('');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    extractParams();
  }, [params])

  useEffect(() => {
    // Only check guest session after stay_id is loaded
    if (!isLoading && stay_id) {
      // Add Safari-specific localStorage check
      try {
        if (hasGuestSession()) {
          console.log('Guest session already exists, redirecting to menu')
          router.replace('/menu')
        }
      } catch (error) {
        console.warn('localStorage not available:', error)
        // Continue without guest session check if localStorage fails
      }
    }
  }, [isLoading, stay_id, router])

  // Override global white background for registration page
  useEffect(() => {
    // Remove white background for registration page
    document.body.style.backgroundColor = 'transparent'
    document.documentElement.style.backgroundColor = 'transparent'
    
    // Cleanup: restore white background when leaving the page
    return () => {
      document.body.style.backgroundColor = 'white'
      document.documentElement.style.backgroundColor = 'white'
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form submission started'); // Debug logging for Safari
    
    // 1. Check non-empty firstName
    if (!firstName.trim()) {
      toast.error('Please enter your first name')
      return
    }
    
    // 2. Check if stay_id is available
    if (!stay_id) {
      toast.error('Registration link is invalid. Please try again.')
      console.error('No stay_id available:', { stay_id, pathname: window.location.pathname });
      return
    }
    
    setIsLoading(true)
    
    try {
      // 3. Generate userId
      const userId = nanoid()
      console.log('Generated user ID:', userId); // Debug logging
      
      // 4. Insert into database
      console.log('Inserting into database:', { userId, firstName: firstName.trim(), stay_id });
      const { error, data } = await supabase
        .from('guest_users')
        .insert({ 
          user_id: userId, 
          first_name: firstName.trim(), 
          stay_id 
        })
        .select()
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Failed to register. Please try again.')
        return
      }
      
      console.log('Database insert successful:', data);
      
      // 5. Save guest session with Safari-compatible error handling
      let sessionSaved = false;
      try {
        saveGuestSession({
          guest_user_id: userId,
          guest_first_name: firstName.trim(),
          guest_stay_id: stay_id
        })
        sessionSaved = true;
        console.log('Session saved successfully');
      } catch (storageError) {
        console.warn('localStorage not available, continuing without session storage:', storageError)
        // Continue without localStorage - user will still be registered in database
      }
      
      // 6. Success message and redirect
      toast.success(`Welcome, ${firstName.trim()}!${!sessionSaved ? ' (Session not saved)' : ''}`)
      
      // Add delay for Safari compatibility and ensure toast is visible
      setTimeout(() => {
        console.log('Redirecting to menu...');
        router.replace('/menu')
      }, sessionSaved ? 500 : 1500) // Longer delay if session wasn't saved
      
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="w-full overflow-hidden" 
      style={{
        minHeight: '100vh',
        minHeight: '100dvh', // Dynamic viewport height for Safari iOS
        position: 'relative',
        backgroundImage: 'url(/bg-landing.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'scroll', // Avoid fixed for Safari iOS
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20"></div>
      
      <div 
        className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 text-center"
        style={{
          minHeight: '100vh',
          minHeight: '100dvh',
          paddingTop: 'max(env(safe-area-inset-top), 20px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
          WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      >
        <h1 
          className="text-3xl md:text-4xl font-semibold text-white drop-shadow-lg"
          style={{
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility'
          }}
        >
          Hi! 👋 Welcome to
        </h1>
        <Image 
          src="/CoconutBeachLogo.png" 
          alt="Coconut Beach" 
          width={320} 
          height={120} 
          className="w-60 md:w-80 h-auto drop-shadow-lg" 
          priority 
          style={{
            WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        />
        <p 
          className="text-2xl md:text-3xl text-white font-bold mt-6 drop-shadow-lg"
          style={{
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility'
          }}
        >
          What is your first name?
        </p>
        
        {isLoading && !stay_id ? (
          <div 
            className="text-white text-lg drop-shadow-lg"
            style={{
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'optimizeLegibility'
            }}
          >
            Loading...
          </div>
        ) : (
          <form 
            onSubmit={handleSubmit} 
            className="w-full max-w-sm flex flex-col gap-4"
            style={{
              WebkitTransform: 'translate3d(0, 0, 0)',
              transform: 'translate3d(0, 0, 0)'
            }}
          >
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-white/95 border-2 border-white/30 placeholder:text-gray-500 text-gray-900 text-center placeholder:text-center text-lg py-3 rounded-xl shadow-lg"
              style={{
                fontSize: '16px', // Prevent zoom on iOS Safari
                WebkitAppearance: 'none',
                borderRadius: '12px',
                WebkitTransform: 'translate3d(0, 0, 0)',
                transform: 'translate3d(0, 0, 0)'
              }}
              aria-label="First name"
              disabled={isLoading}
              autoComplete="given-name"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck="false"
              required
            />
            <Button 
              type="submit"
              size="lg" 
              className="w-full bg-white/80 hover:bg-white/95 text-gray-900 rounded-xl border-2 border-white/30 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-lg py-3 shadow-lg transition-all duration-200"
              disabled={isLoading || !stay_id}
              style={{
                WebkitAppearance: 'none',
                borderRadius: '12px',
                WebkitTransform: 'translate3d(0, 0, 0)',
                transform: 'translate3d(0, 0, 0)'
              }}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
