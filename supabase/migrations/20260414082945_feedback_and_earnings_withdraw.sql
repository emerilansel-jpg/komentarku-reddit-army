/*
  # Feedback Table + Earnings Withdraw Support

  1. New Table: `feedback`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `type` (varchar) — 'bug', 'saran', 'pertanyaan', 'lainnya'
    - `title` (text)
    - `description` (text)
    - `screenshot_url` (text, optional)
    - `status` (varchar, default 'open') — 'open', 'in_progress', 'resolved'
    - `admin_notes` (text, optional)
    - `created_at` (timestamptz)

  2. Changes to `earnings`
    - Add `type` (varchar, default 'task') — 'task' or 'withdrawal'
    - Add `bank_name` (text) — for withdrawal records
    - Add `account_number` (text) — for withdrawal records

  3. Security
    - RLS on feedback: users can insert + read own, admins can read/update all
*/

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  type varchar NOT NULL DEFAULT 'bug',
  title text NOT NULL,
  description text NOT NULL,
  screenshot_url text,
  status varchar DEFAULT 'open',
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update feedback"
  ON feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

ALTER TABLE earnings ADD COLUMN IF NOT EXISTS type varchar DEFAULT 'task';
ALTER TABLE earnings ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE earnings ADD COLUMN IF NOT EXISTS account_number text;
