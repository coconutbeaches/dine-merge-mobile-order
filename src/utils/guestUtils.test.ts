import { describe, it, expect } from 'vitest';
import { formatStayId } from './guestUtils';

describe('formatStayId', () => {
  it('should format walkin with table number', () => {
    const result = formatStayId('walkin_abc', '7');
    expect(result).toBe('walkin 7');
  });

  it('should format walkin without table number', () => {
    const result = formatStayId('walkin_xyz', null);
    expect(result).toBe('walkin');
  });

  it('should return "unknown" for null stayId', () => {
    const result = formatStayId(null);
    expect(result).toBe('unknown');
  });

  it('should return hotel guest stayId untouched', () => {
    const result = formatStayId('A5_CROWLEY');
    expect(result).toBe('A5_CROWLEY');
  });
});
