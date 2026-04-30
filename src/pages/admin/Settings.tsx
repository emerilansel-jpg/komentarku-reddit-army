import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type AdminSettings = {
  id: string;
  min_reddit_age_days: number;
  min_karma: number;
  updated_at: string;
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #e2e8f0',
  fontSize: 15, fontWeight: 700, textAlign: 'center', outline: 'none',
  boxSizing: 'border-box', background: 'white', color: '#0f172a',
};

export default function Settings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minAge, setMinAge] = useState('30');
  const [minKarma, setMinKarma] = useState('100');

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    const { data } = await supabase.from('admin_settings').select('*').maybeSingle();
    if (data) {
      setSettings(data);
      setMinAge(String(data.min_reddit_age_days));
      setMinKarma(String(data.min_karma));
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await supabase.from('admin_settings').update({
      min_reddit_age_days: parseInt(minAge) || 30,
      min_karma: parseInt(minKarma) || 100,
      updated_at: new Date().toISOString(),
    }).eq('id', settings.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadSettings();
  }

  const lastUpdated = settings?.updated_at
    ? new Date(settings.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>Pengaturan</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Konfigurasi persyaratan keanggotaan Army</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2].map(i => <div key={i} style={{ background: 'white', borderRadius: 14, height: 110, opacity: 0.6 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            {
              icon: '⏱️', iconBg: '#dbeafe', label: 'Minimum Umur Akun Reddit', unit: 'hari',
              desc: 'Akun Reddit harus berumur minimal X hari untuk bergabung sebagai anggota.',
              value: minAge, current: settings?.min_reddit_age_days ?? 30, onChange: setMinAge,
              min: 1, max: 365,
            },
            {
              icon: '📈', iconBg: '#dcfce7', label: 'Minimum Karma', unit: 'karma',
              desc: 'Total karma minimum yang dibutuhkan anggota untuk mengerjakan task.',
              value: minKarma, current: settings?.min_karma ?? 100, onChange: setMinKarma,
              min: 0, max: 10000,
            },
          ].map(field => {
            const hasChanged = parseInt(field.value) !== field.current;
            return (
              <div key={field.label} style={{ background: 'white', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: field.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {field.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>{field.label}</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, lineHeight: 1.5 }}>{field.desc}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="number" min={field.min} max={field.max}
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    style={{ ...inputStyle, width: 120 }}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b', margin: 0 }}>{field.unit}</p>
                    {hasChanged && <p style={{ fontSize: 11, color: '#f59e0b', margin: '2px 0 0', fontWeight: 600 }}>Belum disimpan</p>}
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Nilai saat ini</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0 }}>{field.current} {field.unit}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {lastUpdated && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
              Terakhir diperbarui: {lastUpdated}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '13px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
              background: saved ? '#dcfce7' : '#0f172a',
              color: saved ? '#15803d' : 'white',
              opacity: saving ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {saving ? (
              <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Menyimpan...</>
            ) : saved ? '✅ Pengaturan Tersimpan!' : '💾 Simpan Pengaturan'}
          </button>
        </div>
      )}
    </div>
  );
}
