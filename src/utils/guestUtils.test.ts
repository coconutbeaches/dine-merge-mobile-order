import { describe, it, expect } from 'vitest';
import { formatStayId } from './guestUtils';

describe('formatStayId', () => {
  it('should format walkin with table number', () => {
    const result = formatStayId('walkin_abc', '7');
    expect(result).toBe('Walkin 7');
  });

  it('should format walkin without table number', () => {
    const result = formatStayId('walkin_xyz', null);
    expect(result).toBe('Walkin');
  });

  it('should return "unknown" for null stayId', () => {
    const result = formatStayId(null);
    expect(result).toBe('unknown');
  });

  it('should format hotel guest stayId by replacing underscores with spaces', () => {
    const result = formatStayId('New_House_Diogo');
    expect(result).toBe('New House Diogo');
  });
});
