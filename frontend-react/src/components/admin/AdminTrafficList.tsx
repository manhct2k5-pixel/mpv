import type { AdminTrafficItem } from '../../types/admin';

interface AdminTrafficListProps {
  items: AdminTrafficItem[];
  loading?: boolean;
}

const toneClass: Record<string, string> = {
  info: 'bg-cyan-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500'
};

const AdminTrafficList = ({ items, loading }: AdminTrafficListProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="admin-skeleton h-9 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-6 text-sm text-[var(--admin-muted)]">
        Chưa có dữ liệu phân bổ trạng thái đơn.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-[var(--admin-text)]">{item.label}</span>
            <span className="text-[var(--admin-muted)]">{item.value.toLocaleString('vi-VN')} đơn</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
            <div
              className={`h-full rounded-full ${toneClass[item.tone ?? 'info'] ?? toneClass.info}`}
              style={{ width: `${Math.max(4, Math.min(100, item.percent))}%` }}
            />
          </div>
          <p className="text-right text-[11px] font-semibold text-[var(--admin-muted)]">{item.percent}%</p>
        </li>
      ))}
    </ul>
  );
};

export default AdminTrafficList;
