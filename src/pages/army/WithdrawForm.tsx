import { useEffect, useState } from 'react';
import { supabase, Profile } from '../../lib/supabase';
import { ArrowLeft, Banknote, CircleCheck as CheckCircle } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'Bank Transfer - BCA', label: 'Bank Transfer - BCA' },
  { value: 'Bank Transfer - BNI', label: 'Bank Transfer - BNI' },
  { value: 'Bank Transfer - BRI', label: 'Bank Transfer - BRI' },
  { value: 'Bank Transfer - Mandiri', label: 'Bank Transfer - Mandiri' },
  { value: 'GoPay', label: 'GoPay' },
  { value: 'OVO', label: 'OVO' },
  { value: 'DANA', label: 'DANA' },
];

interface WithdrawFormProps {
  profile: Profile;
  onBack: () => void;
}

type Step = 'form' | 'confirm' | 'success';

export default function WithdrawForm({ profile, onBack }: WithdrawFormProps) {
  const [balance, setBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState(profile.display_name || '');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadBalance();
  }, [profile.id]);

  async function loadBalance() {
    setLoadingBalance(true);
    const { data } = await supabase
      .from('earnings')
      .select('amount, type, status')
      .eq('army_member_id', profile.id);

    if (data) {
      const earned = data
        .filter((r: { type: string; status: string }) => r.type !== 'withdrawal' && (r.status === 'paid' || r.status === 'pending' || r.status === 'completed'))
        .reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);
      const withdrawn = data
        .filter((r: { type: string; status: string }) => r.type === 'withdrawal' && r.status !== 'rejected')
        .reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);
      setBalance(Math.max(0, earned - withdrawn));
    }
    setLoadingBalance(false);
  }

  const amountNum = parseInt(amount, 10) || 0;
  const isValid =
    fullName.trim().length >= 2 &&
    paymentMethod !== '' &&
    accountNumber.trim().length >= 4 &&
    amountNum >= 1 &&
    amountNum <= balance;

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setStep('confirm');
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError('');

    const { error: withdrawErr } = await supabase.from('withdrawal_requests').insert({
      user_id: profile.id,
      full_name: fullName.trim(),
      payment_method: paymentMethod,
      account_number: accountNumber.trim(),
      amount: amountNum,
      status: 'pending',
    });

    if (withdrawErr) {
      setError('Gagal mengajukan pencairan. Coba lagi.');
      setSubmitting(false);
      setStep('form');
      return;
    }

    const { error: earningErr } = await supabase.from('earnings').insert({
      army_member_id: profile.id,
      amount: amountNum,
      type: 'withdrawal',
      status: 'pending',
      description: `Pencairan ke ${paymentMethod} - ${accountNumber.trim()} (${fullName.trim()})`,
    });

    if (earningErr) {
      setError('Gagal mencatat penarikan. Hubungi admin.');
      setSubmitting(false);
      setStep('form');
      return;
    }

    setSubmitting(false);
    setStep('success');
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-6 text-center"
        style={{ background: '#f0f4ff' }}>
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4 shadow-lg">
          <CheckCircle size={40} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-2">Pengajuan Berhasil!</h2>
        <p className="text-gray-500 text-sm mb-1">
          Pencairan <span className="font-bold text-gray-700">Rp{amountNum.toLocaleString('id-ID')}</span>
        </p>
        <p className="text-gray-500 text-sm mb-1">
          ke <span className="font-bold text-gray-700">{paymentMethod}</span>
        </p>
        <p className="text-gray-500 text-sm mb-6">
          a/n <span className="font-bold text-gray-700">{fullName}</span> — {accountNumber}
        </p>
        <p className="text-xs text-gray-400 mb-8">Admin akan memproses dalam 1–2 hari kerja.</p>
        <button
          onClick={onBack}
          className="px-8 py-3 rounded-2xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
          Kembali ke Penghasilan
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f0f4ff' }}>
      <div className="px-4 pt-5 pb-5"
        style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Ajukan Pencairan</h1>
            <p className="text-blue-200 text-xs">Isi data penarikan penghasilan kamu</p>
          </div>
        </div>

        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Banknote size={20} className="text-yellow-300" />
          </div>
          <div>
            <p className="text-blue-200 text-xs">Saldo Tersedia</p>
            {loadingBalance ? (
              <div className="h-5 w-28 bg-white/20 rounded animate-pulse mt-0.5" />
            ) : (
              <p className="text-white font-black text-xl">
                Rp{balance.toLocaleString('id-ID')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 pb-12">
        {step === 'form' && (
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-black text-gray-800 mb-4">Detail Pencairan</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Nama sesuai rekening"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Metode Pembayaran</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition appearance-none">
                    <option value="">-- Pilih Metode --</option>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Nomor Rekening / Akun</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="Masukkan nomor rekening / nomor HP"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Jumlah Pencairan</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-semibold">Rp</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      min={1}
                      max={balance}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Saldo tersedia: Rp{balance.toLocaleString('id-ID')}</p>
                  {amountNum > balance && balance > 0 && (
                    <p className="text-xs text-red-500 font-semibold mt-0.5">Jumlah melebihi saldo tersedia</p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-semibold text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={!isValid}
              className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isValid ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#e5e7eb',
                color: isValid ? 'white' : '#9ca3af',
                boxShadow: isValid ? '0 4px 16px rgba(245,158,11,0.3)' : 'none',
              }}>
              Ajukan Withdraw
            </button>
          </form>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-black text-gray-800 mb-4">Konfirmasi Pencairan</h3>
              <div className="space-y-3">
                {[
                  { label: 'Nama Lengkap', value: fullName },
                  { label: 'Metode', value: paymentMethod },
                  { label: 'Nomor Rekening', value: accountNumber },
                  { label: 'Jumlah', value: `Rp${amountNum.toLocaleString('id-ID')}` },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <span className="text-sm font-bold text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-xs text-amber-700 font-medium text-center">
                  Pastikan semua data sudah benar. Admin akan memproses dalam 1–2 hari kerja.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('form')}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-gray-600 bg-white border border-gray-200 transition-all active:scale-95">
                Kembali
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                {submitting ? 'Memproses...' : 'Konfirmasi & Kirim'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
