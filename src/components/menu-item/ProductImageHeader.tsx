"use client";

import React from 'react';
import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

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
          src={imageUrl || '/placeholder.svg'}
          alt={productDescription || 'Product image'}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
