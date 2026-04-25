import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Settings2, Clock, TrendingUp, Save, CircleCheck as CheckCircle } from 'lucide-react';

type AdminSettings = {
  id: string;
  min_reddit_age_days: number;
  min_karma: number;
  updated_at: string;
};

export default function Settings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [minAge, setMinAge] = useState('30');
  const [minKarma, setMinKarma] = useState('100');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data } = await supabase
      .from('admin_settings')
      .select('*')
      .maybeSingle();
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
    await supabase
      .from('admin_settings')
      .update({
        min_reddit_age_days: parseInt(minAge) || 30,
        min_karma: parseInt(minKarma) || 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadSettings();
  }

  const lastUpdated = settings?.updated_at
    ? new Date(settings.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="px-4 pt-5 pb-6"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
            <Settings2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Pengaturan</h1>
            <p className="text-blue-300 text-xs">Konfigurasi persyaratan Army</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 pb-28 space-y-4">
        {loading ? (
          <>
            <div className="bg-white rounded-2xl h-32 animate-pulse" />
            <div className="bg-white rounded-2xl h-32 animate-pulse" />
          </>
        ) : (
          <>
            <SettingCard
              icon={<Clock size={18} className="text-blue-500" />}
              iconBg="bg-blue-50"
              title="Minimum Umur Akun Reddit"
              subtitle="Akun Reddit harus berumur minimal X hari untuk bergabung"
              currentValue={settings?.min_reddit_age_days ?? 30}
              unit="hari"
              value={minAge}
              onChange={setMinAge}
              min={1}
              max={365}
            />
            <SettingCard
              icon={<TrendingUp size={18} className="text-emerald-500" />}
              iconBg="bg-emerald-50"
              title="Minimum Karma"
              subtitle="Karma minimum yang dibutuhkan untuk mengerjakan task"
              currentValue={settings?.min_karma ?? 100}
              unit="karma"
              value={minKarma}
              onChange={setMinKarma}
              min={0}
              max={10000}
            />

            {lastUpdated && (
              <p className="text-xs text-gray-400 text-center">Terakhir diperbarui: {lastUpdated}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: saved ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : saved ? (
                <>
                  <CheckCircle size={16} />
                  Tersimpan!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Simpan Pengaturan
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SettingCard({
  icon,
  iconBg,
  title,
  subtitle,
  currentValue,
  unit,
  value,
  onChange,
  min,
  max,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  currentValue: number;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
}) {
  const hasChanged = parseInt(value) !== currentValue;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-base font-bold text-gray-800 focus:outline-none focus:border-blue-300 transition-colors text-center"
          />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold text-gray-500">{unit}</span>
          {hasChanged && (
            <span className="text-[10px] text-amber-500 font-semibold mt-0.5">
              Belum disimpan
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">Nilai saat ini:</span>
        <span className="text-xs font-bold text-gray-600">{currentValue} {unit}</span>
      </div>
    </div>
  );
}
