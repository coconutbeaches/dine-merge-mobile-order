
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatThaiCurrency(amount: number): string {
  // Math.round ensures no decimal places for amounts like X.00 and rounds X.50 up.
  return `฿${Math.round(amount)}`;
}

