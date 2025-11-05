import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";
import { reactToMessage } from "./utils.ts";

type Message = {
  id: string;
  from?: string;
  text?: { body?: string };
  [key: string]: unknown;
};

type UpdatePayload = {
  whatsapp_valid_number: string;
  whatsapp_verified: boolean;
  updated_at: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Supabase credentials are missing. Updates will fail.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const VERIFY_USAGE = "Usage: /verify [phone] [stay_id]";

/**
 * Handle /verify [phone] [stay_id]
 */
export async function handleVerify(message: Message): Promise<Response> {
  try {
    const text = message?.text?.body?.trim() ?? "";
    const parts = text.split(/\s+/);
    const [, phoneRaw, stayIdRaw] = parts;

    if (!phoneRaw || !stayIdRaw) {
      console.warn("❌ Missing args for /verify");
      return new Response(VERIFY_USAGE, { status: 400 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Supabase environment variables are not configured.");
      return new Response("Server configuration error", { status: 500 });
    }

    const phone = phoneRaw.replace(/[^0-9+]/g, "");
    const stayId = stayIdRaw.trim();

    if (!stayId) {
      return new Response(VERIFY_USAGE, { status: 400 });
    }

    console.log(`🟡 Verifying number ${phone} for stay ${stayId}`);

    const updatePayload: UpdatePayload = {
      whatsapp_valid_number: phone,
      whatsapp_verified: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("incoming_guests")
      .update(updatePayload)
      .eq("stay_id", stayId);

    if (error) {
      console.error("❌ DB error:", error);
      return new Response("Database error", { status: 500 });
    }

    if (message?.id) {
      await reactToMessage(message.id, "✅");
    } else {
      console.warn("Message ID missing; cannot send reaction");
    }
    console.log(`✅ Verified ${phone} for ${stayId}`);

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("❌ handleVerify error:", err);
    return new Response("error", { status: 500 });
  }
}
