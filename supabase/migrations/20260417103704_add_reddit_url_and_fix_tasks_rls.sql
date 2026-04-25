/*
  # Add reddit_url to profiles and fix tasks RLS

  1. Changes
    - Add `reddit_url` column to `profiles` table (optional text field)
  
  2. Security
    - Drop existing tasks SELECT policy and replace with one allowing unassigned tasks visible to all authenticated users
    - USING (assigned_to = auth.uid() OR assigned_to IS NULL)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'reddit_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN reddit_url text;
  END IF;
END $$;

DROP POLICY IF EXISTS "Army members can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Army members can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;

CREATE POLICY "Army members can view assigned or unassigned tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid() OR assigned_to IS NULL);
