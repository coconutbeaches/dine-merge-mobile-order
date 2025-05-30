'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface CategoryHeaderProps {
  /**
   * Category name (primary, typically Thai)
   */
  name: string;
  
  /**
   * Optional English name
   */
  nameEn?: string;
  
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * Category Header Component
 * 
 * Displays a category name in a styled header for the menu page
 * Used to separate different menu categories (e.g., Drinks, Food, Desserts)
 */
export default function CategoryHeader({
  name,
  nameEn,
  className,
}: CategoryHeaderProps) {
  return (
    <div 
      className={cn(
        "category-header bg-black text-white font-medium py-2 px-4 rounded-lg mb-3",
        className
      )}
    >
      <h2 className="text-lg font-display">
        {name}
        {nameEn && name !== nameEn && (
          <span className="text-sm ml-2 opacity-80">
            ({nameEn})
          </span>
        )}
      </h2>
    </div>
  );
}
