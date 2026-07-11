import type { SupabaseClient } from '@supabase/supabase-js';
import { getProductImageUrl } from '@/utils/imageUrl';

/**
 * Authoritative, server-side order pricing AND order_items reconstruction.
 *
 * The browser is never trusted for `total_amount` OR for the product/option
 * labels that staff read to fulfil an order. Given only a product id and which
 * options were selected, the server rebuilds each order line — name, price,
 * image, option labels and price adjustments — from the `products`,
 * `product_options` and `product_option_choices` tables. Client-supplied names
 * and prices are discarded, so submitting a cheap product id with an expensive
 * display name cannot cause staff to fulfil an unpriced item.
 */

/** Base class for anything that should reject an order with HTTP 400. */
export class OrderRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderRejectedError';
  }
}

/** Product missing/unavailable/unknown, or an invalid quantity. */
export class UnpriceableItemError extends OrderRejectedError {
  constructor(message: string) {
    super(message);
    this.name = 'UnpriceableItemError';
  }
}

/** A selected option/choice is invalid, or a required option is missing. */
export class InvalidOptionError extends OrderRejectedError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOptionError';
  }
}

const MAX_SPECIAL_INSTRUCTIONS = 500;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// Choice names carry significant whitespace/casing in the catalog (e.g.
// "No Milk  "). Match leniently but always STORE the catalog's canonical name.
const normName = (value: string) => value.trim().toLowerCase();

// ---------------------------------------------------------------------------
// Trusted catalog (loaded from the database, or assembled in tests)
// ---------------------------------------------------------------------------

export interface CatalogChoice {
  name: string;
  price: number; // price_adjustment
}

export interface CatalogOption {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  choices: CatalogChoice[];
}

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  image: string | null;
  description: string;
  category: string | null;
  active: boolean;
  options: CatalogOption[];
}

export type Catalog = Map<string, CatalogProduct>;

// ---------------------------------------------------------------------------
// Request + trusted output shapes
// ---------------------------------------------------------------------------

// The loose client line. We only ever read the product reference, the quantity,
// which options were selected, and free-text special instructions.
export interface OrderRequestItem {
  id?: unknown;
  quantity?: unknown;
  menuItem?: { id?: string | null } | null;
  product_id?: string | null;
  selectedOptions?: Record<string, unknown> | null;
  specialInstructions?: unknown;
}

// The trusted stored line — same JSON shape the admin UI / confirmation expect
// (see the order_items produced by the client cart).
export interface TrustedOrderLine {
  id: string;
  quantity: number;
  menuItem: {
    id: string;
    name: string;
    price: number;
    image: string | null;
    description: string;
    category: string | null;
    available: boolean;
    options: Array<{
      id: string;
      name: string;
      required: boolean;
      multiSelect: boolean;
      choices: CatalogChoice[];
    }>;
  };
  selectedOptions: Record<string, string | string[]>;
  specialInstructions?: string;
}

/** Extract selected choice names from the various client shapes. */
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
 * Rebuild trusted order lines and compute the authoritative total. Pure so it
 * can be unit tested without a database.
 *
 * Throws:
 *  - UnpriceableItemError for unknown/inactive products or invalid quantities,
 *  - InvalidOptionError for missing required options, choices that don't belong
 *    to the product/option, or multiple choices on a single-select option.
 */
export function buildTrustedOrder(
  items: OrderRequestItem[],
  catalog: Catalog,
): { orderItems: TrustedOrderLine[]; total: number } {
  if (!Array.isArray(items) || items.length === 0) {
    throw new UnpriceableItemError('Order has no items');
  }

  let total = 0;
  const orderItems: TrustedOrderLine[] = [];

  items.forEach((item, index) => {
    const productId = item?.menuItem?.id ?? item?.product_id ?? null;
    if (!productId || typeof productId !== 'string') {
      throw new UnpriceableItemError('Order item is missing a product reference');
    }

    const product = catalog.get(productId);
    if (!product || !product.active) {
      throw new UnpriceableItemError(`Product ${productId} is unavailable`);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new UnpriceableItemError(`Invalid quantity for product ${productId}`);
    }

    const clientSelected =
      item.selectedOptions && typeof item.selectedOptions === 'object'
        ? (item.selectedOptions as Record<string, unknown>)
        : {};

    // Reject selections that reference an option not on this product.
    const productOptionIds = new Set(product.options.map((o) => o.id));
    for (const optionId of Object.keys(clientSelected)) {
      if (!productOptionIds.has(optionId) && extractChoiceNames(clientSelected[optionId]).length > 0) {
        throw new InvalidOptionError(`Option ${optionId} does not belong to product ${productId}`);
      }
    }

    let unitPrice = product.price;
    const trustedSelected: Record<string, string | string[]> = {};

    for (const option of product.options) {
      const chosenNames = extractChoiceNames(clientSelected[option.id]);

      if (chosenNames.length === 0) {
        if (option.required) {
          throw new InvalidOptionError(`Required option "${option.name}" is missing`);
        }
        continue;
      }

      if (!option.multiSelect && chosenNames.length > 1) {
        throw new InvalidOptionError(`Option "${option.name}" allows only one choice`);
      }

      const choiceByNorm = new Map(option.choices.map((c) => [normName(c.name), c]));
      const canonical: string[] = [];
      for (const chosen of chosenNames) {
        const choice = choiceByNorm.get(normName(chosen));
        if (!choice) {
          throw new InvalidOptionError(`Invalid choice "${chosen}" for option "${option.name}"`);
        }
        unitPrice += choice.price;
        canonical.push(choice.name); // store the catalog's canonical label
      }

      trustedSelected[option.id] = option.multiSelect ? canonical : canonical[0];
    }

    if (unitPrice < 0) unitPrice = 0;
    total += unitPrice * quantity;

    const lineId =
      typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 64) : `item-${index}`;

    const line: TrustedOrderLine = {
      id: lineId,
      quantity,
      menuItem: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description,
        category: product.category,
        available: product.active,
        options: product.options.map((o) => ({
          id: o.id,
          name: o.name,
          required: o.required,
          multiSelect: o.multiSelect,
          choices: o.choices.map((c) => ({ name: c.name, price: c.price })),
        })),
      },
      selectedOptions: trustedSelected,
    };

    if (typeof item.specialInstructions === 'string') {
      const trimmed = item.specialInstructions.trim().slice(0, MAX_SPECIAL_INSTRUCTIONS);
      if (trimmed) line.specialInstructions = trimmed;
    }

    orderItems.push(line);
  });

  return { orderItems, total: round2(total) };
}

