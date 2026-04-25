type AdminPage = 'dashboard' | 'accounts' | 'tasks' | 'approvals' | 'team' | 'payroll' | 'settings' | 'feedback';

interface AdminBottomNavProps {
  active: AdminPage;
  onChange: (page: AdminPage) => void;
  pendingApprovals?: number;
}

const navItems: { id: AdminPage; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'accounts', icon: '🔑', label: 'Akun' },
  { id: 'tasks', icon: '📋', label: 'Tasks' },
  { id: 'approvals', icon: '✅', label: 'Approval' },
  { id: 'team', icon: '👥', label: 'Tim' },
  { id: 'payroll', icon: '💳', label: 'Payroll' },
  { id: 'feedback', icon: '📣', label: 'Laporan' },
  { id: 'settings', icon: '⚙️', label: 'Setting' },
];

export default function AdminBottomNav({ active, onChange, pendingApprovals = 0 }: AdminBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-around px-1 py-1.5 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = active === item.id;
          const hasBadge = item.id === 'approvals' && pendingApprovals > 0;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-150 flex-shrink-0 ${isActive ? 'bg-slate-100' : ''}`}
              style={{ minWidth: 40 }}>
              <span className={`text-xl transition-transform duration-150 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-semibold transition-colors ${isActive ? 'text-slate-800' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {hasBadge && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-black text-white">
                  {pendingApprovals > 9 ? '9+' : pendingApprovals}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { AdminPage };
