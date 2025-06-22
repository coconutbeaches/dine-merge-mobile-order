
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formats all prices without decimals

export function formatThaiCurrency(amount: number): string {
  return `฿${Math.round(amount)}`;
}

export function formatThaiCurrencyWithComma(amount: number): string {
  return `฿${Math.round(amount).toLocaleString()}`;
}
