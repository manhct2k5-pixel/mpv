import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, ChevronUp, Lock, Mail, Sparkles } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout.tsx';
import { useAuthStore } from '../store/auth.ts';
import { api } from '../services/api.ts';

const quickAccounts = [
  { label: 'Demo khách', email: 'user@shopvui.local', password: 'password' },
  { label: 'Demo seller', email: 'seller@shopvui.local', password: 'password' },
  { label: 'Demo staff', email: 'warehouse@shopvui.local', password: 'password' }
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isDemoExpanded, setIsDemoExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await api.post('/login', data);
      return response.data;
    },
    onSuccess: async (data) => {
      if (data.token) {
        login(data.token);
        setStatusMessage('Đăng nhập thành công! Đang chuyển hướng...');
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
                  : '/';
          setTimeout(() => navigate(nextPath), 400);
        } catch {
          setTimeout(() => navigate('/'), 400);
        }
      }
    },
    onError: (error: any) => {
      setStatusMessage(error.response?.data?.error || 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleQuickFill = (account: (typeof quickAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setStatusMessage(`Đã điền thông tin cho ${account.label}`);
  };

  return (
    <AuthLayout
      title="Đăng nhập Mộc Mầm"
      subtitle="Vào tủ đồ nâu kem cute và nhận gợi ý phối đồ mới mỗi ngày."
      footer={
        <div className="space-y-2 text-sm">
          <p>
            Chưa có tài khoản mua hàng?{' '}
            <Link to="/register" className="text-mocha underline-offset-4 hover:underline">
              Đăng ký khách
            </Link>
          </p>
          <p>
            Muốn bán hàng trên hệ thống?{' '}
            <Link to="/seller/register" className="text-mocha underline-offset-4 hover:underline">
              Đăng ký người bán
            </Link>
          </p>
        </div>
      }
    >
      <div className="space-y-5">
        {quickAccounts.length > 0 && (
          <div className="space-y-3 rounded-2xl border-2 border-caramel/30 bg-white/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-cocoa/60">Tài khoản demo</p>
              <button
                type="button"
                aria-expanded={isDemoExpanded}
                aria-controls="demo-accounts-panel"
                onClick={() => setIsDemoExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-xl border border-caramel/40 bg-white/80 px-3 py-1.5 text-xs font-semibold text-cocoa transition hover:bg-cream"
              >
                {isDemoExpanded ? 'Ẩn tài khoản demo' : 'Mở tài khoản demo'}
                {isDemoExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
            {isDemoExpanded ? (
              <div id="demo-accounts-panel" className="flex flex-wrap gap-3">
                {quickAccounts.map((account) => (
                  <button
                    key={account.label}
                    type="button"
                    onClick={() => handleQuickFill(account)}
                    className="flex-1 rounded-2xl border-2 border-caramel/40 bg-white/70 px-4 py-2 text-xs font-semibold text-cocoa transition hover:-translate-y-0.5 hover:bg-cream"
                  >
                    Dùng {account.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => navigate('/dang-ky-nguoi-ban')}
                  className="flex-1 rounded-2xl border-2 border-caramel/40 bg-latte/30 px-4 py-2 text-xs font-semibold text-cocoa transition hover:-translate-y-0.5 hover:bg-latte/50"
                >
                  Đăng ký seller
                </button>
              </div>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border-2 border-caramel/40 bg-white/80 px-12 py-3 text-sm text-cocoa placeholder:text-cocoa/50 focus:border-mocha focus:outline-none focus:ring-2 focus:ring-caramel/40"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-cocoa/70">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="rememberMe"
                autoComplete="off"
                className="h-4 w-4 rounded border-caramel/40 bg-white/70 text-mocha focus:ring-caramel/50"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Nhớ đăng nhập
            </label>
            <button type="button" className="text-mocha underline-offset-4 hover:underline">
              Quên mật khẩu?
            </button>
          </div>

          {statusMessage && (
            <div
              className={`rounded-2xl border-2 px-4 py-3 text-sm ${
                loginMutation.isError
                  ? 'border-rose-500/40 bg-rose-200/50 text-rose-700'
                  : 'border-emerald-500/40 bg-emerald-200/50 text-emerald-700'
              }`}
            >
              {statusMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="flex items-center gap-2 text-xs text-cocoa/60">
          <Sparkles className="h-3.5 w-3.5 text-mocha/70" />
          Bằng việc đăng nhập bạn đồng ý với Điều khoản &amp; Chính sách bảo mật.
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
