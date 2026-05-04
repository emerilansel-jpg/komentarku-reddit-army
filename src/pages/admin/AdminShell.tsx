import { useEffect, useState } from 'react';
import { adminSupabase as supabase } from '../../lib/supabase';
import AdminDashboard from './AdminDashboard';
import ApprovalQueue from './ApprovalQueue';
import KelolaAkun from './KelolaAkun';
import TaskQueue from './TaskQueue';
import Tim from './Tim';
import Payroll from './Payroll';
import Settings from './Settings';
import FeedbackDashboard from './FeedbackDashboard';
import AdminBottomNav from '../../components/admin/AdminBottomNav';

export type AdminPage = 'dashboard' | 'accounts' | 'tasks' | 'approvals' | 'team' | 'payroll' | 'settings' | 'feedback';

interface Profile {
  id: string;
  display_name: string;
  role: string;
}

interface AdminShellProps {
  profile: Profile;
}

export default function AdminShell({ profile }: AdminShellProps) {
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted')
      .then(({ count }) => setPendingApprovals(count || 0));
  }, [activePage]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f1f5f9' }}>
      <AdminBottomNav
        active={activePage}
        onChange={setActivePage}
        pendingApprovals={pendingApprovals}
      />
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {activePage === 'dashboard'  && <AdminDashboard profile={profile} />}
        {activePage === 'approvals'  && <ApprovalQueue />}
        {activePage === 'accounts'   && <KelolaAkun />}
        {activePage === 'tasks'      && <TaskQueue />}
        {activePage === 'team'       && <Tim />}
        {activePage === 'payroll'    && <Payroll />}
        {activePage === 'settings'   && <Settings />}
        {activePage === 'feedback'   && <FeedbackDashboard />}
      </main>
    </div>
  );
}
