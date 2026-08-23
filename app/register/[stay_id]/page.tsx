'use client'

import React, { useEffect, useState, use } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  getGuestSession,
  logStandaloneStatus,
  isStandaloneMode,
  recoverGuestSessionInStandalone,
  createGuestUser,
  getTableNumber,
} from '@/utils/guestSession'

// Safari iOS compatibility checks
const isSafariIOS = () => {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent
  return /iP(ad|od|hone)/i.test(userAgent) && /WebKit/i.test(userAgent) && !/CriOS/i.test(userAgent)
}

// iOS Safari specific fixes
const applySafariIOSFixes = () => {
  if (typeof window === 'undefined') return

  const viewport = document.querySelector('meta[name=viewport]')
  if (viewport && isSafariIOS()) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    )
  }

  if (isSafariIOS()) {
    document.addEventListener('focusin', (e) => {
      if (e.target instanceof HTMLInputElement) {
        setTimeout(() => {
          window.scrollTo(0, 0)
          document.body.scrollTop = 0
        }, 300)
      }
    })
  }
}

interface RegisterPageProps {
  params: Promise<{ stay_id: string }>
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const [stay_id, setStayId] = useState<string>('')
  const [firstName, setFirstName] = useState('')
  const [acceptedRules, setAcceptedRules] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const unwrappedParams = use(params)

  useEffect(() => {
    applySafariIOSFixes()
  }, [])

  useEffect(() => {
    try {
      const extractedStayId = unwrappedParams.stay_id || ''
      console.log('Extracted stay_id:', extractedStayId)
      setStayId(extractedStayId)
    } catch (error) {
      console.error('Error extracting stay_id:', error)
      if (typeof window !== 'undefined') {
        const pathParts = window.location.pathname.split('/')
        const stayIdFromUrl = pathParts[pathParts.length - 1]
        const decoded = decodeURIComponent(stayIdFromUrl || '')
        console.log('Fallback stay_id:', decoded)
        setStayId(decoded)
      }
    } finally {
      setIsLoading(false)
    }
  }, [unwrappedParams])

  useEffect(() => {
    if (!isLoading && stay_id) {
      logStandaloneStatus()

      if (isStandaloneMode()) {
        console.log('[Registration] Standalone mode detected, checking for existing session...')

        const recoveredSession = recoverGuestSessionInStandalone()
        if (recoveredSession) {
          console.log('[Registration] Found existing session in standalone mode, redirecting to menu')
          router.replace('/menu')
          return
        }
      }

      try {
        const existingSession = getGuestSession()
        if (existingSession) {
          console.log('Found existing guest session:', existingSession)

          if (existingSession.guest_stay_id === stay_id) {
            console.log('Same stay_id found, allowing new family member registration')
          } else {
            console.log('Different stay_id found, redirecting to menu')
            router.replace('/menu')
          }
        }
      } catch (error) {
        console.warn('localStorage not available:', error)
      }
    }
  }, [isLoading, stay_id, router])

