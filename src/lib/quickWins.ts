import { supabase } from './supabase';
import type { QuickWinData } from '../components/army/QuickWinToast';

export const QUICK_WIN_POINTS: Record<string, number> = {
    login: 10,
    first_task_view: 5,
    first_comment: 25,
    first_submission: 50,
    profile_complete: 100,
    karma_refresh: 10,
    level_up: 200,
};

export async function awardQuickWin(
    userId: string,
    eventType: string,
    points: number,
    description: string
  ): Promise<void> {
    // Dedup check: prevent duplicate entries for same user + event + today
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('quick_wins')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59')
      .maybeSingle();

    if (existing) return; // Already awarded today

    await supabase.from('quick_wins').insert({ user_id: userId, event_type: eventType, points, description });
    await supabase.rpc('increment_total_points', { user_id: userId, delta: points }).maybeSingle();
}

export async function checkLoginStreak(userId: string): Promise<{ toastData?: QuickWinData }> {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('quick_wins')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', 'login')
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59')
      .maybeSingle();

    if (existing) return {}; // Already logged in today

    const points = QUICK_WIN_POINTS.login;
    const description = 'Login harian berhasil!';

    await supabase.from('quick_wins').insert({
          user_id: userId,
          event_type: 'login',
          points,
          description,
    });
    await supabase.rpc('increment_total_points', { user_id: userId, delta: points }).maybeSingle();

    return {
          toastData: {
                  type: 'login',
                  points,
                  description,
          },
    };
}