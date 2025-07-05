"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  useEffect(() => {
    // For now, redirect to the existing Vite route structure
    // In the future, this can be replaced with a proper Next.js product edit component
    if (typeof window !== 'undefined') {
      window.location.href = `/products/edit/${productId}`;
    }
  }, [productId]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Redirecting to Product Editor...</h2>
        <p className="text-gray-600">Please wait while we redirect you to the product edit page.</p>
      </div>
    </div>
  );
}
