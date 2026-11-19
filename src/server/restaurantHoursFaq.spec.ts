import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
vi.mock('server-only', () => ({}));
import { APPROVED_HOURS, collectRestaurantHours, createRestaurantHoursHandler, isRestaurantHoursQuestion, runRestaurantHoursBatch } from './restaurantHoursFaq';

const t = Date.parse('2026-11-19T08:22:00Z'), channel = 'GRNLTR-V67TK', self = '66631457299';
const phone = '66800000002', chat = phone + '@s.whatsapp.net';
const item = { id: 'synthetic-message', chatId: chat, at: t };
const message = { id: item.id, type: 'text', source: 'mobile', timestamp: t / 1000, from_me: false, from: phone, chat_id: chat, text: { body: 'What time do you close today?' } };
const fixture = (m: object = message, p = {}) => ({
  event: { type: 'messages', event: 'post' }, channel_id: channel, messages: [m], ...p,
});
const budget = new AbortController().signal;
const env = { RESTAURANT_HOURS_FAQ_ENABLED: 'true', RESTAURANT_HOURS_FAQ_LIVE_AFTER: '2026-11-19T08:21:00Z', RESTAURANT_HOURS_FAQ_SCOPE: 'staff-canary', RESTAURANT_HOURS_FAQ_CANARY_CHAT: chat, RESTAURANT_WHAPI_TOKEN: 'SYNTHETIC', RESTAURANT_WHAPI_PHONE: self, RESTAURANT_WHAPI_CHANNEL_ID: channel };

describe('only clear English hours questions from inbound direct guests', () => {
  it.each(['Hi, what time do you close today?', 'Opening hours?', 'What are your restaurant hours?', 'When do you open tomorrow?', 'What time is the last order on Saturday?', 'Are you open right now?', 'What time is the kitchen closing today?', 'Is the restaurant open today?', 'What time do you stop taking orders?'])('matches %s', text => expect(isRestaurantHoursQuestion(text)).toBe(true));
  it.each(['Can I have ice?', 'When are you open and is it gluten-free?', 'Close my order', 'Are you serving dinner?', 'I want to complain about your closing time', 'What are the restaurant hours?\nOrder: #123', 'Ref: signedtoken\nHi my name is Joe. Please send me the menu.', 'What time do you close? And can I add fries?', 'Nos horaires?', 'Can I place my order?', 'I just ordered, can you add two more?', 'What time?'])('does not match %s', text => expect(isRestaurantHoursQuestion(text)).toBe(false));

  it('deduplicates identical provider events and rejects conflicting evidence', () => {
    expect(collectRestaurantHours(fixture(message, { messages: [message, message] }))).toEqual([item]);
    expect(collectRestaurantHours(fixture(message, { messages: [message, { ...message, from_me: true }] }))).toEqual([]);
    expect(collectRestaurantHours(fixture(message, { messages: [message, { ...message, timestamp: t / 1000 + 1 }] }))).toEqual([]);
  });
  it.each([
    { from_me: true }, { from_me: undefined }, { source: 'api' }, { source: 'system' }, { source: undefined }, { from: undefined }, { author: '66800000003' },
    { chat_id: '123@g.us' }, { chat_id: '123@lid' }, { is_group: true }, { history: true },
    { forwarded: true }, { context: { is_forwarded: true } }, { text: { ...message.text, forwarding_score: 3 } },
    { quoted_id: 'different' }, { channel_id: 'OTHER' }, { type: 'link_preview' }, { timestamp: '' },
  ])('ignores ambiguous or excluded inbound shape %#', fields => expect(collectRestaurantHours(fixture({ ...message, ...fields }))).toEqual([]));
  it('rejects wrong channel, history, edit and overlarge payloads', () => {
    for (const override of [{ channel_id: 'OTHER' }, { history: true }, { event: { type: 'messages', event: 'patch' } }, { messages: Array(51).fill(message) }]) expect(collectRestaurantHours(fixture(message, override))).toEqual([]);
  });
});

