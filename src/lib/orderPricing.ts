import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Authoritative, server-side order pricing.
 *
 * The browser must never be trusted for `total_amount`. These helpers recompute
 * the order total from the `products` and `product_option_choices` tables using
 * the same rules as the client-side `calculateTotalPrice` (base price + the
 * price_adjustment of each selected choice), so a tampered client total is
 * ignored.
 */

export class UnpriceableItemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnpriceableItemError';
  }
}

// Shape of a single line as stored in orders.order_items (see src/types/app.ts
// CartItem). We only rely on the fields needed for pricing and tolerate the
// looser client shapes defensively.
export interface PricableItem {
  quantity: number;
  menuItem?: { id?: string | null } | null;
  product_id?: string | null;
  selectedOptions?: Record<string, unknown> | null;
}

export interface PricingData {
  // product id -> authoritative base price + availability
  products: Map<string, { price: number; active: boolean }>;
  // `${option_id} ${choiceName}` -> price_adjustment
  choiceAdjustments: Map<string, number>;
  // option id -> product id (to confirm an option belongs to the product)
  optionProduct: Map<string, string>;
}

const choiceKey = (optionId: string, name: string) => `${optionId} ${name.trim()}`;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function extractChoiceNames(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') return value.trim() ? [value] : [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (typeof entry === 'string') return entry.trim() ? [entry] : [];
      if (entry && typeof entry === 'object' && typeof (entry as { name?: unknown }).name === 'string') {
        return [(entry as { name: string }).name];
      }
      return [];
    });
  }
  if (typeof value === 'object' && typeof (value as { name?: unknown }).name === 'string') {
    return [(value as { name: string }).name];
  }
  return [];
}

/**
 * Pure total computation. Kept independent of Supabase so it can be unit tested.
 * Throws UnpriceableItemError when an item references an unknown/inactive
 * product (so the caller can reject the order rather than trust a client total).
 * Unknown options/choices contribute 0 — they can never lower the base price.
 */
export function computeOrderTotal(items: PricableItem[], data: PricingData): number {
  if (!Array.isArray(items) || items.length === 0) {
    throw new UnpriceableItemError('Order has no items');
  }

  let total = 0;

  for (const item of items) {
    const productId = item?.menuItem?.id ?? item?.product_id ?? null;
    if (!productId || typeof productId !== 'string') {
      throw new UnpriceableItemError('Order item is missing a product reference');
    }

    const product = data.products.get(productId);
    if (!product || !product.active) {
      throw new UnpriceableItemError(`Product ${productId} is unavailable`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new UnpriceableItemError(`Invalid quantity for product ${productId}`);
    }

    let unitPrice = product.price;

    const selected = item.selectedOptions;
    if (selected && typeof selected === 'object') {
      for (const [optionId, rawValue] of Object.entries(selected)) {
        // Only honour options that actually belong to this product.
        if (data.optionProduct.get(optionId) !== productId) continue;
        for (const name of extractChoiceNames(rawValue)) {
          unitPrice += data.choiceAdjustments.get(choiceKey(optionId, name)) ?? 0;
        }
      }
    }

    if (unitPrice < 0) unitPrice = 0;
    total += unitPrice * quantity;
  }

  return round2(total);
}

/** Load authoritative pricing data for the given product ids. */
export async function fetchPricingData(
  serviceClient: SupabaseClient,
  productIds: string[],
): Promise<PricingData> {
  const uniqueIds = Array.from(new Set(productIds.filter((id): id is string => typeof id === 'string' && !!id)));

  const products = new Map<string, { price: number; active: boolean }>();
  const choiceAdjustments = new Map<string, number>();
  const optionProduct = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return { products, choiceAdjustments, optionProduct };
  }

  const { data: productRows, error: productError } = await serviceClient
    .from('products')
    .select('id, price, active')
    .in('id', uniqueIds);
  if (productError) throw productError;

  for (const row of productRows ?? []) {
    products.set(row.id as string, {
      price: Number(row.price) || 0,
      active: row.active !== false,
    });
  }

  const { data: optionRows, error: optionError } = await serviceClient
    .from('product_options')
    .select('id, product_id')
    .in('product_id', uniqueIds);
  if (optionError) throw optionError;

  const optionIds: string[] = [];
  for (const row of optionRows ?? []) {
    optionProduct.set(row.id as string, row.product_id as string);
    optionIds.push(row.id as string);
  }

  if (optionIds.length > 0) {
    const { data: choiceRows, error: choiceError } = await serviceClient
      .from('product_option_choices')
      .select('option_id, name, price_adjustment')
      .in('option_id', optionIds);
    if (choiceError) throw choiceError;

    for (const row of choiceRows ?? []) {
      choiceAdjustments.set(
        choiceKey(row.option_id as string, row.name as string),
        Number(row.price_adjustment) || 0,
      );
    }
  }

  return { products, choiceAdjustments, optionProduct };
}

/** Convenience: load pricing data then compute the total for the given items. */
export async function recomputeOrderTotal(
  serviceClient: SupabaseClient,
  items: PricableItem[],
): Promise<number> {
  const productIds = (items ?? [])
    .map((item) => item?.menuItem?.id ?? item?.product_id ?? null)
    .filter((id): id is string => typeof id === 'string' && !!id);

  const data = await fetchPricingData(serviceClient, productIds);
  return computeOrderTotal(items, data);
}
