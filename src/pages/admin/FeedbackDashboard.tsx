import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

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

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  open:        { label: 'Baru',     bg: '#dbeafe', color: '#1d4ed8' },
  in_progress: { label: 'Diproses', bg: '#fef9c3', color: '#854d0e' },
  resolved:    { label: 'Selesai',  bg: '#dcfce7', color: '#15803d' },
};

function relTime(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function FeedbackDashboard() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded] = useState<FeedbackRow | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('feedback').select('*, profiles(display_name)').order('created_at', { ascending: false });
    if (data) setRows(data as FeedbackRow[]);
    setLoading(false);
  }

  function openDetail(row: FeedbackRow) {
    setExpanded(row);
    setEditStatus(row.status);
    setEditNotes(row.admin_notes || '');
  }

  async function handleSave() {
    if (!expanded) return;
    setSaving(true);
    await supabase.from('feedback').update({ status: editStatus, admin_notes: editNotes || null }).eq('id', expanded.id);
    setSaving(false);
    setExpanded(null);
    load();
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

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>Feedback & Laporan</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>{rows.length} total laporan dari anggota</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { key: 'open', label: 'Baru', icon: '🔵', color: '#1d4ed8', bg: '#dbeafe' },
          { key: 'in_progress', label: 'Diproses', icon: '🟡', color: '#854d0e', bg: '#fef9c3' },
          { key: 'resolved', label: 'Selesai', icon: '🟢', color: '#15803d', bg: '#dcfce7' },
        ].map(s => (
          <div key={s.key} style={{
            background: 'white', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            border: filterStatus === s.key ? `2px solid ${s.color}` : '2px solid transparent',
          }} onClick={() => setFilterStatus(prev => prev === s.key ? 'all' : s.key)}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {s.icon}
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>{counts[s.key as keyof typeof counts]}</p>
              <p style={{ fontSize: 12, color: s.color, fontWeight: 700, margin: 0 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white', cursor: 'pointer' }}>
          <option value="all">Semua Tipe</option>
          <option value="bug">Bug</option>
          <option value="saran">Saran</option>
          <option value="pertanyaan">Pertanyaan</option>
          <option value="lainnya">Lainnya</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white', cursor: 'pointer' }}>
          <option value="all">Semua Status</option>
          <option value="open">Baru</option>
          <option value="in_progress">Diproses</option>
          <option value="resolved">Selesai</option>
        </select>
        <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', marginLeft: 'auto' }}>{filtered.length} laporan</span>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <p>Tidak ada laporan</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Anggota', 'Tipe', 'Judul', 'Status', 'Waktu', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const sc = STATUS_CONFIG[row.status] || STATUS_CONFIG.open;
                const member = (row.profiles as { display_name: string } | null)?.display_name || 'Unknown';
                return (
                  <tr key={row.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => openDetail(row)}
                  >
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{member}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{TYPE_LABEL[row.type] || row.type}</span>
                    </td>
                    <td style={{ padding: '12px 20px', maxWidth: 280 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</p>
                      {row.admin_notes && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {row.admin_notes}</p>}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>{relTime(row.created_at)}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>Detail →</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {expanded && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
          onClick={() => setExpanded(null)}>
          <div style={{ background: 'white', borderRadius: 18, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>{expanded.title}</h3>
              <button onClick={() => setExpanded(null)}
                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b' }}>
                {TYPE_LABEL[expanded.type] || expanded.type}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b' }}>
                {(expanded.profiles as { display_name: string } | null)?.display_name || 'Unknown'}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center' }}>{relTime(expanded.created_at)}</span>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 }}>{expanded.description}</p>
            </div>

            {expanded.screenshot_url && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Screenshot</p>
                <a href={expanded.screenshot_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none' }}>🔗 Lihat screenshot</a>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>Update Status</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <button key={k} onClick={() => setEditStatus(k)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: `2px solid ${editStatus === k ? v.color : '#e2e8f0'}`,
                      background: editStatus === k ? v.bg : 'white',
                      color: editStatus === k ? v.color : '#94a3b8',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>{v.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Catatan Admin</p>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Tambah catatan..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setExpanded(null)}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#0f172a', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
