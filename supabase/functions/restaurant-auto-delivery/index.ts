import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHAPI_TEXT_URL = "https://gate.whapi.cloud/messages/text";
const AUTO_DELIVERY_TABLES = new Set(["6"]);
const RESTAURANT_TOKEN_ENV_NAMES = ["RESTAURANT_WHAPI_TOKEN", "WHAPI_RESTAURANT_TOKEN"];
const EDGE_ADMIN_KEY_NAME = "edge_admin_2026_06";
const EDGE_ADMIN_KEY_FALLBACKS = ["edge_admin"];
const SHORT_HANDSHAKE_REF_RE = /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;
const LEGACY_HANDSHAKE_REF_RE = /^h1\.[A-Za-z0-9_-]{20,80}\.[A-Za-z0-9_-]+$/;
const PENDING_STALE_MS = 90_000;
const HANDSHAKE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

type DeliveryStatus = "pending" | "sent" | "failed" | "uncertain";

type OrderRow = {
  id: number;
  user_id: string | null;
  total_amount: number | string;
  created_at: string;
  customer_name: string | null;
  order_items: unknown;
  table_number: string | null;
  guest_user_id: string | null;
  guest_first_name: string | null;
  stay_id: string | null;
  kitchen_whapi_message_id: string | null;
  kitchen_whapi_channel_id: string | null;
  kitchen_whapi_chat_id: string | null;
  restaurant_auto_delivery_status: DeliveryStatus | null;
  restaurant_auto_delivery_attempted_at: string | null;
  restaurant_auto_delivery_completed_at: string | null;
  restaurant_auto_delivery_error: string | null;
};

type HandshakeRow = {
  id: string;
  table_number: string;
  first_name: string;
  status: string;
  match_kind: string | null;
  whatsapp_chat_id: string | null;
  matched_stay_id: string | null;
  provider_channel_id: string | null;
  completed_at: string | null;
};

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getAdminKey(): string {
  const rawKeys = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}";
  let secretKeys: Record<string, unknown> = {};
  try {
    secretKeys = JSON.parse(rawKeys) as Record<string, unknown>;
  } catch {
    throw new Error("invalid_supabase_secret_keys_json");
  }
  for (const name of [EDGE_ADMIN_KEY_NAME, ...EDGE_ADMIN_KEY_FALLBACKS]) {
    const value = secretKeys[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const legacy = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (legacy) return legacy;
  throw new Error("missing_supabase_admin_key");
}

function createAdminClient() {
  const url = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  if (!url) throw new Error("missing_supabase_url");
  return createClient(url, getAdminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getRestaurantToken(): { token: string; source: string } {
  for (const name of RESTAURANT_TOKEN_ENV_NAMES) {
    const token = (Deno.env.get(name) ?? "").trim();
    if (token) return { token, source: name };
  }
  return { token: "", source: "missing" };
}

function normalizeName(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function extractMessageId(payload: unknown): string | null {
  const keys = ["id", "message_id", "messageId", "msg_id"];
  const visit = (value: unknown, depth: number): string | null => {
    if (!value || depth > 5) return null;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = visit(item, depth + 1);
        if (found) return found;
      }
      return null;
    }
    if (typeof value !== "object") return null;
    const obj = value as Record<string, unknown>;
    for (const key of keys) {
      const candidate = obj[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    for (const nested of Object.values(obj)) {
      const found = visit(nested, depth + 1);
      if (found) return found;
    }
    return null;
  };
  return visit(payload, 0);
}

function optionValues(selectedOptions: unknown): string[] {
  if (!selectedOptions || typeof selectedOptions !== "object" || Array.isArray(selectedOptions)) return [];
  const values: string[] = [];
  for (const raw of Object.values(selectedOptions as Record<string, unknown>)) {
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const text = String(item ?? "").trim();
        if (text) values.push(text);
      }
    } else {
      const text = String(raw ?? "").trim();
      if (text) values.push(text);
    }
  }
  return values;
}

function buildOrderMessage(order: OrderRow): string {
  const rawItems = Array.isArray(order.order_items) ? order.order_items : [];
  const lines = rawItems.map((raw) => {
    const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const menuItem = item.menuItem && typeof item.menuItem === "object"
      ? item.menuItem as Record<string, unknown>
      : {};
    const quantity = Math.max(1, Number(item.quantity ?? 1) || 1);
    const name = String(menuItem.name ?? item.name ?? item.product ?? "Item").trim() || "Item";
    const options = optionValues(item.selectedOptions);
    return `- ${quantity}x ${name}${options.length ? ` (${options.join(", ")})` : ""}`;
  });

  const customerName = String(order.customer_name || order.guest_first_name || "Guest").trim() || "Guest";
  const stayId = String(order.stay_id || "").trim();
  const isWalkIn = stayId.toLocaleLowerCase("en").includes("walkin");
  const displayCustomerName = isWalkIn
    ? `Walkin ${customerName}`
    : `${stayId ? stayId.replace(/_/g, " ") : "Guest"} ${customerName}`;
  const tableNumber = String(order.table_number || "Takeaway");
  const total = `฿${Math.round(Number(order.total_amount) || 0)}`;

  return `${tableNumber} // ${displayCustomerName}\n*Order: #${order.id}*\n\n*Items:*\n${lines.join("\n")}\n\n*Total:* ${total}`;
}

async function updateDeliveryState(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: number,
  status: DeliveryStatus,
  errorCode: string | null,
): Promise<void> {
  const payload: Record<string, unknown> = {
    restaurant_auto_delivery_status: status,
    restaurant_auto_delivery_error: errorCode,
  };
  if (status === "sent") payload.restaurant_auto_delivery_completed_at = new Date().toISOString();
  const { error } = await supabase.from("orders").update(payload).eq("id", orderId);
  if (error) console.error("[RESTAURANT_AUTO_DELIVERY_STATE_ERROR] order=%s status=%s err=%s", orderId, status, error.message);
}

async function readOrder(supabase: ReturnType<typeof createAdminClient>, orderId: number): Promise<OrderRow | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("id,user_id,total_amount,created_at,customer_name,order_items,table_number,guest_user_id,guest_first_name,stay_id,kitchen_whapi_message_id,kitchen_whapi_channel_id,kitchen_whapi_chat_id,restaurant_auto_delivery_status,restaurant_auto_delivery_attempted_at,restaurant_auto_delivery_completed_at,restaurant_auto_delivery_error")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`order_lookup_failed:${error.message}`);
  return (data as OrderRow | null) ?? null;
}

