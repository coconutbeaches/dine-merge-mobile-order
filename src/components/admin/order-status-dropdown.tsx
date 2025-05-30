'use client';

import React, { useState } from 'react';
import { FiChevronDown, FiCheck, FiLoader } from 'react-icons/fi';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

// Order status types
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

interface OrderStatusDropdownProps {
  /**
   * Order ID for the status update
   */
  orderId: string;
  
  /**
   * Initial status of the order
   */
  initialStatus: OrderStatus;
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether the component is rendered client-side only
   */
  clientOnly?: boolean;
  
  /**
   * Optional callback when status is updated
   */
  onStatusUpdate?: (status: OrderStatus) => void;
}

/**
 * Order Status Dropdown Component
 * 
 * Used in the admin dashboard to update order status
 * Provides visual feedback during the update process
 */
export default function OrderStatusDropdown({
  orderId,
  initialStatus,
  className,
  disabled = false,
  clientOnly = false,
  onStatusUpdate,
}: OrderStatusDropdownProps) {
  // Local state
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Status options with labels and colors
  const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
    { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
    { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  ];
  
  // Get current status option
  const currentStatus = statusOptions.find(option => option.value === status);
  
  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled && !isUpdating) {
      setIsOpen(!isOpen);
    }
  };
  
  // Close dropdown
  const closeDropdown = () => {
    setIsOpen(false);
  };
  
  // Update order status
  const updateStatus = async (newStatus: OrderStatus) => {
    // Skip if status is the same
    if (newStatus === status) {
      closeDropdown();
      return;
    }
    
    // Set updating state
    setIsUpdating(true);
    
    try {
      // Make API call to update status
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
      
      // Update local state
      setStatus(newStatus);
      
      // Show success toast
      toast.success(`Order status updated to ${newStatus.toLowerCase()}`);
      
      // Call callback if provided
      if (onStatusUpdate) {
        onStatusUpdate(newStatus);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      // Reset states
      setIsUpdating(false);
      closeDropdown();
    }
  };
  
  return (
    <div className="relative">
      {/* Dropdown button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled || isUpdating}
        className={cn(
          "relative w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
          disabled && "opacity-50 cursor-not-allowed",
          isUpdating && "cursor-wait",
          className
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center">
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2",
            currentStatus?.color
          )}>
            {currentStatus?.label}
          </span>
        </span>
        
        {isUpdating ? (
          <FiLoader className="h-5 w-5 text-gray-400 animate-spin" />
        ) : (
          <FiChevronDown className={cn(
            "h-5 w-5 text-gray-400 transition-transform",
            isOpen && "transform rotate-180"
          )} />
        )}
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg"
          role="listbox"
        >
          <ul 
            className="max-h-60 overflow-auto rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
            tabIndex={-1}
          >
            {statusOptions.map((option) => (
              <li
                key={option.value}
                className={cn(
                  "relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-gray-100",
                  option.value === status && "bg-gray-50"
                )}
                role="option"
                aria-selected={option.value === status}
                onClick={() => updateStatus(option.value)}
              >
                <div className="flex items-center">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2",
                    option.color
                  )}>
                    {option.label}
                  </span>
                </div>
                
                {option.value === status && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600">
                    <FiCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
