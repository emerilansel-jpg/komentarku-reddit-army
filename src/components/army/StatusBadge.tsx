import { Task } from '../../lib/supabase';

interface StatusBadgeProps {
  status: Task['status'];
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { icon: string; label: string; bg: string; text: string; border: string; pulse?: boolean }> = {
  pending: { icon: '✏️', label: 'Tulis Draft', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  submitted: { icon: '⏳', label: 'Menunggu Review', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  approved: { icon: '✅', label: 'Siap Diposting!', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', pulse: true },
  rejected: { icon: '❌', label: 'Ditolak', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  posted: { icon: '✔', label: 'Selesai', bg: 'bg-emerald-900/10', text: 'text-emerald-800', border: 'border-emerald-200' },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold border ${config.bg} ${config.text} ${config.border} ${sizeClass} ${config.pulse ? 'pulse-green' : ''}`}>
      {config.icon} {config.label}
    </span>
  );
}
