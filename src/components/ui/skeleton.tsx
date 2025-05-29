'use client';

import { cn } from '@/lib/utils/cn';
import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Optional custom className to apply additional styles
   */
  className?: string;
}

/**
 * Skeleton component for loading states
 * 
 * Used to show a placeholder while content is loading
 * Accepts all standard HTML div props plus custom className for styling
 * 
 * @example
 * <Skeleton className="h-20 w-full" /> // Full width, 5rem height skeleton
 * <Skeleton className="h-10 w-24 rounded-full" /> // Rounded skeleton for avatar
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
      {...props}
      aria-hidden="true"
      aria-busy="true"
      role="status"
    />
  );
}