// ---------------------------------------------------------------------------
// Catalog loading
// ---------------------------------------------------------------------------

type RawProduct = {
  id: string;
  name?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  description?: string | null;
  category_id?: string | null;
  // `active` is present on the live DB but absent from the repo's generated
  // types/migrations, so it is read defensively rather than SELECTed by name.
  active?: boolean | null;
};
type RawOption = {
  id: string;
  product_id: string;
  name?: string | null;
  required?: boolean | null;
  selection_type?: string | null;
  sort_order?: number | null;
};
type RawChoice = {
  option_id: string;
  name?: string | null;
  price_adjustment?: number | string | null;
  sort_order?: number | null;
};

const bySortOrder = (a: { sort_order?: number | null }, b: { sort_order?: number | null }) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0);

/** Assemble a Catalog from raw table rows. Pure — no database dependency. */
export function assembleCatalog(
  products: RawProduct[],
  options: RawOption[],
  choices: RawChoice[],
): Catalog {
  const choicesByOption = new Map<string, CatalogChoice[]>();
  for (const choice of [...choices].sort(bySortOrder)) {
    const list = choicesByOption.get(choice.option_id) ?? [];
    list.push({ name: String(choice.name ?? ''), price: Number(choice.price_adjustment) || 0 });
    choicesByOption.set(choice.option_id, list);
  }

  const optionsByProduct = new Map<string, CatalogOption[]>();
  for (const option of [...options].sort(bySortOrder)) {
    const list = optionsByProduct.get(option.product_id) ?? [];
    list.push({
      id: option.id,
      name: String(option.name ?? ''),
      required: option.required === true,
      multiSelect: option.selection_type === 'multiple',
      choices: choicesByOption.get(option.id) ?? [],
    });
    optionsByProduct.set(option.product_id, list);
  }

  const catalog: Catalog = new Map();
  for (const product of products) {
    catalog.set(product.id, {
      id: product.id,
      name: String(product.name ?? ''),
      price: Number(product.price) || 0,
      image: getProductImageUrl(product.image_url),
      description: product.description ?? 'No description',
      category: product.category_id ?? null,
      // Treat a missing `active` column (undefined) as active; only an explicit
      // false marks a product unavailable.
      active: product.active !== false,
      options: optionsByProduct.get(product.id) ?? [],
    });
  }
  return catalog;
}

/** Load catalog data for the given product ids using the service role. */
export async function fetchCatalog(
  serviceClient: SupabaseClient,
  productIds: string[],
): Promise<Catalog> {
  const uniqueIds = Array.from(
    new Set(productIds.filter((id): id is string => typeof id === 'string' && !!id)),
  );
  if (uniqueIds.length === 0) return new Map();

  // SELECT * (never names `active`, which is absent from some schemas) — the
  // column, when present, is read defensively in assembleCatalog.
  const { data: productRows, error: productError } = await serviceClient
    .from('products')
    .select('*')
    .in('id', uniqueIds);
  if (productError) throw productError;

  const { data: optionRows, error: optionError } = await serviceClient
    .from('product_options')
    .select('id, product_id, name, required, selection_type, sort_order')
    .in('product_id', uniqueIds);
  if (optionError) throw optionError;

  const optionIds = (optionRows ?? []).map((o) => o.id as string);
  let choiceRows: RawChoice[] = [];
  if (optionIds.length > 0) {
    const { data, error: choiceError } = await serviceClient
      .from('product_option_choices')
      .select('option_id, name, price_adjustment, sort_order')
      .in('option_id', optionIds);
    if (choiceError) throw choiceError;
    choiceRows = (data ?? []) as RawChoice[];
  }

  return assembleCatalog(
    (productRows ?? []) as RawProduct[],
    (optionRows ?? []) as RawOption[],
    choiceRows,
  );
}

/** Load the catalog for a request's items, then rebuild + price them. */
export async function buildTrustedOrderFromRequest(
  serviceClient: SupabaseClient,
  items: OrderRequestItem[],
): Promise<{ orderItems: TrustedOrderLine[]; total: number }> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new UnpriceableItemError('Order has no items');
  }

  const productIds = items
    .map((item) => item?.menuItem?.id ?? item?.product_id ?? null)
    .filter((id): id is string => typeof id === 'string' && !!id);

  const catalog = await fetchCatalog(serviceClient, productIds);
  return buildTrustedOrder(items, catalog);
}
