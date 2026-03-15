import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { StaffOverviewSignal } from '../../constants/staffNav';

interface StaffTopbarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMobileSidebar: () => void;
  fullName: string;
  avatarLabel: string;
  overview: StaffOverviewSignal;
}

const StaffTopbar = ({
  collapsed,
  onToggleCollapsed,
  onOpenMobileSidebar,
  fullName,
  avatarLabel,
  overview
}: StaffTopbarProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = useMemo(() => {
    let count = 0;
    if (overview.pendingOrders > 0) count += 1;
    if (overview.packingOrders > 0) count += 1;
    if (overview.openTickets > 0) count += 1;
    if (overview.openReturns > 0) count += 1;
    return count;
  }, [overview]);

  const notifications = useMemo(() => {
    const items: string[] = [];
    if (overview.pendingOrders > 0) {
      items.push(`${overview.pendingOrders} đơn chờ staff tiếp nhận.`);
    }
    if (overview.packingOrders > 0) {
      items.push(`${overview.packingOrders} đơn đang ở bước đóng gói/QC.`);
    }
    if (overview.handoverOrders > 0) {
      items.push(`${overview.handoverOrders} đơn cần bàn giao vận chuyển.`);
    }
    if (overview.openTickets > 0) {
      items.push(`${overview.openTickets} ticket hỗ trợ đang mở.`);
    }
    if (overview.openReturns > 0) {
      items.push(`${overview.openReturns} yêu cầu đổi trả cần xác minh.`);
    }
    if (items.length === 0) {
      items.push('Không có cảnh báo mới trong ca trực hiện tại.');
    }
    return items;
  }, [overview]);

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = query.trim();
    navigate(keyword ? `/staff/orders?q=${encodeURIComponent(keyword)}` : '/staff/orders');
  };

  return (
    <header className="admin-topbar">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="admin-icon-button admin-focus-ring md:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Mở menu staff"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="admin-icon-button admin-focus-ring hidden md:inline-flex"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <form onSubmit={onSearch} className="relative min-w-0 flex-1">
          <div className="admin-search-wrap">
            <Search className="h-4 w-4 text-[var(--admin-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm mã đơn / mã vận đơn..."
              className="admin-search-input"
            />
          </div>
        </form>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link to="/staff/shipments" className="admin-inline-button hidden lg:inline-flex">
          Vận đơn
        </Link>
        <Link to="/staff/tickets" className="admin-inline-button hidden lg:inline-flex">
          Ticket
        </Link>

        <div className="relative">
          <button
            type="button"
            className="admin-icon-button admin-focus-ring relative"
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="Thông báo staff"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? <span className="admin-notify-badge">{unreadCount}</span> : null}
          </button>
          {showNotifications ? (
            <div className="admin-user-menu w-[290px]">
              <p className="mb-1 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Cảnh báo ca trực
              </p>
              {notifications.map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-2.5 py-2 text-xs text-[var(--admin-text)]"
                >
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <Link to="/staff/profile" className="admin-user-button admin-focus-ring">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--admin-primary-700)] text-xs font-semibold text-white">
            {avatarLabel}
          </span>
          <span className="max-w-[130px] truncate text-xs font-semibold text-[var(--admin-text)]">{fullName}</span>
        </Link>
      </div>
    </header>
  );
};

export default StaffTopbar;
