import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import StaffSidebar from './StaffSidebar';
import StaffTopbar from './StaffTopbar';
import { financeApi, storeApi } from '../../services/api.ts';
import type { OrderSummary } from '../../types/store';
import type { StaffOverviewSignal } from '../../constants/staffNav';

const emptyOverview: StaffOverviewSignal = {
  pendingOrders: 0,
  packingOrders: 0,
  handoverOrders: 0,
  openTickets: 0,
  openReturns: 0
};

const StaffLayout = () => {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isAdmin = role === 'admin';
  const staffId = profile?.id != null ? Number(profile.id) : null;

  const { data: orders = [] } = useQuery<OrderSummary[]>({
    queryKey: ['staff-layout-orders', role, staffId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(staffId as number)),
    enabled: isAdmin || staffId != null,
    refetchInterval: 45_000
  });

  const overview = useMemo<StaffOverviewSignal>(() => {
    const pendingOrders = orders.filter((order) =>
      ['pending', 'processing', 'confirmed'].includes(order.status.toLowerCase())
    ).length;
    const packingOrders = orders.filter((order) => order.status.toLowerCase() === 'packing').length;
    const handoverOrders = orders.filter((order) => order.status.toLowerCase() === 'packing').length;
    const openReturns = orders.filter(
      (order) => order.status.toLowerCase() === 'cancelled' || order.paymentStatus.toLowerCase() === 'refunded'
    ).length;
    const openTickets = orders.filter((order) => {
      const status = order.status.toLowerCase();
      const payment = order.paymentStatus.toLowerCase();
      if (status === 'cancelled' || payment === 'refunded') return true;
      const ageHours = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
      return (status === 'pending' || status === 'processing') && ageHours >= 24;
    }).length;

    return {
      pendingOrders,
      packingOrders,
      handoverOrders,
      openTickets,
      openReturns
    };
  }, [orders]);

  const fullName = profile?.fullName?.trim() || 'Nhân viên vận hành';
  const avatarLabel = fullName.charAt(0).toUpperCase() || 'S';

  useEffect(() => {
    document.body.classList.add('admin-body');
    document.body.classList.add('staff-body');
    return () => {
      document.body.classList.remove('admin-body');
      document.body.classList.remove('staff-body');
    };
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
    <div className="admin-theme staff-theme min-h-screen">
      <div className="admin-shell">
        <StaffSidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          overview={overview ?? emptyOverview}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="admin-main">
          <StaffTopbar
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((prev) => !prev)}
            onOpenMobileSidebar={() => setMobileOpen(true)}
            fullName={fullName}
            avatarLabel={avatarLabel}
            overview={overview}
          />
          <main className="admin-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default StaffLayout;
