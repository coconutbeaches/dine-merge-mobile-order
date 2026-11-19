import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { issueRestaurantOrderLink, verifyRestaurantOrderLink } from './restaurantOrderLink';
import { appendRestaurantOrderRef, restaurantOrderRefFromHash, restaurantOrderRefMatchesId } from '../lib/restaurantWhatsAppMessage';
import { processRestaurantOrders, type OrderWebhookStore } from './restaurantOrderWebhook';
const secret = 'synthetic-restaurant-signing-secret-for-tests';
const now = new Date('2026-11-18T04:00:00Z');
describe('signed creation response to guest message to exact binding', () => {
  it('round trips signed refs without changing readable items or total', async () => {
    const ref = issueRestaurantOrderLink(42, secret);
    expect(ref).toMatch(/^v1\./);
    expect(verifyRestaurantOrderLink(ref,secret,42)).toEqual({version:'v1',orderId:42});
    expect(verifyRestaurantOrderLink(ref,secret,43)).toBeNull();
    expect(verifyRestaurantOrderLink(ref,secret+'wrong')).toBeNull();
    expect(verifyRestaurantOrderLink(ref+'bad',secret)).toBeNull();
    expect(ref).not.toContain(secret);
    expect(restaurantOrderRefFromHash(`#ref=${encodeURIComponent(ref)}`)).toBe(ref);
    expect(restaurantOrderRefMatchesId(ref,42)).toBe(true);
    expect(restaurantOrderRefMatchesId(ref,43)).toBe(false);
    const base = '*Order: #42*\n*Items:*\nRice\n*Total:* THB 100';
    const body = appendRestaurantOrderRef(base, ref);
    expect(body).toBe(`${base}\n\nRef: ${ref}`);
    const store: OrderWebhookStore = { bind: vi.fn(async () => 'bound'), find: vi.fn(), compareAndSet: vi.fn() };
    await processRestaurantOrders(store, { channel_id: 'restaurant', event: { type:'messages',event:'post' }, messages: [{ id:'m1', type:'text',from_me:false,from:'49123456789',chat_id:'49123456789@s.whatsapp.net',timestamp:now.getTime()/1000,text:{body} }] }, {enabled:true,channelId:'restaurant',liveAfter:now.toISOString(),operatorPhones:['66800000001'],signingSecret:secret},true,now);
    expect(store.bind).toHaveBeenCalledWith(42,{ messageId:'m1',chatId:'49123456789@s.whatsapp.net',channelId:'restaurant'},now.toISOString());
  });
  it('preserves legacy numeric display without granting signed authority', () => {
    expect(issueRestaurantOrderLink(42)).toBe('42');
    expect(appendRestaurantOrderRef('order text','42')).toBe('order text');
    expect(restaurantOrderRefMatchesId('42',42)).toBe(true);
  });
  it('requires a configured strong key when signing is requested', () => {
    for (const key of ['', 'short']) expect(() => issueRestaurantOrderLink(42,key)).toThrow();
    expect(issueRestaurantOrderLink(42,` ${secret} `)).toBe(issueRestaurantOrderLink(42,secret));
  });
});
