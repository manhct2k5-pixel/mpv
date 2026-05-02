import { LogOut, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { staffNavItems } from '../../constants/staffNav';
import type { StaffOverviewSignal } from '../../constants/staffNav';
import { useAuthStore } from '../../store/auth';
import { cn } from '../../utils/cn';

interface StaffSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  overview: StaffOverviewSignal;
  onCloseMobile: () => void;
}

const getBadgeValue = (overview: StaffOverviewSignal, key?: string) => {
  if (!key) return null;
  if (key === 'pendingOrders') return overview.pendingOrders;
  if (key === 'packingOrders') return overview.packingOrders;
  if (key === 'handoverOrders') return overview.handoverOrders;
  if (key === 'openTickets') return overview.openTickets;
  if (key === 'openReturns') return overview.openReturns;
  if (key === 'returnFocus') return overview.newReturns > 0 ? overview.newReturns : overview.openReturns;
  return null;
};

const StaffSidebarContent = ({
  collapsed,
  overview,
  onNavigate,
  onLogout
}: {
  collapsed: boolean;
  overview: StaffOverviewSignal;
  onNavigate: () => void;
  onLogout: () => void;
}) => (
  <div className="flex h-full flex-col">
    <div className={cn('mb-5 flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
      <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-primary-700)]">
        <ClipboardMarker />
      </div>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--admin-text)]">Staff Operations</p>
          <p className="truncate text-xs text-[var(--admin-muted)]">Trung tâm xử lý đơn nội bộ</p>
        </div>
      ) : null}
    </div>

    <nav className="flex-1 space-y-1">
      {staffNavItems.map((item) => {
        const badge = getBadgeValue(overview, item.badgeKey);
        return (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/staff'}
            onClick={onNavigate}
            className={({ isActive }) => cn('admin-sidebar-item admin-focus-ring', isActive ? 'is-active' : '')}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
            {!collapsed && badge != null && badge > 0 ? <span className="admin-sidebar-badge">{badge}</span> : null}
          </NavLink>
        );
      })}
    </nav>

    <button type="button" className="admin-sidebar-logout admin-focus-ring mt-4" onClick={onLogout}>
      <LogOut className="h-4 w-4" />
      {!collapsed ? <span>Đăng xuất</span> : null}
    </button>
  </div>
);

const ClipboardMarker = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
    <path d="M9 4h6m-7 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M10 4.5A1.5 1.5 0 0 1 11.5 3h1A1.5 1.5 0 0 1 14 4.5V6h-4V4.5Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="m9.5 13 1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const StaffSidebar = ({ collapsed, mobileOpen, overview, onCloseMobile }: StaffSidebarProps) => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <aside
        className={cn('admin-sidebar hidden md:flex', collapsed ? 'admin-sidebar--collapsed' : 'admin-sidebar--expanded')}
      >
        <StaffSidebarContent
          collapsed={collapsed}
          overview={overview}
          onNavigate={() => undefined}
          onLogout={handleLogout}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu staff">
          <button type="button" className="h-full flex-1 bg-black/40" onClick={onCloseMobile} aria-label="Đóng menu" />
          <aside className="admin-sidebar admin-sidebar--mobile admin-sidebar--expanded">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Điều hướng</p>
              <button
                type="button"
                className="admin-icon-button"
                onClick={onCloseMobile}
                aria-label="Đóng menu staff"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <StaffSidebarContent
              collapsed={false}
              overview={overview}
              onNavigate={onCloseMobile}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default StaffSidebar;
