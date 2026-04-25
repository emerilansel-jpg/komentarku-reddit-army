/*
  # Quick Wins & Gamification Fields

  1. New Table: `quick_wins`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users)
    - `event_type` (varchar) — 'login', 'first_task_view', etc.
    - `points` (integer) — points awarded for this event
    - `description` (text) — human-readable description
    - `created_at` (timestamptz)

  2. Changes to `profiles`
    - Add `total_points` (integer, default 0)
    - Add `login_streak` (integer, default 0)
    - Add `last_login_date` (date)

  3. Security
    - RLS enabled on quick_wins
    - Users can insert and read their own quick wins
    - Admins can read all quick wins
*/

CREATE TABLE IF NOT EXISTS quick_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type varchar NOT NULL,
  points integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quick_wins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own quick wins"
  ON quick_wins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own quick wins"
  ON quick_wins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all quick wins"
  ON quick_wins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_streak integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_date date;
