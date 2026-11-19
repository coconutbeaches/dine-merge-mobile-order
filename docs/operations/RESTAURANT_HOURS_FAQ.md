# Restaurant WhatsApp hours FAQ

Separate from restaurant order status and feedback polls. Uses the authenticated
Restaurant Whapi webhook and repeats the live active row 45 from
`public.chatbot_faqs`, exactly as approved, followed by the standard Coco sign-off. It does not infer real-time or
exceptional hours and does not use lodging Volt, groups, old messages, kitchen
requests, menu handshakes, structured orders, quoted replies or complex intents.
No guest message content or chat ID is written to the attempt ledger.

## Gate sequence

1. Independently review against the verified baseline including ⭐ V2. Verify no
   active manual or provider automation is already answering the same hours FAQ.
2. Apply the additive service-only ledger migration, verify RLS and public/anon/
   authenticated role restrictions. Stage the app with the FAQ flag unset.
3. Verify current exact live Restaurant sender/channel and approved FAQ 45.
   Verify Vercel runtime headroom for foreground work plus the shared 20-second
   after-response budget. Then enable `RESTAURANT_HOURS_FAQ_ENABLED=true` only
   in `RESTAURANT_HOURS_FAQ_SCOPE=staff-canary`, with the verified internal test-only
   direct JID in `RESTAURANT_HOURS_FAQ_CANARY_CHAT` and a new ISO-8601 UTC cutoff in
   `RESTAURANT_HOURS_FAQ_LIVE_AFTER`. The gate closes automatically two hours after cutoff. Never test using a guest account.
4. With controlled test identities verify one genuine WhatsApp hours question,
   duplicate webhook, non-hours/order text, actual native forwarding of an
   hours question, and no sends outside the canary. This classifier rejects
   observed/configured forwarding flags; public Whapi webhook docs do not
   guarantee that flags are surfaced. If the native forwarded event cannot be
   distinguished (or source/identity fields are not present), stop and investigate rather than relaxing any checks. Verify the exact reply visually, not merely
   API acceptance.
5. General mode is not implemented by this deploy. Keep this staff-only and
   preserve the attempt ledger. Approved FAQ content is pinned: if row 45 is
   edited, delivery stops until the new exact answer is verified and deliberately
   shipped. No stale fallback.

Rollback is flag off or the previously verified deploy. Leave dedup intact.
A deadline, interrupted attempt, or unclear response never causes automatic
resend; verify directly in the same DM first. Aggregate outcome codes only in
logs. No secret, guest body, message ID or phone number logged.
