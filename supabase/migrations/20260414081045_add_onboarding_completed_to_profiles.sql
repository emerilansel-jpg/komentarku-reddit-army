/*
  # Add onboarding_completed to profiles

  1. Changes
    - Add `onboarding_completed` boolean column (default false) to `profiles` table
    - This tracks whether a new army member has completed the onboarding flow
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
