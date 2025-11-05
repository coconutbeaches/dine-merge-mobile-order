// supabase/functions/verify_whatsapp/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
Deno.serve(async ()=>{
  try {
    // Get all future guests with phone numbers and not yet verified
    const today = new Date().toISOString().split("T")[0];
    const { data: guests, error } = await supabase.from("incoming_guests").select("id, phone_e164").gte("check_in_date", today).or("whatsapp_verified.is.null,whatsapp_verified.eq.false");
    if (error) throw error;
    const results = [];
    for (const guest of guests ?? []){
      if (!guest.phone_e164) continue;
      const res = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          blocking: "wait",
          contacts: [
            guest.phone_e164
          ],
          force_check: true
        })
      });
      const data = await res.json();
      const isValid = data?.contacts?.[0]?.status === "valid" && !!data?.contacts?.[0]?.wa_id;
      await supabase.from("incoming_guests").update({
        whatsapp_verified: isValid
      }).eq("id", guest.id);
      results.push({
        id: guest.id,
        phone: guest.phone_e164,
        valid: isValid,
        response: data
      });
    }
    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
