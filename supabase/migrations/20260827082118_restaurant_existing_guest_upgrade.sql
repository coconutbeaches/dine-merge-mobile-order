-- A requested upgrade is NOT a verified binding. Only the upgrade completion
-- endpoint may populate bound_* after checking the completed WhatsApp identity.
alter table public.restaurant_guest_handshakes
  add column upgrade_guest_user_id uuid null,
  add column upgrade_guest_stay_id text null,
  add constraint restaurant_handshake_upgrade_target_pair check (
    (upgrade_guest_user_id is null and upgrade_guest_stay_id is null)
    or (upgrade_guest_user_id is not null and upgrade_guest_stay_id is not null and length(upgrade_guest_stay_id) > 0)
  );

comment on column public.restaurant_guest_handshakes.upgrade_guest_user_id is
  'Unverified existing-account upgrade target, never authorization. Intentionally retained if the guest is deleted so an upgrade cannot become new registration.';
comment on column public.restaurant_guest_handshakes.upgrade_guest_stay_id is
  'Original stay id of the upgrade target. Completion must preserve this id and match historical WhatsApp evidence before setting bound_*.';
