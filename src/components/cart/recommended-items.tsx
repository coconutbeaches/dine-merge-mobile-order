'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { MenuItem } from '@prisma/client';
import { FiPlus } from 'react-icons/fi';
import { useAppDispatch } from '@/store/store';
import { addItem } from '@/store/cart-slice';
import toast from 'react-hot-toast';

interface RecommendedItemsProps {
  /**
   * Array of recommended menu items
   */
  items: MenuItem[];
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Maximum number of items to display
   */
  maxItems?: number;
  
  /**
   * Whether to show recommendation reason
   */
  showReason?: boolean;
}

/**
 * Recommended Items Component
 * 
 * Displays a horizontal scrollable list of recommended items
 * Used in the "People also bought" section of the cart page
 */
export default function RecommendedItems({
  items,
  className,
  maxItems = 4,
  showReason = false,
}: RecommendedItemsProps) {
  // Redux dispatch
  const dispatch = useAppDispatch();
  
  // Limit the number of items to display
  const displayItems = items.slice(0, maxItems);
  
  // Handle add to cart
  const handleAddToCart = (item: MenuItem) => {
    dispatch(addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image || '/images/placeholder.png',
    }));
    
    // Show success toast
    toast.success(`Added ${item.name} to cart`);
  };
  
  // If no items, don't render anything
  if (!displayItems.length) {
    return null;
  }
  
  return (
    <div className={cn("recommended-items", className)}>
      <div className="grid grid-cols-2 gap-4">
        {displayItems.map((item) => (
          <div 
            key={item.id}
            className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100"
          >
            <div className="relative aspect-square">
              <Image
                src={item.image || '/images/placeholder.png'}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
            
            <div className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-sm line-clamp-1" title={item.name}>
                    {item.name}
                  </h3>
                  
                  {item.nameEn && item.nameEn !== item.name && (
                    <p className="text-xs text-gray-500 line-clamp-1" title={item.nameEn}>
                      {item.nameEn}
                    </p>
                  )}
                  
                  <p className="mt-1 font-medium text-sm format-baht">
                    {item.price.toFixed(2)}
                  </p>
                </div>
                
                <button
                  onClick={() => handleAddToCart(item)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label={`Add ${item.name} to cart`}
                >
                  <FiPlus size={16} />
                </button>
              </div>
              
              {showReason && (item as any).recommendationReason && (
                <p className="text-xs text-gray-500 mt-1">
                  {(item as any).recommendationReason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