async function readAndValidateHandshake(
  supabase: ReturnType<typeof createAdminClient>,
  handshakeRef: string,
  order: OrderRow,
): Promise<{ handshake: HandshakeRow | null; code: string | null }> {
  const refHash = await sha256Hex(handshakeRef);
  const { data: handshakeData, error: handshakeError } = await supabase
    .from("restaurant_guest_handshakes")
    .select("id,table_number,first_name,status,match_kind,whatsapp_chat_id,matched_stay_id,provider_channel_id,completed_at")
    .eq("ref_hash", refHash)
    .maybeSingle();

  if (handshakeError || !handshakeData) {
    return { handshake: null, code: "handshake_not_found" };
  }

  const handshake = handshakeData as HandshakeRow;
  const completedAt = handshake.completed_at ? new Date(handshake.completed_at).getTime() : 0;
  const orderCreatedAt = new Date(order.created_at).getTime();
  const completedTooOld = !completedAt || Date.now() - completedAt > HANDSHAKE_MAX_AGE_MS;
  const completedAfterOrder = completedAt > orderCreatedAt + 5 * 60 * 1000;
  const orderName = normalizeName(order.guest_first_name || order.customer_name);
  const handshakeName = normalizeName(handshake.first_name);
  const hotelMismatch = handshake.match_kind === "hotel" && normalizeName(handshake.matched_stay_id) !== normalizeName(order.stay_id);
  const nameMismatch = Boolean(orderName && handshakeName && orderName !== handshakeName);

  if (
    handshake.status !== "completed" ||
    handshake.table_number !== String(order.table_number) ||
    !handshake.whatsapp_chat_id ||
    !handshake.provider_channel_id ||
    completedTooOld ||
    completedAfterOrder ||
    hotelMismatch ||
    nameMismatch
  ) {
    return { handshake: null, code: "handshake_order_mismatch" };
  }

  return { handshake, code: null };
}

