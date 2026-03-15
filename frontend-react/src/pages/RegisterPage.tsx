import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Lock, Mail, User } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout.tsx';
import { api } from '../services/api.ts';

const benefits = [
  'Gợi ý outfit nâu kem mới mỗi tuần',
  'Lưu wishlist và theo dõi đơn hàng',
  'Thanh toán nhanh và nhận ưu đãi thành viên'
];

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    monthlyIncome: ''
  });
  const [agreed, setAgreed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const registerMutation = useMutation({
    mutationFn: async () => {
      const monthlyIncome = formData.monthlyIncome.trim()
        ? Number(formData.monthlyIncome.trim())
        : undefined;
      const response = await api.post('/register', {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        monthlyIncome: Number.isFinite(monthlyIncome) ? monthlyIncome : undefined
      });
      return response.data;
    },
    onSuccess: () => {
      setStatusMessage('Đăng ký tài khoản khách thành công! Vui lòng đăng nhập để bắt đầu mua sắm.');
      setTimeout(() => navigate('/login'), 900);
    },
    onError: (error: any) => {
      setStatusMessage(
        error.response?.data?.message ||
          error.response?.data?.error ||
          'Đăng ký thất bại, vui lòng thử lại.'
      );
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setStatusMessage('Vui lòng đồng ý với điều khoản sử dụng trước khi tiếp tục.');
      return;
    }
    if (formData.password.length < 6) {
      setStatusMessage('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setStatusMessage('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    registerMutation.mutate();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <AuthLayout
      title="Đăng ký tài khoản khách"
      subtitle="Tạo tài khoản mua hàng để lưu wishlist, đặt đơn và theo dõi thanh toán."
      footer={
        <div className="space-y-2 text-sm">
          <p>
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-mocha underline-offset-4 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border-2 border-caramel/30 bg-white/80 p-4">
          <p className="text-sm font-semibold text-cocoa">Chọn loại tài khoản</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-xl border-2 border-mocha bg-mocha/10 px-3 py-2 text-sm font-semibold text-mocha"
              aria-pressed="true"
            >
              Khách hàng (mua sắm)
            </button>
            <Link
              to="/dang-ky-nguoi-ban"
              className="rounded-xl border-2 border-caramel/40 bg-white px-3 py-2 text-center text-sm font-semibold text-cocoa transition hover:border-mocha/50 hover:text-mocha"
            >
              Người bán (Seller)
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-cocoa">
            Họ và tên
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={formData.fullName}
              onChange={handleChange}
              className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa placeholder:text-cocoa/50 focus:border-mocha focus:outline-none focus:ring-2 focus:ring-caramel/40"
              placeholder="Nguyễn An"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-cocoa">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa placeholder:text-cocoa/50 focus:border-mocha focus:outline-none focus:ring-2 focus:ring-caramel/40"
              placeholder="ban@email.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-cocoa">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa placeholder:text-cocoa/50 focus:border-mocha focus:outline-none focus:ring-2 focus:ring-caramel/40"
              placeholder="••••••••"
            />
          </div>
          <p className="text-xs text-cocoa/60">Ít nhất 6 ký tự.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-cocoa">
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha/70" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa placeholder:text-cocoa/50 focus:border-mocha focus:outline-none focus:ring-2 focus:ring-caramel/40"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="monthlyIncome" className="text-sm font-medium text-cocoa">
            Thu nhập tháng (tùy chọn)
          </label>
          <input
            id="monthlyIncome"
            name="monthlyIncome"
            type="number"
            min={0}
            value={formData.monthlyIncome}
            onChange={handleChange}
            className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-4 py-3 text-sm text-cocoa placeholder:text-cocoa/50 focus:border-mocha focus:outline-none focus:ring-2 focus:ring-caramel/40"
            placeholder="Ví dụ: 12000000"
          />
          <p className="text-xs text-cocoa/60">Bạn có thể bỏ trống và cập nhật sau trong tài khoản.</p>
        </div>

        <div className="rounded-2xl border-2 border-caramel/30 bg-white/80 p-4 text-sm text-cocoa/80">
          <p className="font-semibold text-cocoa">Lợi ích cho tài khoản khách</p>
          <ul className="mt-3 space-y-2">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-mocha" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {statusMessage && (
          <div
            className={`rounded-2xl border-2 px-4 py-3 text-sm ${
              registerMutation.isError
                ? 'border-rose-500/40 bg-rose-200/50 text-rose-700'
                : 'border-emerald-500/40 bg-emerald-200/50 text-emerald-700'
            }`}
          >
            {statusMessage}
          </div>
        )}

        <label className="flex items-center gap-3 text-sm text-cocoa/70">
          <input
            type="checkbox"
            autoComplete="off"
            className="h-4 w-4 rounded border-caramel/40 bg-white/70 text-mocha focus:ring-caramel/50"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          Tôi đồng ý với Điều khoản dịch vụ &amp; Chính sách bảo mật.
        </label>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {registerMutation.isPending ? 'Đang đăng ký...' : 'Tạo tài khoản'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
