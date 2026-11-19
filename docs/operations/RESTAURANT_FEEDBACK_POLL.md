# Restaurant WhatsApp feedback poll: staff canary only

During the two-hour canary, a fresh manual ⭐ reaction made from the explicitly authorized
Restaurant WhatsApp account on an exactly linked order message **in the guest's
direct chat with the restaurant** sends one single-choice poll only if the chat
matches the single explicitly approved staff destination:

> How was your visit to Coconut Beach?

The choices are one to five stars. This is deliberately separate from the
status emojis and their mirroring. Stars on a Kitchen copy, group chats,
personal accounts, bare order-number guesses, API-set reactions, old callbacks,
and ambiguous message bindings do not send. The ⭐ is a deliberate staff action;
there is no order-status gate or automatic send at completion/payment. There are
no replay or bulk operations. The one vote-based reply is the 5-star review
follow-up below.

## Activation checklist

1. Independently review the narrow code/SQL diff against the current production
   source. Recheck the alias and exact existing Restaurant channel and sender
   before any production change.
2. Deploy the additive service-only poll-attempt table and RPC. Before enabling
   sends, confirm RLS and role grants, no row writes from invalid inputs, and that
   ordinary orders and status handling still work.
3. Preview or stage the app with the poll disabled. Use mocks or a confirmed
   controlled staff recipient for positive end-to-end checks; no real guest test.
   The app uses the existing restaurant-specific Whapi channel and verifies
   credentials against its configured identity before every send. Never use the
   lodging account or personal accounts. No new token, provider connection, cron,
   or webhook route is needed.
4. For the staff-only canary, set `RESTAURANT_FEEDBACK_POLL_ENABLED=true`,
   `RESTAURANT_FEEDBACK_POLL_MODE=staff-canary`, and
   `RESTAURANT_FEEDBACK_POLL_CANARY_DM` to the one verified and owner-approved
   staff WhatsApp JID (a direct `@s.whatsapp.net` chat, not the Restaurant
   account itself or a guest). Set `RESTAURANT_FEEDBACK_POLL_LIVE_AFTER` to a
   fresh UTC activation instant (ISO ending in Z); the gate expires two hours
   later. Keep the existing order rollout cutoff unchanged. Do not log the
   configured JID. Verify source/config on the live alias before the canary.
5. On the approved staff handset, place one genuine controlled order through
   the normal walk-in/table flow after coordinating with the kitchen. Use the
   confirmation's **Send Order via WhatsApp** path from that same account and
   send the full prefilled text unchanged. On the Restaurant account, verify it
   arrived in that staff member's one-to-one chat. React ⭐ from Restaurant on
   that exact order message, not the Kitchen copy. Confirm the native poll in
   the staff DM and the successful attempt in the ledger. Do not send a
   manual fallback if automatic delivery may already have sent the order.
   Runtime warns with counts only, never guest identities, tokens, or payloads.

There is no all-guest mode in this candidate; a later reviewed change is
required to enable that behavior.

The authenticated callback finishes existing status/binding and acknowledges
Whapi before its poll worker begins. The worker is capped at five concurrent
attempts and a 20-second after-response budget. If the background worker cannot
start or the budget expires, it skips unstarted work rather than blocking the
restaurant webhook or replaying old callbacks. A fresh staff action can be
considered only if there is no existing reservation for that order.

The send reservation is durable and one-per-order; an attempted, unconfirmed, or
interrupted send cannot be retried automatically. Reconcile against the exact
WhatsApp history if an attempt is uncertain; do not clear records or resend to
make a console indicator look successful. Poll-off or promote the previously
verified replacement deployment for rollback; leave the attempt ledger in place
to retain deduplication. No rollback step uses Fly.io.

## 5-star review follow-up (separate flag)

When the guest picks ⭐⭐⭐⭐⭐ on the poll, they get one message with the Google
review link (text in `src/server/restaurantFeedbackReviewReply.ts`). Enable with
`RESTAURANT_FEEDBACK_REVIEW_REPLY_ENABLED=true`; it reuses the poll's
`RESTAURANT_FEEDBACK_POLL_MODE=staff-canary` and `..._CANARY_DM`, so it can only
reply to that one staff DM until the poll itself is widened.

- The vote event only says *a* vote happened. The handler re-reads the poll from
  Whapi (`GET /messages/{id}`) and replies only if the guest is in the 5-star
  voter list at that moment.
- One reply per order (`restaurant_feedback_review_replies`, claimed via
  `restaurant_claim_feedback_review_reply_v1`), only for polls in the attempt
  ledger with status `sent`, to the same chat, within 7 days. Never retried.
- Votes older than 10 minutes are ignored. Webhook must deliver Messages POST
  and/or PATCH events (both shapes are handled).
- Log tag: `[restaurant-review-reply]` with outcome counts only.
- Policy note: Google prohibits selectively soliciting positive reviews. Asking
  only 5-star voters is that pattern; changing `REVIEW_REPLY_OPTION` logic to any
  vote is the compliant variant.
