import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import NotificationDrawer from './NotificationDrawer';
import { financeApi } from '../../services/api.ts';
import { ADMIN_DEMO_MODE } from '../../services/adminDemo.ts';
import { useUIStore } from '../../store/ui';
import type { AdminOverview, AppNotification } from '../../types/app';

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
    placeholderData: emptyAdminOverview,
    refetchInterval: 15_000
  });

  const adminNotifications = useMemo<AppNotification[]>(() => {
    const source = overview ?? emptyAdminOverview;
    const now = new Date().toISOString();
    const items: AppNotification[] = [];

    if (source.pendingBusinessRequests > 0) {
      items.push({
        id: `admin-business-requests-${source.pendingBusinessRequests}`,
        title: 'Seller chờ duyệt',
        message: `${source.pendingBusinessRequests.toLocaleString('vi-VN')} yêu cầu seller cần xử lý.`,
        timestamp: now,
        type: 'warning',
        read: false
      });
    }

    if (source.unpaidOrders > 0) {
      items.push({
        id: `admin-unpaid-orders-${source.unpaidOrders}`,
        title: 'Đơn chưa thanh toán',
        message: `${source.unpaidOrders.toLocaleString('vi-VN')} đơn cần đối soát chuyển khoản.`,
        timestamp: now,
        type: 'info',
        read: false
      });
    }

    if (source.flaggedTransactions > 0) {
      items.push({
        id: `admin-flagged-transactions-${source.flaggedTransactions}`,
        title: 'Giao dịch cần kiểm tra',
        message: `${source.flaggedTransactions.toLocaleString('vi-VN')} giao dịch đang được gắn cờ.`,
        timestamp: now,
        type: 'warning',
        read: false
      });
    }

    if (ADMIN_DEMO_MODE) {
      items.push({
        id: 'admin-demo-mode',
        title: 'Admin demo mode đang bật',
        message: 'Một số thao tác admin sẽ mô phỏng trên trình duyệt và không ghi database.',
        timestamp: now,
        type: 'info',
        read: false
      });
    }

    return items;
  }, [overview]);

  useEffect(() => {
    setNotifications(adminNotifications);
  }, [adminNotifications, setNotifications]);

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
          {ADMIN_DEMO_MODE ? (
            <div className="px-4 pt-4 sm:px-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Admin demo mode: mọi thay đổi chỉ mô phỏng trên trình duyệt này, không ghi xuống backend. Một số bảng
                như đơn hàng, hoàn tiền và log dùng dữ liệu minh họa để trình diễn luồng quản trị.
              </div>
            </div>
          ) : null}
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
