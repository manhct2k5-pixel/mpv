import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout.tsx';
import { useAuthStore } from '../store/auth.ts';
import { api, getApiErrorMessage } from '../services/api.ts';
import type { UserProfile } from '../types/app';

const quickAccounts = [
  { label: 'Demo khách', email: 'user@shopvui.local', password: 'password' },
  { label: 'Demo seller', email: 'seller@shopvui.local', password: 'password' },
  { label: 'Demo staff', email: 'warehouse@shopvui.local', password: 'password' },
  { label: 'Demo admin', email: 'admin@shopvui.local', password: 'password' }
];

const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true';
const DEMO_ACCOUNT_CREDENTIALS = new Map(
  quickAccounts.map((account) => [account.email.toLowerCase(), account.password])
);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    tone: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await api.post('/login', data);
      return response.data;
    },
    onSuccess: async (data) => {
      if (data.token) {
        login(data.token);
        setStatusMessage({ tone: 'success', text: 'Đăng nhập thành công! Đang chuyển hướng...' });
        try {
          const profileResponse = await api.get<UserProfile>('/user');
          const profile = profileResponse.data;
          queryClient.setQueryData(['profile'], profile);
          setTimeout(() => navigate('/', { replace: true }), 250);
        } catch {
          queryClient.removeQueries({ queryKey: ['profile'], exact: true });
          setTimeout(() => navigate('/', { replace: true }), 250);
        }
      }
    },
    onError: (error: unknown, variables) => {
      const attemptedEmail = String(variables?.email ?? '').trim().toLowerCase();
      const attemptedPassword = String(variables?.password ?? '');
      const demoPassword = DEMO_ACCOUNT_CREDENTIALS.get(attemptedEmail);
      const attemptedKnownDemoAccount = demoPassword !== undefined && attemptedPassword === demoPassword;
      if (attemptedKnownDemoAccount && axios.isAxiosError(error) && error.response?.status === 401) {
        setStatusMessage({
          tone: 'error',
          text: 'Tài khoản demo chưa sẵn sàng trên backend hiện tại. Hãy chạy start.bat hoặc bật APP_SEED_DEMO_DATA=true rồi thử lại.'
        });
        return;
      }
      setStatusMessage({
        tone: 'error',
        text: getApiErrorMessage(error, 'Đăng nhập thất bại. Vui lòng thử lại.', {
          networkMessage:
            'Không kết nối được tới backend. Hãy chạy backend ở cổng 8080 hoặc dùng start.bat để mở cả backend và frontend.',
          validationMessage: 'Email không hợp lệ. Vui lòng kiểm tra lại địa chỉ email.'
        })
      });
    }
  });

  const submitLogin = (credentials: { email: string; password: string }) => {
    const normalizedEmail = credentials.email.trim();
    setEmail(normalizedEmail);
    setPassword(credentials.password);
    setStatusMessage(null);
    loginMutation.mutate({ email: normalizedEmail, password: credentials.password });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitLogin({ email, password });
  };

  const handleQuickLogin = (account: (typeof quickAccounts)[number]) => {
    setStatusMessage({ tone: 'info', text: `Đang đăng nhập bằng ${account.label}...` });
    submitLogin({ email: account.email, password: account.password });
  };

  const handleForgotPassword = () => {
    loginMutation.reset();
    setStatusMessage({
      tone: 'info',
      text: 'Khôi phục mật khẩu chưa được cấu hình trên backend. Vui lòng liên hệ admin để đặt lại mật khẩu.'
    });
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
        {SHOW_DEMO_ACCOUNTS && quickAccounts.length > 0 && (
          <div className="space-y-3 rounded-2xl border-2 border-caramel/30 bg-white/70 p-3">
            <p className="text-xs font-semibold uppercase text-cocoa/60">Tài khoản demo</p>
            <p className="text-xs text-cocoa/65">
              Bấm để đăng nhập nhanh 4 tài khoản mẫu. Các tài khoản này chỉ dùng được khi backend bật <code>APP_SEED_DEMO_DATA=true</code>.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickAccounts.map((account) => (
                <button
                  key={account.label}
                  type="button"
                  onClick={() => handleQuickLogin(account)}
                  disabled={loginMutation.isPending}
                  className="rounded-2xl border-2 border-caramel/40 bg-white/70 px-4 py-2 text-xs font-semibold text-cocoa transition hover:-translate-y-0.5 hover:bg-cream"
                >
                  Đăng nhập {account.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/dang-ky-nguoi-ban')}
              className="w-full rounded-2xl border-2 border-caramel/40 bg-latte/30 px-4 py-2 text-xs font-semibold text-cocoa transition hover:-translate-y-0.5 hover:bg-latte/50"
            >
              Đăng ký seller
            </button>
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

          <div className="flex justify-end text-sm text-cocoa/70">
            <button
              type="button"
              className="text-mocha underline-offset-4 hover:underline"
              onClick={handleForgotPassword}
            >
              Quên mật khẩu?
            </button>
          </div>

          {statusMessage && (
            <div
              className={`rounded-2xl border-2 px-4 py-3 text-sm ${
                statusMessage.tone === 'error'
                  ? 'border-rose-500/40 bg-rose-200/50 text-rose-700'
                  : statusMessage.tone === 'success'
                    ? 'border-emerald-500/40 bg-emerald-200/50 text-emerald-700'
                    : 'border-sky-500/40 bg-sky-200/50 text-sky-700'
              }`}
            >
              {statusMessage.text}
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
