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
import {
  isRestaurantHandshakeVerifiedForSession,
  markRestaurantHandshakeVerified,
} from '@/lib/restaurantHandshakeSession'

const RESTAURANT_HANDSHAKE_CANARY_TABLE = '6'

const isSafariIOS = () => {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator.userAgent
  return /iP(ad|od|hone)/i.test(userAgent) && /WebKit/i.test(userAgent) && !/CriOS/i.test(userAgent)
}

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

type HandshakeStatusPayload = {
  status?: 'pending' | 'completed' | 'expired'
  table_number?: string
  first_name?: string
  match_kind?: 'hotel' | 'walkin'
  matched_stay_id?: string | null
  error?: string
}

export default function RegisterPage({ params }: RegisterPageProps) {
  const [stay_id, setStayId] = useState<string>('')
  const [firstName, setFirstName] = useState('')
  const [acceptedRules, setAcceptedRules] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [handshakeCompletionRef, setHandshakeCompletionRef] = useState<string | null>(null)
  const router = useRouter()

  const unwrappedParams = use(params)

  useEffect(() => {
    applySafariIOSFixes()
    const ref = new URLSearchParams(window.location.search).get('handshake')?.trim() || null
    setHandshakeCompletionRef(ref)
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

      const urlParams = new URLSearchParams(window.location.search)
      const tableNumber = urlParams.get('table') || getTableNumber()
      const table6Canary = tableNumber === RESTAURANT_HANDSHAKE_CANARY_TABLE
      const hasHandshakeCompletionRef = Boolean(handshakeCompletionRef)

      if (isStandaloneMode()) {
        console.log('[Registration] Standalone mode detected, checking for existing session...')

        const recoveredSession = recoverGuestSessionInStandalone()
        if (
          recoveredSession &&
          !hasHandshakeCompletionRef &&
          (!table6Canary || isRestaurantHandshakeVerifiedForSession(recoveredSession))
        ) {
          console.log('[Registration] Found verified existing session, redirecting to menu')
          router.replace('/menu')
          return
        }
      }

      try {
        const existingSession = getGuestSession()
        if (existingSession && !hasHandshakeCompletionRef) {
          if (table6Canary && !isRestaurantHandshakeVerifiedForSession(existingSession)) {
            console.log('[Registration] Table 6 requires WhatsApp verification for this browser session')
            return
          }

          console.log('Found existing guest session:', existingSession)
          if (existingSession.guest_stay_id === stay_id) {
            console.log('Same stay_id found, allowing new family member registration')
          } else {
            console.log('Different verified stay_id found, redirecting to menu')
            router.replace('/menu')
          }
        }
      } catch (error) {
        console.warn('localStorage not available:', error)
      }
    }
  }, [isLoading, stay_id, router, handshakeCompletionRef])

  useEffect(() => {
    if (!stay_id || !handshakeCompletionRef || typeof window === 'undefined') return

    const urlParams = new URLSearchParams(window.location.search)
    const tableNumber = urlParams.get('table') || getTableNumber()
    if (tableNumber !== RESTAURANT_HANDSHAKE_CANARY_TABLE) return

    let cancelled = false
    let attempts = 0
    setIsLoading(true)

    const finishFromHandshake = async () => {
      attempts += 1
      try {
        const response = await fetch(
          `/api/restaurant/handshake/status?ref=${encodeURIComponent(handshakeCompletionRef)}`,
          { cache: 'no-store' }
        )
        const payload = (await response.json()) as HandshakeStatusPayload
        if (!response.ok) throw new Error(payload.error || 'Could not verify WhatsApp handshake')
        if (cancelled) return

        if (payload.status === 'pending' && attempts < 20) {
          window.setTimeout(finishFromHandshake, 1500)
          return
        }
        if (payload.status !== 'completed' || !payload.first_name) {
          throw new Error(
            payload.status === 'expired'
              ? 'This WhatsApp link expired. Please scan the table QR again.'
              : 'WhatsApp verification is not complete yet.'
          )
        }

        const session = await createGuestUser({
          table_number: RESTAURANT_HANDSHAKE_CANARY_TABLE,
          first_name: payload.first_name,
          stay_id:
            payload.match_kind === 'hotel' && payload.matched_stay_id
              ? payload.matched_stay_id
              : undefined,
        })
        if (cancelled) return

        markRestaurantHandshakeVerified(session)
        toast.success(`Welcome, ${payload.first_name}!`)
        router.replace('/menu')
      } catch (error: any) {
        if (cancelled) return
        console.error('[RestaurantHandshake] completion failed:', error)
        toast.error(error?.message || 'Could not complete WhatsApp verification')
        setIsLoading(false)
      }
    }

    finishFromHandshake()
    return () => {
      cancelled = true
    }
  }, [handshakeCompletionRef, stay_id, router])

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

    if (!acceptedRules) {
      toast.error('Please accept the house rules to continue')
      return
    }

    if (!firstName.trim()) {
      toast.error('Please enter your first name')
      return
    }

    if (!stay_id) {
      toast.error('Registration link is invalid. Please try again.')
      return
    }

    setIsLoading(true)

    try {
      const storedTableNumber = getTableNumber()
      const urlParams = new URLSearchParams(window.location.search)
      const urlTableNumber = urlParams.get('table')

      const isWalkinGuest =
        stay_id.toLowerCase().includes('unknown') ||
        stay_id.toLowerCase().includes('walkin') ||
        Boolean(storedTableNumber) ||
        Boolean(urlTableNumber)

      const tableNumberToUse = isWalkinGuest
        ? storedTableNumber || urlTableNumber || stay_id
        : stay_id

      if (String(tableNumberToUse) === RESTAURANT_HANDSHAKE_CANARY_TABLE) {
        const response = await fetch('/api/restaurant/handshake/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_number: RESTAURANT_HANDSHAKE_CANARY_TABLE,
            first_name: firstName.trim(),
          }),
        })
        const payload = await response.json()
        if (!response.ok || !payload?.whatsapp_url) {
          throw new Error(payload?.error || 'Could not start WhatsApp verification')
        }

        console.log('[RestaurantHandshake] Opening restaurant WhatsApp')
        window.location.assign(payload.whatsapp_url)
        return
      }

      const session = await createGuestUser({
        table_number: tableNumberToUse,
        first_name: firstName.trim(),
        stay_id: isWalkinGuest ? undefined : stay_id,
      })

      toast.success(`Welcome, ${firstName.trim()}!`)
      setTimeout(() => router.replace('/menu'), 500)
    } catch (error: any) {
      console.error('Registration error:', error)
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
            <div className="space-y-4 text-sm leading-relaxed text-white/95 sm:text-base">
              <p>
                <strong>Coconut Beach is a calm, quiet and relaxed place.</strong>{' '}
                To respect our guests and the nearby massage area, please use the other end of the beach for music, sports, loud children, etc.
              </p>

              <p>
                <strong>Sofa bags are reserved for hotel guests, but restaurant guests may use them while eating.</strong>{' '}
                After eating, please leave the sofa bag for the next guest.
              </p>

              <p>
                <strong>Outside food, laptops and pets are not permitted.</strong>
              </p>

              <p>
                <strong>Public nudity and cannabis use are illegal.</strong>
              </p>
            </div>

            {isLoading && !stay_id ? (
              <div className="mt-6 text-center text-base text-white/90">Loading...</div>
            ) : isLoading && handshakeCompletionRef ? (
              <div className="mt-6 text-center text-base text-white/90">Confirming WhatsApp...</div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white/10 p-3 text-left">
                  <input
                    type="checkbox"
                    checked={acceptedRules}
                    onChange={(e) => setAcceptedRules(e.target.checked)}
                    disabled={isLoading}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 border-white/70 bg-white/95 text-[18px] font-black leading-none text-gray-950 shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-white peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black/70"
                  >
                    {acceptedRules ? '✓' : ''}
                  </span>
                  <span className="font-semibold leading-snug">
                    I understand and accept the rules
                  </span>
                </label>

                <div>
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
