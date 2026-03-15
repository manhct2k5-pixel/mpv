import { LogOut, X } from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { adminBrandItem, adminNavItems } from '../../constants/adminNav';
import type { AdminNavItem } from '../../constants/adminNav';
import type { AdminOverview } from '../../types/app';
import { useAuthStore } from '../../store/auth';
import { cn } from '../../utils/cn';

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  overview?: AdminOverview;
  onCloseMobile: () => void;
}

const getBadgeValue = (badgeKey: AdminNavItem['badgeKey'], overview?: AdminOverview) => {
  if (!overview || !badgeKey) return null;
  if (badgeKey === 'openOrders') return overview.openOrders;
  if (badgeKey === 'totalUsers') return overview.totalUsers;
  if (badgeKey === 'pendingBusinessRequests') return overview.pendingBusinessRequests;
  if (badgeKey === 'unpaidOrders') return overview.unpaidOrders;
  return null;
};

const AdminSidebarContent = ({
  collapsed,
  overview,
  onNavigate,
  onLogout
}: {
  collapsed: boolean;
  overview?: AdminOverview;
  onNavigate: () => void;
  onLogout: () => void;
}) => {
  const { pathname } = useLocation();
  const BrandIcon = adminBrandItem.icon;
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  return (
    <>
      <div className="flex h-full flex-col">
        <div className={cn('mb-5 flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-primary-700)]">
            <BrandIcon className="h-5 w-5" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{adminBrandItem.label}</p>
              <p className="truncate text-xs text-[var(--admin-muted)]">Trung tâm quản trị hệ thống</p>
            </div>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1">
          {adminNavItems.map((item) => {
            const active = item.sectionId
              ? normalizedPath === item.path
              : normalizedPath === item.path || normalizedPath.startsWith(`${item.path}/`);
            const badgeValue = getBadgeValue(item.badgeKey, overview);

            return (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={onNavigate}
                className={() => cn('admin-sidebar-item admin-focus-ring', active ? 'is-active' : '')}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
                {!collapsed && badgeValue != null && badgeValue > 0 ? (
                  <span className="admin-sidebar-badge">{badgeValue}</span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 space-y-2">
          {!collapsed ? (
            <Link to="/admin/account" className="admin-sidebar-item admin-focus-ring" onClick={onNavigate}>
              <span className="truncate">Tài khoản admin</span>
            </Link>
          ) : null}
          <button type="button" className="admin-sidebar-logout admin-focus-ring" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            {!collapsed ? <span>Đăng xuất</span> : null}
          </button>
        </div>
      </div>
    </>
  );
};

const AdminSidebar = ({ collapsed, mobileOpen, overview, onCloseMobile }: AdminSidebarProps) => {
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
        <AdminSidebarContent
          collapsed={collapsed}
          overview={overview}
          onNavigate={() => undefined}
          onLogout={handleLogout}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button
            type="button"
            className="h-full flex-1 bg-black/40"
            onClick={onCloseMobile}
            aria-label="Đóng menu"
          />
          <aside className="admin-sidebar admin-sidebar--mobile admin-sidebar--expanded">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Điều hướng</p>
              <button
                type="button"
                className="admin-icon-button"
                onClick={onCloseMobile}
                aria-label="Đóng menu admin"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AdminSidebarContent
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

export default AdminSidebar;
