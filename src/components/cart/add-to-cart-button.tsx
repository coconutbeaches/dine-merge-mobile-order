'use client';

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { addItem, selectCartItemById } from '@/store/cart-slice';
import { cn } from '@/lib/utils/cn';
import { FiShoppingBag, FiCheck, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface AddToCartButtonProps {
  /**
   * Item to add to cart
   */
  item: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
  
  /**
   * Optional quantity to add (defaults to 1)
   */
  quantity?: number;
  
  /**
   * Whether to show the price on the button
   */
  showPrice?: boolean;
  
  /**
   * Whether to use full width button
   */
  fullWidth?: boolean;
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether the component is rendered client-side only
   */
  clientOnly?: boolean;
  
  /**
   * Optional callback when item is added
   */
  onAddToCart?: () => void;
}

/**
 * Add to Cart Button Component
 * 
 * Dispatches action to add an item to the cart
 * Shows success animation when item is added
 */
export default function AddToCartButton({
  item,
  quantity = 1,
  showPrice = false,
  fullWidth = false,
  className,
  disabled = false,
  clientOnly = false,
  onAddToCart,
}: AddToCartButtonProps) {
  // Get cart item if it exists
  const existingItem = useAppSelector(state => selectCartItemById(state, item.id));
  
  // Local state for success animation
  const [isAdding, setIsAdding] = useState(false);
  
  // Redux dispatch
  const dispatch = useAppDispatch();
  
  // Handle add to cart
  const handleAddToCart = () => {
    if (disabled) return;
    
    // Show adding animation
    setIsAdding(true);
    
    // Add item to cart
    dispatch(addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: quantity,
      image: item.image,
    }));
    
    // Show success toast
    toast.success(`Added ${item.name} to cart`);
    
    // Reset animation after delay
    setTimeout(() => {
      setIsAdding(false);
    }, 1000);
    
    // Call callback if provided
    if (onAddToCart) {
      onAddToCart();
    }
  };
  
  // Determine button text
  const buttonText = existingItem 
    ? `Add Another (${existingItem.quantity} in cart)` 
    : 'Add';
  
  return (
    <button
      type="button"
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      className={cn(
        "btn btn-primary flex items-center justify-center gap-2 transition-all duration-300",
        fullWidth ? "w-full" : "px-6",
        isAdding ? "bg-green-500 hover:bg-green-600" : "",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className
      )}
      aria-label={`Add ${item.name} to cart`}
    >
      {isAdding ? (
        <>
          <FiCheck size={18} className="animate-bounce" />
          <span>Added!</span>
        </>
      ) : (
        <>
          {existingItem ? (
            <FiPlus size={18} />
          ) : (
            <FiShoppingBag size={18} />
          )}
          <span>{buttonText}</span>
          {showPrice && (
            <span className="ml-1 font-semibold">฿{item.price.toFixed(2)}</span>
          )}
        </>
      )}
    </button>
  );
}
