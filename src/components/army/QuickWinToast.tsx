import { useEffect, useState } from 'react';

export type QuickWinData = {
  emoji: string;
  message: string;
  points: number;
};

interface QuickWinToastProps {
  win: QuickWinData | null;
  onDismiss: () => void;
}

export default function QuickWinToast({ win, onDismiss }: QuickWinToastProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (win) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(() => { setMounted(false); onDismiss(); }, 400);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [win]);

  if (!mounted || !win) return null;

  return (
    <div
      className="fixed top-4 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
      style={{ transition: 'none' }}>
      <div
        className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl max-w-sm w-full"
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(-80px) scale(0.9)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
          boxShadow: '0 8px 32px rgba(5,150,105,0.4)',
        }}>
        <span className="text-2xl flex-shrink-0">{win.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight">{win.message}</p>
        </div>
        <div className="flex-shrink-0 bg-white/20 rounded-xl px-2.5 py-1">
          <span className="text-white font-black text-sm">+{win.points}</span>
          <span className="text-green-100 text-xs font-semibold ml-0.5">poin</span>
        </div>
      </div>
    </div>
  );
}
