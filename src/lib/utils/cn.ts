import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge class names with Tailwind CSS
 * 
 * Combines clsx and tailwind-merge to handle conditional classes and resolve Tailwind conflicts
 * 
 * @param inputs - Class names or conditional class objects to merge
 * @returns A string of merged class names optimized for Tailwind CSS
 * 
 * @example
 * // Basic usage
 * cn('text-red-500', 'bg-blue-500') // => 'text-red-500 bg-blue-500'
 * 
 * // With conditionals
 * cn('text-lg', isLarge && 'font-bold') // => 'text-lg font-bold' or 'text-lg'
 * 
 * // Resolving conflicts (last one wins)
 * cn('text-red-500', 'text-blue-500') // => 'text-blue-500'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
