"use client";

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((toast, index) => (
        <div key={index} className="bg-black text-white px-4 py-2 rounded">
          {toast.message}
        </div>
      ))}
    </div>
  );
}
