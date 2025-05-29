'use client';

import React, { useState, useEffect } from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { selectCartItemById, updateQuantity } from '@/store/cart-slice';
import { cn } from '@/lib/utils/cn';

interface QuantitySelectorProps {
  /**
   * ID of the menu item (used for cart integration)
   */
  id?: string;
  
  /**
   * Minimum allowed value
   */
  minValue?: number;
  
  /**
   * Maximum allowed value
   */
  maxValue?: number;
  
  /**
   * Default/initial value
   */
  defaultValue?: number;
  
  /**
   * Optional callback when value changes
   */
  onChange?: (value: number) => void;
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Whether to disable the component
   */
  disabled?: boolean;
  
  /**
   * Whether the component is rendered client-side only
   */
  clientOnly?: boolean;
}

/**
 * Quantity selector component
 * 
 * Used for selecting quantities of items in the menu and cart
 */
export default function QuantitySelector({
  id,
  minValue = 1,
  maxValue = 99,
  defaultValue = 1,
  onChange,
  className,
  disabled = false,
  clientOnly = false,
}: QuantitySelectorProps) {
  // Get cart item if ID is provided
  const cartItem = useAppSelector(state => id ? selectCartItemById(state, id) : undefined);
  
  // Local state for quantity
  const [quantity, setQuantity] = useState<number>(
    cartItem ? cartItem.quantity : defaultValue
  );
  
  // Redux dispatch
  const dispatch = useAppDispatch();
  
  // Update local state when cart item changes
  useEffect(() => {
    if (cartItem) {
      setQuantity(cartItem.quantity);
    }
  }, [cartItem]);
  
  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    // Ensure quantity is within bounds
    const validQuantity = Math.max(minValue, Math.min(maxValue, newQuantity));
    
    // Update local state
    setQuantity(validQuantity);
    
    // Update cart if ID is provided
    if (id) {
      dispatch(updateQuantity({ id, quantity: validQuantity }));
    }
    
    // Call onChange callback if provided
    if (onChange) {
      onChange(validQuantity);
    }
  };
  
  // Decrement quantity
  const decrementQuantity = () => {
    if (!disabled && quantity > minValue) {
      handleQuantityChange(quantity - 1);
    }
  };
  
  // Increment quantity
  const incrementQuantity = () => {
    if (!disabled && quantity < maxValue) {
      handleQuantityChange(quantity + 1);
    }
  };
  
  return (
    <div 
      className={cn(
        "flex items-center border border-gray-300 rounded-lg overflow-hidden",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <button
        type="button"
        onClick={decrementQuantity}
        disabled={disabled || quantity <= minValue}
        className={cn(
          "flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset",
          quantity <= minValue && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Decrease quantity"
      >
        <FiMinus size={16} />
      </button>
      
      <div className="w-12 h-10 flex items-center justify-center border-x border-gray-300 font-medium">
        {quantity}
      </div>
      
      <button
        type="button"
        onClick={incrementQuantity}
        disabled={disabled || quantity >= maxValue}
        className={cn(
          "flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset",
          quantity >= maxValue && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Increase quantity"
      >
        <FiPlus size={16} />
      </button>
    </div>
  );
}
