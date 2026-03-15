import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { financeApi } from '../services/api.ts';

const AdminRequestsPage = () => {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['business-requests'],
    queryFn: financeApi.businessRequests,
    retry: 1
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => financeApi.approveBusinessRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => financeApi.rejectBusinessRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    }
  });

  return (
    <div className="space-y-8 pb-8">
      <section className="sticker-card space-y-2 p-6 sm:p-8">
        <p className="badge">
          <Clock className="h-3.5 w-3.5" />
          Yêu cầu đang chờ
        </p>
        <h1 className="font-display text-3xl text-mocha">Duyệt quyền kinh doanh</h1>
        <p className="text-sm text-cocoa/70">
          Các tài khoản user đang chờ mở gian hàng. Duyệt để nâng quyền seller.
        </p>
      </section>

      {isLoading ? (
        <div className="sticker-card p-6 text-sm text-cocoa/70">Đang tải danh sách...</div>
      ) : requests.length === 0 ? (
        <div className="sticker-card p-6 text-sm text-cocoa/70">Chưa có yêu cầu mới.</div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const requestedAt = request.requestedAt
              ? new Date(request.requestedAt).toLocaleString('vi-VN')
              : 'Không rõ';
            return (
              <div key={request.id} className="sticker-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-cocoa">{request.fullName}</p>
                  <p className="text-xs text-cocoa/60">{request.email}</p>
                  <p className="text-xs text-cocoa/60">Gửi lúc: {requestedAt}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary btn-primary--sm"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(request.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Duyệt
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-secondary--sm"
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(request.id)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Từ chối
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminRequestsPage;
