import { describe, expect, it } from 'vitest';
import {
  assembleCatalog,
  buildTrustedOrder,
  InvalidOptionError,
  UnpriceableItemError,
  type Catalog,
  type OrderRequestItem,
} from './orderPricing';

const COFFEE = 'f90058d6-0fbe-4a97-9b92-a442f15dc39d';
const NOOPT = '00000000-0000-0000-0000-0000000000aa'; // simple product, no options
const ROUNDING = '00000000-0000-0000-0000-0000000000bb';
const INACTIVE = '00000000-0000-0000-0000-0000000000cc';

const OPT_TEMP = 'opt-temperature';
const OPT_MILK = 'opt-milk';
const OPT_EXTRA = 'opt-extras';

// Raw rows deliberately mirror the live schema, EXCEPT the products rows omit an
// `active` column for the active-default products (proving the loader tolerates
// a schema without that column).
const productRows = [
  { id: COFFEE, name: 'Coffee', price: 100, image_url: 'https://img/coffee.jpg', description: 'No description', category_id: 'cat-1' },
  { id: NOOPT, name: 'Plain Water', price: 30, image_url: null, category_id: 'cat-1' },
  { id: ROUNDING, name: 'Odd Price', price: 10.005, image_url: null },
  { id: INACTIVE, name: 'Discontinued', price: 50, active: false },
];

const optionRows = [
  { id: OPT_TEMP, product_id: COFFEE, name: 'Temperature', required: true, selection_type: 'single', sort_order: 0 },
  { id: OPT_MILK, product_id: COFFEE, name: 'Milk', required: false, selection_type: 'single', sort_order: 1 },
  { id: OPT_EXTRA, product_id: COFFEE, name: 'Extras', required: false, selection_type: 'multiple', sort_order: 2 },
];

const choiceRows = [
  { option_id: OPT_TEMP, name: 'Hot', price_adjustment: 0, sort_order: 0 },
  { option_id: OPT_TEMP, name: 'Iced', price_adjustment: 10, sort_order: 1 },
  { option_id: OPT_MILK, name: 'No Milk  ', price_adjustment: 0, sort_order: 0 }, // note trailing spaces
  { option_id: OPT_MILK, name: 'Almond Milk', price_adjustment: 20, sort_order: 1 },
  { option_id: OPT_EXTRA, name: 'Extra shot', price_adjustment: 95, sort_order: 0 },
  { option_id: OPT_EXTRA, name: 'Whipped cream', price_adjustment: 15, sort_order: 1 },
];

const makeCatalog = (): Catalog => assembleCatalog(productRows, optionRows, choiceRows);

const order = (items: OrderRequestItem[]) => buildTrustedOrder(items, makeCatalog());

describe('assembleCatalog', () => {
  it('treats products with no `active` column as available (no column-not-found reliance)', () => {
    const catalog = assembleCatalog([{ id: NOOPT, name: 'Plain Water', price: 30 }], [], []);
    expect(catalog.get(NOOPT)?.active).toBe(true);
  });

  it('marks an explicitly inactive product unavailable', () => {
    expect(makeCatalog().get(INACTIVE)?.active).toBe(false);
  });
});

