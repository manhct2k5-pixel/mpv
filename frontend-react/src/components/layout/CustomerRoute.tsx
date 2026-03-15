import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../services/api.ts';

interface CustomerRouteProps {
  children: React.ReactNode;
}

const CustomerRoute = ({ children }: CustomerRouteProps) => {
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    retry: 1
  });

  if (isLoading) {
    return <div className="px-4 py-6 text-sm text-slate-500">Đang tải quyền khách hàng...</div>;
  }

  const role = (profile?.role ?? '').toLowerCase();
  if (isError || role !== 'user') {
    return <Navigate to="/tai-khoan" replace />;
  }

  return <>{children}</>;
};

export default CustomerRoute;
