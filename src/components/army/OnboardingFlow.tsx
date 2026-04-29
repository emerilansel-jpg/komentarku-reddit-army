import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { awardQuickWin, QUICK_WIN_POINTS } from '@/lib/quickWins';

type StepDef = {
  key: string;
  title: string;
  bonus: number;
};

const STEPS: StepDef[] = [
  { key: 'welcome',   title: 'Selamat Datang!',           bonus: 25000 },
  { key: 'warp',      title: 'Pasang Cloudflare WARP',    bonus: 10000 },
  { key: 'reddit',    title: 'Buat Akun Reddit',          bonus: 10000 },
  { key: 'redditUrl', title: 'URL Profil Reddit Kamu',    bonus: 5000 },
  { key: 'done',      title: 'Orientasi Selesai!',        bonus: 0    },
];

const RUPIAH = (n: number) => 'Rp' + n.toLocaleString('id-ID');

export default function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [warpOn, setWarpOn] = useState(false);
  const [redditOk, setRedditOk] = useState(false);
  const [redditUrl, setRedditUrl] = useState('');
  const [showUrlHelp, setShowUrlHelp] = useState(false);
  const [error, setError] = useState('');
  const [redditCheckStatus, setRedditCheckStatus] = useState("idle");
  const [redditStats, setRedditStats] = useState(null);
  const [redditError, setRedditError] = useState("");
  const [waNumber, setWaNumber] = useState("");

  // --- Resume state: load onboarding_step from Supabase ---
  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('army_profiles')
        .select('onboarding_step, display_name, reddit_profile_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setStep(data.onboarding_step ?? 0);
        if (data.display_name) setDisplayName(data.display_name);
        if (data.reddit_profile_url) { setRedditUrl(data.reddit_profile_url); setRedditOk(true); }
      }
      setLoading(false);
    })();
  }, [user]);

  const persistStep = async (next: number) => {
    if (!user) return;
    await supabase.from('army_profiles').update({ onboarding_step: next }).eq('user_id', user.id);
  };

  const fire = () => confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });

  const runningTotal = STEPS.slice(0, step + 1).reduce((s, x) => s + x.bonus, 0);
  const stepBonus = STEPS[step]?.bonus ?? 0;

  const goNext = async () => {
    const next = Math.min(step + 1, STEPS.length - 1);
    setStep(next);
    fire();
    await persistStep(next);
  };

  const goBack = async () => {
    const prev = Math.max(step - 1, 0);
    setStep(prev);
    await persistStep(prev);
  };

  const validateRedditUrl = (u: string) => {
    const n = parseRedditInput(u);
    return !!n;
  };

    function parseRedditInput(input) {
    const v = (input || "").trim();
    if (!v) return null;
    const urlRe = new RegExp("reddit\\.com\\/(?:user|u)\\/([\\w_-]+)", "i");
    const urlMatch = v.match(urlRe);
    if (urlMatch) return urlMatch[1];
    const httpRe = new RegExp("^https?:\\/\\/");
    const uPathRe = new RegExp("^\\/?u\\/", "i");
    const atRe = new RegExp("^@");
    const cleaned = v.replace(httpRe, "").replace(uPathRe, "").replace(atRe, "");
    const validRe = new RegExp("^[\\w_-]+$");
    return validRe.test(cleaned) ? cleaned : null;
  }

  async function fetchRedditStats(input) {
    const username = parseRedditInput(input);
    if (!username) {
      setRedditCheckStatus("error");
      setRedditError("Format tidak dikenal. Contoh: u/Username atau https://reddit.com/user/Username");
      setRedditStats(null);
      return;
    }
    setRedditCheckStatus("loading");
    setRedditError("");
    const path = "/user/" + username + "/about.json";
    const baseUrl = "https://www.reddit.com" + path;
    const tryUrls = [
      "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(baseUrl),
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(baseUrl),
      "https://corsproxy.org/?" + encodeURIComponent(baseUrl),
      "https://thingproxy.freeboard.io/fetch/" + baseUrl,
      baseUrl,
      "https://api.reddit.com" + path,
    ];
    for (const url of tryUrls) {
      try {
        const r = await fetch(url, { headers: { "Accept": "application/json" } });
        if (!r.ok) continue;
        const j = await r.json();
        const d = j.data || j;
        if (!d || (d.link_karma === undefined && d.comment_karma === undefined)) continue;
        const karma = (d.link_karma || 0) + (d.comment_karma || 0);
        const ageDays = d.created_utc ? Math.floor((Date.now()/1000 - d.created_utc) / 86400) : 0;
        setRedditStats({ username: username, karma: karma, ageDays: ageDays });
        setRedditCheckStatus("ok");
        return;
      } catch (e) { continue; }
    }
    // Last-ditch: verify user exists via HTML page (Reddit aggressively rate-limits JSON for low-karma accounts but HTML 200s)
    try {
      const htmlUrl = "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent("https://www.reddit.com/user/" + username);
      const hr = await fetch(htmlUrl);
      if (hr.ok) {
        const html = await hr.text();
        if (!html.includes('"error":404') && !html.includes('Sorry, nobody on Reddit goes by that name')) {
          // User confirmed exists. Accept onboarding with karma=0; can be refreshed later.
          setRedditStats({ username: username, karma: 0, ageDays: 0 });
          setRedditCheckStatus("ok");
          return;
        }
      }
    } catch (htmlErr) {}
    setRedditCheckStatus("error");
    setRedditError("Akun u/" + username + " ga ketemu di Reddit, ATAU Reddit lagi rate-limit. Pastiin: (1) spelling bener (case-sensitive), (2) akunnya udah dibuat di reddit.com. Cek manual: reddit.com/user/" + username);
    setRedditStats(null);
  }

  const handleFinish = async () => {
    if (!user) return;
    await supabase
      .from('army_profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: STEPS.length - 1,
        display_name: displayName.trim() || undefined,
        reddit_profile_url: redditUrl.trim() || undefined,
        whatsapp_number: waNumber || null,
      })
      .eq('user_id', user.id);
    await awardQuickWin(user.id, 'profile_complete', QUICK_WIN_POINTS.profile_complete, 'Orientasi selesai!');
    fire();
    onComplete?.();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200">
        <div>Memuat orientasi kamu…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 px-4 py-6 md:py-10">
      <div className="max-w-xl mx-auto">
        {/* Running saldo header (sticky-ish) */}
        <div className="sticky top-0 z-10 bg-slate-800/90 backdrop-blur rounded-xl p-4 mb-5 border border-emerald-500/30">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400">💰 Saldo kamu</div>
              <div className="text-2xl font-bold text-emerald-400 transition-all">{RUPIAH(runningTotal)}</div>
            </div>
            {stepBonus > 0 && (
              <div className="text-sm text-emerald-300">
                +{RUPIAH(stepBonus)} dari step ini
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= step ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Back button */}
        {step > 0 && (
          <button
            onClick={goBack}
            className="mb-3 text-sm text-slate-400 hover:text-slate-200 transition"
          >
            ← Kembali
          </button>
        )}

        {/* Step content card */}
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
          <div className="text-xs uppercase tracking-wider text-emerald-400 mb-1">
            Step {step + 1} dari {STEPS.length}
          </div>
          <h1 className="text-2xl font-bold mb-4">{STEPS[step].title}</h1>

          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-slate-300">
                Hai! Selamat datang di <b>PeTa</b>. Kamu bakal dibayar buat ngerjain misi mudah di Reddit (upvote, komentar, thread).
              </p>
              <p className="text-slate-300">
                Orientasi singkat ini akan kasih kamu <b>{RUPIAH(50000)} gratis</b> sebagai saldo awal. ±3 menit aja.
              </p>
              
              <button
                onClick={goNext}
                disabled={false}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-900 font-bold py-4 px-5 rounded-xl text-lg transition animate-pulse-slow"
              >
                🚀 Klaim Bonus {RUPIAH(25000)} Sekarang!
              </button>
              <div className="text-center text-xs text-slate-400">
                Gratis untuk semua anggota baru • ±3 menit selesai
              </div>
            </div>
          )}

          {/* Step 1 — WARP */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-500/10 border border-blue-400/40 p-3 text-sm text-blue-100">
                💡 <b>Silakan install WARP dulu baru lanjut ke step berikutnya.</b>
                <br />Tutup page ini sementara kalau perlu — progress kamu akan tersimpan. Atau buka di device lain: <b>HP untuk WARP + Reddit, laptop untuk PeTa</b> (atau sebaliknya).
              </div>
              <p className="text-slate-300">
                Reddit diblokir ISP di Indonesia. Kita pakai <b>Cloudflare WARP (1.1.1.1)</b> — gratis, aman, resmi.
              </p>
              <a
                href="https://one.one.one.one/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 px-5 rounded-xl text-center transition"
              >
                📥 Buka 1.1.1.1 (Download WARP)
              </a>
              <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1">
                <li>Download & install WARP</li>
                <li>Buka app, tekan tombol besar di tengah sampai "Connected"</li>
                <li>Balik ke sini, centang konfirmasi di bawah</li>
              </ol>
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={warpOn}
                  onChange={e => setWarpOn(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>✅ Saya sudah install & turn ON WARP</span>
              </label>
              <button
                onClick={goNext}
                disabled={!warpOn}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-900 font-bold py-3 rounded-xl transition"
              >
                Lanjut →
              </button>
            </div>
          )}

          {/* Step 2 — Reddit account */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-500/10 border border-blue-400/40 p-3 text-sm text-blue-100">
                💡 <b>Silakan daftar Reddit dulu baru lanjut.</b>
                <br />Tutup page ini sementara kalau perlu — progress tersimpan. Atau pakai device lain (HP untuk WARP+Reddit, laptop untuk PeTa).
              </div>
              <p className="text-slate-300">
                Tips pilih username: <b>jangan bot-like</b>. Hindari angka random panjang. Pilih interest natural (animals, gaming, news, dll).
              </p>
              <a
                href="https://www.reddit.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 px-5 rounded-xl text-center transition"
              >
                📝 Daftar di Reddit
              </a>
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redditOk}
                  onChange={e => setRedditOk(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>✅ Saya sudah buat akun Reddit</span>
              </label>
              <button
                onClick={goNext}
                disabled={!redditOk}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-900 font-bold py-3 rounded-xl transition"
              >
                Lanjut →
              </button>
            </div>
          )}

          {/* Step 3 — Reddit URL */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-slate-300">
                Masukkan URL profil Reddit kamu. Kita butuh ini untuk tracking karma & verifikasi.
              </p>
              <div className="space-y-3">
              <input
                type="text"
                value={redditUrl}
                onChange={(e) => setRedditUrl(e.target.value)}
                onBlur={() => fetchRedditStats(redditUrl)}
                placeholder="u/Username atau https://reddit.com/user/Username"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
              {redditCheckStatus === "loading" && (
                <div className="text-sm text-blue-300">⏳ Cek karma & umur akun...</div>
              )}
              {redditCheckStatus === "ok" && redditStats && (
                <div className="rounded-xl bg-emerald-900/40 border border-emerald-700 p-3 text-sm">
                  <div className="text-emerald-200">✅ Akun ditemukan: <strong>u/{redditStats.username}</strong></div>
                  <div className="text-emerald-100 mt-1">🌟 Karma: <strong>{redditStats.karma.toLocaleString("id-ID")}</strong></div>
                  <div className="text-emerald-100">📅 Umur akun: <strong>{redditStats.ageDays} hari</strong></div>
                </div>
              )}
              {redditCheckStatus === "error" && (
                <div className="text-sm text-red-300">❌ {redditError}</div>
              )}
              <div>
                <label className="block text-sm text-slate-300 mb-1">Nomor WhatsApp (opsional, untuk admin contact)</label>
                <input
                  type="tel"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
              {error && <div className="text-red-400 text-sm">{error}</div>}
              <button
                onClick={() => setShowUrlHelp(s => !s)}
                className="text-sm text-emerald-400 hover:underline"
              >
                {showUrlHelp ? '▼' : '▶'} Cara dapat URL profil Reddit
              </button>
              {showUrlHelp && (
                <ol className="list-decimal list-inside text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg space-y-1">
                  <li>Buka Reddit (pastikan WARP ON)</li>
                  <li>Klik foto / ikon profil kamu di pojok kanan atas</li>
                  <li>Klik username kamu di dropdown menu</li>
                  <li>Copy URL dari address bar browser</li>
                </ol>
              )}
              <button
                onClick={() => {
                  if (!validateRedditUrl(redditUrl)) {
                    setRedditError("Ketik username Reddit kamu aja (contoh: emeril_123) atau paste full link profile kamu.");
                    return;
                  }
                  goNext();
                }}
                disabled={!redditUrl.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-900 font-bold py-3 rounded-xl transition"
              >
                Simpan & Lanjut →
              </button>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div className="space-y-4 text-center">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-bold">Orientasi selesai!</h2>
              <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4 text-left">
                <div className="text-sm text-slate-300 mb-2">Bonus kamu:</div>
                <ul className="text-sm space-y-1">
                  <li>• Welcome: +{RUPIAH(25000)}</li>
                  <li>• Pasang WARP: +{RUPIAH(10000)}</li>
                  <li>• Daftar Reddit: +{RUPIAH(10000)}</li>
                  <li>• URL profil Reddit: +{RUPIAH(5000)}</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-emerald-500/30 flex justify-between font-bold text-emerald-300">
                  <span>Total</span>
                  <span>{RUPIAH(50000)}</span>
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                Misi Pertama kamu — <b>Bangun Karma Reddit</b> — sudah menunggu di dashboard 💪
              </p>
              <button
                onClick={handleFinish}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 rounded-xl text-lg transition"
              >
                💰 Mulai Cuan di Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
