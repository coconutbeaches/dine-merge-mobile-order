'use client'
import React, { useState, useEffect, use } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { saveGuestSession, hasGuestSession } from '@/utils/guestSession'
import { cn } from '@/lib/utils'
import { NAME_PROMPT_WIDTH } from '@/lib/constants'

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
  params: Promise<{ stay_id: string }>;
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const [stay_id, setStayId] = useState<string>('')
  const [firstName, setFirstName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [inputWidth, setInputWidth] = useState('100%')
  const [formWidth, setFormWidth] = useState('100%')
  const router = useRouter()
  
  // Unwrap params using React.use()
  const unwrappedParams = use(params)

  // Apply Safari iOS fixes on component mount
  useEffect(() => {
    applySafariIOSFixes();
  }, []);

  // Handle responsive input width
  useEffect(() => {
    const isMobileDevice = () => {
      // Check for mobile devices using multiple methods
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768; // Use md breakpoint instead of sm
      
      return isMobile || (hasTouchScreen && isSmallScreen);
    };
    
    const handleResize = () => {
      const width = isMobileDevice() ? '100%' : `${NAME_PROMPT_WIDTH}px`;
      setInputWidth(width);
      setFormWidth(width);
    };
    
    handleResize(); // Set initial width
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle params extraction using unwrapped params
  useEffect(() => {
    try {
      const extractedStayId = unwrappedParams.stay_id || '';
      console.log('Extracted stay_id:', extractedStayId); // Debug logging
      setStayId(extractedStayId);
    } catch (error) {
      console.error('Error extracting stay_id:', error);
      // Fallback to URL parsing
      if (typeof window !== 'undefined') {
        const pathParts = window.location.pathname.split('/');
        const stayIdFromUrl = pathParts[pathParts.length - 1];
        const decoded = decodeURIComponent(stayIdFromUrl || '');
        console.log('Fallback stay_id:', decoded);
        setStayId(decoded);
      }
    } finally {
      setIsLoading(false);
    }
  }, [unwrappedParams])

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
    
    console.log('=== SAFARI REGISTRATION DEBUG START ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Form submission started');
    console.log('Current URL:', window.location.href);
    console.log('Form data:', { firstName: firstName.trim(), stay_id });
    
    // 1. Check non-empty firstName
    if (!firstName.trim()) {
      console.error('VALIDATION ERROR: Empty firstName');
      toast.error('Please enter your first name')
      return
    }
    
    // 2. Check if stay_id is available
    if (!stay_id) {
      console.error('VALIDATION ERROR: No stay_id available:', { 
        stay_id, 
        pathname: window.location.pathname,
        href: window.location.href,
        params: unwrappedParams 
      });
      toast.error('Registration link is invalid. Please try again.')
      return
    }
    
    console.log('Validation passed, starting registration process...');
    setIsLoading(true)
    
    try {
      // 3. Generate userId
      const userId = nanoid()
      console.log('Generated user ID:', userId);
      
      // 4. Test Supabase connection first
      console.log('Testing Supabase connection...');
      try {
        const connectionTest = await supabase.from('guest_users').select('count').limit(1);
        console.log('Supabase connection test result:', connectionTest);
      } catch (connError) {
        console.error('Supabase connection test failed:', connError);
      }
      
      // 5. Insert into database with detailed logging
      console.log('Attempting database insert...');
      console.log('Insert data:', {
        user_id: userId,
        first_name: firstName.trim(),
        stay_id: stay_id
      });
      
      const insertResult = await supabase
        .from('guest_users')
        .insert({ 
          user_id: userId, 
          first_name: firstName.trim(), 
          stay_id 
        })
        .select()
      
      console.log('Database insert result:', insertResult);
      console.log('Insert error:', insertResult.error);
      console.log('Insert data:', insertResult.data);
      
      if (insertResult.error) {
        console.error('=== DATABASE ERROR DETAILS ===');
        console.error('Error object:', insertResult.error);
        console.error('Error code:', insertResult.error.code);
        console.error('Error message:', insertResult.error.message);
        console.error('Error details:', insertResult.error.details);
        console.error('Error hint:', insertResult.error.hint);
        
        // More specific error messages
        if (insertResult.error.code === '23505') {
          toast.error('Registration already exists for this stay. Please try logging in instead.')
        } else if (insertResult.error.code === '42501') {
          toast.error('Permission denied. Please contact support.')
        } else if (insertResult.error.message?.includes('network')) {
          toast.error('Network error. Please check your connection and try again.')
        } else {
          toast.error(`Registration failed: ${insertResult.error.message || 'Unknown error'}`)
        }
        return
      }
      
      console.log('Database insert successful:', insertResult.data);
      
      // 6. Save guest session with Safari-compatible error handling
      console.log('Attempting to save guest session...');
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
        console.error('localStorage error:', storageError);
        console.warn('localStorage not available, continuing without session storage');
        // Continue without localStorage - user will still be registered in database
      }
      
      // 7. Success message and redirect
      console.log('Registration completed successfully, showing success message...');
      toast.success(`Welcome, ${firstName.trim()}!${!sessionSaved ? ' (Session not saved)' : ''}`)
      
      // Add delay for Safari compatibility and ensure toast is visible
      console.log('Setting redirect timeout...');
      setTimeout(() => {
        console.log('Redirecting to menu...');
        router.replace('/menu')
      }, sessionSaved ? 500 : 1500) // Longer delay if session wasn't saved
      
      console.log('=== SAFARI REGISTRATION DEBUG END (SUCCESS) ===');
      
    } catch (error) {
      console.error('=== SAFARI REGISTRATION DEBUG END (ERROR) ===');
      console.error('Outer catch error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      toast.error(`An error occurred: ${error.message || 'Unknown error'}`)
    } finally {
      console.log('Setting loading to false...');
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
            className={cn(
              'flex flex-col gap-4'
            )}
            style={{
              WebkitTransform: 'translate3d(0, 0, 0)',
              transform: 'translate3d(0, 0, 0)',
              width: formWidth
            }}
          >
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={cn('bg-white/95 border-2 border-white/30 placeholder:text-gray-500 text-gray-900 text-center placeholder:text-center text-lg py-3 rounded-xl shadow-lg')}
              style={{
                fontSize: '16px', // Prevent zoom on iOS Safari
                WebkitAppearance: 'none',
                borderRadius: '12px',
                WebkitTransform: 'translate3d(0, 0, 0)',
                transform: 'translate3d(0, 0, 0)',
                width: inputWidth
              }}
              aria-label="First name"
              disabled={isLoading}
              autoComplete="given-name"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck="false"
              required
            />
            {firstName.trim() && (
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
            )}
          </form>
        )}
      </div>
    </div>
  )
}
