import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminKpiTile } from '../../types/admin';

interface AdminKpiCardProps {
  item: AdminKpiTile;
  icon: LucideIcon;
}

const formatValue = (value: number, unit: AdminKpiTile['unit']) => {
  if (unit === 'currency') {
    return `${Math.round(value).toLocaleString('vi-VN')} đ`;
  }
  if (unit === 'percent') {
    return `${value.toFixed(1)}%`;
  }
  return Math.round(value).toLocaleString('vi-VN');
};

const formatDelta = (value?: number) => {
  if (value == null || Number.isNaN(value)) return '--';
  const rounded = Math.abs(value).toFixed(1);
  return `${rounded}%`;
};

const toneClass: Record<NonNullable<AdminKpiTile['severity']>, string> = {
  info: 'border-l-cyan-500',
  success: 'border-l-emerald-500',
  warning: 'border-l-amber-500',
  danger: 'border-l-rose-500'
};

const AdminKpiCard = ({ item, icon: Icon }: AdminKpiCardProps) => {
  const trend = item.trend ?? 'flat';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendTone = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500';

  return (
    <article
      className={`admin-kpi-card ${item.severity ? toneClass[item.severity] : 'border-l-slate-300'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">{item.title}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--admin-text)]">{formatValue(item.value, item.unit)}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--admin-primary-100)] text-[var(--admin-primary-600)]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-[var(--admin-muted)]">{item.periodLabel ?? 'Cập nhật gần nhất'}</span>
        {item.deltaPercent != null ? (
          <span className={`inline-flex items-center gap-1 font-semibold ${trendTone}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {formatDelta(item.deltaPercent)}
          </span>
        ) : null}
      </div>
    </article>
  );
};

export default AdminKpiCard;