function setup() {
  const read = vi.fn().mockResolvedValue({ data: { id: 45, is_active: true, question: 'What are the restaurant hours?', answer: APPROVED_HOURS } });
  const faq = { select: vi.fn(), eq: vi.fn(), abortSignal: vi.fn(), maybeSingle: read };
  for (const m of [faq.select, faq.eq, faq.abortSignal]) m.mockReturnValue(faq);
  const claim = vi.fn().mockResolvedValue({ data: [{ inbound_message_id: item.id }] });
  const finish = vi.fn().mockResolvedValue({ data: [{ inbound_message_id: item.id }] });
  const finishChain = { abortSignal: finish, select: vi.fn(), eq: vi.fn() };
  finishChain.eq.mockReturnValue(finishChain); finishChain.select.mockReturnValue(finishChain);
  const update = vi.fn().mockReturnValue(finishChain);
  const upsert = vi.fn().mockReturnValue({ select: () => ({ abortSignal: claim }) });
  const from = vi.fn().mockImplementation((table: string) => table === 'chatbot_faqs' ? faq : ({ upsert, update }));
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => String(input).includes('/health')
    ? Response.json({ status: { text: 'AUTH' }, channel_id: channel, user: { id: self } })
    : Response.json({ message: { id: 'accepted', chat_id: chat } }));
  const make = (e: NodeJS.ProcessEnv = env, clock = () => t) => createRestaurantHoursHandler({ from } as unknown as SupabaseClient, e, fetcher, clock);
  return { fetcher, from, read, claim, finish, update, upsert, make };
}
describe('controlled exact answer and at-most-once attempt', () => {
  it('is default-off, rejects wrong account/scope/canary and rejects expired texts', async () => {
    const s = setup();
    expect(s.make({})).toBeUndefined();
    await expect(s.make({ ...env, RESTAURANT_WHAPI_PHONE: '66800000008' })?.(item, budget)).resolves.toBe('hours_invalid_configuration');
    await expect(s.make({ ...env, RESTAURANT_HOURS_FAQ_SCOPE: '' })?.(item, budget)).resolves.toBe('hours_invalid_configuration');
    await expect(s.make()?.({ ...item, chatId: '66800000008@s.whatsapp.net' }, budget)).resolves.toBe('hours_ineligible');
    await expect(s.make()?.({ ...item, at: t - 121_000 }, budget)).resolves.toBe('hours_ineligible');
    expect(s.fetcher).not.toHaveBeenCalled(); expect(s.from).not.toHaveBeenCalled();
  });
  it.each(['general', 'canary', '', ' staff-canary '])('fails closed with invalid scope %s', async scope => {
    const s = setup();
    await expect(s.make({ ...env, RESTAURANT_HOURS_FAQ_SCOPE: scope })?.(item, budget)).resolves.toBe('hours_invalid_configuration');
    expect(s.from).not.toHaveBeenCalled();
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  it.each(['2026-11-19T08:21:00+00:00', '2026-02-30T08:21:00Z', ''])('fails closed with malformed cutoff %s', async cutoff => {
    const s = setup();
    await expect(s.make({ ...env, RESTAURANT_HOURS_FAQ_LIVE_AFTER: cutoff })?.(item, budget)).resolves.toBe('hours_invalid_configuration');
    expect(s.from).not.toHaveBeenCalled();
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  const floor = Date.parse(env.RESTAURANT_HOURS_FAQ_LIVE_AFTER), sunset = floor + 7_200_000;
  it('requires both current time and event at to be inside the canary window', async () => {
    const s = setup();
    for (const [now, at] of [[floor - 1, floor], [floor, floor - 1], [sunset - 1, sunset], [sunset, sunset - 1], [sunset + 1, sunset]]) {
      await expect(s.make(env, () => now)?.({ ...item, at }, budget)).resolves.toBe('hours_ineligible');
    }
    expect(s.from).not.toHaveBeenCalled();
    expect(s.fetcher).not.toHaveBeenCalled();
    await expect(s.make(env, () => floor)?.({ ...item, at: floor }, budget)).resolves.toBe('hours_sent');
  });
  it.each(['faq', 'health', 'claim'])('does not send if the canary expires during %s', async stage => {
    const s = setup();
    let now = sunset - 1;
    const when = <T,>(value: T) => { now = sunset; return Promise.resolve(value); };
    if (stage === 'faq') s.read.mockImplementationOnce(() => when({ data: { id: 45, is_active: true, question: 'What are the restaurant hours?', answer: APPROVED_HOURS } }));
    if (stage === 'health') s.fetcher.mockImplementationOnce(() => when(Response.json({ status: { text: 'AUTH' }, channel_id: channel, user: { id: self } })));
    if (stage === 'claim') s.claim.mockImplementationOnce(() => when({ data: [{ inbound_message_id: item.id }] }));
    await expect(s.make(env, () => now)?.({ ...item, at: now }, budget)).resolves.toBe('hours_expired');
    expect(s.fetcher).toHaveBeenCalledTimes(stage === 'faq' ? 0 : 1);
    expect(s.claim).toHaveBeenCalledTimes(stage === 'claim' ? 1 : 0);
    expect(s.update).toHaveBeenCalledTimes(stage === 'claim' ? 1 : 0);
  });
  it('posts only exact verified approved text to the inbound DM', async () => {
    const s = setup(); await expect(s.make()?.(item, budget)).resolves.toBe('hours_sent');
    expect(s.upsert).toHaveBeenCalledWith({ channel_id: channel, inbound_message_id: item.id }, { onConflict: 'channel_id,inbound_message_id', ignoreDuplicates: true });
    expect(s.fetcher.mock.calls[0][0]).toBe('https://gate.whapi.cloud/health?wakeup=false');
    const [url, init] = s.fetcher.mock.calls[1];
    expect(String(url)).toBe('https://gate.whapi.cloud/messages/text');
    expect(JSON.parse(String(init?.body))).toEqual({ to: chat, body: APPROVED_HOURS + '\n\n- Coco 🤖', no_link_preview: true });
    expect(s.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent', provider_message_id: 'accepted' }));
  });
  it('never sends without exact active approved content and verified sender', async () => {
    const s = setup(); s.read.mockResolvedValueOnce({ data: { id: 45, answer: 'Unapproved' } });
    await expect(s.make()?.(item, budget)).resolves.toBe('hours_faq_not_approved');
    expect(s.fetcher).not.toHaveBeenCalled();
    s.fetcher.mockResolvedValueOnce(Response.json({ status: { text: 'AUTH' }, user: { id: '66926025572' }, channel_id: channel }));
    await expect(s.make()?.(item, budget)).resolves.toBe('hours_sender_unverified');
    expect(s.upsert).not.toHaveBeenCalled();
  });
  it('no second POST after failed/ambiguous delivery and duplicate claim', async () => {
    const s = setup();
    s.fetcher.mockResolvedValueOnce(Response.json({ status: { text: 'AUTH' }, channel_id: channel, user: { id: self } }));
    s.fetcher.mockRejectedValueOnce(new Error('timeout'));
    await expect(s.make()?.(item, budget)).resolves.toBe('hours_uncertain');
    s.claim.mockResolvedValueOnce({ data: [] });
    await expect(s.make()?.(item, budget)).resolves.toBe('hours_duplicate');
    expect(s.fetcher.mock.calls.filter(([u]) => String(u).endsWith('/messages/text'))).toHaveLength(1);
  });
  it('does not treat an acceptance for another chat as a confirmed delivery', async () => {
    const s = setup(); s.fetcher.mockResolvedValueOnce(Response.json({ status: { text: 'AUTH' }, channel_id: channel, user: { id: self } }));
    s.fetcher.mockResolvedValueOnce(Response.json({ message: { id: 'accepted', chat_id: '66800000009@s.whatsapp.net' } }));
    await expect(s.make()?.(item, budget)).resolves.toBe('hours_uncertain');
  });
  it('caps concurrency and drops remaining work on deadline', async () => {
    const signal = new AbortController();
    let release: () => void = () => {};
    const start = new Promise<void>(resolve => { release = resolve; });
    const handle = vi.fn().mockImplementation(async () => { await start; return 'hours_sent'; });
    const pending = runRestaurantHoursBatch([...Array(10)].map((_, i) => ({ ...item, id: 'sample-' + i })), handle, signal.signal);
    expect(handle).toHaveBeenCalledTimes(2);
    signal.abort(); release();
    await expect(pending).resolves.toEqual({ hours_sent: 2, hours_deadline: 8 });
  });
});
