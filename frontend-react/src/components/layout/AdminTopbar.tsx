import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Store,
  User
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { financeApi } from '../../services/api.ts';
import { mockProfile } from '../../data/mock';
import { useUIStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import { adminNavItems } from '../../constants/adminNav';

interface AdminTopbarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMobileSidebar: () => void;
}

type SearchEntry = {
  id: string;
  label: string;
  description: string;
  action: () => void;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const AdminTopbar = ({ collapsed, onToggleCollapsed, onOpenMobileSidebar }: AdminTopbarProps) => {
  const navigate = useNavigate();
  const unreadCount = useUIStore((state) => state.unreadCount);
  const toggleNotificationDrawer = useUIStore((state) => state.toggleNotificationDrawer);
  const logout = useAuthStore((state) => state.logout);

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [timeFilter, setTimeFilter] = useState('7d');
  const searchRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    placeholderData: mockProfile
  });

  const quickActions = [
    { id: 'seller', label: 'Trang seller', to: '/seller' },
    { id: 'orders', label: 'Đơn hàng', to: '/admin/orders' },
    { id: 'reports', label: 'Báo cáo', to: '/admin/reports' },
    { id: 'refunds', label: 'Hoàn tiền', to: '/admin/refunds' }
  ];

  const searchEntries = useMemo<SearchEntry[]>(() => {
    const pages = adminNavItems.map((item) => ({
      id: `page-${item.key}`,
      label: item.label,
      description: `Đi tới ${item.label}`,
      action: () => navigate(item.path)
    }));

    const actions: SearchEntry[] = [
      {
        id: 'action-seller-home',
        label: 'Trang chủ seller',
        description: 'Mở seller workspace để quản lý gian hàng',
        action: () => navigate('/seller')
      },
      {
        id: 'action-orders',
        label: 'Giám sát đơn hàng',
        description: 'Mở danh sách đơn toàn hệ thống',
        action: () => navigate('/admin/orders')
      },
      {
        id: 'action-reports',
        label: 'Xem báo cáo',
        description: 'Mở dashboard báo cáo hệ thống',
        action: () => navigate('/admin/reports')
      },
      {
        id: 'action-refunds',
        label: 'Xử lý hoàn tiền',
        description: 'Mở danh sách yêu cầu hoàn tiền',
        action: () => navigate('/admin/refunds')
      },
      {
        id: 'action-notify',
        label: 'Xem thông báo',
        description: 'Mở trung tâm thông báo',
        action: () => toggleNotificationDrawer()
      }
    ];

    return [...actions, ...pages];
  }, [navigate, toggleNotificationDrawer]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return searchEntries;
    return searchEntries.filter((entry) =>
      normalizeText(`${entry.label} ${entry.description}`).includes(normalizedQuery)
    );
  }, [query, searchEntries]);

  const visible = filtered.slice(0, 8);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const runSearchAction = (entry: SearchEntry) => {
    entry.action();
    setSearchOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="admin-topbar">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="admin-icon-button admin-focus-ring md:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Mở menu admin"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="admin-icon-button admin-focus-ring hidden md:inline-flex"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <div className="relative min-w-0 flex-1" ref={searchRef}>
          <label className="sr-only" htmlFor="admin-topbar-search">
            Tìm kiếm trong admin
          </label>
          <div className="admin-search-wrap">
            <Search className="h-4 w-4 text-[var(--admin-muted)]" />
            <input
              id="admin-topbar-search"
              value={query}
              placeholder="Tìm người dùng, đơn hàng, cấu hình, báo cáo..."
              className="admin-search-input"
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (!visible.length) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((prev) => (prev + 1) % visible.length);
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex((prev) => (prev - 1 + visible.length) % visible.length);
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  runSearchAction(visible[activeIndex]);
                }
                if (event.key === 'Escape') {
                  setSearchOpen(false);
                }
              }}
            />
          </div>

          {searchOpen ? (
            <div className="admin-search-popover" role="listbox" aria-label="Gợi ý tìm kiếm admin">
              {visible.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[var(--admin-muted)]">Không có kết quả phù hợp.</p>
              ) : (
                visible.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`admin-search-item ${index === activeIndex ? 'is-active' : ''}`}
                    onClick={() => runSearchAction(entry)}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    aria-selected={index === activeIndex}
                  >
                    <span className="text-sm font-medium text-[var(--admin-text)]">{entry.label}</span>
                    <span className="text-xs text-[var(--admin-muted)]">{entry.description}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <select
          value={timeFilter}
          onChange={(event) => setTimeFilter(event.target.value)}
          className="admin-select hidden min-w-[150px] xl:block"
          aria-label="Bộ lọc thời gian"
        >
          <option value="today">Hôm nay</option>
          <option value="7d">7 ngày</option>
          <option value="30d">30 ngày</option>
          <option value="quarter">Quý này</option>
        </select>

        <div className="hidden items-center gap-2 xl:flex">
          {quickActions.map((action) => (
            <Link key={action.id} to={action.to} className="admin-inline-button admin-focus-ring">
              {action.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="admin-icon-button admin-focus-ring relative"
          onClick={() => toggleNotificationDrawer()}
          aria-label="Mở thông báo"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? <span className="admin-notify-badge">{Math.min(99, unreadCount)}</span> : null}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="admin-user-button admin-focus-ring"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="admin-user-menu"
          >
            <img
              src={
                profile?.avatar ??
                profile?.avatarUrl ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName ?? 'Admin')}&background=0B0F1A&color=fff`
              }
              alt={profile?.fullName ?? 'Admin'}
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="hidden max-w-24 truncate text-sm font-medium text-[var(--admin-text)] sm:block">
              {profile?.fullName ?? 'Admin'}
            </span>
            <ChevronDown className="h-4 w-4 text-[var(--admin-muted)]" />
          </button>

          {menuOpen ? (
            <div id="admin-user-menu" role="menu" className="admin-user-menu">
              <Link to="/seller" className="admin-user-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <Store className="h-4 w-4" />
                Trang chủ seller
              </Link>
              <Link to="/tai-khoan" className="admin-user-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <User className="h-4 w-4" />
                Hồ sơ
              </Link>
              <Link to="/admin/account" className="admin-user-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <Settings className="h-4 w-4" />
                Tài khoản admin
              </Link>
              <button type="button" className="admin-user-menu-item" role="menuitem" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default AdminTopbar;
