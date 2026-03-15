import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../services/api.ts';

interface SellerRouteProps {
  children: React.ReactNode;
}

const ALLOWED_ROLES = new Set(['admin', 'seller', 'warehouse']);

const SellerRoute = ({ children }: SellerRouteProps) => {
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  if (isLoading) {
    return <div className="px-4 py-6 text-sm text-slate-500">Đang tải workspace...</div>;
  }

  const role = (profile?.role ?? '').toLowerCase();
  const normalizedRole = role === 'styles' ? 'warehouse' : role;
  if (isError || !ALLOWED_ROLES.has(normalizedRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default SellerRoute;
