import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type MemberRow = {
  id: string;
  display_name: string;
  created_at: string;
  accountCount: number;
  tasksCompleted: number;
  monthEarnings: number;
  topLevel: number;
  topLevelEmoji: string;
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

type MemberDetail = {
  profile: { id: string; display_name: string; created_at: string };
  accounts: { id: string; username: string; level: number; level_emoji: string; level_name: string; karma: number; status: string }[];
  earnings: { id: string; amount: number; status: string; created_at: string; paid_at: string | null }[];
  tasks: { id: string; subreddit: string; status: string; payment_amount: number; created_at: string }[];
};

export default function Tim() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemberDetail | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink] = useState(`${window.location.origin}?invite=${Math.random().toString(36).slice(2, 10).toUpperCase()}`);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: profiles } = await supabase.from('profiles').select('id, display_name, created_at').eq('role', 'army');
    if (!profiles) { setLoading(false); return; }

    const rows: MemberRow[] = await Promise.all(profiles.map(async (p) => {
      const [accsRes, tasksRes, earningsRes] = await Promise.all([
        supabase.from('reddit_accounts').select('level, level_emoji').eq('assigned_to', p.id),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', p.id).eq('status', 'posted'),
        supabase.from('earnings').select('amount').eq('army_member_id', p.id).gte('created_at', monthStart),
      ]);
      const accs = accsRes.data || [];
      const topLevel = accs.length > 0 ? Math.max(...accs.map((a: any) => a.level)) : 0;
      const topLevelEmoji = accs.find((a: any) => a.level === topLevel)?.level_emoji || '🥚';
      const monthEarnings = (earningsRes.data || []).reduce((s: number, e: any) => s + e.amount, 0);
      return {
        id: p.id, display_name: p.display_name, created_at: p.created_at,
        accountCount: accs.length, tasksCompleted: tasksRes.count || 0,
        monthEarnings, topLevel, topLevelEmoji,
      };
    }));
    setMembers(rows);
    setLoading(false);
  }

  async function loadMemberDetail(memberId: string) {
    const [profileRes, accountsRes, earningsRes, tasksRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', memberId).maybeSingle(),
      supabase.from('reddit_accounts').select('id, username, level, level_emoji, level_name, karma, status').eq('assigned_to', memberId),
      supabase.from('earnings').select('*').eq('army_member_id', memberId).order('created_at', { ascending: false }).limit(10),
      supabase.from('tasks').select('id, subreddit, status, payment_amount, created_at').eq('assigned_to', memberId).order('created_at', { ascending: false }).limit(10),
    ]);
    if (profileRes.data) {
      setSelected({
        profile: profileRes.data,
        accounts: accountsRes.data || [],
        earnings: earningsRes.data || [],
        tasks: tasksRes.data || [],
      });
    }
  }

  function handleCopyInvite() {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="px-4 pt-5 pb-4"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">Tim 👥</h1>
            <p className="text-blue-300 text-xs">{members.length} anggota aktif</p>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            + Undang
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 pb-24 space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-gray-500 text-sm">Belum ada anggota tim</p>
          </div>
        ) : (
          members.map(member => (
            <div key={member.id}
              className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.99] transition-all"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              onClick={() => loadMemberDetail(member.id)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                  style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
                  {member.display_name.slice(0, 1)}
                </div>
                <div>
                  <p className="font-black text-gray-800">{member.display_name}</p>
                  <p className="text-xs text-gray-400">
                    {member.topLevelEmoji} Lv.{member.topLevel} · Bergabung {formatDate(member.created_at)}
                  </p>
                </div>
                <span className="ml-auto text-lg">›</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center rounded-xl p-2 bg-blue-50">
                  <p className="font-black text-blue-700 text-sm">{member.accountCount}</p>
                  <p className="text-xs text-blue-400">Akun</p>
                </div>
                <div className="text-center rounded-xl p-2 bg-emerald-50">
                  <p className="font-black text-emerald-700 text-sm">{member.tasksCompleted}</p>
                  <p className="text-xs text-emerald-400">Selesai</p>
                </div>
                <div className="text-center rounded-xl p-2 bg-amber-50">
                  <p className="font-black text-amber-700 text-sm">Rp{(member.monthEarnings/1000).toFixed(0)}rb</p>
                  <p className="text-xs text-amber-400">Bulan Ini</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <MemberDetailModal detail={selected} onClose={() => setSelected(null)} />
      )}

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 bounce-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-gray-800 text-lg mb-1">Undang Anggota Baru</h3>
            <p className="text-gray-500 text-sm mb-4">Bagikan link ini ke calon prajurit</p>
            <div className="rounded-xl p-3 mb-3 bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 font-semibold mb-1">Link Undangan:</p>
              <p className="text-sm font-mono text-blue-600 break-all">{inviteLink}</p>
            </div>
            <button onClick={handleCopyInvite}
              className="w-full py-3 rounded-xl font-bold text-white text-sm mb-2"
              style={{ background: inviteCopied ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
              {inviteCopied ? '✅ Link Tersalin!' : '📋 Salin Link'}
            </button>
            <button onClick={() => setShowInvite(false)} className="w-full py-2.5 rounded-xl font-semibold text-gray-500 text-sm bg-gray-100">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberDetailModal({ detail, onClose }: { detail: MemberDetail; onClose: () => void }) {
  const [tab, setTab] = useState<'accounts' | 'earnings' | 'tasks'>('accounts');
  const totalEarnings = detail.earnings.reduce((s, e) => s + e.amount, 0);
  const paidEarnings = detail.earnings.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="mt-auto bg-white rounded-t-3xl w-full max-w-2xl mx-auto max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
              {detail.profile.display_name.slice(0, 1)}
            </div>
            <div>
              <p className="font-black text-gray-800 text-lg">{detail.profile.display_name}</p>
              <p className="text-xs text-gray-400">{detail.accounts.length} akun · {detail.tasks.filter(t => t.status === 'posted').length} misi selesai</p>
            </div>
            <button onClick={onClose} className="ml-auto w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-bold">×</button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl p-2 text-center bg-emerald-50">
              <p className="font-black text-emerald-700 text-sm">Rp{(paidEarnings/1000).toFixed(0)}rb</p>
              <p className="text-xs text-emerald-400">Total Dibayar</p>
            </div>
            <div className="rounded-xl p-2 text-center bg-amber-50">
              <p className="font-black text-amber-700 text-sm">Rp{((totalEarnings - paidEarnings)/1000).toFixed(0)}rb</p>
              <p className="text-xs text-amber-400">Belum Dibayar</p>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          {(['accounts', 'earnings', 'tasks'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>
              {t === 'accounts' ? '🔑 Akun' : t === 'earnings' ? '💰 Riwayat' : '📋 Tugas'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === 'accounts' && detail.accounts.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <span className="text-xl">{a.level_emoji}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{a.username}</p>
                <p className="text-xs text-gray-400">Lv.{a.level} {a.level_name} · {a.karma.toLocaleString()} karma</p>
              </div>
              <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${a.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {a.status}
              </span>
            </div>
          ))}
          {tab === 'earnings' && detail.earnings.map(e => (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <span className="text-lg">{e.status === 'paid' ? '✅' : '⏳'}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Rp{e.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
              </div>
              <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${e.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {e.status === 'paid' ? 'Dibayar' : 'Pending'}
              </span>
            </div>
          ))}
          {tab === 'tasks' && detail.tasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <span className="text-lg">{t.status === 'posted' ? '✅' : '📋'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{t.subreddit}</p>
                <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
              </div>
              <span className="text-sm font-black text-emerald-600">Rp{(t.payment_amount/1000).toFixed(0)}rb</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
