import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabaseTypes';
import { createSupabaseGuestStore } from './guestRegistrationStore';

type QueryResult = { data?: unknown; count?: number; error?: unknown };

/**
 * Minimal chainable Supabase query-builder mock. Every builder method records
 * its name and returns the same thenable builder, which resolves to `result`
 * when awaited. `maybeSingle` throws so a regression to it is caught.
 */
function createMockClient(result: QueryResult) {
  const methods: string[] = [];
  const builder: Record<string, unknown> = {};
  const passthrough = (name: string) => (..._args: unknown[]) => {
    methods.push(name);
    return builder;
  };

  builder.select = passthrough('select');
  builder.eq = passthrough('eq');
  builder.order = passthrough('order');
  builder.limit = passthrough('limit');
  builder.insert = passthrough('insert');
  builder.single = () => {
    methods.push('single');
    return Promise.resolve(result);
  };
  builder.maybeSingle = () => {
    methods.push('maybeSingle');
    throw new Error('maybeSingle must not be used: (stay_id, first_name) is not unique');
  };
  // Make the builder awaitable (PostgREST builders are thenables).
  builder.then = (resolve: (v: QueryResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);

  const client = {
    from: (_table: string) => {
      methods.push('from');
      return builder;
    },
  } as unknown as SupabaseClient<Database>;

  return { client, methods };
}

describe('createSupabaseGuestStore.findByStayAndName', () => {
  it('does not error on multiple historical rows and returns the first deterministic row', async () => {
    // Two rows share (stay_id, first_name); the query orders + limits to 1.
    const { client, methods } = createMockClient({
      data: [
        { id: 'row-oldest', stay_id: 'A9_SZEMES', first_name: 'Bouke' },
        { id: 'row-newer', stay_id: 'A9_SZEMES', first_name: 'Bouke' },
      ],
      error: null,
    });

    const store = createSupabaseGuestStore(client);
    const result = await store.findByStayAndName('A9_SZEMES', 'Bouke');

    expect(result).toEqual({ id: 'row-oldest', stay_id: 'A9_SZEMES', first_name: 'Bouke' });
    // Proves the fix: deterministic ordering + limit, and NOT .maybeSingle().
    expect(methods).toContain('order');
    expect(methods).toContain('limit');
    expect(methods).not.toContain('maybeSingle');
  });

  it('returns null when no rows match', async () => {
    const { client } = createMockClient({ data: [], error: null });
    const store = createSupabaseGuestStore(client);
    expect(await store.findByStayAndName('NOPE', 'Ghost')).toBeNull();
  });

  it('propagates a query error', async () => {
    const { client } = createMockClient({ data: null, error: { message: 'boom' } });
    const store = createSupabaseGuestStore(client);
    await expect(store.findByStayAndName('A9', 'Bouke')).rejects.toBeTruthy();
  });
});
