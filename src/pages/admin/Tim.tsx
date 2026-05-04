import { useState, useEffect, useCallback } from 'react';
import { adminSupabase as supabase } from '../../lib/supabase';

interface ArmyMember {
  id: string;
  display_name: string | null;
  reddit_profile_url: string | null;
  whatsapp_number: string | null;
  reddit_karma: number | null;
  account_age_days: number | null;
  email: string | null;
  auth_created_at: string | null;
}

export default function Tim() {
  const [members, setMembers] = useState<ArmyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    const { data, error: err } = await supabase.rpc('get_army_members_admin');
    if (err) {
      setError(err.message);
    } else {
      setMembers((data as ArmyMember[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
    const interval = setInterval(loadMembers, 30000);
    return () => clearInterval(interval);
  }, [loadMembers]);

  async function handleRemove(memberId: string) {
    setRemoving(memberId);
    setConfirmId(null);
    const { error: err } = await supabase.rpc('delete_army_member', { p_user_id: memberId });
    if (err) {
      alert('Gagal hapus: ' + err.message);
      setRemoving(null);
    } else {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setRemoving(null);
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  function shortUrl(url: string | null) {
    if (!url) return null;
    const clean = url.replace(/^https?:\/\/(www\.)?reddit\.com/, '').replace(/\/$/, '');
    return clean || url;
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Dark gradient header */}
      <div
        className="px-4 pt-5 pb-4"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)', borderRadius: '0 0 24px 24px' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">Tim Army 👥</h1>
            <p className="text-blue-300 text-xs mt-0.5">
              {loading ? 'Memuat...' : `${members.length} anggota terdaftar`}
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); loadMembers(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-4 pb-32">
        {error && (
          <div className="rounded-xl px-4 py-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400 text-sm">Memuat data tim...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Belum ada anggota terdaftar
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Display Name','Reddit Profile','WhatsApp','Karma','Umur Akun','Email','Daftar','Aksi'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: '11px',
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      {/* Display Name */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                          {m.display_name || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                        </span>
                      </td>

                      {/* Reddit Profile */}
                      <td style={{ padding: '10px 14px' }}>
                        {m.reddit_profile_url ? (
                          <a
                            href={m.reddit_profile_url.startsWith('http') ? m.reddit_profile_url : `https://reddit.com${m.reddit_profile_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#f97316', textDecoration: 'none', fontSize: '12px', fontWeight: 500 }}
                          >
                            {shortUrl(m.reddit_profile_url)}
                          </a>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* WhatsApp */}
                      <td style={{ padding: '10px 14px' }}>
                        {m.whatsapp_number ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 9999,
                            fontSize: '11px',
                            fontWeight: 600,
                            background: '#dcfce7',
                            color: '#15803d',
                          }}>
                            {m.whatsapp_number}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Karma */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {m.reddit_karma != null ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 9999,
                            fontSize: '11px',
                            fontWeight: 600,
                            background: '#fef3c7',
                            color: '#92400e',
                          }}>
                            {m.reddit_karma.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Account Age */}
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <span style={{ color: '#475569', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                          {m.account_age_days != null ? `${m.account_age_days} hari` : '—'}
                        </span>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>
                          {m.email || '—'}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                          {formatDate(m.auth_created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {confirmId === m.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleRemove(m.id)}
                              disabled={removing === m.id}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                background: removing === m.id ? '#fca5a5' : '#ef4444',
                                color: '#fff',
                                border: 'none',
                                cursor: removing === m.id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {removing === m.id ? '...' : 'Ya, Hapus'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                background: '#f1f5f9',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                              }}
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(m.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 500,
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              cursor: 'pointer',
                            }}
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
