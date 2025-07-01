import { describe, test, expect, vi } from 'vitest';
import { formatLastOrderDate } from '../orderDashboardUtils';

describe('formatLastOrderDate', () => {
  // Test null and undefined values
  test('returns "Never" for null input', () => {
    expect(formatLastOrderDate(null)).toBe('Never');
  });

  test('returns "Never" for undefined input', () => {
    expect(formatLastOrderDate(undefined)).toBe('Never');
  });

  test('returns "Never" for empty string', () => {
    expect(formatLastOrderDate('')).toBe('Never');
  });

  test('returns "Never" for whitespace-only string', () => {
    expect(formatLastOrderDate('   ')).toBe('Never');
    expect(formatLastOrderDate('\t\n  ')).toBe('Never');
  });

  // Test valid date strings
  test('formats valid ISO date string correctly', () => {
    const date = '2024-03-15T14:30:00.000Z';
    const result = formatLastOrderDate(date);
    // The exact format depends on locale, but should contain key elements
    expect(result).toMatch(/Mar 15, 2024/);
    expect(result).not.toBe('Never');
  });

  test('formats another valid date correctly', () => {
    const date = '2023-12-25T09:15:30.000Z';
    const result = formatLastOrderDate(date);
    expect(result).toMatch(/Dec 25, 2023/);
    expect(result).not.toBe('Never');
  });

  test('formats date without timezone correctly', () => {
    const date = '2024-01-01T00:00:00';
    const result = formatLastOrderDate(date);
    expect(result).toMatch(/Jan 1, 2024/);
    expect(result).not.toBe('Never');
  });

  // Test invalid date strings
  test('returns "Never" for invalid date string', () => {
    expect(formatLastOrderDate('invalid-date')).toBe('Never');
    expect(formatLastOrderDate('not-a-date')).toBe('Never');
    expect(formatLastOrderDate('2024-13-45')).toBe('Never'); // Invalid month/day
  });

  test('returns "Never" for malformed ISO strings', () => {
    expect(formatLastOrderDate('2024-03-15T')).toBe('Never');
    expect(formatLastOrderDate('2024-03-15T25:00:00')).toBe('Never'); // Invalid hour
  });

  // Test edge cases
  test('handles very old dates', () => {
    const date = '1900-01-01T00:00:00.000Z';
    const result = formatLastOrderDate(date);
    expect(result).toMatch(/Jan 1, 1900/);
    expect(result).not.toBe('Never');
  });

  test('handles future dates', () => {
    const date = '2030-12-31T23:59:59.000Z';
    const result = formatLastOrderDate(date);
    expect(result).toMatch(/Dec 31, 2030/);
    expect(result).not.toBe('Never');
  });

  // Test error handling
  test('logs warning for invalid dates but returns fallback', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const result = formatLastOrderDate('completely-invalid');
    
    expect(result).toBe('Never');
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  // Test type coercion
  test('converts non-string inputs to string', () => {
    // These would be edge cases where the date comes as number or other type
    expect(formatLastOrderDate(null as any)).toBe('Never');
    expect(formatLastOrderDate(123 as any)).toBe('Never'); // Invalid date number
  });

  // Test specific format requirements
  test('output format includes expected elements', () => {
    const date = '2024-06-15T16:45:30.000Z';
    const result = formatLastOrderDate(date);
    
    // Should contain month abbreviation, day, year, and time
    expect(result).toMatch(/\w{3} \d{1,2}, \d{4}/); // "Jun 15, 2024" pattern
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/); // "4:45 PM" pattern
  });

  // Test boundary conditions
  test('handles leap year dates correctly', () => {
    const date = '2024-02-29T12:00:00.000Z'; // Leap year
    const result = formatLastOrderDate(date);
    expect(result).toMatch(/Feb 29, 2024/);
    expect(result).not.toBe('Never');
  });

  test('handles end of year correctly', () => {
    const date = '2023-12-31T23:59:59.000Z';
    const result = formatLastOrderDate(date);
    expect(result).toMatch(/Dec 31, 2023/);
    expect(result).not.toBe('Never');
  });
});
