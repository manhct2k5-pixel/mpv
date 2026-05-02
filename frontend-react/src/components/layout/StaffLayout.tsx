import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import StaffSidebar from './StaffSidebar';
import StaffTopbar from './StaffTopbar';
import { financeApi, storeApi } from '../../services/api.ts';
import type { OrderSummary, ReturnRequest, SupportTicket } from '../../types/store';
import type { StaffOverviewSignal } from '../../constants/staffNav';
import {
  countNewReturnRequests,
  countOpenReturnRequests,
  countOpenSupportTickets,
  getStaffOverview,
  getStaffReturnSeenStorageKey
} from '../../utils/staffOverview.ts';

const emptyOverview: StaffOverviewSignal = {
  pendingOrders: 0,
  packingOrders: 0,
  handoverOrders: 0,
  openTickets: 0,
  openReturns: 0,
  newReturns: 0
};

const StaffLayout = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [returnSeenAt, setReturnSeenAt] = useState(() => new Date().toISOString());

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isAdmin = role === 'admin';
  const staffId = profile?.id != null ? Number(profile.id) : null;
  const returnSeenStorageKey = staffId != null ? getStaffReturnSeenStorageKey(staffId) : null;

  const { data: orders = [] } = useQuery<OrderSummary[]>({
    queryKey: ['staff-layout-orders', role, staffId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(staffId as number)),
    enabled: isAdmin || staffId != null,
    refetchInterval: 45_000
  });

  const { data: tickets = [] } = useQuery<SupportTicket[]>({
    queryKey: ['staff-support-tickets'],
    queryFn: () => storeApi.supportTickets(),
    enabled: isAdmin || staffId != null,
    refetchInterval: 45_000
  });

  const { data: returnRequests = [] } = useQuery<ReturnRequest[]>({
    queryKey: ['staff-return-requests'],
    queryFn: () => storeApi.returnRequests(),
    enabled: isAdmin || staffId != null,
    refetchInterval: 15_000
  });

  const overview = useMemo<StaffOverviewSignal>(() => {
    return getStaffOverview(orders, {
      openTickets: countOpenSupportTickets(tickets),
      openReturns: countOpenReturnRequests(returnRequests),
      newReturns: countNewReturnRequests(returnRequests, returnSeenAt)
    });
  }, [orders, returnRequests, returnSeenAt, tickets]);

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
    if (typeof window === 'undefined' || !returnSeenStorageKey) {
      return;
    }

    const stored = window.localStorage.getItem(returnSeenStorageKey);
    const safeSeenAt =
      stored && !Number.isNaN(Date.parse(stored))
        ? stored
        : new Date().toISOString();

    if (!stored) {
      window.localStorage.setItem(returnSeenStorageKey, safeSeenAt);
    }
    setReturnSeenAt(safeSeenAt);
  }, [returnSeenStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !returnSeenStorageKey) {
      return;
    }
    if (!location.pathname.startsWith('/staff/returns')) {
      return;
    }

    const nextSeenAt = new Date().toISOString();
    window.localStorage.setItem(returnSeenStorageKey, nextSeenAt);
    setReturnSeenAt(nextSeenAt);
  }, [location.pathname, returnSeenStorageKey]);

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
