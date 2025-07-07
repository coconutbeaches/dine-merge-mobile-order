'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Share, Download } from 'lucide-react'
import { NAME_PROMPT_WIDTH } from '@/lib/constants'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running as PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true

    // Detect platform
    const userAgent = window.navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent)
    const isAndroidDevice = /Android/.test(userAgent)
    
    setIsIOS(isIOSDevice)
    setIsAndroid(isAndroidDevice)
    setIsStandalone(isStandaloneMode)

    // Don't show prompt if already installed
    if (isStandaloneMode) {
      return
    }

    // Handle Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Show iOS prompt after a delay (since iOS doesn't have beforeinstallprompt)
    if (isIOSDevice && !isStandaloneMode) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds

      return () => clearTimeout(timer)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android Chrome install
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null)
        setShowPrompt(false)
      }
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Remember dismissal for this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa-prompt-dismissed', 'true')
    }
  }

  // Don't show if already dismissed this session
  if (typeof window !== 'undefined' && sessionStorage.getItem('pwa-prompt-dismissed') === 'true') {
    return null
  }

  // Don't show if running as PWA
  if (isStandalone) {
    return null
  }

  // Don't show if not on mobile
  if (!isIOS && !isAndroid) {
    return null
  }

  if (!showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 z-50 animate-in slide-in-from-bottom-4 duration-300" style={{ left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 48px)', maxWidth: NAME_PROMPT_WIDTH, width: NAME_PROMPT_WIDTH }}>
      <div className="bg-white/95 rounded-xl shadow-lg border border-gray-200 p-4 w-full">
        <div className="flex items-start justify-between">
          <div className="flex-1 text-center">
            <h2 className="text-sm font-medium text-gray-900">
              Add Coconut Beach to Home Screen
            </h2>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-4 text-center">
          {isAndroid && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full bg-emerald-500 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-emerald-600 transition-colors flex items-center justify-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Install</span>
            </button>
          )}
          
          {isIOS && (
            <div className="text-xs text-gray-600 leading-tight space-y-1">
              <div className="flex items-center justify-center space-x-1">
                <span>Tap Share button</span>
                <Share className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-center space-x-1">
                <span>Then "Add to Home Screen"</span>
                <Plus className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
