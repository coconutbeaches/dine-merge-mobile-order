import { describe, expect, it } from 'vitest';
import {
  computeOrderTotal,
  UnpriceableItemError,
  type PricableItem,
  type PricingData,
} from './orderPricing';

const PRODUCT_A = '11111111-1111-1111-1111-111111111111';
const PRODUCT_B = '22222222-2222-2222-2222-222222222222';
const OPTION_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function baseData(): PricingData {
  return {
    products: new Map([
      [PRODUCT_A, { price: 100, active: true }],
      [PRODUCT_B, { price: 50, active: true }],
    ]),
    // OPTION_A belongs to PRODUCT_A; "Large" adds 20, "Extra cheese" adds 15
    choiceAdjustments: new Map([
      [`${OPTION_A} Large`, 20],
      [`${OPTION_A} Extra cheese`, 15],
    ]),
    optionProduct: new Map([[OPTION_A, PRODUCT_A]]),
  };
}

describe('computeOrderTotal', () => {
  it('prices a simple order from authoritative base prices, ignoring client totals', () => {
    const items: PricableItem[] = [
      { quantity: 2, menuItem: { id: PRODUCT_A } },
      { quantity: 1, menuItem: { id: PRODUCT_B } },
    ];
    expect(computeOrderTotal(items, baseData())).toBe(250); // 100*2 + 50
  });

  it('adds option price adjustments looked up from the database, not the client', () => {
    const items: PricableItem[] = [
      {
        quantity: 1,
        menuItem: { id: PRODUCT_A },
        // Client claims price 0 — must be ignored; server uses 100 + 20.
        selectedOptions: { [OPTION_A]: { name: 'Large', price: 0 } },
      },
    ];
    expect(computeOrderTotal(items, baseData())).toBe(120);
  });

  it('supports multi-select option arrays', () => {
    const items: PricableItem[] = [
      {
        quantity: 1,
        menuItem: { id: PRODUCT_A },
        selectedOptions: { [OPTION_A]: ['Large', 'Extra cheese'] },
      },
    ];
    expect(computeOrderTotal(items, baseData())).toBe(135); // 100 + 20 + 15
  });

  it('ignores options that do not belong to the product (cannot inject discounts)', () => {
    const items: PricableItem[] = [
      {
        quantity: 1,
        menuItem: { id: PRODUCT_B }, // OPTION_A belongs to PRODUCT_A, not B
        selectedOptions: { [OPTION_A]: 'Large' },
      },
    ];
    expect(computeOrderTotal(items, baseData())).toBe(50); // unchanged base
  });

  it('ignores unknown choice names (attacker-invented options add nothing)', () => {
    const items: PricableItem[] = [
      {
        quantity: 1,
        menuItem: { id: PRODUCT_A },
        selectedOptions: { [OPTION_A]: 'Free upgrade' },
      },
    ];
    expect(computeOrderTotal(items, baseData())).toBe(100);
  });

  it('rejects an order that references an unknown product', () => {
    const items: PricableItem[] = [{ quantity: 1, menuItem: { id: 'not-a-real-product' } }];
    expect(() => computeOrderTotal(items, baseData())).toThrow(UnpriceableItemError);
  });

  it('rejects an inactive product rather than trusting a client price', () => {
    const data = baseData();
    data.products.set(PRODUCT_A, { price: 100, active: false });
    const items: PricableItem[] = [{ quantity: 1, menuItem: { id: PRODUCT_A } }];
    expect(() => computeOrderTotal(items, data)).toThrow(UnpriceableItemError);
  });

  it('rejects invalid quantities', () => {
    const items: PricableItem[] = [{ quantity: 0, menuItem: { id: PRODUCT_A } }];
    expect(() => computeOrderTotal(items, baseData())).toThrow(UnpriceableItemError);
    const negative: PricableItem[] = [{ quantity: -3, menuItem: { id: PRODUCT_A } }];
    expect(() => computeOrderTotal(negative, baseData())).toThrow(UnpriceableItemError);
  });

  it('rejects an empty order', () => {
    expect(() => computeOrderTotal([], baseData())).toThrow(UnpriceableItemError);
  });

  it('rounds to two decimals', () => {
    const data = baseData();
    data.products.set(PRODUCT_A, { price: 10.005, active: true });
    const items: PricableItem[] = [{ quantity: 3, menuItem: { id: PRODUCT_A } }];
    // 10.005 * 3 = 30.015 -> 30.02
    expect(computeOrderTotal(items, data)).toBe(30.02);
  });
});
