import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data);
    setLoading(false);
  }

  async function signInArmy() {
    setLoading(true);
    const email = 'demo.army@redditarmy.id';
    const password = 'demo123456';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error && error.message.includes('Invalid login credentials')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (!signUpError && signUpData.user) {
        await supabase.rpc('seed_demo_army_data', { user_id: signUpData.user.id, user_name: 'Budi Santoso' });
        await loadProfile(signUpData.user.id);
        setLoading(false);
        return;
      }
    }

    if (data?.user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (!profileData) {
        await supabase.rpc('seed_demo_army_data', { user_id: data.user.id, user_name: 'Budi Santoso' });
      }
      await loadProfile(data.user.id);
    }
    setLoading(false);
  }

  async function signInAdmin() {
    setLoading(true);
    const email = 'demo.admin@redditarmy.id';
    const password = 'admin123456';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error && error.message.includes('Invalid login credentials')) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (!signUpError && signUpData.user) {
        await supabase.rpc('seed_demo_admin_data', { p_admin_user_id: signUpData.user.id });
        await loadProfile(signUpData.user.id);
        setLoading(false);
        return;
      }
    }

    if (data?.user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (!profileData || profileData.role !== 'admin') {
        await supabase.rpc('seed_demo_admin_data', { p_admin_user_id: data.user.id });
      }
      await loadProfile(data.user.id);
    }
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { user, profile, loading, signInArmy, signInAdmin, signOut };
}
