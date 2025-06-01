/**
 * Date and time formatting utilities optimized for Thai locale
 * 
 * Provides functions to format dates and times according to Thai conventions
 * All functions handle timezone conversion to Asia/Bangkok (UTC+7)
 */

/**
 * Formats a date to Thai locale format (day/month/year)
 * 
 * @param date - Date to format (Date object or ISO string)
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date string (e.g., "29/05/2568" for May 29, 2025 in Buddhist era)
 */
export function formatDate(
  date: Date | string | number | undefined | null,
  options: Intl.DateTimeFormatOptions = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    calendar: 'buddhist' // Thai Buddhist calendar (BE)
  }
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      ...options
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Formats a time to Thai locale format (24-hour)
 * 
 * @param date - Date to format (Date object or ISO string)
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted time string (e.g., "14:30:00")
 */
export function formatTime(
  date: Date | string | number | undefined | null,
  options: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false // 24-hour format is common in Thailand
  }
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      ...options
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
}

/**
 * Formats a date and time together in Thai locale
 * 
 * @param date - Date to format (Date object or ISO string)
 * @param options - Optional Intl.DateTimeFormatOptions
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | string | number | undefined | null,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    calendar: 'buddhist'
  }
): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      ...options
    }).format(dateObj);
  }
  catch (error) {
    console.error('Error formatting date and time:', error);
    return '';
  }
}

/**
 * Formats a date in Thai relative format (today, yesterday, etc.)
 * 
 * @param date - Date to format (Date object or ISO string)
 * @returns Relative date string in Thai
 */
export function formatRelativeDate(date: Date | string | number | undefined | null): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    const now = new Date();
    
    // Convert both dates to Bangkok timezone
    const dateInBangkok = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const nowInBangkok = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    
    // Reset time to compare dates only
    dateInBangkok.setHours(0, 0, 0, 0);
    nowInBangkok.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((nowInBangkok.getTime() - dateInBangkok.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'วันนี้'; // Today
    } else if (diffDays === 1) {
      return 'เมื่อวาน'; // Yesterday
    } else if (diffDays <= 7) {
      return `${diffDays} วันที่แล้ว`; // X days ago
    } else {
      return formatDate(date); // Default to normal date format
    }
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return '';
  }
}

/**
 * Converts a date to Bangkok timezone (UTC+7)
 * 
 * @param date - Date to convert (Date object or ISO string)
 * @returns Date object adjusted to Bangkok timezone
 */
export function toBangkokTimezone(date: Date | string | number | undefined | null): Date | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    
    // Create a date string in Bangkok timezone
    const bangkokDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    return bangkokDate;
  } catch (error) {
    console.error('Error converting to Bangkok timezone:', error);
    return null;
  }
}

/**
 * Formats a date for order display (combines relative date with time)
 * 
 * @param date - Date to format (Date object or ISO string)
 * @returns Formatted string for order display
 */
export function formatOrderDate(date: Date | string | number | undefined | null): string {
  if (!date) return '';
  
  try {
    const relativeDate = formatRelativeDate(date);
    const time = formatTime(date);
    
    return `${relativeDate} ${time}`;
  } catch (error) {
    console.error('Error formatting order date:', error);
    return '';
  }
}

/**
 * Returns true if the date is today in Bangkok timezone
 * 
 * @param date - Date to check (Date object or ISO string)
 * @returns Boolean indicating if the date is today
 */
export function isToday(date: Date | string | number | undefined | null): boolean {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'object' ? date : new Date(date);
    const now = new Date();
    
    // Convert both dates to Bangkok timezone
    const dateInBangkok = new Date(dateObj.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const nowInBangkok = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    
    // Reset time to compare dates only
    dateInBangkok.setHours(0, 0, 0, 0);
    nowInBangkok.setHours(0, 0, 0, 0);
    
    return dateInBangkok.getTime() === nowInBangkok.getTime();
  } catch (error) {
    console.error('Error checking if date is today:', error);
    return false;
  }
}
