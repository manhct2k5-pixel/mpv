import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

type MetricTone = 'balance' | 'income' | 'expenses' | 'savings';

interface MetricCardProps {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  tone?: MetricTone;
}

const TONE_STYLES: Record<
  MetricTone,
  {
    accent: string;
    glow: string;
    iconBg: string;
    iconText: string;
    progress: string;
  }
> = {
  balance: {
    accent: 'from-caramel/70 via-caramel/60 to-latte/70',
    glow: 'bg-caramel/20',
    iconBg: 'bg-caramel/20',
    iconText: 'text-mocha',
    progress: 'from-caramel via-caramel to-latte'
  },
  income: {
    accent: 'from-emerald-400/70 via-emerald-400/60 to-teal-400/70',
    glow: 'bg-emerald-500/20',
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-700',
    progress: 'from-emerald-400 via-emerald-400 to-teal-400'
  },
  expenses: {
    accent: 'from-rose-400/70 via-rose-400/60 to-orange-400/70',
    glow: 'bg-rose-500/20',
    iconBg: 'bg-rose-500/15',
    iconText: 'text-rose-700',
    progress: 'from-rose-400 via-rose-400 to-orange-400'
  },
  savings: {
    accent: 'from-amber-400/70 via-amber-400/60 to-yellow-400/70',
    glow: 'bg-amber-500/20',
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-700',
    progress: 'from-amber-400 via-amber-400 to-yellow-400'
  }
};

const MetricCard = ({ label, value, change, icon, tone = 'balance' }: MetricCardProps) => {
  const isPositive = change >= 0;
  const trimmedValue = value.trim();
  const isPercentValue = trimmedValue.endsWith('%');
  const percentValueText = isPercentValue ? trimmedValue.slice(0, -1).trim() : '';
  const parsedPercent = isPercentValue ? Number(percentValueText.replace(',', '.')) : Number.NaN;
  const percentValue = Number.isFinite(parsedPercent)
    ? Math.min(Math.max(parsedPercent, 0), 100)
    : null;
  const changeLabel = `${isPositive ? 'Tăng' : 'Giảm'} ${Math.abs(change).toFixed(1)}%`;
  const changeClasses = isPositive
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
    : 'border-rose-500/20 bg-rose-500/10 text-rose-200';
  const toneStyle = TONE_STYLES[tone];

  return (
    <div className="glass-panel relative overflow-hidden p-4 sm:p-5">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneStyle.accent}`}
      />
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl ${toneStyle.glow}`}
      />
      <div className="relative z-10 flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-cocoa/60">{label}</p>
          <div className={`rounded-2xl p-2 sm:p-3 ${toneStyle.iconBg} ${toneStyle.iconText}`}>
            {icon}
          </div>
        </div>
        {isPercentValue ? (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-semibold text-cocoa tabular-nums tracking-tight">
              {percentValueText || '0'}
            </span>
            <span className="text-sm sm:text-base font-semibold text-cocoa/60">%</span>
          </div>
        ) : (
          <p className="text-xl sm:text-2xl font-semibold text-cocoa tabular-nums tracking-tight">
            {value}
          </p>
        )}
        {isPercentValue && percentValue != null && (
          <div className="h-1.5 w-full rounded-full bg-caramel/20">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${toneStyle.progress}`}
              style={{ width: `${percentValue}%` }}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${changeClasses}`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {changeLabel}
          </span>
          <span className="text-cocoa/50">so với tháng trước</span>
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
