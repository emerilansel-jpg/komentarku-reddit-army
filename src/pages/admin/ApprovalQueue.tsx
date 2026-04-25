import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type SubmissionRow = {
  id: string;
  draft_text: string;
  submitted_at: string;
  tasks: {
    id: string;
    subreddit: string;
    thread_title: string;
    thread_url: string | null;
    payment_amount: number;
    priority: string;
    profiles: { display_name: string } | null;
    reddit_accounts: { username: string } | null;
  } | null;
};

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n) + '...' : s; }

function timeAgo(ts: string): string {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
}

export default function ApprovalQueue() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [filterMember, setFilterMember] = useState('all');

  useEffect(() => { loadSubmissions(); }, []);

  async function loadSubmissions() {
    setLoading(true);
    const { data } = await supabase
      .from('task_submissions')
      .select(`
        id, draft_text, submitted_at,
        tasks!inner(
          id, subreddit, thread_title, thread_url, payment_amount, priority, status,
          profiles(display_name),
          reddit_accounts(username)
        )
      `)
      .eq('tasks.status', 'submitted')
      .order('submitted_at', { ascending: true });
    if (data) setSubmissions(data as unknown as SubmissionRow[]);
    setLoading(false);
  }

  async function handleApprove(submission: SubmissionRow) {
    if (!submission.tasks) return;
    setProcessingId(submission.id);
    await supabase.from('tasks').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', submission.tasks.id);
    await supabase.from('task_submissions').update({ reviewed_at: new Date().toISOString() }).eq('id', submission.id);
    setSubmissions(prev => prev.filter(s => s.id !== submission.id));
    setProcessingId(null);
  }

  async function handleReject(submission: SubmissionRow) {
    if (!submission.tasks) return;
    setProcessingId(submission.id);
    await supabase.from('tasks').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', submission.tasks.id);
    await supabase.from('task_submissions').update({
      reviewed_at: new Date().toISOString(),
      reviewer_notes: rejectReason || 'Ditolak oleh admin',
    }).eq('id', submission.id);
    setSubmissions(prev => prev.filter(s => s.id !== submission.id));
    setRejectingId(null);
    setRejectReason('');
    setProcessingId(null);
  }

  async function handleApproveAll() {
    setBatchProcessing(true);
    const toApprove = filterMember === 'all' ? submissions : submissions.filter(s => (s.tasks?.profiles as any)?.display_name === filterMember);
    for (const sub of toApprove) {
      if (!sub.tasks) continue;
      await supabase.from('tasks').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', sub.tasks.id);
      await supabase.from('task_submissions').update({ reviewed_at: new Date().toISOString() }).eq('id', sub.id);
    }
    await loadSubmissions();
    setBatchProcessing(false);
  }

  const allMembers = Array.from(new Set(submissions.map(s => (s.tasks?.profiles as any)?.display_name).filter(Boolean)));
  const filtered = filterMember === 'all' ? submissions : submissions.filter(s => (s.tasks?.profiles as any)?.display_name === filterMember);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="px-4 pt-5 pb-4"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-black text-white">Approval Queue ✅</h1>
            <p className="text-blue-300 text-xs">{submissions.length} draft menunggu review</p>
          </div>
          {submissions.length > 0 && (
            <button onClick={handleApproveAll} disabled={batchProcessing}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-60"
              style={{ background: 'rgba(34,197,94,0.3)', border: '1px solid rgba(34,197,94,0.5)' }}>
              {batchProcessing ? '⏳' : '✅ Approve Semua'}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {['all', ...allMembers].map(m => (
          <button key={m} onClick={() => setFilterMember(m)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${filterMember === m ? 'bg-slate-800 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {m === 'all' ? `Semua (${submissions.length})` : m}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-24 space-y-3">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-36 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-gray-600 font-bold text-base">Semua bersih!</p>
            <p className="text-gray-400 text-sm">Tidak ada draft yang perlu direview</p>
          </div>
        ) : (
          filtered.map(sub => {
            const task = sub.tasks;
            if (!task) return null;
            const memberName = (task.profiles as any)?.display_name || '—';
            const accountName = (task.reddit_accounts as any)?.username || '—';
            const isProcessing = processingId === sub.id;
            const isRejecting = rejectingId === sub.id;
            return (
              <div key={sub.id} className="bg-white rounded-2xl shadow-sm overflow-hidden"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{task.subreddit}</span>
                        <span className="text-xs text-gray-400">{timeAgo(sub.submitted_at)}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{truncate(task.thread_title, 50)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">👤 {memberName} · {accountName}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-600 flex-shrink-0">Rp{(task.payment_amount/1000).toFixed(0)}rb</p>
                  </div>

                  <div className="rounded-xl p-3 mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Draft Komentar:</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{sub.draft_text}</p>
                  </div>

                  {task.thread_url && (
                    <a href={task.thread_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 font-semibold hover:text-blue-700 mb-3 block">
                      🔗 Lihat Thread ↗
                    </a>
                  )}

                  {isRejecting ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Alasan penolakan (opsional)..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-red-200 text-sm focus:outline-none focus:border-red-400 resize-none bg-red-50"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setRejectingId(null)}
                          className="flex-1 py-2 rounded-xl font-semibold text-sm text-gray-600 bg-gray-100">
                          Batal
                        </button>
                        <button onClick={() => handleReject(sub)} disabled={isProcessing}
                          className="flex-1 py-2 rounded-xl font-bold text-sm text-white bg-red-500 disabled:opacity-50">
                          {isProcessing ? '⏳' : '❌ Tolak'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRejectingId(sub.id)}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm text-red-600 bg-red-50 border border-red-200 transition-all active:scale-95">
                        ❌ Tolak
                      </button>
                      <button
                        onClick={() => handleApprove(sub)}
                        disabled={isProcessing}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                        {isProcessing ? '⏳ Memproses...' : '✅ Setujui'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
