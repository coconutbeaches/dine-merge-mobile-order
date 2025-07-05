CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id text NOT NULL,
  first_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can create their own records." ON guests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Guests can view their own records." ON guests
  FOR SELECT USING (true);

CREATE POLICY "Guests can update their own records." ON guests
  FOR UPDATE USING (true) WITH CHECK (true);