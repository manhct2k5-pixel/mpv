import { Camera, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '../services/api.ts';

const LookbookPage = () => {
  const navigate = useNavigate();
  const { data: lookbooks = [], isLoading } = useQuery({
    queryKey: ['store-lookbooks'],
    queryFn: storeApi.lookbooks
  });

  const items = lookbooks.filter((item) => item.active !== false);

  return (
    <div className="space-y-10 pb-6">
      <section className="relative overflow-hidden rounded-[38px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.9))] p-6 shadow-[0_20px_42px_rgba(148,163,184,0.18)] sm:p-10">
        <div className="pointer-events-none absolute -right-6 top-2 h-24 w-24 rounded-full bg-rose-200/50 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-6 h-28 w-28 rounded-full bg-orange-200/35 blur-3xl" />
        <span className="badge !border-rose-200 !bg-white/90 !text-rose-500">
          <Camera className="h-3.5 w-3.5" />
          Lookbook
        </span>
        <h1 className="font-display text-4xl text-mocha sm:text-5xl">
          Mix đồ nâu kem thật đáng yêu
        </h1>
        <p className="text-sm text-cocoa/70">
          Lấy cảm hứng từ những ngày nhẹ nhàng: cafe sáng, đi dạo, đi làm và chuyến đi xa.
        </p>
        <div className="flex flex-wrap gap-2">
          {['Tông nâu kem', 'Layer mềm', 'Phụ kiện nhỏ xinh'].map((item) => (
            <span key={item} className="tag !border-rose-200/80 !bg-white/90">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-5 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            Đang tải lookbook...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-5 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            Chưa có lookbook.
          </div>
        ) : (
          items.map((story) => (
            <div
              key={story.id}
              className="rounded-3xl border border-rose-200/70 bg-white/90 p-5 shadow-[0_12px_24px_rgba(148,163,184,0.14)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(148,163,184,0.2)]"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-200/70 bg-rose-50/70">
                  <Sparkles className="h-4 w-4 text-mocha" />
                </div>
                <div>
                  <p className="text-xs uppercase text-cocoa/60">{story.mood ?? 'Lookbook'}</p>
                  <p className="text-lg font-semibold text-cocoa">{story.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-cocoa/70">{story.description ?? 'Khám phá outfit mới.'}</p>
              {story.tags && story.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {story.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag !border-rose-200/80 !bg-white/90">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-mocha/70">Outfit gợi ý</span>
                <div className="flex items-center gap-2">
                  <Link to={`/lookbook/${story.id}`} className="btn-secondary btn-secondary--sm">
                    Xem chi tiết
                  </Link>
                  <Link to="/nu" className="btn-secondary btn-secondary--sm">
                    Xem sản phẩm
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 shadow-[0_12px_24px_rgba(148,163,184,0.14)] sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-cocoa">Lưu outfit bạn thích vào wishlist</p>
          <p className="text-xs text-cocoa/60">Sau đó thêm vào giỏ và đặt đơn ngay trong tài khoản khách hàng.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => navigate('/yeu-thich')}>
          Mở wishlist
        </button>
      </section>
    </div>
  );
};

export default LookbookPage;
