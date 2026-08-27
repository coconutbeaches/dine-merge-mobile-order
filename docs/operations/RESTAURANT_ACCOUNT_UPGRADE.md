# Existing restaurant account upgrade

Entry point: `/restaurant/upgrade` in the browser already used for ordering.
This is for legacy walk-in accounts with previous exact WhatsApp order links,
including staff ordering on behalf of guests without phones. A staff display
name does not grant any staff/admin permissions.

## Flow and preservation

1. The browser supplies its existing guest/stay IDs and service location.
2. The server loads the canonical account name, requires exactly one historical
   WhatsApp phone/chat/channel identity, and creates an **unbound** pending
   handshake with `upgrade_guest_*` target fields. No guest/order is changed.
3. The person sends the ordinary verification message from that WhatsApp phone.
   The existing authenticated restaurant webhook completes the challenge.
4. The original tab polls the upgrade endpoint. The usual WhatsApp reply link
   also works: registration status reports `upgrade_required`, and the page
   redirects to the upgrade screen before any guest registration.
5. Completion checks the fresh completed challenge against the canonical name,
   unchanged walk-in guest/stay pair and historical phone/chat/channel. Only
   then does a compare-and-set populate the existing `bound_*` fields.
6. The browser refreshes its cached name and v2 handshake proof while retaining
   the same guest/stay IDs. It refuses to replace a different browser account.
   The cart, historical orders, totals and payment statuses are untouched.

The upgrade endpoint never calls order delivery or sends a WhatsApp message.
The person must explicitly send the prefilled verification message. Only a
subsequent order uses the existing automatic-delivery flow.

## Denial and recovery rules

- Missing, incomplete, group/LID-only, multiple phone/channel identities or
  more than 500 linked historical orders require operator assistance. No
  name-only fallback and no invented phone-to-account link are allowed.
- A different WhatsApp phone, hotel match, deleted/reassigned/renamed account,
  expired challenge or conflicting existing binding fails closed.
- `upgrade_guest_*` is not authorization. Normal bind and registration routes
  reject upgrade refs, preventing both a phone-check bypass and a duplicate
  walk-in registration. The target marker remains even if a guest is deleted.
- Repeat completion for the same binding is safe. A lost response can be
  retried; it cannot create a new account or resend an order.
- Browser storage failure must not show upgrade success. Keep the link open
  and retry. Do not clear cookies or log out. Use the original browser if a
  WhatsApp reply opens a different browser or a different logged-in account.
- Existing handshake limits are unchanged: pending verification 15 minutes,
  completion/recovery 120 minutes, automatic order delivery currently 12 hours
  from handshake completion in the bot and Edge Function. This patch does not
  remove that expiry or promise indefinite automatic delivery.

## Rollout

1. Review and apply `20260827082118_restaurant_existing_guest_upgrade.sql` to
   the menu database **before** deploying the app. It adds two nullable columns
   and a paired-target constraint to the existing server-only/RLS-protected
   handshake table; no guest/order backfill or RLS/grant change is required.
2. Deploy the reviewed app commit. No bot deployment, new secrets, provider
   settings changes or broad account migration are needed.
3. Ask Kung to open `/restaurant/upgrade` in her existing ordering browser and
   send the verification message from her normal phone. Do not replay #21591
   or any previous order. Verify that the bound guest ID and stay ID still
   equal her original account and the canonical name remains `KUNG STAFF`.
4. Have Kung place the next real guest order; verify automatic delivery, the
   exact message/chat/channel link, and the visible `KUNG STAFF` label. Only a
   human should send a payment reaction after actual payment.

Rollback: revert the app commit; retain the additive columns and any binding
records. Do not delete accounts, clear browser sessions, unset valid bindings,
or resend old orders as part of rollback.

## Local checks

- `npm run test:coverage -- --run`
- Focused ESLint on the new upgrade route/page/helpers/tests.
- `psql -X -h 127.0.0.1 -p 5432 -U <local-user> -d <empty-disposable-db> -f scripts/test-restaurant-guest-upgrade.sql`
- Browser: missing session, existing account, pending verification, success,
  wrong phone, browser account conflict, retry/reload, no registration or
  order-delivery request during upgrade. Use synthetic local fixtures only.

Server tests execute the real Supabase query builder against an in-memory HTTP
fixture and verify that all writes target handshake rows. They are not proof
of production WhatsApp delivery. A human production canary remains required.

### Implementation verification — 2026-08-27

Base: `9ea6054d635d7fa6aaa728f7af510d92ca5dc86b`, branch
`codex/staff-handshake-upgrade`. Implementation checks below preceded rollout.

- Full Vitest and coverage run: **158 passed / 23 files**. Upgrade server helper
  has 100% line coverage and 90.24% branch coverage; browser-session persistence
  helper has 100% line/branch coverage.
- `npm run build`: pass. The repository configuration skips type validation;
  the separate full `tsc` check remains red due to repository-wide schema/type
  and Deno errors. No diagnostics remain in the changed files.
- Targeted ESLint and `git diff --check`: pass. `npm run lint` cannot run because
  its existing `next lint` command is unsupported by installed Next 16.
- Local PostgreSQL 14 migration rehearsal: pass, transaction rolled back. It
  rejects both half-null target combinations and an empty target stay; existing
  row content, RLS and the unbound state are preserved.
- Local browser: missing-session guidance, start/pending/success, same account
  ID, refreshed `KUNG STAFF` name and v2 proof verified with synthetic data.
- Production-build callback UI verified through the local-only
  `scripts/restaurant-upgrade-browser-fixture.mjs`: `/register/unknown?...`
  reached `/restaurant/upgrade` and displayed `Account upgraded`. The only API
  calls were handshake status and upgrade; no new-guest registration or order
  delivery. Test browser storage contains synthetic account data only. Missing
  Supabase configuration warnings are expected in this credential-free fixture.

To repeat the callback browser check: build, run
`npm run start -- --hostname 127.0.0.1 --port 3109`, then
`node scripts/restaurant-upgrade-browser-fixture.mjs`. Visit
`http://127.0.0.1:3108/register/unknown?table=Take%20Away&handshake=ABCDE-FGHJK`.
Read `http://127.0.0.1:3108/fixture-calls` for the API allowlist assertion.

### Database rollout verification — 2026-08-27

The user authorized the migration and website release. The menu database applied
`restaurant_existing_guest_upgrade` at ledger version `20260827082118`; the
CLI-created local filename was aligned with that actual server-assigned version.
Both nullable columns and the paired-target constraint were read back. RLS stayed
enabled, with no anon/authenticated/PUBLIC table grants. No new security advisor
findings appeared (the existing server-only table intentionally has no policies).
Kung's guest row and all 84 order rows had identical before/after hashes. No
upgrade challenge or binding was created by deployment. The browser upgrade and
next real order still require Kung's own WhatsApp verification and human canary.
