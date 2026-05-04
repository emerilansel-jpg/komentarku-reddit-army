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
    if (!url) return '—';
    const clean = url.replace(/^https?:\/\/(www\.)?reddit\.com/, '').replace(/\/$/, '');
    return clean || url;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60 text-sm">Memuat data tim...</div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-white font-bold text-lg">Tim Army</h1>
          <p className="text-white/40 text-xs mt-0.5">{members.length} anggota terdaftar</p>
        </div>
        <button
          onClick={() => { setLoading(true); loadMembers(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm text-red-300"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
          Error: {error}
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm">
          Belum ada anggota terdaftar
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '13px',
            color: '#fff',
          }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                {['Display Name','Reddit Profile','WhatsApp','Karma','Umur Akun','Email','Daftar','Aksi'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => (
                <tr key={m.id} style={{
                  background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                  {/* Display Name */}
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>
                      {m.display_name || <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>—</span>}
                    </div>
                  </td>

                  {/* Reddit Profile URL */}
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {m.reddit_profile_url ? (
                      <a
                        href={m.reddit_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#f97316', textDecoration: 'none', fontSize: '12px' }}
                        title={m.reddit_profile_url}
                      >
                        {shortUrl(m.reddit_profile_url)}
                      </a>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>—</span>
                    )}
                  </td>

                  {/* WhatsApp */}
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: m.whatsapp_number ? '#4ade80' : 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                      {m.whatsapp_number || '—'}
                    </span>
                  </td>

                  {/* Reddit Karma */}
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                    <span style={{ color: m.reddit_karma ? '#fbbf24' : 'rgba(255,255,255,0.3)', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                      {m.reddit_karma != null ? m.reddit_karma.toLocaleString('id-ID') : '—'}
                    </span>
                  </td>

                  {/* Account Age Days */}
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                      {m.account_age_days != null ? `${m.account_age_days}h` : '—'}
                    </span>
                  </td>

                  {/* Email */}
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
                      {m.email || '—'}
                    </span>
                  </td>

                  {/* Auth Created At */}
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                      {formatDate(m.auth_created_at)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
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
                            background: removing === m.id ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.8)',
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
                            background: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.7)',
                            border: 'none',
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
                          background: 'rgba(239,68,68,0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239,68,68,0.3)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
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
      )}
    </div>
  );
}
