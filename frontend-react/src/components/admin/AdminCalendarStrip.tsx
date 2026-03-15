import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AdminCalendarModel } from '../../types/admin';

interface AdminCalendarStripProps {
  calendar: AdminCalendarModel;
  onSelectDate: (dateISO: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

const AdminCalendarStrip = ({
  calendar,
  onSelectDate,
  onPrevWeek,
  onNextWeek
}: AdminCalendarStripProps) => {
  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--admin-text)]">Tháng {calendar.monthLabel}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="admin-icon-button admin-focus-ring"
            onClick={onPrevWeek}
            aria-label="Tuần trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="admin-icon-button admin-focus-ring"
            onClick={onNextWeek}
            aria-label="Tuần sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {calendar.dates.map((date) => (
          <button
            key={date.dateISO}
            type="button"
            className={`admin-calendar-pill admin-focus-ring ${date.isSelected ? 'is-selected' : ''}`}
            onClick={() => onSelectDate(date.dateISO)}
            aria-label={`Ngày ${date.dayNumber}`}
            aria-pressed={date.isSelected}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--admin-muted)]">
              {date.weekDayLabel}
            </span>
            <span className="text-sm font-semibold text-[var(--admin-text)]">{date.dayNumber}</span>
            <span className="mt-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-[var(--admin-muted)]">
              {date.hasEvents ? date.eventCount : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminCalendarStrip;
