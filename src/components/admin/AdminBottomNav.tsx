import { type AdminPage } from '../../pages/admin/AdminShell';

const NAV_ITEMS: { page: AdminPage; label: string; icon: string }[] = [
  { page: 'dashboard',  label: 'Dashboard',    icon: '🏠' },
  { page: 'approvals',  label: 'Persetujuan',  icon: '✅' },
  { page: 'accounts',   label: 'Akun Reddit',  icon: '🎭' },
  { page: 'tasks',      label: 'Task Queue',   icon: '📋' },
  { page: 'team',       label: 'Tim',          icon: '👥' },
  { page: 'payroll',    label: 'Payroll',      icon: '💰' },
  { page: 'feedback',   label: 'Feedback',     icon: '💬' },
  { page: 'settings',   label: 'Pengaturan',   icon: '⚙️' },
];

interface Props {
  active: AdminPage;
  onChange: (p: AdminPage) => void;
  pendingApprovals: number;
}

export default function AdminBottomNav({ active, onChange, pendingApprovals }: Props) {
  return (
    <aside
      className="flex-shrink-0 flex flex-col"
      style={{
        width: 232,
        background: '#0f172a',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <p className="text-white font-black text-lg tracking-tight">âï¸ KomentarKu</p>
        <p className="text-slate-400 text-xs font-medium mt-0.5">Admin Panel</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = active === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onChange(item.page)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
              style={{
                background: isActive ? 'rgba(99,102,241,0.18)' : 'transparent',
                color: isActive ? '#a5b4fc' : '#94a3b8',
              }}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.page === 'approvals' && pendingApprovals > 0 && (
                <span
                  className="text-xs font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: '#ef4444', color: 'white', minWidth: 20, textAlign: 'center' }}
                >
                  {pendingApprovals}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-slate-500 text-xs">v1.0 Â· Admin Only</p>
      </div>
    </aside>
  );
}
