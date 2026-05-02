import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { BarChart3, CircleDollarSign, ClipboardPlus, LifeBuoy, PackageCheck, Shield, Star, Ticket, Truck, type LucideIcon } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import { paymentStatusLabels } from '../constants/payment.ts';

const SellerWorkspacePage = () => {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isAdmin = role === 'admin';
  const isWarehouse = role === 'warehouse';
  const isStaff = isWarehouse;
  const isSeller = role === 'seller';
  const canUseWorkspace = isAdmin || isSeller || isStaff;
  const sellerId = profile?.id != null ? Number(profile.id) : null;

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['seller-workspace-orders', role, sellerId],
    queryFn: () => (isAdmin ? financeApi.admin.orders() : storeApi.sellerOrders(sellerId as number)),
    enabled: canUseWorkspace && (isAdmin || sellerId != null)
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['seller-workspace-products', role, sellerId],
    queryFn: async () => {
      if (!isAdmin && !isSeller) return [];
      if (isAdmin) {
        const payload = await storeApi.products({ page: 0, pageSize: 200 });
        return payload.items;
      }
      return storeApi.sellerProducts(sellerId as number);
    },
    enabled: canUseWorkspace && (isAdmin || isSeller) && (isAdmin || sellerId != null)
  });

  const openOrders = useMemo(
    () => orders.filter((item) => !['cancelled', 'delivered'].includes(item.status.toLowerCase())).length,
    [orders]
  );

  const unpaidOrders = useMemo(
    () => orders.filter((item) => item.paymentStatus.toLowerCase() === 'unpaid').length,
    [orders]
  );

  const paidRevenue = useMemo(
    () =>
      orders
        .filter((item) => item.paymentStatus.toLowerCase() === 'paid')
        .reduce((total, order) => total + (order.total ?? 0), 0),
    [orders]
  );

  const latestOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [orders]
  );

  const quickActionCards = useMemo<
    Array<{
      title: string;
      description: string;
      to: string;
      icon: LucideIcon;
      tone: 'emerald' | 'violet' | 'blue' | 'amber';
    }>
  >(() => {
    const cards: Array<{
      title: string;
      description: string;
      to: string;
      icon: LucideIcon;
      tone: 'emerald' | 'violet' | 'blue' | 'amber';
    }> = [];

    if (isAdmin || isSeller) {
      cards.push({
        title: 'Catalog',
        description: 'Thêm sản phẩm mới, cập nhật biến thể và tồn kho.',
        to: '/seller/san-pham',
        icon: PackageCheck,
        tone: 'emerald'
      });
      cards.push({
        title: 'Hồ sơ gian hàng',
        description: 'Tinh chỉnh thông tin cửa hàng và nhận diện thương hiệu.',
        to: '/seller/ho-so',
        icon: CircleDollarSign,
        tone: 'violet'
      });
      cards.push({
        title: 'Báo cáo',
        description: 'Theo dõi doanh thu, tỷ lệ hoàn tất và xu hướng theo kỳ.',
        to: '/seller/bao-cao',
        icon: BarChart3,
        tone: 'blue'
      });
    }

    if (isAdmin) {
      cards.push({
        title: 'Control Center',
        description: 'Quản trị nhân sự, danh mục, cấu hình hệ thống và nghiệp vụ hoàn tiền đặc biệt.',
        to: '/admin',
        icon: Shield,
        tone: 'amber'
      });
    }

    cards.push({
      title: isStaff ? 'Queue đơn nội bộ' : 'Đơn bán hàng',
      description: 'Theo dõi trạng thái và xử lý các đơn cần thao tác ngay.',
      to: '/seller/don-hang',
      icon: Truck,
      tone: 'blue'
    });

    if (isAdmin) {
      cards.push({
        title: 'Tạo đơn thủ công',
        description: 'Lên đơn nhanh cho khách lẻ hoặc đơn hỗ trợ từ CSKH.',
        to: '/admin/manual-order',
        icon: ClipboardPlus,
        tone: 'blue'
      });
    }

    cards.push({
      title: 'Đánh giá & phản hồi',
      description: 'Theo dõi độ hài lòng và phản hồi nhanh các vấn đề cần xử lý.',
      to: '/seller/danh-gia',
      icon: Star,
      tone: 'violet'
    });
    cards.push({
      title: 'Vận hành / hỗ trợ',
      description: 'Quản lý ticket phát sinh, phối hợp xử lý khiếu nại và sự cố.',
      to: '/seller/van-hanh',
      icon: LifeBuoy,
      tone: 'amber'
    });

    return cards;
  }, [isAdmin, isSeller, isStaff]);

  const operatingChecklist = useMemo(() => {
    if (isStaff) {
      return ['Nhận đơn đã xác nhận', 'Đóng gói theo biến thể', 'Bàn giao vận chuyển'];
    }
    if (isAdmin) {
      return ['Theo dõi điểm nghẽn', 'Ưu tiên đơn chưa thanh toán', 'Điều phối seller + staff'];
    }
    return ['Kiểm tra đơn mới', 'Xác nhận thanh toán chuyển khoản', 'Phối hợp kho vận giao hàng'];
  }, [isAdmin, isStaff]);

  const getActionToneClass = (tone: 'emerald' | 'violet' | 'blue' | 'amber') => {
    if (tone === 'emerald') return 'from-emerald-500/20 to-emerald-200/10';
    if (tone === 'violet') return 'from-violet-500/20 to-violet-200/10';
    if (tone === 'blue') return 'from-blue-500/20 to-blue-200/10';
    return 'from-amber-500/20 to-amber-200/10';
  };

  if (profileLoading) {
    return <div className="rounded-2xl border border-amber-200 bg-white/85 p-6 text-sm text-amber-900/70">Đang tải workspace...</div>;
  }

  if (!canUseWorkspace) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white/85 p-6 text-sm text-amber-900/70">
        Khu vực này dành cho Seller, Staff vận hành hoặc Admin.
      </div>
    );
  }

  if (isStaff) {
    return <Navigate to="/staff" replace />;
  }

  const title = isStaff ? 'Bảng điều hành Staff' : isAdmin ? 'Bảng điều phối Seller Network' : 'Bảng điều hành Seller';
  const scopeDescription = isStaff
    ? 'Vai trò Staff: xử lý đơn nội bộ, tạo vận đơn bàn giao, quản lý ticket và cập nhật trạng thái.'
    : 'Vai trò Seller: quản lý sản phẩm, theo dõi đơn bán, phối hợp vận hành khi có phát sinh.';

  return (
    <div className="space-y-5 pb-8">
      <section className="overflow-hidden rounded-[30px] border border-amber-200/60 bg-gradient-to-br from-[#7c2d12] via-[#b45309] to-[#f59e0b] p-6 text-white shadow-[0_30px_80px_rgba(180,83,9,0.35)] sm:p-8">
        <p className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
          Workspace
        </p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-amber-50/95">{scopeDescription}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(146,64,14,0.12)]">
          <div className="flex items-center gap-2 text-amber-900/65">
            <PackageCheck className="h-4 w-4 text-emerald-700" />
            <p className="text-xs uppercase tracking-wide">Sản phẩm quản lý</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{productsLoading ? '...' : products.length}</p>
        </article>
        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(146,64,14,0.12)]">
          <div className="flex items-center gap-2 text-amber-900/65">
            <Truck className="h-4 w-4 text-blue-700" />
            <p className="text-xs uppercase tracking-wide">Đơn đang mở</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{ordersLoading ? '...' : openOrders}</p>
        </article>
        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(146,64,14,0.12)]">
          <div className="flex items-center gap-2 text-amber-900/65">
            <Ticket className="h-4 w-4 text-amber-700" />
            <p className="text-xs uppercase tracking-wide">Đơn chưa thanh toán</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{ordersLoading ? '...' : unpaidOrders}</p>
        </article>
        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(146,64,14,0.12)]">
          <div className="flex items-center gap-2 text-amber-900/65">
            <CircleDollarSign className="h-4 w-4 text-violet-700" />
            <p className="text-xs uppercase tracking-wide">Doanh thu đã thu</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-950">
            {ordersLoading ? '...' : `${paidRevenue.toLocaleString('vi-VN')} đ`}
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr,0.9fr]">
        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(146,64,14,0.12)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-amber-950">Bảng tác vụ nhanh</h2>
            <span className="rounded-full border border-amber-300/80 bg-amber-100/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
              Commerce actions
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickActionCards.map((card) => (
              <Link
                key={card.title}
                to={card.to}
                className={`group rounded-2xl border border-amber-200/80 bg-gradient-to-br ${getActionToneClass(card.tone)} p-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_16px_26px_rgba(146,64,14,0.15)]`}
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-300/60 bg-white/80 text-amber-900">
                    <card.icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold text-amber-950">{card.title}</p>
                </div>
                <p className="mt-2 text-xs text-amber-900/70">{card.description}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(146,64,14,0.12)]">
          <h2 className="text-lg font-semibold text-amber-950">Quy trình hôm nay</h2>
          <div className="mt-3 space-y-2">
            {operatingChecklist.map((step, index) => (
              <div key={step} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
                <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#6f3a1d] text-[10px] font-bold text-amber-50">
                  {index + 1}
                </span>
                <p className="text-xs text-amber-900">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
              <p className="text-amber-900/70">Đơn đang mở</p>
              <p className="mt-1 text-sm font-semibold text-amber-950">{openOrders.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
              <p className="text-amber-900/70">Chưa thanh toán</p>
              <p className="mt-1 text-sm font-semibold text-amber-950">{unpaidOrders.toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-amber-200/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(146,64,14,0.12)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-amber-950">Đơn gần nhất</h2>
          <Link to="/seller/don-hang" className="text-sm font-semibold text-amber-900 underline-offset-4 hover:underline">
            Xem toàn bộ
          </Link>
        </div>

        {ordersLoading ? (
          <p className="mt-3 text-sm text-amber-900/70">Đang tải danh sách đơn...</p>
        ) : latestOrders.length === 0 ? (
          <p className="mt-3 text-sm text-amber-900/70">Chưa có đơn hàng.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {latestOrders.map((order) => (
              <Link
                key={order.id}
                to={`/don-hang/${order.id}`}
                className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/45 px-4 py-3 text-sm transition hover:bg-white sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-amber-950">{order.orderNumber}</p>
                  <p className="text-xs text-amber-900/65">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-amber-200 bg-white px-2 py-1 text-amber-900/70">{order.status}</span>
                  <span className="rounded-full border border-amber-200 bg-white px-2 py-1 text-amber-900/70">
                    {paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                  <span className="font-semibold text-amber-950">{order.total.toLocaleString('vi-VN')} đ</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SellerWorkspacePage;
