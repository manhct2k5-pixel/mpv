import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/ui';

const iconByType = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle
} as const;

interface NotificationDrawerProps {
  theme?: 'admin' | 'customer';
  title?: string;
  subtitle?: string;
  onMarkAllRead?: (ids: Array<number | string>) => void;
}

const NotificationDrawer = ({
  theme = 'admin',
  title = 'Thông báo',
  subtitle = 'Cập nhật mới nhất',
  onMarkAllRead
}: NotificationDrawerProps) => {
  const isOpen = useUIStore((state) => state.isNotificationDrawerOpen);
  const close = useUIStore((state) => state.setNotificationDrawerOpen);
  const notifications = useUIStore((state) => state.notifications);
  const markAllNotificationsRead = useUIStore((state) => state.markAllNotificationsRead);

  if (!isOpen) return null;

  const isAdminTheme = theme === 'admin';
  const panelClass = isAdminTheme
    ? 'w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-2xl'
    : 'w-full max-w-md rounded-3xl border border-rose-200/70 bg-white p-6 shadow-[0_24px_44px_rgba(148,163,184,0.22)]';
  const closeButtonClass = isAdminTheme
    ? 'rounded-full bg-white/10 p-2 text-slate-400 hover:text-white'
    : 'rounded-full border border-rose-200/70 bg-white p-2 text-cocoa/60 hover:text-cocoa';
  const emptyClass = isAdminTheme
    ? 'rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300'
    : 'rounded-2xl border border-rose-200/70 bg-rose-50/50 p-4 text-sm text-cocoa/70';
  const itemClass = isAdminTheme
    ? 'rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm'
    : 'rounded-2xl border border-rose-200/70 bg-rose-50/45 p-4 text-sm';
  const itemTitleClass = isAdminTheme ? 'mb-1 flex items-center gap-2 text-slate-100' : 'mb-1 flex items-center gap-2 text-cocoa';
  const itemMessageClass = isAdminTheme ? 'text-slate-300' : 'text-cocoa/80';
  const itemDateClass = isAdminTheme ? 'mt-2 text-xs text-slate-400' : 'mt-2 text-xs text-cocoa/60';

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    onMarkAllRead?.(notifications.map((item) => item.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 py-6 sm:items-center">
      <div className={panelClass}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className={`text-base font-semibold ${isAdminTheme ? 'text-white' : 'text-cocoa'}`}>{title}</p>
            <p className={`text-xs ${isAdminTheme ? 'text-slate-400' : 'text-cocoa/60'}`}>{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={isAdminTheme
                ? 'rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/20'
                : 'rounded-full border border-rose-200/70 bg-white px-3 py-1 text-xs text-cocoa/70 hover:text-cocoa'}
              onClick={handleMarkAllRead}
            >
              Đánh dấu đã đọc
            </button>
            <button className={closeButtonClass} onClick={() => close(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <div className={emptyClass}>
              Chưa có thông báo.
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = iconByType[notification.type];
              const timestamp = notification.timestamp ?? notification.createdAt ?? '';
              const dateLabel = timestamp ? new Date(timestamp).toLocaleString('vi-VN') : '';
              return (
                <div key={notification.id} className={itemClass}>
                  <div className={itemTitleClass}>
                    <Icon className="h-4 w-4" />
                    <span className="font-semibold">{notification.title}</span>
                    {!notification.read ? (
                      <span className={isAdminTheme
                        ? 'rounded-full bg-slate-200/20 px-2 py-0.5 text-xxs text-slate-100'
                        : 'rounded-full border border-rose-200 bg-white px-2 py-0.5 text-xxs text-cocoa/80'}>
                        Mới
                      </span>
                    ) : null}
                  </div>
                  <p className={itemMessageClass}>{notification.message}</p>
                  {dateLabel ? <p className={itemDateClass}>{dateLabel}</p> : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDrawer;
