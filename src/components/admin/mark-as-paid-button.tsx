'use client';

import React, { useState } from 'react';
import { FiCreditCard, FiLoader } from 'react-icons/fi';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

interface MarkAsPaidButtonProps {
  /**
   * Order ID for the payment status update
   */
  orderId: string;
  
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
   * Optional callback when payment status is updated
   */
  onPaymentUpdate?: () => void;
}

/**
 * Mark as Paid Button Component
 * 
 * Used in the admin dashboard to update order payment status
 * Provides visual feedback during the update process
 */
export default function MarkAsPaidButton({
  orderId,
  className,
  disabled = false,
  clientOnly = false,
  onPaymentUpdate,
}: MarkAsPaidButtonProps) {
  // Local state
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Update payment status
  const markAsPaid = async () => {
    if (disabled || isUpdating) return;
    
    // Set updating state
    setIsUpdating(true);
    
    try {
      // Make API call to update payment status
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }
      
      // Show success toast
      toast.success('Order marked as paid');
      
      // Call callback if provided
      if (onPaymentUpdate) {
        onPaymentUpdate();
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to mark order as paid');
    } finally {
      // Reset updating state
      setIsUpdating(false);
    }
  };
  
  return (
    <button
      type="button"
      onClick={markAsPaid}
      disabled={disabled || isUpdating}
      className={cn(
        "inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium",
        "text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500",
        "transition-colors duration-200",
        (disabled || isUpdating) && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label="Mark order as paid"
    >
      {isUpdating ? (
        <>
          <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <FiCreditCard className="-ml-1 mr-2 h-4 w-4" />
          <span>Mark as paid</span>
        </>
      )}
    </button>
  );
}
