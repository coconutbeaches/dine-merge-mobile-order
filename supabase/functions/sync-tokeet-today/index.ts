import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.224.0/csv/mod.ts";

type CsvRow = Record<string, string>;

type SanitizedGuest = {
  full: string;
  first: string;
  last: string;
};

type NormalizationSample = {
  rental: string;
  guestBefore: string;
  guestAfter: string;
  stayId: string;
};

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    console.log("🔍 Fetching latest Tokeet CSV…");
    const resp = await fetch(
      "https://datafeed.tokeet.com/v1/inquiry/1569940530.428/01985505-7541-7420-b8dd-15398648e054-tk2/01985505-7541-717b-93bb-eabd47459777-tk2/1753773077?booked=1&start=10-04-2025&end=10-04-2026",
    );
    if (!resp.ok) throw new Error(`Tokeet fetch failed (${resp.status})`);

    const csvText = await resp.text();
    const BOM = String.fromCharCode(0xfeff);
    const sanitized = csvText.replace(new RegExp(`^${BOM}`), "").replace(/\r\n/g, "\n").trim();
    const rows = parse(sanitized, {
      skipFirstRow: true,
      strip: true,
    }) as CsvRow[];
    console.log(`✅ Parsed ${rows.length} rows`);

    // -------- Helper Functions --------
    const RENTAL_CODE_MAP = [
      { regex: /Beach House/i, code: "BH" },
      { regex: /Double House/i, code: "DH" },
      { regex: /Jungle House/i, code: "JH" },
      { regex: /New House/i, code: "NH" },
      { regex: /Sea\s*View\s*2\s*Bedroom/i, code: "B" },
    ];

    function deriveRentalCode(rental: string): string {
      if (!rental) return "UNK";
      const clean = rental
        .replace(/·/g, " ")
        .replace(/[()]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const unitMatch = clean.match(/\b([AB]\d{1,2})\b/i);
      if (unitMatch) return unitMatch[1].toUpperCase();
      for (const { regex, code } of RENTAL_CODE_MAP) {
        if (regex.test(clean)) return code;
      }
      const fallback = clean.split(" ")[0]?.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      return fallback || "UNK";
    }

    function sanitizeGuestName(rawName: string): SanitizedGuest {
      const normalized = (rawName ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!normalized) {
        return { full: "Guest", first: "Guest", last: "Guest" };
      }
      const parts = normalized.split(" ");
      const first = parts[0] || "Guest";
      const last = parts.length > 1 ? parts[parts.length - 1] : first;
      return { full: normalized, first, last };
    }

    function normalizeStayId(rentalUnit: string, guest: SanitizedGuest): string {
      const shortCode = deriveRentalCode(rentalUnit);
      const lastName = guest.last || "Guest";
      return `${shortCode}_${lastName}`;
    }

    function parseNumberSafe(value: unknown) {
      if (!value) return null;
      const num = parseFloat(value.toString().replace(/[^\d.-]/g, ""));
      return Number.isNaN(num) ? null : num;
    }

    // -------- Transform Rows --------
    const normalizationSamples: NormalizationSample[] = [];

    const payload = rows.map((row: CsvRow, index: number) => {
      const rentalUnit = row["Rental"] || "";
      const guestRaw = row["Name"] || "";
      const guest = sanitizeGuestName(guestRaw);
      const stayId = normalizeStayId(rentalUnit, guest);

      if (index < 5) {
        normalizationSamples.push({
          rental: rentalUnit,
          guestBefore: guestRaw,
          guestAfter: guest.full,
          stayId,
        });
      }

      return {
        stay_id: stayId,
        booking_channel: row["Source"] || "tokeet",
        rental_unit: rentalUnit,
        booking_status: row["Booking Status"] || null,
        check_in_date: row["Arrive"] || null,
        check_out_date: row["Depart"] || null,
        first_name: guest.first || null,
        last_name: guest.last || null,
        email: row["Email"] || null,
        phone_e164: row["Telephone"] || null,
        adults: parseNumberSafe(row["Adults"]),
        children: parseNumberSafe(row["Children"]),
        currency: row["Currency"] || null,
        total_cost: parseNumberSafe(row["Total Cost"]),
        base_rate: parseNumberSafe(row["Base Rate"]),
        booking_id: row["Booking ID"] || null,
        inquiry_id: row["Inquiry ID"] || null,
        source: "tokeet_upsert",
        status: "pending_review",
        row_type: "booking",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    if (normalizationSamples.length) {
      console.log("🧪 stay_id normalization examples:");
      for (const sample of normalizationSamples) {
        console.log(
          `   before: rental="${sample.rental}" guest="${sample.guestBefore}" | after: stay_id="${sample.stayId}" (sanitized guest="${sample.guestAfter}")`,
        );
      }
    }

    // -------- Upsert --------
    const { error: upsertError } = await supabase.from("incoming_guests").upsert(payload, {
      onConflict: "booking_id,row_type",
    });
    if (upsertError) throw upsertError;

    console.log(`🚀 Upserted ${payload.length} bookings successfully`);
    return new Response(
      JSON.stringify({
        success: true,
        count: payload.length,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(
      JSON.stringify({
        error: (err as Error).message,
        details: (err as Error).stack,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});
