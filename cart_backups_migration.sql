-- Create cart_backups table
create table if not exists cart_backups (
  guest_user_id uuid primary key,
  cart          jsonb     not null,
  updated_at    timestamptz not null default now()
);

-- Enable Row Level Security
alter table cart_backups enable row level security;

-- Option 1: Policy for when NO Supabase Auth is used (open to anon)
-- Uncomment the following policy if you are NOT using Supabase Auth for guests:
/*
create policy "anon full access"
  on cart_backups
  for all
  using ( true )
  with check ( true );
*/

-- Option 2: Policy for when Supabase Auth IS used for guests
-- Uncomment the following policy if you ARE using Supabase Auth for guests:
/*
create policy "guest can manage own backup"
  on cart_backups
  for all
  using ( guest_user_id = auth.uid() )
  with check ( guest_user_id = auth.uid() );
*/

-- Note: Uncomment only ONE of the above policies based on your authentication setup
