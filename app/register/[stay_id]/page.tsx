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

interface RegisterPageProps {
  params: Promise<{ stay_id: string }>;
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const { stay_id } = use(params);  // <- use React.use() for Next.js 15 compatibility
  const [firstName, setFirstName] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if guest already has a session
    if (hasGuestSession()) {
      console.log('Guest session already exists, redirecting to menu')
      router.replace('/menu')
    }
  }, [])

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
    
    try {
      // 2. Generate userId
      const userId = nanoid()
      
      // 3. Insert into database
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
      
      // 5. Save guest session and redirect
      saveGuestSession({
        guest_user_id: userId,
        guest_first_name: firstName.trim(),
        guest_stay_id: stay_id
      })
      
      // 6. Success message and redirect
      toast.success(`Welcome, ${firstName.trim()}!`)
      router.replace('/menu')
      
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('An error occurred. Please try again.')
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      <Image src="/bg-landing.png" alt="" fill priority className="object-cover object-center -z-10" />
      <div className="flex flex-col items-center justify-center gap-6 px-6 text-center min-h-screen">
        <h1 className="text-3xl md:text-4xl font-semibold text-white">Hi! 👋 Welcome to</h1>
        <Image src="/CoconutBeachLogo.png" alt="Coconut Beach" width={320} height={120} className="w-60 md:w-80 h-auto" priority />
        <p className="text-2xl md:text-3xl text-white font-bold mt-6">What is your first name?</p>
        <div className="w-full max-w-sm flex flex-col gap-4">
          <Input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="bg-white/90 border-white/20 placeholder:text-gray-500 text-gray-900 text-center placeholder:text-center"
            aria-label="First name"
          />
          <Button onClick={handleSubmit} size="lg" className="w-full bg-white/70 hover:bg-white/90 text-gray-900 rounded-lg border-0 font-bold">
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