async function sendWhapiText(token: string, to: string, body: string): Promise<{
  ok: boolean;
  status: number;
  messageId: string | null;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(WHAPI_TEXT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, body }),
      signal: controller.signal,
    });
    const responseText = await response.text();
    let parsed: unknown = null;
    try {
      parsed = responseText ? JSON.parse(responseText) : null;
    } catch {
      parsed = null;
    }
    return { ok: response.ok, status: response.status, messageId: extractMessageId(parsed) };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const orderId = Number(body.order_id);
  const handshakeRef = String(body.handshake_ref ?? "").trim();
  if (!Number.isSafeInteger(orderId) || orderId <= 0) return json({ error: "invalid_order_id" }, 400);
  if (!SHORT_HANDSHAKE_REF_RE.test(handshakeRef) && !LEGACY_HANDSHAKE_REF_RE.test(handshakeRef)) {
    return json({ status: "failed", code: "invalid_handshake_ref", safe_manual_fallback: true }, 200);
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (error) {
    console.error("[RESTAURANT_AUTO_DELIVERY_CONFIG_ERROR] %s", error instanceof Error ? error.message : String(error));
    return json({ status: "failed", code: "service_unavailable", safe_manual_fallback: true }, 200);
  }

  let order: OrderRow | null;
  try {
    order = await readOrder(supabase, orderId);
  } catch {
    console.error("[RESTAURANT_AUTO_DELIVERY_ORDER_ERROR] order=%s", orderId);
    return json({ status: "uncertain", code: "order_lookup_error", safe_manual_fallback: false }, 200);
  }
  if (!order) return json({ status: "failed", code: "order_not_found", safe_manual_fallback: true }, 200);
  if (!AUTO_DELIVERY_TABLES.has(String(order.table_number ?? "").trim())) {
    return json({ status: "failed", code: "table_not_enabled", safe_manual_fallback: true }, 200);
  }

  if (String(order.kitchen_whapi_message_id ?? "").trim()) {
    if (order.restaurant_auto_delivery_status !== "sent") {
      await updateDeliveryState(supabase, orderId, "sent", null);
    }
    return json({ status: "sent", message_id: order.kitchen_whapi_message_id, deduped: true });
  }

  if (order.restaurant_auto_delivery_status === "failed") {
    return json({ status: "failed", code: order.restaurant_auto_delivery_error || "previous_explicit_failure", safe_manual_fallback: true });
  }
  if (order.restaurant_auto_delivery_status === "uncertain") {
    return json({ status: "uncertain", code: order.restaurant_auto_delivery_error || "previous_uncertain_result", safe_manual_fallback: false });
  }
  if (order.restaurant_auto_delivery_status === "pending") {
    const attemptedAt = order.restaurant_auto_delivery_attempted_at
      ? new Date(order.restaurant_auto_delivery_attempted_at).getTime()
      : 0;
    if (attemptedAt && Date.now() - attemptedAt > PENDING_STALE_MS) {
      await updateDeliveryState(supabase, orderId, "uncertain", "stale_pending_attempt");
      return json({ status: "uncertain", code: "stale_pending_attempt", safe_manual_fallback: false });
    }
    return json({ status: "pending", safe_manual_fallback: false });
  }

  // Validate the exact raw handshake before mutating the order. This prevents
  // a guessed order number plus a random well-formed ref from forcing a Table 6
  // order into fallback mode.
  const handshakeResult = await readAndValidateHandshake(supabase, handshakeRef, order);
  if (!handshakeResult.handshake) {
    return json({
      status: "failed",
      code: handshakeResult.code || "handshake_order_mismatch",
      safe_manual_fallback: true,
    });
  }
  const handshake = handshakeResult.handshake;

  const tokenInfo = getRestaurantToken();
  if (!tokenInfo.token) {
    const { data: failedClaim } = await supabase
      .from("orders")
      .update({
        restaurant_auto_delivery_status: "failed",
        restaurant_auto_delivery_attempted_at: new Date().toISOString(),
        restaurant_auto_delivery_error: "missing_restaurant_whapi_token",
      })
      .eq("id", orderId)
      .is("restaurant_auto_delivery_status", null)
      .select("id");
    if (failedClaim && failedClaim.length > 0) {
      return json({ status: "failed", code: "restaurant_channel_unavailable", safe_manual_fallback: true });
    }
    const current = await readOrder(supabase, orderId).catch(() => null);
    if (current?.kitchen_whapi_message_id) return json({ status: "sent", message_id: current.kitchen_whapi_message_id, deduped: true });
    return json({ status: current?.restaurant_auto_delivery_status || "uncertain", safe_manual_fallback: current?.restaurant_auto_delivery_status === "failed" });
  }

  const attemptedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("orders")
    .update({
      restaurant_auto_delivery_status: "pending",
      restaurant_auto_delivery_attempted_at: attemptedAt,
      restaurant_auto_delivery_error: null,
    })
    .eq("id", orderId)
    .is("restaurant_auto_delivery_status", null)
    .select("id");

  if (claimError) {
    console.error("[RESTAURANT_AUTO_DELIVERY_CLAIM_ERROR] order=%s err=%s", orderId, claimError.message);
    return json({ status: "uncertain", code: "claim_failed", safe_manual_fallback: false });
  }
  if (!claimed || claimed.length === 0) {
    const current = await readOrder(supabase, orderId).catch(() => null);
    if (current?.kitchen_whapi_message_id) return json({ status: "sent", message_id: current.kitchen_whapi_message_id, deduped: true });
    return json({ status: current?.restaurant_auto_delivery_status || "pending", safe_manual_fallback: current?.restaurant_auto_delivery_status === "failed" });
  }

  const message = buildOrderMessage(order);
  let sent: { ok: boolean; status: number; messageId: string | null };
  try {
    sent = await sendWhapiText(tokenInfo.token, handshake.whatsapp_chat_id!, message);
  } catch {
    console.error("[RESTAURANT_AUTO_DELIVERY_UNCERTAIN] order=%s reason=network_or_timeout", orderId);
    await updateDeliveryState(supabase, orderId, "uncertain", "whapi_network_or_timeout");
    return json({ status: "uncertain", code: "whapi_network_or_timeout", safe_manual_fallback: false });
  }

  if (!sent.ok) {
    const status: DeliveryStatus = sent.status >= 500 ? "uncertain" : "failed";
    const code = `whapi_http_${sent.status}`;
    await updateDeliveryState(supabase, orderId, status, code);
    return json({ status, code, safe_manual_fallback: status === "failed" });
  }
  if (!sent.messageId) {
    await updateDeliveryState(supabase, orderId, "uncertain", "whapi_success_missing_message_id");
    return json({ status: "uncertain", code: "whapi_success_missing_message_id", safe_manual_fallback: false });
  }

  const completedAtIso = new Date().toISOString();
  const { error: persistError } = await supabase
    .from("orders")
    .update({
      kitchen_whapi_message_id: sent.messageId,
      kitchen_whapi_channel_id: handshake.provider_channel_id,
      kitchen_whapi_chat_id: handshake.whatsapp_chat_id,
      restaurant_auto_delivery_status: "sent",
      restaurant_auto_delivery_completed_at: completedAtIso,
      restaurant_auto_delivery_error: null,
    })
    .eq("id", orderId)
    .eq("restaurant_auto_delivery_status", "pending");

  if (persistError) {
    console.error("[RESTAURANT_AUTO_DELIVERY_UNCERTAIN] order=%s reason=persist_after_send_failed err=%s", orderId, persistError.message);
    await updateDeliveryState(supabase, orderId, "uncertain", "persist_after_send_failed");
    return json({ status: "uncertain", code: "persist_after_send_failed", safe_manual_fallback: false });
  }

  console.log("[RESTAURANT_AUTO_DELIVERY_SENT] order=%s table=%s message=%s token_source=%s", orderId, order.table_number, sent.messageId, tokenInfo.source);
  return json({ status: "sent", message_id: sent.messageId, safe_manual_fallback: false });
});
