import { after, NextResponse, type NextRequest } from 'next/server';
import { reactionObservation } from '@/server/restaurantReactionObservation';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  authenticateRestaurantWebhook,
  createSupabaseRestaurantHandshakeStore,
  processRestaurantWhapiPayload,
  RESTAURANT_WEBHOOK_TOKEN_HEADER,
} from '@/server/restaurantWhapiWebhook';

import { createOrderWebhookStore, orderWebhookConfig, processRestaurantOrders, type FeedbackReaction } from '@/server/restaurantOrderWebhook';

import { createRestaurantFeedbackHandler, runRestaurantFeedbackBatch } from '@/server/restaurantFeedbackPoll';
import { collectRestaurantHours, createRestaurantHoursHandler, runRestaurantHoursBatch } from '@/server/restaurantHoursFaq';

export const runtime = 'nodejs';

const MAX_WEBHOOK_BYTES = 256 * 1024;

async function readBoundedBody(request: NextRequest): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_WEBHOOK_BYTES) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

export async function POST(request: NextRequest) {
  const expectedChannelId = process.env.RESTAURANT_WHAPI_CHANNEL_ID?.trim() ?? '';
  const restaurantToken = process.env.RESTAURANT_WHAPI_TOKEN?.trim() ?? '';
  const webhookTokens = process.env.WHAPI_WEBHOOK_TOKENS?.trim() ?? '';
  if (!expectedChannelId || !restaurantToken || !webhookTokens) {
    console.error('[restaurant-whapi-webhook] configuration_unavailable');
    return NextResponse.json({ status: 'retry' }, { status: 503 });
  }
  if (!authenticateRestaurantWebhook(request.headers.get(RESTAURANT_WEBHOOK_TOKEN_HEADER), webhookTokens)) {
    console.warn('[restaurant-whapi-webhook] authentication_rejected');
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }
  let payload: unknown;
  try {
    const rawBody = await readBoundedBody(request);
    if (rawBody === null) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  if (process.env.RESTAURANT_REACTION_OBSERVE === 'true') {
    const observation = reactionObservation(payload);
    // warn survives the existing production removeConsole setting.
    if (observation) console.warn('[restaurant-reaction-shape]', JSON.stringify(observation));
  }
  const client = createServiceRoleClient();
  if (!client) return NextResponse.json({ status: 'retry' }, { status: 503 });
  const result = await processRestaurantWhapiPayload(
    createSupabaseRestaurantHandshakeStore(client),
    payload,
    { expectedChannelId, restaurantToken, webhookTokens },
  );
  // Keep the existing handshake path unchanged. New order behavior is default-off.
  const handleFeedback = createRestaurantFeedbackHandler(client, process.env);
  const feedbackReactions: FeedbackReaction[] = [];
  const orders = await processRestaurantOrders(
    createOrderWebhookStore(client), payload, orderWebhookConfig(process.env), true, new Date(),
    handleFeedback ? reaction => { feedbackReactions.push(reaction); } : undefined,
  );
  // The parser only collects approved actions; no poll or poll database calls
  // can block a binding, status update, or the provider's response.
  const handleHours = createRestaurantHoursHandler(client, process.env);
  const hourQuestions = handleHours ? collectRestaurantHours(payload) : [];
  if ((handleFeedback && feedbackReactions.length) || (handleHours && hourQuestions.length)) {
    try {
      after(async () => {
        const budget = AbortSignal.timeout(20_000);
        // Run the lanes in parallel to avoid delaying the already bounded poll lane.
        await Promise.allSettled([
          handleFeedback && feedbackReactions.length ? runRestaurantFeedbackBatch(feedbackReactions, handleFeedback, budget)
            .then(outcomes => console.warn('[restaurant-feedback]', outcomes)) : undefined,
          handleHours && hourQuestions.length ? runRestaurantHoursBatch(hourQuestions, handleHours, budget)
            .then(outcomes => console.warn('[restaurant-hours-faq]', outcomes)) : undefined,
        ]);
      });
    } catch {
      console.warn('[restaurant-whapi-webhook] background_registration_unavailable');
    }
  }
  const httpStatus = result.httpStatus === 503 || orders.httpStatus === 503 ? 503 : 200;
  const counts = [...result.outcomes, ...orders.outcomes].reduce<Record<string, number>>((summary, outcome) => {
    summary[outcome] = (summary[outcome] ?? 0) + 1;
    return summary;
  }, {});
  console.info('[restaurant-whapi-webhook] processed', { counts });
  return NextResponse.json(
    { status: httpStatus === 200 ? 'ok' : 'retry' },
    { status: httpStatus },
  );
}
