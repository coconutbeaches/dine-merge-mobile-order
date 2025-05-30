'use client';

import React from 'react';
import { useAppSelector } from '@/store/store';
import { selectCartItemCount, selectCartTotal } from '@/store/cart-slice';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';
import { FiShoppingBag } from 'react-icons/fi';

interface CartButtonProps {
  /**
   * Whether to show the total price
   */
  showTotal?: boolean;
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Whether the button is rendered client-side only
   */
  clientOnly?: boolean;
  
  /**
   * Whether to use a floating style (for bottom of page)
   */
  floating?: boolean;
  
  /**
   * Whether to use a compact style (for header)
   */
  compact?: boolean;
}

/**
 * Cart Button Component
 * 
 * Displays the current cart status with item count and optional total price
 * Used in the header and as a floating button at the bottom of the menu page
 */
export default function CartButton({
  showTotal = false,
  className,
  clientOnly = false,
  floating = false,
  compact = false,
}: CartButtonProps) {
  // Get cart information from Redux store
  const itemCount = useAppSelector(selectCartItemCount);
  const cartTotal = useAppSelector(selectCartTotal);
  
  // Don't render anything if cart is empty and we're not showing the total
  if (itemCount === 0 && !showTotal) {
    return null;
  }
  
  // Floating button style (for bottom of page)
  if (floating) {
    return (
      <Link
        href="/cart"
        className={cn(
          "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20",
          "bg-black text-white rounded-full py-3 px-6 shadow-lg",
          "flex items-center justify-center gap-2",
          "transition-transform hover:scale-105 active:scale-95",
          className
        )}
        aria-label={`View cart with ${itemCount} items`}
      >
        <span className="flex items-center gap-2">
          <span className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
            {itemCount}
          </span>
          <span className="font-medium">Cart</span>
        </span>
        
        {showTotal && itemCount > 0 && (
          <>
            <span className="mx-1 text-gray-300">|</span>
            <span className="font-semibold">฿{cartTotal.toFixed(2)}</span>
          </>
        )}
      </Link>
    );
  }
  
  // Compact style (for header)
  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <FiShoppingBag size={22} />
        
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
            {itemCount}
          </span>
        )}
      </div>
    );
  }
  
  // Default style (for menu page bottom bar)
  return (
    <Link
      href="/cart"
      className={cn(
        "flex items-center bg-black text-white rounded-full py-2 px-4",
        "transition-transform hover:scale-105 active:scale-95",
        className
      )}
      aria-label={`View cart with ${itemCount} items`}
    >
      <span className="bg-white text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-2">
        {itemCount}
      </span>
      
      <span className="font-medium">Cart</span>
      
      {showTotal && itemCount > 0 && (
        <span className="ml-2 font-semibold">฿{cartTotal.toFixed(2)}</span>
      )}
    </Link>
  );
}
