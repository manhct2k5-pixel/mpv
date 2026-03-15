import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { storeApi } from '../services/api.ts';
import ProductCard from '../components/store/ProductCard';

const LookbookDetailPage = () => {
  const { id } = useParams();
  const lookbookId = Number(id);

  const { data: lookbook, isLoading } = useQuery({
    queryKey: ['store-lookbook', lookbookId],
    queryFn: () => storeApi.lookbook(lookbookId),
    enabled: Number.isFinite(lookbookId)
  });

  const productQuery = useMemo(() => {
    if (!lookbook) return '';
    if (lookbook.tags && lookbook.tags.length > 0) {
      return lookbook.tags[0];
    }
    return lookbook.title;
  }, [lookbook]);

  const { data: related = { items: [], total: 0, page: 0, pageSize: 0 } } = useQuery({
    queryKey: ['lookbook-related', productQuery],
    queryFn: () => storeApi.products({ page: 0, pageSize: 6, q: productQuery }),
    enabled: Boolean(productQuery)
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Đang tải lookbook...
      </div>
    );
  }

  if (!lookbook) {
    return (
      <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        Không tìm thấy lookbook.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="rounded-[34px] border border-rose-200/70 bg-[linear-gradient(130deg,rgba(255,255,255,0.96),rgba(255,243,236,0.88))] p-6 shadow-[0_16px_36px_rgba(148,163,184,0.16)] sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-cocoa/60">Lookbook</p>
            <h1 className="font-display text-3xl text-mocha">{lookbook.title}</h1>
            <p className="text-sm text-cocoa/70">{lookbook.mood ?? 'Phong cách riêng'}</p>
          </div>
          <Link to="/lookbook" className="btn-secondary !border-rose-200/80 !bg-white/90">
            Quay lại
          </Link>
        </div>
      </div>

      <section className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/90 p-6 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
        <div>
          <p className="text-xs uppercase tracking-wide text-cocoa/60">Bộ ảnh chủ đề</p>
          <h2 className="font-display text-2xl text-mocha">Chi tiết phối đồ</h2>
        </div>
        {lookbook.coverImageUrl ? (
          <img
            src={lookbook.coverImageUrl}
            alt={lookbook.title}
            className="h-72 w-full rounded-3xl object-cover"
          />
        ) : (
          <div className="flex h-72 items-center justify-center rounded-3xl bg-cream/70 text-sm text-cocoa/60">
            Chưa có ảnh lookbook
          </div>
        )}
        <p className="text-sm text-cocoa/70">
          {lookbook.description ?? 'Khám phá outfit mới theo lookbook này.'}
        </p>
        {lookbook.tags && lookbook.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lookbook.tags.map((tag) => (
              <span key={tag} className="tag !border-rose-200/80 !bg-white/90">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl text-mocha">Sản phẩm liên quan</h2>
          <p className="text-sm text-cocoa/70">Gợi ý dựa trên lookbook.</p>
        </div>
        {related.items.length === 0 ? (
          <div className="rounded-3xl border border-rose-200/70 bg-white/90 p-6 text-sm text-cocoa/70 shadow-[0_12px_24px_rgba(148,163,184,0.14)]">
            Chưa có sản phẩm phù hợp.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default LookbookDetailPage;
