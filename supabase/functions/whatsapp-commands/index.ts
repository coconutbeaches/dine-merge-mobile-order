import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { handleVerify } from "./commands/verify.ts";

type IncomingMessage = {
  id: string;
  from?: string;
  text?: { body?: string };
  [key: string]: unknown;
};

type WebhookPayload = {
  messages?: IncomingMessage[];
  [key: string]: unknown;
};

serve(async (req) => {
  try {
    const body = (await req.json()) as WebhookPayload;
    console.log("Incoming payload:", JSON.stringify(body, null, 2));

    const message = body?.messages?.[0];
    const text = message?.text?.body?.trim();

    if (!text) {
      return new Response("No text body", { status: 400 });
    }

    if (text.startsWith("/verify")) {
      return await handleVerify(message);
    }

    return new Response("Unknown command", { status: 200 });
  } catch (err) {
    console.error("Handler error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
