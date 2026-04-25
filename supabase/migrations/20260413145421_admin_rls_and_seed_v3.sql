/*
  # Admin RLS Policies & Seed Data (v3)
  Adds admin RLS policies and demo admin seed function.
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can read all reddit accounts" ON reddit_accounts;
  DROP POLICY IF EXISTS "Admins can insert reddit accounts" ON reddit_accounts;
  DROP POLICY IF EXISTS "Admins can update reddit accounts" ON reddit_accounts;
  DROP POLICY IF EXISTS "Admins can delete reddit accounts" ON reddit_accounts;
  DROP POLICY IF EXISTS "Admins can read all tasks" ON tasks;
  DROP POLICY IF EXISTS "Admins can insert tasks" ON tasks;
  DROP POLICY IF EXISTS "Admins can update all tasks" ON tasks;
  DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
  DROP POLICY IF EXISTS "Admins can read all submissions" ON task_submissions;
  DROP POLICY IF EXISTS "Admins can update submissions" ON task_submissions;
  DROP POLICY IF EXISTS "Admins can read all earnings" ON earnings;
  DROP POLICY IF EXISTS "Admins can insert earnings" ON earnings;
  DROP POLICY IF EXISTS "Admins can update earnings" ON earnings;
END $$;

CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can read all reddit accounts" ON reddit_accounts FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert reddit accounts" ON reddit_accounts FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update reddit accounts" ON reddit_accounts FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete reddit accounts" ON reddit_accounts FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can read all tasks" ON tasks FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update all tasks" ON tasks FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can delete tasks" ON tasks FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "Admins can read all submissions" ON task_submissions FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can update submissions" ON task_submissions FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins can read all earnings" ON earnings FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert earnings" ON earnings FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins can update earnings" ON earnings FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT '',
  entity_type text DEFAULT '',
  entity_id text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read activity log" ON activity_log;
DROP POLICY IF EXISTS "Admins can insert activity log" ON activity_log;
CREATE POLICY "Admins can read activity log" ON activity_log FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Admins can insert activity log" ON activity_log FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP FUNCTION IF EXISTS seed_demo_admin_data(uuid);

CREATE OR REPLACE FUNCTION seed_demo_admin_data(p_admin_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  member1_id uuid := gen_random_uuid();
  member2_id uuid := gen_random_uuid();
  member3_id uuid := gen_random_uuid();
  acc1_id uuid := gen_random_uuid();
  acc2_id uuid := gen_random_uuid();
  acc3_id uuid := gen_random_uuid();
  acc4_id uuid := gen_random_uuid();
  acc5_id uuid := gen_random_uuid();
  t1 uuid := gen_random_uuid();
  t2 uuid := gen_random_uuid();
  t3 uuid := gen_random_uuid();
  t4 uuid := gen_random_uuid();
  t5 uuid := gen_random_uuid();
  t6 uuid := gen_random_uuid();
BEGIN
  INSERT INTO profiles (id, display_name, role) VALUES (p_admin_user_id, 'Admin Utama', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', display_name = 'Admin Utama';

  INSERT INTO profiles (id, display_name, role, created_at) VALUES
    (member1_id, 'Budi Santoso', 'army', now() - interval '60 days'),
    (member2_id, 'Siti Rahayu', 'army', now() - interval '45 days'),
    (member3_id, 'Dimas Prasetyo', 'army', now() - interval '30 days')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO reddit_accounts (id, assigned_to, username, karma, account_age_days, level, level_name, level_emoji, karma_next_level, status, task_rate, level_rate, last_karma_fetch)
  VALUES
    (acc1_id, member1_id, 'u/techbro_id_adm', 4850, 365, 3, 'Village Warrior', '⚔️', 10000, 'active', 92, 15000, now() - interval '2 hours'),
    (acc2_id, member1_id, 'u/gadget_rev_adm', 1200, 180, 2, 'Cave Teen', '🔥', 2000, 'warming', 78, 12000, now() - interval '25 hours'),
    (acc3_id, member2_id, 'u/lifestyle_id_adm', 8900, 400, 4, 'City Slicker', '🏙️', 10000, 'active', 95, 18000, now() - interval '3 hours'),
    (acc4_id, member3_id, 'u/pemuda_dig_adm', 320, 95, 2, 'Cave Teen', '🔥', 500, 'active', 65, 12000, now() - interval '1 hour'),
    (acc5_id, member3_id, 'u/review_prod_adm', 45, 20, 1, 'Cave Baby', '🦴', 100, 'inactive', 0, 10000, NULL)
  ON CONFLICT (username) DO NOTHING;

  INSERT INTO tasks (id, assigned_to, reddit_account_id, subreddit, thread_title, thread_url, admin_brief, priority, status, due_time, payment_amount, created_at, updated_at)
  VALUES
    (t1, member1_id, acc1_id, 'r/indonesia', 'Rekomendasi laptop gaming budget 2024 - mana yang terbaik?', 'https://reddit.com', 'Promosikan laptop ASUS ROG Zephyrus G14 dengan harga kompetitif.', 'high', 'submitted', now() + interval '2 hours', 15000, now() - interval '3 hours', now() - interval '1 hour'),
    (t2, member2_id, acc3_id, 'r/teknologi', 'Ada yang sudah coba iPhone 16 Pro? Worth it ga buat upgrade?', 'https://reddit.com', 'Berikan komentar positif tentang iPhone 16 Pro.', 'normal', 'submitted', now() + interval '4 hours', 18000, now() - interval '5 hours', now() - interval '2 hours'),
    (t3, member1_id, acc2_id, 'r/finansial', 'Tips investasi untuk fresh graduate dengan gaji UMR', 'https://reddit.com', 'Rekomendasikan aplikasi investasi Bibit.', 'normal', 'approved', now() + interval '1 hour', 12000, now() - interval '6 hours', now() - interval '30 minutes'),
    (t4, member3_id, acc4_id, 'r/indonesia', 'Mana lebih enak tinggal di Jakarta vs Bandung?', 'https://reddit.com', 'Buat diskusi menarik tentang kelebihan Jakarta.', 'low', 'posted', now() - interval '1 hour', 12000, now() - interval '1 day', now() - interval '1 hour'),
    (t5, member2_id, acc3_id, 'r/bisnis', 'Startup Indonesia mana yang paling potential tahun ini?', 'https://reddit.com', 'Sebutkan Tokopedia dan GoTo secara positif.', 'high', 'pending', now() + interval '6 hours', 18000, now() - interval '1 hour', now() - interval '1 hour'),
    (t6, member1_id, acc1_id, 'r/otomotif', 'Review jujur Toyota Avanza 2024 setelah pakai 6 bulan', 'https://reddit.com', 'Review positif tentang Toyota Avanza, fokus ke keandalan dan BBM irit.', 'normal', 'posted', now() - interval '2 days', 15000, now() - interval '3 days', now() - interval '2 days')
  ON CONFLICT DO NOTHING;

  INSERT INTO task_submissions (task_id, submitted_by, draft_text, submitted_at)
  VALUES
    (t1, member1_id, 'Gue udah nyoba beberapa laptop gaming budget dan ROG Zephyrus G14 ini emang juara. Harganya reasonable banget untuk spec yang ditawarkan.', now() - interval '1 hour'),
    (t2, member2_id, 'Baru upgrade ke iPhone 16 Pro kemarin dan wow, kameranya beneran beda level.', now() - interval '2 hours')
  ON CONFLICT DO NOTHING;

  INSERT INTO earnings (army_member_id, task_id, amount, status, paid_at, created_at)
  VALUES
    (member1_id, t6, 15000, 'paid', now() - interval '2 days', now() - interval '2 days'),
    (member1_id, NULL, 27000, 'paid', now() - interval '7 days', now() - interval '7 days'),
    (member2_id, NULL, 36000, 'paid', now() - interval '3 days', now() - interval '3 days'),
    (member2_id, NULL, 18000, 'paid', now() - interval '10 days', now() - interval '10 days'),
    (member3_id, t4, 12000, 'pending', NULL, now() - interval '1 day'),
    (member1_id, t3, 12000, 'pending', NULL, now() - interval '30 minutes'),
    (member2_id, t2, 18000, 'pending', NULL, now() - interval '2 hours')
  ON CONFLICT DO NOTHING;

  INSERT INTO activity_log (actor_id, action, entity_type, entity_id, metadata, created_at)
  VALUES
    (p_admin_user_id, 'task_approved', 'task', t3::text, '{"army_member": "Budi Santoso", "subreddit": "r/finansial"}', now() - interval '30 minutes'),
    (member1_id, 'task_submitted', 'task', t1::text, '{"army_member": "Budi Santoso", "subreddit": "r/indonesia"}', now() - interval '1 hour'),
    (member2_id, 'task_submitted', 'task', t2::text, '{"army_member": "Siti Rahayu", "subreddit": "r/teknologi"}', now() - interval '2 hours'),
    (p_admin_user_id, 'account_added', 'reddit_account', acc5_id::text, '{"username": "u/review_prod_adm", "assigned_to": "Dimas Prasetyo"}', now() - interval '3 hours'),
    (member1_id, 'task_posted', 'task', t6::text, '{"army_member": "Budi Santoso", "subreddit": "r/otomotif"}', now() - interval '2 days'),
    (p_admin_user_id, 'earnings_paid', 'earning', member2_id::text, '{"army_member": "Siti Rahayu", "amount": 36000}', now() - interval '3 days'),
    (p_admin_user_id, 'task_created', 'task', t5::text, '{"subreddit": "r/bisnis", "priority": "high"}', now() - interval '1 hour'),
    (member3_id, 'task_posted', 'task', t4::text, '{"army_member": "Dimas Prasetyo", "subreddit": "r/indonesia"}', now() - interval '1 hour')
  ON CONFLICT DO NOTHING;
END;
$$;
