import { Heart, Sparkles, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const values = [
  {
    title: 'Mềm mại & dễ mặc',
    description: 'Ưu tiên chất liệu nhẹ, thoáng, phù hợp da nhạy cảm.',
    icon: Heart
  },
  {
    title: 'Thiết kế đáng yêu',
    description: 'Form dáng nhẹ nhàng, phối tone nâu kem ấm áp.',
    icon: Sparkles
  },
  {
    title: 'Chăm sóc tận tâm',
    description: 'Gói quà, đổi trả và hỗ trợ chọn size nhanh.',
    icon: Star
  }
];

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-10 pb-6">
      <section className="relative overflow-hidden rounded-[38px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.9))] p-6 shadow-[0_20px_42px_rgba(148,163,184,0.18)] sm:p-10">
        <div className="pointer-events-none absolute -right-6 top-2 h-24 w-24 rounded-full bg-rose-200/50 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-6 h-28 w-28 rounded-full bg-orange-200/35 blur-3xl" />
        <span className="badge !border-rose-200 !bg-white/90 !text-rose-500">Câu chuyện Mộc Mầm</span>
        <h1 className="font-display text-4xl text-mocha sm:text-5xl">
          Tủ đồ nâu kem cho những ngày an yên
        </h1>
        <p className="text-base text-cocoa/70">
          Mộc Mầm bắt đầu từ tình yêu với những gam màu dịu nhẹ và mong muốn mang đến outfit dễ thương
          cho cả nam và nữ. Từng thiết kế đều được chọn lọc chất liệu kỹ càng, form dễ mặc, dễ phối.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Chất liệu mềm', 'Form dễ phối', 'Giao hàng nhanh'].map((item) => (
            <span key={item} className="tag !border-rose-200/80 !bg-white/90">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {values.map((value) => {
          const Icon = value.icon;
          return (
            <div key={value.title} className="rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
                  <Icon className="h-5 w-5 text-mocha" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cocoa">{value.title}</p>
                  <p className="text-xs text-cocoa/70">{value.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-cocoa">Cần thêm ý tưởng phối đồ?</p>
          <p className="text-xs text-cocoa/60">Khám phá lookbook mới để xem các set gợi ý theo mùa.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/lookbook')}
        >
          Xem lookbook
        </button>
      </section>

    </div>
  );
};

export default AboutPage;
