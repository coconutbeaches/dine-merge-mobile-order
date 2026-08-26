import { describe, expect, it } from 'vitest';
import {
  isRestaurantServiceLocation,
  normalizeRestaurantServiceLocation,
} from './restaurantServiceLocation';

describe('restaurant service locations', () => {
  it('accepts positive numeric tables', () => {
    expect(normalizeRestaurantServiceLocation('1')).toBe('1');
    expect(normalizeRestaurantServiceLocation('40')).toBe('40');
    expect(isRestaurantServiceLocation('215')).toBe(true);
  });

  it('canonicalizes Take Away variants', () => {
    expect(normalizeRestaurantServiceLocation('Take Away')).toBe('Take Away');
    expect(normalizeRestaurantServiceLocation('takeaway')).toBe('Take Away');
    expect(normalizeRestaurantServiceLocation('take-away')).toBe('Take Away');
  });

  it('rejects non-restaurant order locations', () => {
    expect(isRestaurantServiceLocation('0')).toBe(false);
    expect(isRestaurantServiceLocation('bike-rental')).toBe(false);
    expect(isRestaurantServiceLocation('JH_GRAMER')).toBe(false);
    expect(isRestaurantServiceLocation('')).toBe(false);
    expect(isRestaurantServiceLocation(null)).toBe(false);
  });
});
