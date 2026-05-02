import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Search, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { financeApi, storeApi } from '../services/api.ts';
import { useAuthStore } from '../store/auth.ts';
import type { SellerReview } from '../types/store.ts';

type FeedbackEntry = {
  id: number;
  customerName: string;
  productName: string;
  stars: number;
  content: string;
  createdAt: string;
  partnerName: string;
  partnerRole: string;
  note: string;
  replied: boolean;
  flagged: boolean;
};

const roleLabel = (value: string) => {
  const normalized = value.toLowerCase();
  if (normalized === 'seller') return 'Seller';
  if (normalized === 'warehouse' || normalized === 'styles') return 'Staff';
  if (normalized === 'admin') return 'Admin';
  return normalized;
};

const SellerRatingsPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const [starFilter, setStarFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    enabled: isAuthenticated,
    retry: 1
  });

  const rawRole = (profile?.role ?? '').toLowerCase();
  const role = rawRole === 'styles' ? 'warehouse' : rawRole;
  const canManage = role === 'seller' || role === 'admin';
  const sellerId = Number(profile?.id);
  const sellerName = profile?.storeName || profile?.fullName || 'Gian hàng';

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['seller-reviews', sellerId],
    queryFn: () => storeApi.sellerReviews(sellerId),
    enabled: isAuthenticated && canManage && Number.isFinite(sellerId),
    retry: 1
  });

  useEffect(() => {
    setNoteDrafts((current) => {
      const next = { ...current };
      reviews.forEach((review) => {
        if (next[review.id] == null) {
          next[review.id] = review.note ?? '';
        }
      });
      return next;
    });
  }, [reviews]);

  const updateReviewStateMutation = useMutation({
    mutationFn: ({ reviewId, patch }: { reviewId: number; patch: { note?: string | null; replied?: boolean; flagged?: boolean } }) =>
      storeApi.updateSellerReviewState(sellerId, reviewId, patch),
    onSuccess: (updatedReview) => {
      queryClient.setQueryData<SellerReview[]>(['seller-reviews', sellerId], (current = []) =>
        current.map((review) => (review.id === updatedReview.id ? updatedReview : review))
      );
      setNoteDrafts((current) => ({
        ...current,
        [updatedReview.id]: updatedReview.note ?? ''
      }));
    }
  });

  const feedbackEntries = useMemo<FeedbackEntry[]>(() => {
    return reviews.map((review) => ({
      id: review.id,
      customerName: review.customerName || `Khách hàng #${review.customerId ?? review.id}`,
      productName: review.productName || review.productSlug || `Sản phẩm #${review.productId ?? review.id}`,
      stars: review.rating,
      content: review.comment || 'Khách hàng không để lại nội dung chi tiết.',
      createdAt: review.createdAt,
      partnerName: sellerName,
      partnerRole: role || 'seller',
      note: review.note ?? '',
      replied: Boolean(review.replied),
      flagged: Boolean(review.flagged)
    }));
  }, [reviews, role, sellerName]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    return feedbackEntries.filter((entry) => {
      const passStars = starFilter === 'all' || String(entry.stars) === starFilter;
      const haystack = `${entry.customerName} ${entry.productName} ${entry.content} ${entry.note}`.toLowerCase();
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
    () => filteredEntries.filter((entry) => entry.stars <= 3 && !entry.replied).length,
    [filteredEntries]
  );

  const responseRate = useMemo(() => {
    if (filteredEntries.length === 0) return 0;
    const replied = filteredEntries.filter((entry) => entry.replied).length;
    return (replied / filteredEntries.length) * 100;
  }, [filteredEntries]);

  const updateEntryState = (entry: FeedbackEntry, patch: { note?: string | null; replied?: boolean; flagged?: boolean }) => {
    updateReviewStateMutation.mutate({ reviewId: entry.id, patch });
  };

  const persistNoteIfChanged = (entry: FeedbackEntry) => {
    const draft = noteDrafts[entry.id] ?? '';
    if (draft !== entry.note) {
      updateEntryState(entry, { note: draft });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Vui lòng đăng nhập để theo dõi đánh giá và phản hồi.
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="sticker-card p-6 text-sm text-cocoa/70">
        Bạn không có quyền xem bảng đánh giá seller.
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
            Theo dõi đánh giá thật từ đơn đã giao, lưu note nội bộ, trạng thái phản hồi và flag tiêu cực vào database.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-800">
          Dữ liệu lấy từ API product reviews theo sản phẩm của seller. Không còn sinh phản hồi giả từ rating tổng quan.
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
        <div className="grid gap-3 md:grid-cols-[1fr,180px,220px]">
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
              {sellerName} ({roleLabel(role || 'seller')})
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="text-sm text-cocoa/70">Không có phản hồi phù hợp bộ lọc hoặc seller chưa có đánh giá sản phẩm.</p>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
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
                    value={noteDrafts[entry.id] ?? entry.note}
                    onChange={(event) => setNoteDrafts((current) => ({ ...current, [entry.id]: event.target.value }))}
                    onBlur={() => persistNoteIfChanged(entry)}
                    placeholder="Nhập phản hồi nội bộ hoặc nội dung sẽ gửi cho khách..."
                    className="w-full rounded-xl border border-caramel/35 bg-white/90 px-3 py-2 text-sm text-cocoa"
                  />
                  <button
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      entry.flagged ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-caramel/35 bg-white text-cocoa'
                    }`}
                    onClick={() => updateEntryState(entry, { flagged: !entry.flagged })}
                    disabled={updateReviewStateMutation.isPending}
                  >
                    <ThumbsDown className="mr-1 inline h-3.5 w-3.5" />
                    {entry.flagged ? 'Đã gắn cờ' : 'Gắn cờ tiêu cực'}
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      entry.replied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-caramel/35 bg-white text-cocoa'
                    }`}
                    onClick={() => updateEntryState(entry, { replied: !entry.replied })}
                    disabled={updateReviewStateMutation.isPending}
                  >
                    <ThumbsUp className="mr-1 inline h-3.5 w-3.5" />
                    {entry.replied ? 'Đã phản hồi' : 'Đánh dấu đã phản hồi'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-caramel/30 bg-caramel/10 px-3 py-2 text-xs text-cocoa/65">
          <MessageSquareText className="mr-1 inline h-3.5 w-3.5" />
          Note và trạng thái xử lý được lưu qua endpoint seller reviews, nên refresh hoặc đổi máy vẫn giữ dữ liệu.
        </div>
      </section>
    </div>
  );
};

export default SellerRatingsPage;
