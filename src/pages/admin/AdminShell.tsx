import { useState, useEffect } from 'react';
import { Profile } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import AdminBottomNav, { AdminPage } from '../../components/admin/AdminBottomNav';
import AdminDashboard from './AdminDashboard';
import KelolaAkun from './KelolaAkun';
import TaskQueue from './TaskQueue';
import ApprovalQueue from './ApprovalQueue';
import Tim from './Tim';
import Payroll from './Payroll';
import Settings from './Settings';
import FeedbackDashboard from './FeedbackDashboard';

interface AdminShellProps {
  profile: Profile;
  onSignOut: () => void;
}

export default function AdminShell({ profile }: AdminShellProps) {
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadPendingCount() {
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted');
    setPendingApprovals(count || 0);
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto relative bg-gray-50">
      <div className="min-h-screen overflow-y-auto">
        {activePage === 'dashboard' && <AdminDashboard profile={profile} />}
        {activePage === 'accounts' && <KelolaAkun />}
        {activePage === 'tasks' && <TaskQueue />}
        {activePage === 'approvals' && <ApprovalQueue />}
        {activePage === 'team' && <Tim />}
        {activePage === 'payroll' && <Payroll />}
        {activePage === 'feedback' && <FeedbackDashboard />}
        {activePage === 'settings' && <Settings />}
      </div>

      <AdminBottomNav
        active={activePage}
        onChange={(page) => { setActivePage(page); if (page === 'approvals') loadPendingCount(); }}
        pendingApprovals={pendingApprovals}
      />
    </div>
  );
}
