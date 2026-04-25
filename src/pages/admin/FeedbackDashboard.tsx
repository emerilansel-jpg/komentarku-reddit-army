import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

type FeedbackRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  screenshot_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles?: { display_name: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  bug: '🐛 Bug',
  saran: '💡 Saran',
  pertanyaan: '❓ Pertanyaan',
  lainnya: '📌 Lainnya',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  open: { label: 'Baru', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  in_progress: { label: 'Diproses', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  resolved: { label: 'Selesai', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved'];

export default function FeedbackDashboard() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('feedback')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false });
    if (data) setRows(data as FeedbackRow[]);
    setLoading(false);
  }

  async function updateFeedback(id: string, status: string, adminNotes: string) {
    setSaving(id);
    await supabase
      .from('feedback')
      .update({ status, admin_notes: adminNotes || null })
      .eq('id', id);
    await load();
    setSaving(null);
    setExpandedId(null);
  }

  const filtered = rows.filter(r => {
    const typeOk = filterType === 'all' || r.type === filterType;
    const statusOk = filterStatus === 'all' || r.status === filterStatus;
    return typeOk && statusOk;
  });

  const counts = {
    open: rows.filter(r => r.status === 'open').length,
    in_progress: rows.filter(r => r.status === 'in_progress').length,
    resolved: rows.filter(r => r.status === 'resolved').length,
  };

  function relTime(ts: string) {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-5 pb-5"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <MessageSquare size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Feedback & Laporan</h1>
            <p className="text-slate-400 text-xs">{rows.length} total laporan</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'open', label: 'Baru', color: 'text-blue-300' },
            { key: 'in_progress', label: 'Diproses', color: 'text-amber-300' },
            { key: 'resolved', label: 'Selesai', color: 'text-emerald-300' },
          ].map(s => (
            <div key={s.key} className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className={`font-black text-lg ${s.color}`}>{counts[s.key as keyof typeof counts]}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none">
          <option value="all">Semua Tipe</option>
          <option value="bug">Bug</option>
          <option value="saran">Saran</option>
          <option value="pertanyaan">Pertanyaan</option>
          <option value="lainnya">Lainnya</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none">
          <option value="all">Semua Status</option>
          <option value="open">Baru</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
        </select>
      </div>

      <div className="flex-1 px-4 pb-24 space-y-3">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-gray-400 text-sm">Tidak ada laporan</p>
          </div>
        ) : (
          filtered.map(row => {
            const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.open;
            const isExpanded = expandedId === row.id;
            const notes = editingNotes[row.id] ?? (row.admin_notes || '');
            const currentStatus = editingNotes[`status_${row.id}`] ?? row.status;

            return (
              <div key={row.id} className="bg-white rounded-2xl overflow-hidden"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <button
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-gray-500">
                        {TYPE_LABEL[row.type] || row.type}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400">{relTime(row.created_at)}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 truncate">{row.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {row.profiles?.display_name || 'Unknown'}
                    </p>
                  </div>
                  {isExpanded
                    ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                    : <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                  }
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-1">Deskripsi</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{row.description}</p>
                    </div>

                    {row.screenshot_url && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-1">Screenshot</p>
                        <a
                          href={row.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 underline break-all">
                          {row.screenshot_url}
                        </a>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Update Status</label>
                      <div className="flex gap-2 flex-wrap">
                        {STATUS_OPTIONS.map(s => {
                          const sc = STATUS_CONFIG[s];
                          const isSelected = currentStatus === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setEditingNotes(prev => ({ ...prev, [`status_${row.id}`]: s }))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                isSelected ? `${sc.bg} ${sc.text} ${sc.border}` : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}>
                              {sc.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">Catatan Admin</label>
                      <textarea
                        value={notes}
                        onChange={e => setEditingNotes(prev => ({ ...prev, [row.id]: e.target.value }))}
                        rows={2}
                        placeholder="Tambah catatan..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => updateFeedback(row.id, currentStatus, notes)}
                      disabled={saving === row.id}
                      className="w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all active:scale-95 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
                      {saving === row.id ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
