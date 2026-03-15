import { ReactNode } from 'react';
import { Gift, Heart, Sparkles, Shirt } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

const highlights = [
  {
    icon: <Shirt className="h-5 w-5 text-mocha" />,
    title: 'Outfit dễ thương',
    description: 'Form mềm, dễ mặc cho cả nam và nữ.'
  },
  {
    icon: <Heart className="h-5 w-5 text-caramel" />,
    title: 'Tone nâu kem',
    description: 'Gam màu ấm áp, dễ phối đồ.'
  },
  {
    icon: <Sparkles className="h-5 w-5 text-blush" />,
    title: 'Mix & match nhanh',
    description: 'Gợi ý phối đồ xinh xắn mỗi tuần.'
  }
];

const stats = [
  { value: '7 ngày', label: 'Đổi trả' },
  { value: '30+', label: 'Mẫu mới/tuần' },
  { value: '100%', label: 'Gói quà miễn phí' }
];

const AuthLayout = ({ title, subtitle, children, footer }: AuthLayoutProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-cream text-cocoa">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-10 h-64 w-64 rounded-full bg-blush/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-latte/50 blur-[140px]" />
        <div className="absolute top-10 right-10 h-36 w-36 rounded-full bg-caramel/30 blur-3xl" />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr,0.9fr]">
        <div className="hidden flex-col justify-between px-12 py-14 lg:flex">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border-2 border-caramel/40 bg-white/80 px-4 py-1 text-xs uppercase tracking-widest text-cocoa/70">
              <span className="font-display text-mocha">Mộc Mầm</span>
              <span className="h-4 w-px bg-caramel/40" />
              <span>since 2024</span>
            </div>
            <h1 className="font-display text-4xl leading-tight text-mocha">
              Cửa hàng quần áo nâu kem cute cho mọi khoảnh khắc.
            </h1>
            <p className="text-base text-cocoa/70">
              Chọn outfit nhẹ nhàng, chất liệu mềm mại và phối đồ thật dễ thương cùng Mộc Mầm.
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4">
              {highlights.map((item) => (
                <div key={item.title} className="sticker-card flex items-start gap-4 p-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-caramel/30 bg-white/80">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-cocoa">{item.title}</p>
                    <p className="text-sm text-cocoa/70">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="sticker-card p-4 text-center">
                  <p className="font-display text-2xl text-mocha">{stat.value}</p>
                  <p className="text-xs uppercase tracking-wide text-cocoa/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <p className="badge w-fit justify-center lg:justify-start">
                <Gift className="h-3.5 w-3.5" />
                Mộc Mầm
              </p>
              <h2 className="font-display text-3xl text-mocha">{title}</h2>
              <p className="text-cocoa/70">{subtitle}</p>
            </div>

            <div className="sticker-card space-y-6 p-8">{children}</div>

            {footer && <div className="text-center text-cocoa/70 lg:text-left">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
