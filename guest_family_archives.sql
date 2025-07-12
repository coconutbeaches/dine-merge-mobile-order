-- Create lightweight table to track archived guest families
-- This avoids mutating historical orders rows
CREATE TABLE IF NOT EXISTS public.guest_family_archives (
  stay_id text PRIMARY KEY,
  archived_at timestamptz DEFAULT now()
);

-- Enable Row Level Security for the table
ALTER TABLE public.guest_family_archives ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON public.guest_family_archives TO authenticated;

-- Note: Deleting a row will be the "un-archive" action, keeping the table tiny
