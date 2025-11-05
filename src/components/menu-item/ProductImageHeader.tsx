"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { logImageLoadError } from '@/utils/clientLogger';

interface ProductImageHeaderProps {
  isLoading: boolean;
  error: unknown;
  productDescription: string | null;
  imageUrl: string | null;
}

const ProductImageHeader: React.FC<ProductImageHeaderProps> = ({
  isLoading,
  error,
  productDescription,
  imageUrl
}) => {
  const router = useRouter();
  const [hasImageError, setHasImageError] = useState(false);
  const hasLoggedErrorRef = useRef(false);

  const resolvedImage = useMemo(() => imageUrl || '/placeholder.svg', [imageUrl]);

  useEffect(() => {
    setHasImageError(false);
    hasLoggedErrorRef.current = false;
  }, [imageUrl]);

  const handleImageError = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!imageUrl || hasLoggedErrorRef.current) {
      setHasImageError(true);
      return;
    }

    setHasImageError(true);
    hasLoggedErrorRef.current = true;

    const failedSrc = (event?.currentTarget?.currentSrc) || imageUrl;

    console.error('[ProductImageHeader] Failed to load product image', {
      src: failedSrc,
      alt: productDescription,
    });

    void logImageLoadError({
      src: failedSrc,
      productDescription,
      deviceWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
    });
  }, [imageUrl, productDescription]);

  if (isLoading) {
    return (
      <div className="page-container text-center py-10">
        <p>Loading product details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="page-container text-center py-10">
        <AlertTriangle className="h-12 w-12 mx-auto text-black mb-4" />
        <h2 className="text-xl font-bold mb-2">Menu Item Not Found</h2>
        <p className="text-gray-600 mb-6">The item you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/menu')} className="bg-black hover:bg-black/90 text-white">
          Back to Menu
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Item Image */}
      <div className="relative h-80 w-full mb-4 bg-gray-100">
        <Image
          src={hasImageError ? '/placeholder.svg' : resolvedImage}
          alt={productDescription || 'Product image'}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={handleImageError}
        />
      </div>
      
      {/* Item Details */}
      {(productDescription && productDescription !== 'No description') && (
        <div className="mb-6">
          <p className="text-gray-600">{productDescription}</p>
        </div>
      )}
    </>
  );
};

export default ProductImageHeader;
