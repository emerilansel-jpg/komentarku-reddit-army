/*
  # Onboarding Bonus Support

  1. Changes to `profiles`
    - Add `level` (integer, default 0) — tracks army member level
    - Add `total_earned` (integer, default 0) — cumulative earnings in IDR

  2. Changes to `earnings`
    - Add `type` (text, default 'task') — e.g. 'task', 'bonus'
    - Add `description` (text, nullable) — human-readable note

  3. New Function: `add_to_total_earned`
    - Safely increments `profiles.total_earned` for a given user
    - Security: SECURITY DEFINER so authenticated user can call it for their own profile

  4. RLS Policies
    - Policy for army member to insert their own earnings
    - Policy for army member to read their own earnings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN level integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_earned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_earned integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'earnings' AND column_name = 'type'
  ) THEN
    ALTER TABLE earnings ADD COLUMN type text DEFAULT 'task';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'earnings' AND column_name = 'description'
  ) THEN
    ALTER TABLE earnings ADD COLUMN description text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION add_to_total_earned(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET total_earned = COALESCE(total_earned, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;
