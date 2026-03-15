import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../services/api.ts';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: financeApi.me,
    // no placeholder here to avoid misclassifying role while loading
    retry: 1
  });

  if (isLoading) {
    return <div className="px-4 py-6 text-sm text-slate-500">Đang tải quyền admin...</div>;
  }
  if (isError || (profile?.role ?? '').toLowerCase() !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