describe('buildTrustedOrder', () => {
  it('prices a normal guest checkout with a required option (existing flow still works)', () => {
    const { orderItems, total } = order([
      { menuItem: { id: COFFEE }, quantity: 2, selectedOptions: { [OPT_TEMP]: 'Hot' } },
    ]);
    expect(total).toBe(200); // 100 * 2
    expect(orderItems[0].menuItem.name).toBe('Coffee');
    expect(orderItems[0].selectedOptions[OPT_TEMP]).toBe('Hot');
  });

  it('checkout works for a product on a schema without an `active` column', () => {
    const { total } = order([{ menuItem: { id: NOOPT }, quantity: 1 }]);
    expect(total).toBe(30);
  });

  it('discards a forged expensive display name/price and stores the trusted cheap product', () => {
    const { orderItems, total } = order([
      {
        menuItem: { id: COFFEE, name: 'Lobster Thermidor', price: 9999, image: 'evil.jpg' } as never,
        quantity: 1,
        selectedOptions: { [OPT_TEMP]: 'Hot' },
      },
    ]);
    expect(orderItems[0].menuItem.name).toBe('Coffee');
    expect(orderItems[0].menuItem.price).toBe(100);
    expect(total).toBe(100);
  });

  it('rejects an order that omits a required option', () => {
    expect(() =>
      order([{ menuItem: { id: COFFEE }, quantity: 1, selectedOptions: {} }]),
    ).toThrow(InvalidOptionError);
  });

  it('rejects an invalid choice for an option', () => {
    expect(() =>
      order([{ menuItem: { id: COFFEE }, quantity: 1, selectedOptions: { [OPT_TEMP]: 'Lukewarm' } }]),
    ).toThrow(InvalidOptionError);
  });

  it('rejects an option that does not belong to the product', () => {
    expect(() =>
      order([
        { menuItem: { id: COFFEE }, quantity: 1, selectedOptions: { [OPT_TEMP]: 'Hot', 'bogus-option': 'x' } },
      ]),
    ).toThrow(InvalidOptionError);
  });

  it('rejects multiple choices on a single-select option', () => {
    expect(() =>
      order([{ menuItem: { id: COFFEE }, quantity: 1, selectedOptions: { [OPT_TEMP]: ['Hot', 'Iced'] } }]),
    ).toThrow(InvalidOptionError);
  });

  it('prices valid required + optional (single and multi) options correctly', () => {
    const { orderItems, total } = order([
      {
        menuItem: { id: COFFEE },
        quantity: 1,
        selectedOptions: {
          [OPT_TEMP]: 'Iced',
          [OPT_MILK]: 'Almond Milk',
          [OPT_EXTRA]: ['Extra shot', 'Whipped cream'],
        },
      },
    ]);
    expect(total).toBe(240); // 100 + 10 + 20 + 95 + 15
    expect(orderItems[0].selectedOptions[OPT_EXTRA]).toEqual(['Extra shot', 'Whipped cream']);
  });

  it('ignores a client-supplied choice price and uses the catalog adjustment', () => {
    const { total } = order([
      {
        menuItem: { id: COFFEE },
        quantity: 1,
        // object shape claiming price 0 for an upgrade that actually costs 10
        selectedOptions: { [OPT_TEMP]: { name: 'Iced', price: 0 } as never },
      },
    ]);
    expect(total).toBe(110);
  });

  it('matches choices case/space-insensitively but stores the canonical catalog label', () => {
    const { orderItems, total } = order([
      { menuItem: { id: COFFEE }, quantity: 1, selectedOptions: { [OPT_TEMP]: 'Hot', [OPT_MILK]: 'almond milk' } },
    ]);
    expect(total).toBe(120); // 100 + 20
    expect(orderItems[0].selectedOptions[OPT_MILK]).toBe('Almond Milk');
  });

  it('carries special instructions through, trimmed and length-capped', () => {
    const { orderItems } = order([
      { menuItem: { id: COFFEE }, quantity: 1, selectedOptions: { [OPT_TEMP]: 'Hot' }, specialInstructions: '  no sugar  ' },
    ]);
    expect(orderItems[0].specialInstructions).toBe('no sugar');

    const longNote = 'x'.repeat(900);
    const { orderItems: capped } = order([
      { menuItem: { id: COFFEE }, quantity: 1, selectedOptions: { [OPT_TEMP]: 'Hot' }, specialInstructions: longNote },
    ]);
    expect(capped[0].specialInstructions?.length).toBe(500);
  });

  it('rejects an unknown product', () => {
    expect(() => order([{ menuItem: { id: 'not-a-real-product' }, quantity: 1 }])).toThrow(UnpriceableItemError);
  });

  it('rejects an inactive product', () => {
    expect(() => order([{ menuItem: { id: INACTIVE }, quantity: 1 }])).toThrow(UnpriceableItemError);
  });

  it('rejects invalid quantities', () => {
    expect(() => order([{ menuItem: { id: NOOPT }, quantity: 0 }])).toThrow(UnpriceableItemError);
    expect(() => order([{ menuItem: { id: NOOPT }, quantity: -2 }])).toThrow(UnpriceableItemError);
  });

  it('rejects an empty order', () => {
    expect(() => order([])).toThrow(UnpriceableItemError);
  });

  it('rounds the total to two decimals', () => {
    const { total } = order([{ menuItem: { id: ROUNDING }, quantity: 3 }]);
    expect(total).toBe(30.02); // 10.005 * 3 = 30.015 -> 30.02
  });
});
