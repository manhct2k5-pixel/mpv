import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, FileCheck2, Lock, Mail, Send, Store, User } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout.tsx';
import { api } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';

type AuthTab = 'register' | 'login';
type StatusTone = 'success' | 'error' | 'info';

const sellerBenefits = [
  'Quản lý sản phẩm, biến thể và tồn kho theo gian hàng',
  'Xử lý đơn hàng, theo dõi vận hành và phản hồi đánh giá',
  'Theo dõi dashboard báo cáo doanh thu theo ngày/tuần/tháng'
];

const INDUSTRY_OPTIONS = [
  'Thời trang nữ',
  'Thời trang nam',
  'Phụ kiện',
  'Giày dép',
  'Mỹ phẩm',
  'Khác'
];

const SellerRegisterPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [activeTab, setActiveTab] = useState<AuthTab>('register');
  const [registerData, setRegisterData] = useState({
    storeName: '',
    fullName: '',
    email: '',
    storePhone: '',
    password: '',
    storeAddress: '',
    storeDescription: '',
    industry: INDUSTRY_OPTIONS[0],
    monthlyIncome: '1',
    otpCode: ''
  });
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [documentFileName, setDocumentFileName] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/register/seller', {
        fullName: registerData.fullName.trim(),
        email: registerData.email.trim(),
        password: registerData.password,
        monthlyIncome: Number(registerData.monthlyIncome || '1'),
        storeName: registerData.storeName.trim(),
        storePhone: registerData.storePhone.trim() || undefined,
        storeAddress: registerData.storeAddress.trim() || undefined,
        storeDescription: registerData.storeDescription.trim() || undefined
      });
      return response.data;
    },
    onSuccess: () => {
      setStatus({
        tone: 'success',
        message:
          'Đăng ký thành công. Hồ sơ seller đang chờ admin duyệt. Sau khi duyệt, bạn có thể đăng nhập để bán hàng.'
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.response?.data?.error || 'Không thể gửi đăng ký seller.';
      const isApprovalMessage = String(message).toLowerCase().includes('admin') || error.response?.status === 403;
      setStatus({
        tone: isApprovalMessage ? 'info' : 'error',
        message: isApprovalMessage
          ? 'Yêu cầu seller đã được ghi nhận, hiện cần admin cấp quyền. Vui lòng chờ phê duyệt trước khi đăng bán.'
          : message
      });
    }
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/login', {
        email: loginData.email.trim(),
        password: loginData.password
      });
      return response.data;
    },
    onSuccess: async (data) => {
      if (!data.token) {
        setStatus({ tone: 'error', message: 'Không nhận được token đăng nhập.' });
        return;
      }
      login(data.token);
      setStatus({ tone: 'success', message: 'Đăng nhập thành công. Đang chuyển hướng...' });
      try {
        const profileResponse = await api.get('/user');
        const rawRole = String(profileResponse.data?.role ?? '').toLowerCase();
        const role = rawRole === 'styles' ? 'warehouse' : rawRole;
        const nextPath =
          role === 'admin'
            ? '/admin'
            : role === 'warehouse'
              ? '/staff'
              : role === 'seller'
                ? '/seller'
                : '/tai-khoan';
        setTimeout(() => navigate(nextPath), 400);
      } catch {
        setTimeout(() => navigate('/tai-khoan'), 400);
      }
    },
    onError: (error: any) => {
      setStatus({
        tone: 'error',
        message: error.response?.data?.error || error.response?.data?.message || 'Đăng nhập thất bại.'
      });
    }
  });

  const sendOtp = () => {
    if (!registerData.email.trim() && !registerData.storePhone.trim()) {
      setStatus({
        tone: 'error',
        message: 'Vui lòng nhập Email hoặc SĐT trước khi gửi OTP.'
      });
      return;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(otp);
    setStatus({
      tone: 'info',
      message: `OTP xác thực đã gửi (demo): ${otp}. Vui lòng nhập mã để hoàn tất đăng ký.`
    });
  };

  const handleRegisterSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!documentFileName) {
      setStatus({
        tone: 'error',
        message: 'Vui lòng upload giấy tờ xác minh trước khi gửi đăng ký.'
      });
      return;
    }
    if (!generatedOtp || registerData.otpCode.trim() !== generatedOtp) {
      setStatus({
        tone: 'error',
        message: 'OTP chưa đúng hoặc chưa được gửi. Vui lòng kiểm tra lại.'
      });
      return;
    }
    if (!agreed) {
      setStatus({
        tone: 'error',
        message: 'Vui lòng đồng ý điều khoản dành cho người bán trước khi tiếp tục.'
      });
      return;
    }

    registerMutation.mutate();
  };

  const handleLoginSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    loginMutation.mutate();
  };

  const statusClass = status
    ? status.tone === 'error'
      ? 'border-rose-500/40 bg-rose-200/50 text-rose-700'
      : status.tone === 'success'
        ? 'border-emerald-500/40 bg-emerald-200/50 text-emerald-700'
        : 'border-sky-500/40 bg-sky-200/50 text-sky-700'
    : '';

  return (
    <AuthLayout
      title="Seller Center Access"
      subtitle="Đăng ký hoặc đăng nhập tài khoản người bán để quản lý cửa hàng tập trung."
      footer={
        <div className="space-y-2 text-sm">
          <p>
            Tài khoản khách mua hàng?{' '}
            <Link to="/register" className="text-mocha underline-offset-4 hover:underline">
              Đăng ký tại đây
            </Link>
          </p>
          <p>
            Đã có tài khoản chung?{' '}
            <Link to="/login" className="text-mocha underline-offset-4 hover:underline">
              Đăng nhập nhanh
            </Link>
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-caramel/35 bg-white/80 p-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setStatus(null);
            }}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'register' ? 'bg-mocha text-cream' : 'text-cocoa/70 hover:bg-caramel/20'
            }`}
          >
            Đăng ký người bán
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setStatus(null);
            }}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              activeTab === 'login' ? 'bg-mocha text-cream' : 'text-cocoa/70 hover:bg-caramel/20'
            }`}
          >
            Đăng nhập
          </button>
        </div>

        {activeTab === 'register' ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-cocoa">
                Tên cửa hàng
                <div className="relative mt-2">
                  <Store className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
                  <input
                    value={registerData.storeName}
                    onChange={(event) => setRegisterData((prev) => ({ ...prev, storeName: event.target.value }))}
                    required
                    className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa"
                    placeholder="Mộc Mầm Boutique"
                  />
                </div>
              </label>
              <label className="text-sm font-medium text-cocoa">
                Họ tên người đại diện
                <div className="relative mt-2">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
                  <input
                    value={registerData.fullName}
                    onChange={(event) => setRegisterData((prev) => ({ ...prev, fullName: event.target.value }))}
                    required
                    className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa"
                    placeholder="Nguyễn An"
                  />
                </div>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-cocoa">
                Email
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={registerData.email}
                    onChange={(event) => setRegisterData((prev) => ({ ...prev, email: event.target.value }))}
                    required
                    className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa"
                    placeholder="shop@email.com"
                  />
                </div>
              </label>
              <label className="text-sm font-medium text-cocoa">
                Số điện thoại
                <input
                  type="tel"
                  value={registerData.storePhone}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, storePhone: event.target.value }))}
                  required
                  className="mt-2 w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa"
                  placeholder="0901234567"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-cocoa">
                Mật khẩu
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={registerData.password}
                    onChange={(event) => setRegisterData((prev) => ({ ...prev, password: event.target.value }))}
                    required
                    className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa"
                    placeholder="••••••••"
                  />
                </div>
              </label>
              <label className="text-sm font-medium text-cocoa">
                Doanh thu dự kiến/tháng
                <input
                  type="number"
                  min={1}
                  value={registerData.monthlyIncome}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, monthlyIncome: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa"
                  placeholder="1000000"
                />
              </label>
            </div>

            <label className="text-sm font-medium text-cocoa">
              Địa chỉ lấy hàng
              <input
                value={registerData.storeAddress}
                onChange={(event) => setRegisterData((prev) => ({ ...prev, storeAddress: event.target.value }))}
                required
                className="mt-2 w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa"
                placeholder="Quận 1, TP.HCM"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-cocoa">
                Loại ngành hàng
                <select
                  value={registerData.industry}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, industry: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa"
                >
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-cocoa">
                Upload giấy tờ xác minh
                <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa/75">
                  <FileCheck2 className="h-4 w-4 text-mocha/70" />
                  <span>{documentFileName || 'Chọn file xác minh (PDF/JPG/PNG)'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setDocumentFileName(file?.name ?? '');
                    }}
                  />
                </label>
              </label>
            </div>

            <label className="text-sm font-medium text-cocoa">
              Mô tả cửa hàng
              <textarea
                rows={3}
                value={registerData.storeDescription}
                onChange={(event) => setRegisterData((prev) => ({ ...prev, storeDescription: event.target.value }))}
                className="mt-2 w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa"
                placeholder="Mô tả ngắn về sản phẩm, phân khúc và phong cách phục vụ."
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-[1fr,160px]">
              <label className="text-sm font-medium text-cocoa">
                OTP xác thực
                <input
                  value={registerData.otpCode}
                  onChange={(event) => setRegisterData((prev) => ({ ...prev, otpCode: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa"
                  placeholder="Nhập mã OTP"
                />
              </label>
              <button type="button" onClick={sendOtp} className="btn-secondary mt-7 h-[46px]">
                <Send className="h-4 w-4" />
                Gửi OTP
              </button>
            </div>

            <div className="rounded-2xl border-2 border-caramel/30 bg-white/80 p-4 text-sm text-cocoa/80">
              <p className="font-semibold text-cocoa">Quy trình duyệt seller</p>
              <ul className="mt-3 space-y-2">
                {sellerBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 text-mocha" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-cocoa/60">
                Sau khi gửi OTP và hồ sơ, tài khoản sẽ ở trạng thái chờ admin duyệt trước khi được đăng bán.
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm text-cocoa/70">
              <input
                type="checkbox"
                autoComplete="off"
                className="h-4 w-4 rounded border-caramel/40 bg-white/70 text-mocha focus:ring-caramel/50"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
              />
              Tôi đồng ý điều khoản người bán và chính sách vận hành gian hàng.
            </label>

            <button type="submit" disabled={registerMutation.isPending} className="btn-primary w-full">
              {registerMutation.isPending ? 'Đang gửi hồ sơ...' : 'Gửi đăng ký Seller'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <label className="text-sm font-medium text-cocoa">
              Email
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
                <input
                  type="email"
                  autoComplete="username"
                  value={loginData.email}
                  onChange={(event) => setLoginData((prev) => ({ ...prev, email: event.target.value }))}
                  required
                  className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa"
                  placeholder="seller@email.com"
                />
              </div>
            </label>

            <label className="text-sm font-medium text-cocoa">
              Mật khẩu
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginData.password}
                  onChange={(event) => setLoginData((prev) => ({ ...prev, password: event.target.value }))}
                  required
                  className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa"
                  placeholder="••••••••"
                />
              </div>
            </label>

            <button type="submit" disabled={loginMutation.isPending} className="btn-primary w-full">
              {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập Seller Center'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {status ? <div className={`rounded-2xl border-2 px-4 py-3 text-sm ${statusClass}`}>{status.message}</div> : null}
      </div>
    </AuthLayout>
  );
};

export default SellerRegisterPage;
