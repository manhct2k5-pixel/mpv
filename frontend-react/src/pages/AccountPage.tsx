import { Crown, LogOut, ShieldCheck, ShoppingBag, Store, Truck, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import { toBusinessRoleLabel } from '../constants/roles';

const AccountPage = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isCustomer = role === 'user';
  const isAdmin = role === 'admin';
  const isSeller = role === 'seller';
  const isWarehouse = role === 'warehouse';
  const isStaff = isWarehouse;

  const roleLabel = toBusinessRoleLabel(role);

  const handleLogout = async () => {
    try {
      await financeApi.logout();
    } catch {
      // JWT stateless logout still works on client side
    }
    logout();
    navigate('/');
  };

  const workspacePath = isAdmin ? '/admin' : isStaff ? '/staff' : '/seller';
  const workspaceLabel = isAdmin
    ? 'Control Center'
    : isStaff
      ? 'Kênh vận hành nội bộ'
      : 'Kênh quản lý seller';

  if (isLoading || !profile) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-8 text-center text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10 sm:space-y-7">
      <section className="grid gap-5 rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-5 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:grid-cols-[96px,1fr] sm:items-center sm:gap-6 sm:p-7 lg:p-8">
        <div className="grid h-24 w-24 place-items-center rounded-[26px] border border-rose-200/80 bg-white/90 shadow-[0_12px_24px_rgba(148,163,184,0.16)]">
          <UserRound className="h-10 w-10 text-mocha" />
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Tài khoản</p>
            <h1 className="font-display text-2xl leading-tight text-mocha sm:text-3xl">{profile.fullName}</h1>
            <p className="text-sm text-cocoa/70">{profile.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge !border-rose-200 !bg-white/90 !text-rose-500">Vai trò: {roleLabel}</span>
            {isCustomer && <span className="tag !border-rose-200/80 !bg-white/90">Khách mua hàng</span>}
            {isSeller && <span className="tag !border-rose-200/80 !bg-white/90">Seller/Merchant</span>}
            {isStaff && <span className="tag !border-rose-200/80 !bg-white/90">Staff/Vận hành</span>}
            {isAdmin && <span className="tag !border-rose-200/80 !bg-white/90">Admin</span>}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex min-h-[220px] flex-col justify-between gap-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:p-6">
          {isCustomer ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
                    <ShoppingBag className="h-5 w-5 text-mocha" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cocoa">Chức năng khách hàng</p>
                    <p className="text-xs text-cocoa/60">
                      Xem/tìm sản phẩm, quản lý giỏ hàng và theo dõi đơn hàng cá nhân.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Mua sắm
                  </Link>
                  <Link
                    to="/ho-tro?partner=warehouse"
                    className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                  >
                    CSKH
                  </Link>
                  <Link
                    to="/ho-tro/yeu-cau"
                    className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90"
                  >
                    Hỗ trợ & đổi trả
                  </Link>
                  <Link to="/gio-hang" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Giỏ hàng
                  </Link>
                  <Link to="/tai-khoan/dia-chi" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Sổ địa chỉ
                  </Link>
                  <Link to="/don-hang" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Đơn hàng
                  </Link>
                  <Link to="/yeu-thich" className="btn-secondary btn-secondary--sm !border-rose-200/80 !bg-white/90">
                    Yêu thích
                  </Link>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary !border-rose-200/80 !bg-white/90"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
                    <Store className="h-5 w-5 text-mocha" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cocoa">Khu vực vận hành</p>
                    <p className="text-xs text-cocoa/60">
                      Vai trò hiện tại thuộc nhóm quản trị/vận hành. Vui lòng vào workspace tương ứng để xử lý nghiệp vụ.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary !border-rose-200/80 !bg-white/90"
                onClick={() => navigate(workspacePath)}
              >
                <Truck className="h-4 w-4" />
                Mở {workspaceLabel}
              </button>
            </>
          )}
        </div>

        <div className="flex min-h-[220px] flex-col justify-between gap-4 rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
                {isAdmin ? <ShieldCheck className="h-5 w-5 text-mocha" /> : <Crown className="h-5 w-5 text-mocha" />}
              </div>
              <p className="text-sm font-semibold text-cocoa">Phân quyền hệ thống</p>
            </div>
            <p className="text-xs text-cocoa/60">
              `User` là actor dùng cho đăng nhập/đăng xuất. Nghiệp vụ mua hàng thuộc vai trò `Customer` trên website.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {['Đăng nhập', 'Đăng xuất', 'Bảo mật JWT', 'Phân quyền theo role'].map((item) => (
                <span key={item} className="tag !border-rose-200/80 !bg-white/90">
                  {item}
                </span>
              ))}
            </div>
          </div>
          {!isCustomer ? (
            <button type="button" className="btn-secondary !border-rose-200/80 !bg-white/90" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default AccountPage;
