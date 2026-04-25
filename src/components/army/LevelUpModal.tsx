import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { LEVELS } from '../../lib/gamification';

interface LevelUpModalProps {
  newLevel: number;
  onClose: () => void;
}

export default function LevelUpModal({ newLevel, onClose }: LevelUpModalProps) {
  const firedRef = useRef(false);
  const levelData = LEVELS[Math.min(newLevel, 5)];

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const end = Date.now() + 3000;

    function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#ec4899'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#ec4899'],
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }

    frame();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div
        className="bg-white rounded-3xl p-8 w-full max-w-sm text-center bounce-in"
        onClick={(e) => e.stopPropagation()}>

        <div className="float-animation text-7xl mb-4">{levelData.emoji}</div>

        <div className="mb-1">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
            style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#92400e' }}>
            Level Up!
          </span>
        </div>

        <h2 className="text-3xl font-black text-gray-900 mb-1">SELAMAT! 🎉</h2>
        <p className="text-gray-600 text-base mb-1">Kamu naik ke</p>
        <p className="text-2xl font-black mb-4" style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Level {newLevel} — {levelData.name}
        </p>

        <div className="rounded-2xl p-4 mb-6" style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          border: '2px solid #6ee7b7'
        }}>
          <p className="text-emerald-600 text-sm font-medium mb-1">Rate baru per misi</p>
          <p className="text-3xl font-black text-emerald-800">
            Rp{(levelData.rate / 1000).toFixed(0)}.000
          </p>
          <p className="text-emerald-500 text-xs mt-1">per task</p>
        </div>

        {newLevel < 5 && (
          <div className="mb-6 text-sm text-gray-500">
            <p>Level berikutnya: <span className="font-bold">{LEVELS[newLevel + 1].emoji} {LEVELS[newLevel + 1].name}</span></p>
            <p className="text-xs mt-0.5">Rate: Rp{(LEVELS[newLevel + 1].rate / 1000).toFixed(0)}.000/task</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            boxShadow: '0 6px 24px rgba(245,158,11,0.4)'
          }}>
          Yeahhh! Let's Go! 🚀
        </button>
      </div>
    </div>
  );
}
