/*
  # Army App Schema

  ## Overview
  Creates the complete database schema for the Army (worker) side of the Reddit management app.

  ## New Tables

  ### profiles
  - Extended user profiles for army members
  - Stores display name, role (army/admin), and avatar

  ### reddit_accounts
  - Reddit accounts assigned to army members
  - Stores username, karma, account age, level info, status

  ### tasks
  - Work tasks assigned to army members
  - Linked to subreddits, reddit accounts, threads
  - Priority levels: high, normal, low
  - Status flow: pending -> submitted -> approved/rejected -> posted

  ### task_submissions
  - Draft submissions by army members
  - Stores the comment draft text

  ### earnings
  - Payment records for completed tasks
  - Tracks pending vs paid amounts

  ## Security
  - RLS enabled on all tables
  - Army members can only see their own data
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'army' CHECK (role IN ('army', 'admin')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS reddit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  username text NOT NULL UNIQUE,
  karma integer DEFAULT 0,
  account_age_days integer DEFAULT 0,
  level integer DEFAULT 1,
  level_name text DEFAULT 'Newbie',
  level_emoji text DEFAULT '🌱',
  karma_next_level integer DEFAULT 1000,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned', 'warming')),
  task_rate integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reddit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Army can view own assigned accounts"
  ON reddit_accounts FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reddit_account_id uuid REFERENCES reddit_accounts(id) ON DELETE SET NULL,
  subreddit text NOT NULL DEFAULT '',
  thread_title text NOT NULL DEFAULT '',
  thread_url text,
  admin_brief text DEFAULT '',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'posted')),
  due_time timestamptz,
  payment_amount integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Army can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (assigned_to = auth.uid());

CREATE POLICY "Army can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE TABLE IF NOT EXISTS task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  draft_text text NOT NULL DEFAULT '',
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_notes text
);

ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Army can view own submissions"
  ON task_submissions FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "Army can insert own submissions"
  ON task_submissions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE TABLE IF NOT EXISTS earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  army_member_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Army can view own earnings"
  ON earnings FOR SELECT
  TO authenticated
  USING (army_member_id = auth.uid());

-- Seed demo data function
CREATE OR REPLACE FUNCTION seed_demo_army_data(user_id uuid, user_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  account1_id uuid := gen_random_uuid();
  account2_id uuid := gen_random_uuid();
  task1_id uuid := gen_random_uuid();
  task2_id uuid := gen_random_uuid();
  task3_id uuid := gen_random_uuid();
  task4_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO profiles (id, display_name, role) VALUES (user_id, user_name, 'army')
  ON CONFLICT (id) DO UPDATE SET display_name = user_name;

  INSERT INTO reddit_accounts (id, assigned_to, username, karma, account_age_days, level, level_name, level_emoji, karma_next_level, status, task_rate)
  VALUES 
    (account1_id, user_id, 'u/techbro_indonesia', 4850, 365, 3, 'Veteran Komentator', '🔥', 5000, 'active', 92),
    (account2_id, user_id, 'u/gadget_reviewer_id', 1200, 180, 2, 'Komentator Aktif', '⚡', 2500, 'warming', 78)
  ON CONFLICT (username) DO NOTHING;

  INSERT INTO tasks (id, assigned_to, reddit_account_id, subreddit, thread_title, thread_url, admin_brief, priority, status, due_time, payment_amount)
  VALUES
    (task1_id, user_id, account1_id, 'r/indonesia', 'Rekomendasi laptop gaming budget 2024 - mana yang terbaik?', 'https://reddit.com', 'Promosikan laptop ASUS ROG Zephyrus G14 dengan menyebut harganya yang kompetitif dan performa gaming yang bagus. Gunakan bahasa santai anak muda. Jangan terlalu promosi, buat terkesan organik.', 'high', 'pending', now() + interval '2 hours', 15000),
    (task2_id, user_id, account2_id, 'r/teknologi', 'Ada yang sudah coba iPhone 16 Pro? Worth it ga buat upgrade?', 'https://reddit.com', 'Berikan komentar positif tentang iPhone 16 Pro, fokus ke kamera dan performa chip A18. Ceritakan pengalaman "seolah kamu sudah pakai" dengan natural.', 'normal', 'submitted', now() + interval '4 hours', 10000),
    (task3_id, user_id, account1_id, 'r/finansial', 'Tips investasi untuk fresh graduate dengan gaji UMR', 'https://reddit.com', 'Rekomendasikan aplikasi investasi Bibit secara halus dalam konteks tips investasi umum. Sebutkan fitur auto-rebalance dan reksa dana pilihannya.', 'normal', 'approved', now() + interval '1 hour', 12000),
    (task4_id, user_id, account2_id, 'r/indonesia', 'Mana lebih enak tinggal di Jakarta vs Bandung?', 'https://reddit.com', 'Buat diskusi menarik tentang kelebihan Jakarta, terutama soal fasilitas dan peluang kerja. Bisa sebut developer properti Summarecon.', 'low', 'posted', now() - interval '1 hour', 8000)
  ;

  INSERT INTO task_submissions (task_id, submitted_by, draft_text, submitted_at)
  VALUES
    (task2_id, user_id, 'Gue udah upgrade ke iPhone 16 Pro minggu lalu dan seriously ini worth banget! Kamera 48MP nya gila sih, foto malem jadi jauh lebih tajam. Chip A18 Pro juga kerasa banget bedanya buat multitasking.', now() - interval '30 minutes'),
    (task3_id, user_id, 'Sebagai fresh grad yang baru mulai invest, gue rekomendasiin mulai dari reksa dana dulu. Gue pribadi pakai Bibit karena ada fitur smart saving yang auto-rebalance portfolionya. Mulai dari 10rb udah bisa lho!', now() - interval '2 hours')
  ;

  INSERT INTO earnings (army_member_id, task_id, amount, status, paid_at)
  VALUES
    (user_id, task4_id, 8000, 'paid', now() - interval '1 day'),
    (user_id, NULL, 25000, 'paid', now() - interval '5 days'),
    (user_id, NULL, 18000, 'paid', now() - interval '8 days'),
    (user_id, task3_id, 12000, 'pending', NULL),
    (user_id, task2_id, 10000, 'pending', NULL)
  ;
END;
$$;
