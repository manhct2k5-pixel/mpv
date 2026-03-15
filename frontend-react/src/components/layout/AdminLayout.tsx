import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import NotificationDrawer from './NotificationDrawer';
import { financeApi } from '../../services/api.ts';
import { useUIStore } from '../../store/ui';
import { mockNotifications } from '../../data/mock';
import type { AdminOverview } from '../../types/app';

const emptyAdminOverview: AdminOverview = {
  totalUsers: 0,
  totalCustomers: 0,
  totalSellers: 0,
  totalAdmins: 0,
  totalStaff: 0,
  pendingBusinessRequests: 0,
  totalProducts: 0,
  activeProducts: 0,
  totalOrders: 0,
  openOrders: 0,
  unpaidOrders: 0,
  flaggedTransactions: 0,
  grossMerchandiseValue: 0,
  paidRevenue: 0
};

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const setNotifications = useUIStore((state) => state.setNotifications);

  const { data: overview } = useQuery<AdminOverview>({
    queryKey: ['admin', 'overview'],
    queryFn: () => financeApi.admin?.overview?.() ?? Promise.resolve(emptyAdminOverview),
    placeholderData: emptyAdminOverview
  });

  useEffect(() => {
    setNotifications(mockNotifications);
  }, [setNotifications]);

  useEffect(() => {
    document.body.classList.add('admin-body');
    return () => document.body.classList.remove('admin-body');
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) {
        setMobileOpen(false);
      }
      setCollapsed(window.innerWidth < 1024);
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="admin-theme min-h-screen">
      <div className="admin-shell">
        <AdminSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          overview={overview}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="admin-main">
          <AdminTopbar
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((prev) => !prev)}
            onOpenMobileSidebar={() => setMobileOpen(true)}
          />
          <main className="admin-content">
            <Outlet />
          </main>
        </div>
      </div>
      <NotificationDrawer />
    </div>
  );
};

export default AdminLayout;
