import { Link } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';

const NotFoundPage = () => (
  <section className="mx-auto max-w-3xl rounded-[34px] border border-rose-200/70 bg-white/92 p-8 text-center shadow-[0_18px_38px_rgba(148,163,184,0.16)]">
    <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-rose-200/80 bg-rose-50/80 text-mocha">
      <SearchX className="h-7 w-7" />
    </div>
    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">404</p>
    <h1 className="mt-2 font-display text-3xl text-mocha">Không tìm thấy trang Mộc Mầm</h1>
    <p className="mt-3 text-sm text-cocoa/70">
      Đường dẫn này không tồn tại hoặc sản phẩm đã được ẩn khỏi cửa hàng.
    </p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link to="/" className="btn-primary">
        <Home className="h-4 w-4" />
        Về trang chủ
      </Link>
      <Link to="/san-pham" className="btn-secondary !border-rose-200/80 !bg-white/90">
        Xem sản phẩm
      </Link>
    </div>
  </section>
);

export default NotFoundPage;
