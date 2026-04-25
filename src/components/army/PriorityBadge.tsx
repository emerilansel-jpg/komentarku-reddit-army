import { Task } from '../../lib/supabase';

interface PriorityBadgeProps {
  priority: Task['priority'];
}

const priorityConfig = {
  high: { icon: '🔴', label: 'Prioritas Tinggi', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  normal: { icon: '🟡', label: 'Normal', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  low: { icon: '⚪', label: 'Rendah', bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
};

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      {config.icon} {config.label}
    </span>
  );
}
