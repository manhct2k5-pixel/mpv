import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { AdminDonutSegment } from '../../types/admin';

interface AdminDonutCardProps {
  segments: AdminDonutSegment[];
  loading?: boolean;
}

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} đ`;

const AdminDonutCard = ({ segments, loading }: AdminDonutCardProps) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const total = useMemo(() => segments.reduce((sum, item) => sum + item.value, 0), [segments]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="admin-skeleton h-8 w-44" />
        <div className="admin-skeleton h-60 w-full rounded-2xl" />
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-6 text-sm text-[var(--admin-muted)]">
        Chưa có dữ liệu phân bổ thanh toán.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="label"
              innerRadius={62}
              outerRadius={92}
              strokeWidth={2}
              stroke="#ffffff"
              onMouseLeave={() => setActiveKey(null)}
            >
              {segments.map((segment) => (
                <Cell
                  key={segment.key}
                  fill={segment.color}
                  fillOpacity={activeKey && activeKey !== segment.key ? 0.45 : 1}
                  onMouseEnter={() => setActiveKey(segment.key)}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name, payload: { payload?: AdminDonutSegment }) => [
                formatCurrency(value),
                payload.payload?.label ?? ''
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="-mt-32 flex justify-center">
        <div className="rounded-2xl bg-white/90 px-4 py-2 text-center shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
          <p className="text-[11px] uppercase tracking-wide text-[var(--admin-muted)]">Tổng</p>
          <p className="text-sm font-semibold text-[var(--admin-text)]">{formatCurrency(total)}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--admin-border)] px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-2 text-[var(--admin-text)]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="font-semibold text-[var(--admin-muted)]">{segment.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminDonutCard;
