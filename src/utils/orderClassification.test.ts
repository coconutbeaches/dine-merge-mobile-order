import { describe, expect, it } from 'vitest';

import {
  getOrderCustomerChannel,
  isHotelGuestOrder,
  isOutsideOrder,
  isWalkInStayId,
} from './orderClassification';

describe('orderClassification', () => {
  it('treats non-walkin stay ids as hotel guest orders', () => {
    expect(getOrderCustomerChannel({ stay_id: '3A12' })).toBe('hotel_guest');
    expect(getOrderCustomerChannel({ stay_id: 'A5_CROWLEY' })).toBe('hotel_guest');
    expect(isHotelGuestOrder({ stay_id: 'A5_CROWLEY' })).toBe(true);
  });

  it('treats walkin stay ids as outside orders', () => {
    expect(getOrderCustomerChannel({ stay_id: 'walkin-123' })).toBe('outside');
    expect(getOrderCustomerChannel({ stay_id: 'Walkin_24' })).toBe('outside');
    expect(isOutsideOrder({ stay_id: 'walkin-123' })).toBe(true);
    expect(isWalkInStayId('Walkin_24')).toBe(true);
  });

  it('treats orders without a stay id as outside orders', () => {
    expect(getOrderCustomerChannel({ stay_id: null })).toBe('outside');
    expect(getOrderCustomerChannel({})).toBe('outside');
  });
});
