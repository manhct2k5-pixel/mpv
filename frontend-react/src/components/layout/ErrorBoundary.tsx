import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled React error', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_10%_10%,rgba(241,198,177,0.45),transparent_42%),linear-gradient(135deg,#fffefd,#fef6ee)] px-4 text-cocoa">
        <section className="max-w-lg rounded-[34px] border border-rose-200/70 bg-white/92 p-7 text-center shadow-[0_22px_48px_rgba(148,163,184,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Mộc Mầm</p>
          <h1 className="mt-3 font-display text-3xl text-mocha">Trang gặp lỗi hiển thị</h1>
          <p className="mt-3 text-sm leading-6 text-cocoa/70">
            Ứng dụng đã chặn lỗi để không làm trắng toàn bộ màn hình. Tải lại trang hoặc quay về trang chủ để tiếp tục demo.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Tải lại trang
            </button>
            <button type="button" className="btn-secondary !border-rose-200/80 !bg-white/90" onClick={() => window.location.assign('/')}>
              Về trang chủ
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
