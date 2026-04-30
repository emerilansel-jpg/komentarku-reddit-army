-- R45: Fix withdrawal_requests RLS policies
-- Ensure INSERT policy exists for authenticated users
-- Add anon SELECT policy so Apps Script (anon key) can sync to GSheets

-- Safe recreation of INSERT policy (fixes "no rows in DB" bug)
DROP POLICY IF EXISTS "Army members can insert own withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Army members can insert own withdrawal requests"
  ON withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Safe recreation of SELECT policy (authenticated -- view own)
DROP POLICY IF EXISTS "Army members can view own withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Army members can view own withdrawal requests"
  ON withdrawal_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- NEW: Anon SELECT so Apps Script anon key can read all rows for GSheets sync
DROP POLICY IF EXISTS "Anon can read all withdrawal_requests" ON withdrawal_requests;
CREATE POLICY "Anon can read all withdrawal_requests"
  ON withdrawal_requests FOR SELECT TO anon
  USING (true);
