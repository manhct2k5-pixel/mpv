import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { AdminChartPoint } from '../../types/admin';

interface AdminPerformanceChartProps {
  data: AdminChartPoint[];
  loading?: boolean;
}

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} đ`;

const formatCompact = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${Math.round(value)}`;
};

const TooltipContent = ({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const revenue = Number(payload.find((item) => item.dataKey === 'total')?.value ?? 0);
  const orders = Number(payload.find((item) => item.dataKey === 'orderCount')?.value ?? 0);
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2 text-xs text-[var(--admin-text)] shadow-[0_8px_20px_rgba(20,60,47,0.12)]">
      <p className="font-semibold text-[var(--admin-text)]">{label}</p>
      <p>Doanh thu: {formatCurrency(revenue)}</p>
      <p>Đơn hàng: {orders.toLocaleString('vi-VN')}</p>
    </div>
  );
};

const AdminPerformanceChart = ({ data, loading }: AdminPerformanceChartProps) => {
  const [showTable, setShowTable] = useState(false);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="admin-skeleton h-8 w-40" />
        <div className="admin-skeleton h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-6 text-sm text-[var(--admin-muted)]">
        Chưa có dữ liệu để dựng biểu đồ trong kỳ đã chọn.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--admin-muted)]">Doanh thu và số lượng đơn theo ngày</p>
        <button
          type="button"
          className="admin-inline-button admin-focus-ring"
          onClick={() => setShowTable((prev) => !prev)}
        >
          {showTable ? 'Ẩn dữ liệu' : 'Xem dữ liệu'}
        </button>
      </div>
      <div className="h-72 sm:h-80" role="img" aria-label="Biểu đồ doanh thu và đơn hàng theo ngày">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.42} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="adminOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.34} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9e5df" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6f877d' }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: '#6f877d' }}
              tickFormatter={formatCompact}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: '#6f877d' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TooltipContent />} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="total"
              name="Doanh thu"
              stroke="#0f766e"
              strokeWidth={2}
              fill="url(#adminRevenue)"
              dot={false}
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="orderCount"
              name="Đơn hàng"
              stroke="#14b8a6"
              strokeWidth={2}
              fill="url(#adminOrders)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {showTable ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-left text-[var(--admin-muted)]">
                <th className="px-2 py-2 font-medium">Ngày</th>
                <th className="px-2 py-2 font-medium">Doanh thu</th>
                <th className="px-2 py-2 font-medium">Đơn hàng</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.ts} className="border-b border-[var(--admin-border)]/80">
                  <td className="px-2 py-2 text-[var(--admin-text)]">{point.label}</td>
                  <td className="px-2 py-2 text-[var(--admin-text)]">{formatCurrency(point.total)}</td>
                  <td className="px-2 py-2 text-[var(--admin-text)]">{point.orderCount.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default AdminPerformanceChart;
