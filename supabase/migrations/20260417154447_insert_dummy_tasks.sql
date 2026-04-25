/*
  # Insert 3 Dummy Tasks

  Adds 3 sample tasks visible to all army members (assigned_to IS NULL):
  1. Upvote task - Rp2.000
  2. Comment task - Rp5.000
  3. Create thread task - Rp15.000

  All tasks have:
  - assigned_to = NULL (visible to all members per RLS policy)
  - status = 'pending'
  - deadline 7 days from now
*/

INSERT INTO tasks (
  assigned_to,
  subreddit,
  thread_title,
  thread_url,
  admin_brief,
  priority,
  status,
  due_time,
  payment_amount,
  task_type
) VALUES
(
  NULL,
  'r/indonesia',
  'Upvote Post di r/indonesia',
  'https://www.reddit.com/r/indonesia/',
  'Upvote post berikut dan screenshot sebagai bukti. Pastikan WARP aktif sebelum membuka Reddit.',
  'normal',
  'pending',
  NOW() + INTERVAL '7 days',
  2000,
  'upvote'
),
(
  NULL,
  'r/indonesia',
  'Komentar di Thread r/indonesia',
  'https://www.reddit.com/r/indonesia/',
  'Berikan komentar minimal 2 kalimat di thread berikut. Komentar harus natural dan relevan dengan topik diskusi. Jangan terkesan seperti spam.',
  'normal',
  'pending',
  NOW() + INTERVAL '7 days',
  5000,
  'comment'
),
(
  NULL,
  'r/indonesia',
  'Buat Thread Baru di r/indonesia',
  'https://www.reddit.com/r/indonesia/',
  'Buat thread baru dengan topik menarik minimal 3 paragraf. Pilih topik yang relevan dengan komunitas Indonesia seperti budaya, kuliner, travel, atau pengalaman sehari-hari. Thread harus original dan menarik untuk didiskusikan.',
  'high',
  'pending',
  NOW() + INTERVAL '7 days',
  15000,
  'create_thread'
);
