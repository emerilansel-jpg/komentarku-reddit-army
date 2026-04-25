/*
  # Task Types and Admin Settings

  1. Changes to `tasks`
    - Add `task_type` (varchar, default 'comment') — 'vote', 'comment', or 'thread'
    - Add `max_quantity` (integer, default 1) — max number of army members who can take this task
    - Add `reward_amount` (integer, default 10000) — reward in IDR per completion

  2. New Table: `admin_settings`
    - `id` (uuid, primary key)
    - `min_reddit_age_days` (integer, default 30) — minimum Reddit account age required
    - `min_karma` (integer, default 100) — minimum karma score required
    - `updated_at` (timestamptz)
    - Seeded with one default row

  3. Security
    - RLS enabled on admin_settings
    - Admin can read and update settings
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type varchar DEFAULT 'comment';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_quantity integer DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reward_amount integer DEFAULT 10000;

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_reddit_age_days integer DEFAULT 30,
  min_karma integer DEFAULT 100,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read settings"
  ON admin_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update settings"
  ON admin_settings FOR UPDATE
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

INSERT INTO admin_settings (min_reddit_age_days, min_karma)
SELECT 30, 100
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);
