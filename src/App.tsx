import { useState } from 'react';
import './index.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Task } from './lib/supabase';
import LoginScreen from './components/army/LoginScreen';
import BottomNav, { Page } from './components/army/BottomNav';
import TugasHariIni from './pages/army/TugasHariIni';
import KerjakanTask from './pages/army/KerjakanTask';
import AkunSaya from './pages/army/AkunSaya';
import Penghasilan from './pages/army/Penghasilan';
import WithdrawForm from './pages/army/WithdrawForm';
import AdminShell from './pages/admin/AdminShell';
import AdminGate from './components/admin/AdminGate';
import OnboardingFlow from './components/army/OnboardingFlow';
import Leaderboard from './components/army/Leaderboard';

const IS_ADMIN_ROUTE = window.location.pathname.startsWith('/peta-admin');
const IS_STAGING = window.location.hostname.includes('staging');

function StagingBanner() {
  if (!IS_STAGING) return null;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-white"
      style={{ background: 'linear-gradient(90deg, #dc2626 0%, #ea580c 100%)', minHeight: '28px' }}
    >
      ⚠️ STAGING — Perubahan di sini belum live ke production
    </div>
  );
}

function AppInner() {
  const { user, profile, loading, signOut } = useAuth();
  const [activePage, setActivePage] = useState<Page>('tasks');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // --- /peta-admin/ route ---
  if (IS_ADMIN_ROUTE) {
    if (loading) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)' }}
        >
          <div className="float-animation text-5xl mb-4">⚔️</div>
          <p className="text-white font-bold text-lg">PeTa Admin</p>
          <p className="text-blue-300 text-sm mt-1">Memuat...</p>
        </div>
      );
    }
    if (!user || !profile || profile.role !== 'admin') {
      return <AdminGate />;
    }
    return <AdminShell profile={profile} onSignOut={signOut} />;
  }

  // --- Normal army app flow ---
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)' }}
      >
        <div className="float-animation text-5xl mb-4">⚔️</div>
        <p className="text-white font-bold text-lg">PeTa</p>
        <p className="text-blue-300 text-sm mt-1">Memuat...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginScreen />;
  }

  if (IS_ADMIN_ROUTE) {
    if (profile.role !== 'admin') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3"
          style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)' }}>
          <div className="text-5xl">⛔</div>
          <p className="text-white font-bold text-lg">Akses Ditolak</p>
          <p className="text-blue-200 text-sm">Halaman ini hanya untuk admin.</p>
        </div>
      );
    }
    return <AdminShell profile={profile} onSignOut={signOut} />;
  }

  if (profile.role === 'admin') {
    return <AdminShell profile={profile} onSignOut={signOut} />;
  }

  if (!onboardingDone && !profile.onboarding_completed) {
    return <OnboardingFlow onComplete={() => setOnboardingDone(true)} />;
  }

  if (selectedTask) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
        <KerjakanTask task={selectedTask} profile={profile} onBack={() => setSelectedTask(null)} />
      </div>
    );
  }

  if (activePage === 'withdraw') {
    return (
      <div className="min-h-screen max-w-md mx-auto" style={{ background: '#f0f4ff' }}>
        <WithdrawForm profile={profile} onBack={() => setActivePage('earnings')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto relative" style={{ background: '#f0f4ff' }}>
      <div className="pb-20">
        {activePage === 'tasks' && (
          <TugasHariIni profile={profile} onKerjakan={(task) => setSelectedTask(task)} />
        )}
        {activePage === 'leaderboard' && (
          <Leaderboard currentUserId={profile.id} />
        )}
        {activePage === 'accounts' && (
          <AkunSaya profile={profile} onSignOut={signOut} />
        )}
        {activePage === 'earnings' && (
          <Penghasilan profile={profile} onWithdraw={() => setActivePage('withdraw')} />
        )}
      </div>
      <BottomNav active={activePage} onChange={setActivePage} />
    </div>
  );
}

export default function App() {
  return (
    <>
      <StagingBanner />
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </>
  );
}
