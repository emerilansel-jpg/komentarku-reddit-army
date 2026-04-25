/*
  # Add Gamification Fields to Reddit Accounts

  ## Changes
  - Adds `last_karma_fetch` timestamp to track when karma was last refreshed from Reddit API
  - Adds `level_rate` integer to store the per-task payment rate based on the account's level
  - Updates the level system fields to support the 6-tier system (levels 0-5)

  ## Notes
  - last_karma_fetch is nullable; NULL means karma has never been fetched automatically
  - level_rate stores the Rp value per task for that account's current level
  - Migration is safe: uses IF NOT EXISTS for column additions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reddit_accounts' AND column_name = 'last_karma_fetch'
  ) THEN
    ALTER TABLE reddit_accounts ADD COLUMN last_karma_fetch timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reddit_accounts' AND column_name = 'level_rate'
  ) THEN
    ALTER TABLE reddit_accounts ADD COLUMN level_rate integer DEFAULT 10000;
  END IF;
END $$;
