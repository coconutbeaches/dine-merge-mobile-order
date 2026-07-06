import { describe, expect, it } from 'vitest';
import {
  getStayIdLookupVariants,
  mergeGuestOrderResults,
  normalizeStayId,
  stayIdsMatch,
} from './guestOrderHistory';
import { Order } from '@/types/supabaseTypes';

describe('guestOrderHistory', () => {
  it('normalizes space and underscore stay ids to the same family account key', () => {
    expect(normalizeStayId('A9 SZEMES')).toBe('A9_SZEMES');
    expect(stayIdsMatch('A9 SZEMES', 'A9_SZEMES')).toBe(true);
  });

  it('builds lookup variants for guest sessions and admin-created order rows', () => {
    expect(getStayIdLookupVariants('A9 SZEMES')).toEqual(
      expect.arrayContaining(['A9 SZEMES', 'A9_SZEMES'])
    );
  });

  it('deduplicates and sorts family and individual guest order results', () => {
    const older = {
      id: 18303,
      created_at: '2026-07-06T05:21:00.000Z',
    } as Order;
    const newer = {
      id: 18311,
      created_at: '2026-07-06T08:35:00.000Z',
    } as Order;

    expect(mergeGuestOrderResults([older, newer], [older])).toEqual([newer, older]);
  });
});
