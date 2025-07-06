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

interface RegisterPageProps {
  params: { stay_id: string };
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const [stay_id, setStayId] = useState<string>('')
  const [firstName, setFirstName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

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
        
        // Method 3: Fallback to URL parsing
        if (!extractedStayId) {
          const pathParts = window.location.pathname.split('/');
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart !== 'register') {
            extractedStayId = lastPart;
          }
        }
        
        setStayId(extractedStayId || '');
      } catch (error) {
        console.error('Error resolving params:', error);
        // Final fallback: try to extract from URL
        try {
          const pathParts = window.location.pathname.split('/');
          const stayIdFromUrl = pathParts[pathParts.length - 1];
          setStayId(stayIdFromUrl || '');
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
    
    // 1. Check non-empty firstName
    if (!firstName.trim()) {
      toast.error('Please enter your first name')
      return
    }
    
    // 2. Check if stay_id is available
    if (!stay_id) {
      toast.error('Registration link is invalid. Please try again.')
      return
    }
    
    setIsLoading(true)
    
    try {
      // 3. Generate userId
      const userId = nanoid()
      
      // 4. Insert into database
      const { error } = await supabase
        .from('guest_users')
        .insert({ 
          user_id: userId, 
          first_name: firstName.trim(), 
          stay_id 
        })
      
      if (error) {
        console.error('Database error:', error)
        toast.error('Failed to register. Please try again.')
        return
      }
      
      // 5. Save guest session with Safari-compatible error handling
      try {
        saveGuestSession({
          guest_user_id: userId,
          guest_first_name: firstName.trim(),
          guest_stay_id: stay_id
        })
      } catch (storageError) {
        console.warn('localStorage not available, continuing without session storage:', storageError)
        // Continue without localStorage - user will still be registered in database
      }
      
      // 6. Success message and redirect
      toast.success(`Welcome, ${firstName.trim()}!`)
      
      // Add small delay for Safari compatibility
      setTimeout(() => {
        router.replace('/menu')
      }, 100)
      
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      <Image src="/bg-landing.png" alt="" fill priority className="object-cover object-center -z-10" />
      <div className="flex flex-col items-center justify-center gap-6 px-6 text-center min-h-screen">
        <h1 className="text-3xl md:text-4xl font-semibold text-white">Hi! 👋 Welcome to</h1>
        <Image src="/CoconutBeachLogo.png" alt="Coconut Beach" width={320} height={120} className="w-60 md:w-80 h-auto" priority />
        <p className="text-2xl md:text-3xl text-white font-bold mt-6">What is your first name?</p>
        {isLoading && !stay_id ? (
          <div className="text-white text-lg">Loading...</div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-4">
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-white/90 border-white/20 placeholder:text-gray-500 text-gray-900 text-center placeholder:text-center"
              aria-label="First name"
              disabled={isLoading}
              onKeyDown={(e) => {
                // Safari-compatible enter key handling
                if (e.key === 'Enter' && !isLoading) {
                  handleSubmit(e)
                }
              }}
            />
            <Button 
              onClick={handleSubmit} 
              size="lg" 
              className="w-full bg-white/70 hover:bg-white/90 text-gray-900 rounded-lg border-0 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !stay_id}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
