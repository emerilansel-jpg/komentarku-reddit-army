export type Page = 'tasks' | 'accounts' | 'earnings' | 'withdraw' | 'leaderboard';

interface BottomNavProps {
  active: Page;
  onChange: (page: Page) => void;
}

const navItems: { id: Page; icon: string; label: string; color: string; activeBg: string }[] = [
  { id: 'tasks', icon: '💸', label: 'Misi Cuan', color: 'text-blue-600', activeBg: 'bg-blue-50' },
  { id: 'leaderboard', icon: '🏆', label: 'Ranking', color: 'text-amber-600', activeBg: 'bg-amber-50' },
  { id: 'earnings', icon: '📊', label: 'Penghasilan', color: 'text-emerald-600', activeBg: 'bg-emerald-50' },
  { id: 'accounts', icon: '👤', label: 'Akun', color: 'text-teal-600', activeBg: 'bg-teal-50' },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
      <div className="flex items-center justify-around px-1 py-1.5 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all duration-200 flex-shrink-0 ${isActive ? item.activeBg : ''}`}
              style={{ minWidth: 52 }}>
              <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-semibold transition-colors duration-200 ${isActive ? item.color : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-safe-bottom" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
    </div>
  );
}
