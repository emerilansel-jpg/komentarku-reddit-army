import { useEffect, useRef, useState } from 'react';
import { supabase, Task, TaskSubmission, Profile } from '../../lib/supabase';

interface KerjakanTaskProps {
  task: Task;
  profile: Profile;
  onBack: () => void;
}

export default function KerjakanTask({ task, profile, onBack }: KerjakanTaskProps) {
  const [draftText, setDraftText] = useState('');
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [submission, setSubmission] = useState<TaskSubmission | null>(null);
  const [briefOpen, setBriefOpen] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [markingPosted, setMarkingPosted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task>(task);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const redditAccount = (task as any).reddit_accounts;
  const MAX_CHARS = 10000;

  useEffect(() => {
    loadSubmission();
    setDraftText(task.admin_brief || '');
  }, [task.id]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [draftText]);

  async function loadSubmission() {
    const { data } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('task_id', task.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSubmission(data);
      setDraftText(data.draft_text);
    }

    const { data: taskData } = await supabase
      .from('tasks')
      .select('*, reddit_accounts(*)')
      .eq('id', task.id)
      .maybeSingle();
    if (taskData) setCurrentTask(taskData);
  }

  async function handleSubmit() {
    // Admin draft is the source of truth; user just clicks submit
    setSubmitting(true);

    await supabase.from('task_submissions').insert({
      task_id: task.id,
      submitted_by: profile.id,
      draft_text: (draftText.trim() || task.admin_brief || ''),
    });

    await supabase
      .from('tasks')
      .update({ status: 'submitted', updated_at: new Date().toISOString() })
      .eq('id', task.id);

    await loadSubmission();
    setSubmitting(false);
  }

  async function handleMarkPosted() {
    setMarkingPosted(true);
    await supabase
      .from('tasks')
      .update({ status: 'posted', updated_at: new Date().toISOString() })
      .eq('id', task.id);

    await supabase.from('earnings').insert({
      army_member_id: profile.id,
      task_id: task.id,
      amount: task.payment_amount,
      status: 'pending',
    });

    await loadSubmission();
    setMarkingPosted(false);
  }

  function handleCopy() {
    if (submission?.draft_text) {
      navigator.clipboard.writeText(submission.draft_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const isApproved = currentTask.status === 'approved';
  const isPosted = currentTask.status === 'posted';
  const isSubmitted = currentTask.status === 'submitted';

  return (
    <div className="flex flex-col min-h-full pb-24">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-600 font-bold text-lg transition-colors hover:bg-gray-200">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm truncate">{task.thread_title}</p>
          <p className="text-xs text-gray-400">{task.subreddit} · {redditAccount?.username}</p>
        </div>
        <span className="text-sm font-black text-emerald-600">Rp{(task.payment_amount / 1000).toFixed(0)}rb</span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="rounded-2xl overflow-hidden shadow-sm"
          style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(254, 252, 232, 0.8)' }}>
          <button
            onClick={() => setBriefOpen(!briefOpen)}
            className="w-full flex items-center justify-between px-4 py-3 font-bold text-amber-800 bg-amber-50/50">
            <span className="flex items-center gap-2">
              <span>📋</span>
              <span className="text-sm">Brief dari Admin</span>
            </span>
            <span className="text-lg transition-transform duration-200" style={{ transform: briefOpen ? 'rotate(180deg)' : '' }}>
              ⌄
            </span>
          </button>
          {briefOpen && (
            <div className="px-4 pb-4">
              <p className="text-amber-900 text-sm leading-relaxed">
                {task.admin_brief || 'Tidak ada brief spesifik. Buat komentar yang natural dan relevan dengan topik.'}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Subreddit</p>
              <p className="font-bold text-gray-800">{task.subreddit}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-medium">Akun Reddit</p>
              <p className="font-bold text-gray-800">{redditAccount?.username || '—'}</p>
            </div>
          </div>
          {task.thread_url && (
            <a
              href={task.thread_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm text-blue-600 bg-blue-50 border border-blue-200 transition-colors hover:bg-blue-100">
              🔗 Buka Thread di Reddit ↗
            </a>
          )}
        </div>

        {isApproved && submission && (
          <div className="rounded-2xl p-4 glow-green" style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)', border: '2px solid #22c55e' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎉</span>
              <p className="font-black text-emerald-800">Draft Disetujui Admin!</p>
            </div>
            <div className="bg-white/70 rounded-xl p-3 mb-3">
              <p className="text-emerald-900 text-sm leading-relaxed">{submission.draft_text}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-emerald-700 bg-white border-2 border-emerald-300 transition-all active:scale-95">
                {copied ? '✅ Tersalin!' : '📋 Copy Teks'}
              </button>
              {task.thread_url && (
                <a
                  href={task.thread_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white text-center transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
                  🔗 Buka Thread ↗
                </a>
              )}
            </div>
            {!isPosted && (
              <button
                onClick={handleMarkPosted}
                disabled={markingPosted}
                className="w-full mt-2 py-3 rounded-xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 4px 20px rgba(22,163,74,0.35)' }}>
                {markingPosted ? '⏳ Menyimpan...' : '✔ Sudah Diposting!'}
              </button>
            )}
          </div>
        )}

        {isPosted && (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '2px solid #10b981' }}>
            <p className="text-3xl mb-2">🏆</p>
            <p className="font-black text-emerald-800 text-lg">Misi Selesai!</p>
            <p className="text-emerald-600 text-sm">Rp{(task.payment_amount / 1000).toFixed(0)}rb sedang diproses</p>
          </div>
        )}

        {isSubmitted && (
          <div className="rounded-2xl p-4 text-center" style={{ background: '#eff6ff', border: '2px solid #93c5fd' }}>
            <p className="text-3xl mb-2">⏳</p>
            <p className="font-black text-blue-800">Menunggu Review Admin</p>
            <p className="text-blue-600 text-sm mt-1">Draftmu sedang diperiksa</p>
            {submission && (
              <div className="bg-white/70 rounded-xl p-3 mt-3 text-left">
                <p className="text-xs text-blue-400 font-medium mb-1">Draft yang dikumpulkan:</p>
                <p className="text-blue-900 text-sm leading-relaxed">{submission.draft_text}</p>
              </div>
            )}
          </div>
        )}

        {!isApproved && !isPosted && !isSubmitted && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-gray-800 text-sm">📋 Draft Komentar dari Admin</label>
                <button type="button" onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(draftText || task.admin_brief || '');
                    setCopiedDraft(true);
                    setTimeout(() => setCopiedDraft(false), 2000);
                  } catch (e) { console.warn('clipboard fail', e); }
                }} className={"text-xs font-bold px-3 py-1.5 rounded-lg transition-colors " + (copiedDraft ? "bg-green-500 text-white" : "bg-orange-500 text-white hover:bg-orange-600")}>
                  {copiedDraft ? '✅ Tersalin!' : '📋 Copy Draft'}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {draftText || task.admin_brief || 'Admin belum nyiapin draft. Tulis komentar yang natural sesuai brief di atas.'}
              </div>
              <p className="text-xs text-gray-500 mt-1.5 italic">Langsung copy → buka thread Reddit di atas → paste sebagai komentar baru. Gak perlu ngetik ulang.</p>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl font-black text-base text-white transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: draftText.trim() ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#e5e7eb',
                  boxShadow: draftText.trim() ? '0 4px 20px rgba(34,197,94,0.35)' : 'none'
                }}>
                {submitting ? '⏳ Mengirim...' : '🚀 Kirim untuk Approval'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
