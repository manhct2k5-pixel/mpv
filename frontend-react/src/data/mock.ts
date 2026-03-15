import { AppNotification, UserProfile } from '../types/app';

export const mockNotifications: AppNotification[] = [
  {
    id: 'noti-01',
    title: 'Yêu cầu mở gian hàng mới',
    message: 'Có một tài khoản vừa gửi yêu cầu trở thành seller.',
    timestamp: '2024-06-20T09:30:00+07:00',
    type: 'info',
    read: false
  },
  {
    id: 'noti-02',
    title: 'Đơn hàng cần xác nhận',
    message: 'Có đơn thanh toán chuyển khoản đang chờ đối soát.',
    timestamp: '2024-06-18T20:10:00+07:00',
    type: 'warning',
    read: false
  }
];

export const mockProfile: UserProfile = {
  id: 'user-01',
  fullName: 'Nguyễn Quang Minh',
  email: 'user@email.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face',
  role: 'user'
};
