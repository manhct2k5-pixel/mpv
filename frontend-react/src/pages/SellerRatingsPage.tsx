import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquareText, Search, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';

type FeedbackEntry = {
  id: string;
  partnerId: number;
  customerName: string;
  productName: string;
  stars: number;
  content: string;
  createdAt: string;
  partnerName: string;
  partnerRole: string;
};

type FeedbackState = {
  note: string;
  replied: boolean;
  flagged: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const roleLabel = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized === 'seller') return 'Seller';
  if (normalized === 'warehouse' || normalized === 'styles') return 'Staff';
  if (normalized === 'admin') return 'Admin';
  return normalized;
};

const productNamePool = ['Áo len kem', 'Đầm midi nâu', 'Set công sở', 'Áo khoác form rộng', 'Phụ kiện da'];

const buildFeedbackContent = (stars: number) => {
  if (stars >= 5) return 'Shop hỗ trợ rất nhanh, đóng gói đẹp và giao đúng hẹn.';
  if (stars >= 4) return 'Sản phẩm ổn, chỉ cần cải thiện tốc độ phản hồi thêm chút.';
  if (stars >= 3) return 'Hàng đúng mô tả nhưng giao hơi chậm, mong shop theo sát hơn.';
  if (stars >= 2) return 'Có lỗi nhỏ khi nhận hàng, cần hỗ trợ đổi trả nhanh hơn.';
  return 'Trải nghiệm chưa tốt, cần xử lý khiếu nại sớm.';
};

const SellerRatingsPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [starFilter, setStarFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackStateMap, setFeedbackStateMap] = useState<Record<string, FeedbackState>>({});

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ['store-sellers'],
    queryFn: storeApi.sellers,
    enabled: isAuthenticated
  });

  const storageKey = profile?.id != null ? `seller-feedback-state-${profile.id}` : 'seller-feedback-state-guest';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setFeedbackStateMap({});
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, FeedbackState>;
      setFeedbackStateMap(parsed ?? {});
    } catch {
      setFeedbackStateMap({});
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(feedbackStateMap));
  }, [feedbackStateMap, storageKey]);

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const isSeller = role === 'seller';

  const scopedPartners = useMemo(() => {
    if (!isSeller || profile?.id == null) {
      return sellers;
    }
    const mine = sellers.find((seller) => Number(seller.id) === Number(profile.id));
    return mine ? [mine] : sellers.filter((seller) => seller.role.toLowerCase() === 'seller');
  }, [isSeller, profile?.id, sellers]);

  const feedbackEntries = useMemo<FeedbackEntry[]>(() => {
    return scopedPartners.flatMap((partner) => {
      const count = Math.max(1, Math.min(6, Number(partner.ratingCount ?? 1)));
      return Array.from({ length: count }).map((_, index) => {
        const drift = ((index % 3) - 1) * 0.4;
        const stars = clamp(Math.round((partner.averageRating ?? 0) + drift), 1, 5);
        const createdAt = new Date(Date.now() - (index + 1) * 6 * 60 * 60 * 1000).toISOString();
        return {
          id: `${partner.id}-${index}`,
          partnerId: partner.id,
          customerName: `Khách hàng #${partner.id}-${index + 1}`,
          productName: productNamePool[index % productNamePool.length],
          stars,
          content: buildFeedbackContent(stars),
          createdAt,
          partnerName: partner.fullName,
          partnerRole: partner.role
        };
      });
    });
  }, [scopedPartners]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    return feedbackEntries.filter((entry) => {
      const passStars = starFilter === 'all' || String(entry.stars) === starFilter;
      const haystack = `${entry.customerName} ${entry.productName} ${entry.content}`.toLowerCase();
      const passQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return passStars && passQuery;
    });
  }, [feedbackEntries, searchTerm, starFilter]);

  const satisfactionScore = useMemo(() => {
    if (filteredEntries.length === 0) return 0;
    const total = filteredEntries.reduce((sum, entry) => sum + entry.stars, 0);
    return total / filteredEntries.length;
  }, [filteredEntries]);

  const unresolvedNegativeCount = useMemo(
    () =>
      filteredEntries.filter((entry) => {
        const state = feedbackStateMap[entry.id];
        return entry.stars <= 3 && !state?.replied;
      }).length,
    [feedbackStateMap, filteredEntries]
  );

  const responseRate = useMemo(() => {
    if (filteredEntries.length === 0) return 0;
    const replied = filteredEntries.filter((entry) => feedbackStateMap[entry.id]?.replied).length;
    return (replied / filteredEntries.length) * 100;
  }, [feedbackStateMap, filteredEntries]);

  const updateEntryState = (id: string, patch: Partial<FeedbackState>) => {
    setFeedbackStateMap((prev) => ({
      ...prev,
      [id]: {
        note: prev[id]?.note ?? '',
        replied: prev[id]?.replied ?? false,
        flagged: prev[id]?.flagged ?? false,
        ...patch
      }
    }));
  };

  if (!isAuthenticated) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Vui lòng đăng nhập để theo dõi đánh giá và phản hồi.
      </div>
    );
  }

  if (isLoading) {
    return <div className="sticker-card p-6 text-sm text-cocoa/70">Đang tải phản hồi khách hàng...</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="sticker-card space-y-4 p-6 sm:p-8">
        <div className="space-y-1">
          <h1 className="font-display text-3xl text-mocha">Đánh giá & phản hồi</h1>
          <p className="text-sm text-cocoa/70">
            Theo dõi mức độ hài lòng, lọc phản hồi theo số sao và phản hồi các đánh giá tiêu cực kịp thời.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-caramel/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Mức hài lòng trung bình</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{satisfactionScore.toFixed(1)} / 5</p>
          </article>
          <article className="rounded-2xl border border-caramel/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Phản hồi mới</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{filteredEntries.length.toLocaleString('vi-VN')}</p>
          </article>
          <article className="rounded-2xl border border-caramel/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Tiêu cực chưa xử lý</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{unresolvedNegativeCount.toLocaleString('vi-VN')}</p>
          </article>
          <article className="rounded-2xl border border-caramel/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Tỷ lệ đã phản hồi</p>
            <p className="mt-1 text-2xl font-semibold text-mocha">{responseRate.toFixed(1)}%</p>
          </article>
        </div>
      </section>

      <section className="sticker-card space-y-4 p-6">
        <div className="grid gap-3 md:grid-cols-[1fr,180px,180px]">
          <label className="text-xs text-cocoa/60">
            Tìm kiếm phản hồi
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-caramel/35 bg-white/85 px-3 py-2">
              <Search className="h-4 w-4 text-cocoa/55" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tên khách, sản phẩm, nội dung..."
                className="w-full bg-transparent text-sm text-cocoa outline-none"
              />
            </div>
          </label>
          <label className="text-xs text-cocoa/60">
            Lọc theo sao
            <select
              value={starFilter}
              onChange={(event) => setStarFilter(event.target.value as typeof starFilter)}
              className="mt-1 w-full rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa"
            >
              <option value="all">Tất cả</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>
          </label>
          <div className="text-xs text-cocoa/60">
            Đối tượng theo dõi
            <div className="mt-1 rounded-xl border border-caramel/35 bg-white/85 px-3 py-2 text-sm text-cocoa">
              {scopedPartners.length.toLocaleString('vi-VN')} đối tác ({isSeller ? 'theo shop hiện tại' : 'toàn bộ'})
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="text-sm text-cocoa/70">Không có phản hồi phù hợp bộ lọc.</p>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const state = feedbackStateMap[entry.id] ?? { note: '', replied: false, flagged: false };
              return (
                <article key={entry.id} className="rounded-2xl border border-caramel/30 bg-white/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-cocoa">{entry.customerName}</p>
                      <p className="text-xs text-cocoa/60">
                        {entry.productName} · {entry.partnerName} ({roleLabel(entry.partnerRole)})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full border border-caramel/35 bg-white px-2 py-1 font-semibold text-cocoa">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        {entry.stars}/5
                      </span>
                      <span className="text-cocoa/60">{new Date(entry.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-cocoa/80">{entry.content}</p>

                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr,auto,auto]">
                    <textarea
                      rows={2}
                      value={state.note}
                      onChange={(event) => updateEntryState(entry.id, { note: event.target.value })}
                      placeholder="Nhập phản hồi nội bộ hoặc nội dung sẽ gửi cho khách..."
                      className="w-full rounded-xl border border-caramel/35 bg-white/90 px-3 py-2 text-sm text-cocoa"
                    />
                    <button
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                        state.flagged ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-caramel/35 bg-white text-cocoa'
                      }`}
                      onClick={() => updateEntryState(entry.id, { flagged: !state.flagged })}
                    >
                      <ThumbsDown className="mr-1 inline h-3.5 w-3.5" />
                      {state.flagged ? 'Đã gắn cờ' : 'Gắn cờ tiêu cực'}
                    </button>
                    <button
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                        state.replied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-caramel/35 bg-white text-cocoa'
                      }`}
                      onClick={() => updateEntryState(entry.id, { replied: !state.replied })}
                    >
                      <ThumbsUp className="mr-1 inline h-3.5 w-3.5" />
                      {state.replied ? 'Đã phản hồi' : 'Đánh dấu đã phản hồi'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-caramel/30 bg-caramel/10 px-3 py-2 text-xs text-cocoa/65">
          <MessageSquareText className="mr-1 inline h-3.5 w-3.5" />
          Dữ liệu chi tiết từng đánh giá đang được mô phỏng từ dữ liệu tổng hợp hiện có để hỗ trợ luồng vận hành/phản hồi.
        </div>
      </section>
    </div>
  );
};

export default SellerRatingsPage;
