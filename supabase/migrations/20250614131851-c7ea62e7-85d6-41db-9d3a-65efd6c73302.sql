
-- Enable Row Level Security on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert into profiles (necessary for admin guest creation)
CREATE POLICY "Authenticated can insert profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow all users to select profiles (needed for dashboard/customer lookup)
CREATE POLICY "Authenticated can select profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