  useEffect(() => {
    document.body.style.backgroundColor = 'transparent'
    document.documentElement.style.backgroundColor = 'transparent'

    return () => {
      document.body.style.backgroundColor = 'white'
      document.documentElement.style.backgroundColor = 'white'
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('=== SAFARI REGISTRATION DEBUG START ===')
    console.log('User Agent:', navigator.userAgent)
    console.log('Form submission started')
    console.log('Current URL:', window.location.href)
    console.log('Form data:', {
      firstName: firstName.trim(),
      stay_id,
      acceptedRules,
    })

    if (!acceptedRules) {
      toast.error('Please accept the house rules to continue')
      return
    }

    if (!firstName.trim()) {
      console.error('VALIDATION ERROR: Empty firstName')
      toast.error('Please enter your first name')
      return
    }

    if (!stay_id) {
      console.error('VALIDATION ERROR: No stay_id available:', {
        stay_id,
        pathname: window.location.pathname,
        href: window.location.href,
        params: unwrappedParams,
      })
      toast.error('Registration link is invalid. Please try again.')
      return
    }

    console.log('Validation passed, starting registration process...')
    setIsLoading(true)

    try {
      const storedTableNumber = getTableNumber()
      const urlParams = new URLSearchParams(window.location.search)
      const urlTableNumber = urlParams.get('table')

      const isWalkinGuest =
        stay_id.toLowerCase().includes('unknown') ||
        stay_id.toLowerCase().includes('walkin') ||
        storedTableNumber ||
        urlTableNumber

      const tableNumberToUse = isWalkinGuest
        ? storedTableNumber || urlTableNumber || stay_id
        : stay_id

      console.log('Guest registration details:', {
        storedTableNumber,
        urlTableNumber,
        stay_id,
        isWalkinGuest,
        tableNumberToUse,
        stay_id_for_hotel: isWalkinGuest ? undefined : stay_id,
      })

      const session = await createGuestUser({
        table_number: tableNumberToUse,
        first_name: firstName.trim(),
        stay_id: isWalkinGuest ? undefined : stay_id,
      })
      console.log('Generated session:', session)
      console.log('Session saved successfully:', session)

      toast.success(`Welcome, ${firstName.trim()}!`)

      setTimeout(() => {
        console.log('Redirecting to menu...')
        router.replace('/menu')
      }, 500)

      console.log('=== SAFARI REGISTRATION DEBUG END (SUCCESS) ===')
    } catch (error: any) {
      console.error('=== SAFARI REGISTRATION DEBUG END (ERROR) ===')
      console.error('Outer catch error:', error)
      console.error('Error stack:', error?.stack)
      console.error('Error name:', error?.name)
      console.error('Error message:', error?.message)
      toast.error(`An error occurred: ${error?.message || 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="w-full overflow-y-auto"
      style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        position: 'relative',
        backgroundImage: 'url(/bg-landing.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'scroll',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      <div className="absolute inset-0 bg-black/30" />

      <div
        className="relative z-10 flex min-h-screen min-h-[100dvh] items-center justify-center px-4 py-6 sm:px-6"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 24px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
          WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
        }}
      >
        <div className="w-full max-w-2xl">
          <Image
            src="/CoconutBeachLogo.png"
            alt="Coconut Beach"
            width={320}
            height={120}
            className="mx-auto mb-5 h-auto w-52 drop-shadow-lg sm:w-60"
            priority
          />

          <div className="rounded-xl bg-black/75 p-5 text-left text-white shadow-2xl backdrop-blur-sm sm:p-7">
            <h1 className="text-center text-2xl font-semibold sm:text-3xl">
              Welcome to Coconut Beach
            </h1>

            <p className="mt-3 text-center text-sm leading-relaxed text-white/90 sm:text-base">
              It looks like this may be your first visit. Please read our house rules carefully.
            </p>

            <div className="mt-5 space-y-4 text-sm leading-relaxed text-white/95 sm:text-base">
              <p>
                <strong>Coconut Beach is a calm, quiet and relaxed place.</strong>{' '}
                Please do not play music, play football, shout, or play loudly where it may disturb guests or the nearby massage area. Please use the other end of the beach for these activities.
              </p>

              <p>
                <strong>Sofa bags are reserved for hotel guests, but restaurant guests may use them while eating.</strong>{' '}
                After eating, please leave the sofa bag for the next guest.
              </p>

              <p>
                <strong>Outside food, laptops and pets are not permitted.</strong>
              </p>

              <p>
                <strong>Public nudity and cannabis use are not permitted on the property.</strong>
              </p>

              <p className="text-white/85">
                Violations may be reported to the authorities, and security-camera footage may be provided.
              </p>
            </div>

            {isLoading && !stay_id ? (
              <div className="mt-6 text-center text-base text-white/90">Loading...</div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white/10 p-3 text-left">
                  <input
                    type="checkbox"
                    checked={acceptedRules}
                    onChange={(e) => setAcceptedRules(e.target.checked)}
                    disabled={isLoading}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-white"
                  />
                  <span className="font-semibold leading-snug">
                    I understand and accept the rules
                  </span>
                </label>

                <div>
                  <label htmlFor="first-name" className="mb-2 block font-semibold">
                    First name
                  </label>
                  <Input
                    id="first-name"
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border-2 border-white/30 bg-white/95 py-3 text-center text-gray-900 shadow-lg placeholder:text-center placeholder:text-gray-500"
                    style={{
                      fontSize: '16px',
                      WebkitAppearance: 'none',
                      borderRadius: '12px',
                      WebkitTransform: 'translate3d(0, 0, 0)',
                      transform: 'translate3d(0, 0, 0)',
                    }}
                    aria-label="First name"
                    disabled={isLoading}
                    autoComplete="given-name"
                    autoCapitalize="words"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl border-2 border-white/30 bg-white/90 py-3 text-lg font-bold text-gray-900 shadow-lg transition-all duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isLoading || !stay_id || !acceptedRules || !firstName.trim()}
                  style={{
                    WebkitAppearance: 'none',
                    borderRadius: '12px',
                    WebkitTransform: 'translate3d(0, 0, 0)',
                    transform: 'translate3d(0, 0, 0)',
                  }}
                >
                  {isLoading ? 'Continuing...' : 'Continue'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
