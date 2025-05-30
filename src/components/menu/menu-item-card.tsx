'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface MenuItemCardProps {
  /**
   * Menu item ID
   */
  id: string;
  
  /**
   * Menu item name
   */
  name: string;
  
  /**
   * Menu item price in Thai Baht
   */
  price: number;
  
  /**
   * Menu item image URL
   */
  image: string;
  
  /**
   * Optional English name
   */
  nameEn?: string;
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Whether the item is available
   */
  isAvailable?: boolean;
}

/**
 * Menu Item Card Component
 * 
 * Displays a menu item in a card format with image, name, and price
 * Used on the menu page in a grid layout
 */
export default function MenuItemCard({
  id,
  name,
  price,
  image,
  nameEn,
  className,
  isAvailable = true,
}: MenuItemCardProps) {
  return (
    <Link 
      href={`/menu/${id}`}
      className={cn(
        "menu-item group rounded-lg overflow-hidden transition-all duration-200",
        "hover:shadow-md focus:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500",
        !isAvailable && "opacity-60 grayscale",
        className
      )}
      aria-disabled={!isAvailable}
    >
      <div className="menu-item-image aspect-square relative overflow-hidden bg-gray-100">
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={false}
        />
        
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
            <span className="px-2 py-1 bg-black text-white text-xs font-medium rounded">
              Sold Out
            </span>
          </div>
        )}
      </div>
      
      <div className="p-2">
        <h3 className="font-medium text-base line-clamp-1" title={name}>
          {name}
        </h3>
        
        {nameEn && name !== nameEn && (
          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5" title={nameEn}>
            {nameEn}
          </p>
        )}
        
        <p className="mt-1 font-medium text-base format-baht">
          {price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
