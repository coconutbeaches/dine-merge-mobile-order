# Signed Restaurant WhatsApp Order Binding

Restaurant WhatsApp cancellation requires a cryptographic binding between the
order created by the dine app and the exact guest message received by the
restaurant WHAPI channel.

## Contract

- Algorithm: HMAC-SHA256.
- Token: `v1.<base64url(order-id)>.<base64url(hmac)>`.
- Signed input: the complete `v1.<payload>` string.
- Secret: `RESTAURANT_ORDER_LINK_SIGNING_SECRET`, server-only and at least 32
  bytes.
- The visible `*Order: #<id>*` line remains for staff, but the chatbot requires
  it to agree with the verified signed ID.
- The browser only transports the issued token in the URL fragment and adds it
  to the WhatsApp message as `Ref: <token>`. It never receives the secret or
  calculates a signature. The fragment is removed from analytics input and is
  not sent in HTTP requests.

The `/api/orders` route validates configuration before inserting, then signs
the final database order ID after the authoritative insert. There is no public
signing endpoint and no unsigned compatibility path.

## Required configuration

Configure the same high-entropy value in both systems, but do not prefix it
with `NEXT_PUBLIC_`:

- dine app / Vercel: `RESTAURANT_ORDER_LINK_SIGNING_SECRET`
- python-whatsapp-chatbot / Fly: `RESTAURANT_ORDER_LINK_SIGNING_SECRET`

The restaurant WHAPI webhook must separately send the existing
`X-Coco-Webhook-Token`. A valid signed reference never substitutes for webhook
authentication.

## Safe rollout order

1. Configure the same signing secret on Vercel and Fly.
2. Deploy the chatbot verifier first. It rejects unsigned messages, and the
   still-missing restaurant webhook header prevents any capture during this
   interval.
3. Deploy the dine app issuer and confirmation-message transport.
4. Configure `GRNLTR-V67TK` to send the existing `X-Coco-Webhook-Token`.
5. Confirm both services are healthy.
6. Create a new disposable non-guest order and send it directly to the
   restaurant WhatsApp number.
7. Verify the exact WHAPI message/chat/channel triplet is stored before any
   reaction.
8. Have an authorized human restaurant operator react ❌ to that exact message.
9. Verify only that order changes to `cancelled`.

Historical unsigned orders and orders with NULL reference fields remain
unsupported. Do not backfill them from guest, phone, stay, time, or amount.
