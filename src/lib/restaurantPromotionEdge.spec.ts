// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

// Execute the unchanged production Edge entrypoint, including its real handler,
// lookup and validation. Only Deno's server adapter, database and external HTTP
// transport are replaced. No validator is copied, extracted or mocked.
const source = readFileSync(resolve('supabase/functions/restaurant-auto-delivery/index.ts'), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const GUEST = '11111111-1111-4111-8111-111111111111';
const HOTEL = 'BH_TEST';

async function deliver(changes: Record<string, unknown> = {}) {
  const now = Date.now();
  const order = {
    id: 22, table_number: '6', guest_user_id: GUEST, stay_id: HOTEL,
    guest_first_name: 'Example', customer_name: 'Example',
    created_at: new Date(now).toISOString(), restaurant_auto_delivery_status: null,
    kitchen_whapi_message_id: null,
  };
  const handshake = {
    id: '22222222-2222-4222-8222-222222222222', table_number: '6',
    first_name: 'Example', status: 'completed', match_kind: 'walkin',
    matched_stay_id: null, whatsapp_chat_id: 'synthetic-chat',
    provider_channel_id: 'synthetic-channel', completed_at: new Date(now - 60_000).toISOString(),
    bound_guest_user_id: GUEST, bound_guest_stay_id: HOTEL, ...changes,
  };
  const lookups: string[] = [];
  const createClient = () => ({ from(table: string) {
    lookups.push(table);
    const query = {
      select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: table === 'orders' ? order : handshake, error: null }),
    };
    return query;
  } });
  const transport = vi.fn(async () => new Response(JSON.stringify({ status: 'sent', message_id: 'synthetic-message' }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }));
  let handler: ((request: Request) => Promise<Response>) | undefined;
  runInNewContext(javascript, {
    exports: {},
    require(specifier: string) {
      if (specifier === 'https://deno.land/std@0.168.0/http/server.ts') {
        return { serve(callback: typeof handler) { handler = callback; } };
      }
      if (specifier === 'https://esm.sh/@supabase/supabase-js@2') return { createClient };
      throw new Error(`Unexpected Edge dependency: ${specifier}`);
    },
    Deno: { env: { get(name: string) {
      return ({ SUPABASE_URL: 'https://synthetic.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-key' } as Record<string, string>)[name];
    } } },
    crypto: webcrypto, TextEncoder, Response, Request, AbortController,
    setTimeout, clearTimeout, fetch: transport,
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }, { filename: 'restaurant-auto-delivery.production.js' });
  expect(handler).toBeTypeOf('function');
  const response = await handler!(new Request('https://synthetic.invalid/delivery', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: 22, handshake_ref: 'ABCDE-FGHJK' }),
  }));
  return { payload: await response.json(), transport, lookups };
}

describe('production Edge validation of a promoted walk-in', () => {
  it('accepts historical walk-in evidence with a synchronized hotel binding and reaches delivery', async () => {
    const { payload, transport, lookups } = await deliver();
    expect(payload).toMatchObject({ status: 'sent', message_id: 'synthetic-message' });
    expect(lookups).toEqual(['orders', 'restaurant_guest_handshakes']);
    expect(transport).toHaveBeenCalledOnce();
    const request = transport.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(request[1].body))).toEqual({ order_id: 22, handshake_ref: 'ABCDE-FGHJK' });
  });

  it.each([
    ['different stay', { bound_guest_stay_id: 'A1_OTHER' }, 'guest_whatsapp_binding_mismatch'],
    ['different guest', { bound_guest_user_id: '33333333-3333-4333-8333-333333333333' }, 'guest_whatsapp_binding_mismatch'],
    ['conflicting hotel evidence', { match_kind: 'hotel', matched_stay_id: 'A1_OTHER' }, 'handshake_order_mismatch'],
    ['missing guest binding', { bound_guest_user_id: null }, 'guest_whatsapp_binding_required'],
    ['missing stay binding', { bound_guest_stay_id: null }, 'guest_whatsapp_binding_required'],
    ['incomplete handshake', { status: 'pending' }, 'handshake_order_mismatch'],
    ['missing channel', { provider_channel_id: null }, 'handshake_order_mismatch'],
    ['expired handshake', { completed_at: '2000-01-01T00:00:00Z' }, 'handshake_order_mismatch'],
  ])('rejects %s before delivery', async (_label, changes, code) => {
    const { payload, transport } = await deliver(changes);
    expect(payload).toMatchObject({ status: 'failed', code });
    expect(transport).not.toHaveBeenCalled();
  });
});
