import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  display_name: string;
  role: 'army' | 'admin';
  avatar_url: string | null;
  created_at: string;
  level?: number;
  total_earned?: number;
  onboarding_completed?: boolean;
  total_points?: number;
  login_streak?: number;
  last_login_date?: string | null;
  reddit_url?: string | null;
  whatsapp_number?: string | null;
};

export type RedditAccount = {
  id: string;
  assigned_to: string | null;
  username: string;
  karma: number;
  account_age_days: number;
  level: number;
  level_name: string;
  level_emoji: string;
  karma_next_level: number;
  status: 'active' | 'inactive' | 'banned' | 'warming';
  task_rate: number;
  level_rate: number;
  last_karma_fetch: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  assigned_to: string;
  reddit_account_id: string | null;
  subreddit: string;
  thread_title: string;
  thread_url: string | null;
  admin_brief: string | null;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'posted';
  due_time: string | null;
  payment_amount: number;
  created_at: string;
  updated_at: string;
  reddit_accounts?: RedditAccount;
};

export type TaskSubmission = {
  id: string;
  task_id: string;
  submitted_by: string;
  draft_text: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
};

export type Earning = {
  id: string;
  army_member_id: string;
  task_id: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'rejected' | 'completed';
  type?: string;
  description?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  created_at: string;
  paid_at: string | null;
  tasks?: Task;
};
