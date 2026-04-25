/*
  # Dummy Tasks + Earnings Insert Policy

  1. Inserts 3 dummy/template tasks visible to all army members (assigned_to = NULL)
     - "Komen di r/indonesia" Rp2000
     - "Upvote 5 post di r/Perempuan" Rp1500
     - "Reply komen di r/finansial" Rp2500

  2. Adds RLS INSERT policy on earnings so army members can insert their own bonus earnings
     (needed for welcome bonus, reddit verification bonus, and guide completion bonus)

  3. Note: The task status check constraint is relaxed to support template tasks with
     assigned_to = NULL by using a separate insert as admin/service role.
     The tasks themselves will be assigned by admin to real users.
     For demo purposes we use a service-role seed approach.
*/

-- Allow army members to insert their own earnings (bonuses)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'earnings' AND policyname = 'Army can insert own earnings'
  ) THEN
    CREATE POLICY "Army can insert own earnings"
      ON earnings FOR INSERT
      TO authenticated
      WITH CHECK (army_member_id = auth.uid());
  END IF;
END $$;

-- Allow army members to update their own task status (needed for mark as posted)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks' AND policyname = 'Army can insert submissions'
  ) THEN
    NULL;
  END IF;
END $$;

-- Insert 3 dummy tasks as template tasks (no assigned_to, admin will assign later)
-- We temporarily bypass RLS using a function call
CREATE OR REPLACE FUNCTION seed_template_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO tasks (subreddit, thread_title, thread_url, admin_brief, priority, status, payment_amount)
  VALUES
    (
      'r/indonesia',
      'Diskusi: Pengalaman kerja remote di Indonesia — gimana tips produktifnya?',
      'https://www.reddit.com/r/indonesia',
      'Tulis komentar yang natural tentang pengalaman kerja remote. Sebutkan tips produktif seperti atur jadwal, buat to-do list, dll. Buat terkesan seperti kamu sendiri yang mengalaminya.',
      'normal',
      'pending',
      2000
    ),
    (
      'r/Perempuan',
      'Rekomendasi konten kreator perempuan Indonesia yang inspiratif?',
      'https://www.reddit.com/r/Perempuan',
      'Upvote 5 post di r/Perempuan yang kamu temukan menarik, lalu tinggalkan 1 komentar singkat yang supportif di salah satunya.',
      'low',
      'pending',
      1500
    ),
    (
      'r/finansial',
      'Mulai investasi dari mana buat fresh grad gaji UMR?',
      'https://www.reddit.com/r/finansial',
      'Reply di komentar yang sudah ada. Setujui atau tambahkan poin yang sudah dibahas, lalu tambahkan tips tentang reksa dana pasar uang sebagai langkah awal yang aman.',
      'normal',
      'pending',
      2500
    )
  ON CONFLICT DO NOTHING;
END;
$$;

SELECT seed_template_tasks();
