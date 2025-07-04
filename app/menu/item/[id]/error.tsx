'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/menu');
  };

  return (
    <div className="page-container">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="text-red-500">
          <AlertCircle size={64} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Something went wrong!
          </h2>
          <p className="text-gray-600 max-w-md">
            We encountered an error while loading this menu item. This could be due to a network issue or the item may not exist.
          </p>
        </div>

        {/* Error details for debugging */}
        <details className="max-w-md">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            View error details
          </summary>
          <div className="mt-2 p-3 bg-gray-100 rounded-md text-left">
            <p className="text-xs text-gray-700 font-mono break-all">
              {error.message || 'An unexpected error occurred'}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-1">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </details>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={reset}
            className="flex items-center gap-2"
            variant="default"
          >
            <RefreshCw size={16} />
            Try Again
          </Button>
          
          <Button
            onClick={handleGoBack}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Go Back
          </Button>
          
          <Button
            onClick={handleGoHome}
            variant="ghost"
          >
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
