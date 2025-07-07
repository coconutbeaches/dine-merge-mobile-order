'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Share, Download } from 'lucide-react'

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
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <img 
                src="/icons/icon-96x96.png" 
                alt="Coconut Beach" 
                className="w-8 h-8 rounded-md"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                Add to Home Screen
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Install Coconut Beach for quick access
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-4 flex space-x-2">
          {isAndroid && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-emerald-500 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-emerald-600 transition-colors flex items-center justify-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Install</span>
            </button>
          )}
          
          {isIOS && (
            <div className="flex-1 text-xs text-gray-600 leading-tight">
              <div className="flex items-center space-x-1 mb-1">
                <Share className="w-4 h-4" />
                <span>Tap Share button</span>
              </div>
              <div className="flex items-center space-x-1">
                <Plus className="w-4 h-4" />
                <span>Then "Add to Home Screen"</span>
              </div>
            </div>
          )}
          
          <button
            onClick={handleDismiss}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
