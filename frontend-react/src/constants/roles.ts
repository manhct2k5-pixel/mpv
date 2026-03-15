export type RuntimeRole = 'user' | 'seller' | 'warehouse' | 'admin';

export type RoleActorKind = 'human' | 'system';

export type RoleActorKey =
  | 'guest'
  | 'customer_buyer'
  | 'seller_merchant'
  | 'warehouse_staff'
  | 'customer_support'
  | 'finance_accounting'
  | 'admin_system_admin'
  | 'payment_gateway'
  | 'shipping_carrier'
  | 'notification_service'
  | 'fraud_detection';

export interface RoleActor {
  displayName: string;
  kind: RoleActorKind;
  runtimeRole?: RuntimeRole;
  description: string;
}

export const ROLE_ACTORS: Record<RoleActorKey, RoleActor> = {
  guest: {
    displayName: 'Guest',
    kind: 'human',
    description:
      'Người dùng chưa đăng ký: xem danh mục, tìm kiếm, so sánh đặc điểm và giá; chỉ mua khi đăng ký.'
  },
  customer_buyer: {
    displayName: 'Customer/Buyer',
    kind: 'human',
    runtimeRole: 'user',
    description:
      'Người dùng đã đăng ký: quản lý hồ sơ, giỏ hàng, đặt đơn, thanh toán, theo dõi đơn hàng và để lại đánh giá.'
  },
  seller_merchant: {
    displayName: 'Seller/Merchant',
    kind: 'human',
    runtimeRole: 'seller',
    description:
      'Quản lý sản phẩm, cập nhật tồn kho/giá và xử lý đơn bán của gian hàng.'
  },
  warehouse_staff: {
    displayName: 'Warehouse Staff',
    kind: 'human',
    runtimeRole: 'warehouse',
    description:
      'Nhân viên nội bộ do admin tạo tài khoản: đóng gói, bàn giao vận chuyển, xử lý ticket/đổi trả và cập nhật trạng thái đơn.'
  },
  customer_support: {
    displayName: 'Customer Support',
    kind: 'human',
    runtimeRole: 'warehouse',
    description:
      'Nhân viên kho kiêm CSKH: hỗ trợ đơn hàng/chính sách/đổi trả và phối hợp xử lý vận hành.'
  },
  finance_accounting: {
    displayName: 'Finance/Accounting',
    kind: 'human',
    runtimeRole: 'admin',
    description:
      'Ghi nhận và đối soát giao dịch, doanh thu, phí, hoàn tiền, thuế; đảm bảo báo cáo tài chính chính xác.'
  },
  admin_system_admin: {
    displayName: 'Admin/System Admin',
    kind: 'human',
    runtimeRole: 'admin',
    description:
      'Quản trị hệ thống, phân quyền tài khoản, duyệt nội dung/sản phẩm, giám sát an ninh và vận hành.'
  },
  payment_gateway: {
    displayName: 'Payment Gateway',
    kind: 'system',
    description:
      'Cầu nối giữa website và ngân hàng để truyền dữ liệu thanh toán an toàn, ủy quyền và chuyển tiền.'
  },
  shipping_carrier: {
    displayName: 'Shipping Carrier',
    kind: 'system',
    description:
      'Đơn vị vận chuyển nhận hàng từ kho, giao tới khách và cập nhật trạng thái giao nhận/hoàn.'
  },
  notification_service: {
    displayName: 'Notification Service',
    kind: 'system',
    description: 'Dịch vụ gửi OTP và thông báo trạng thái đơn hàng qua email, SMS hoặc push notification.'
  },
  fraud_detection: {
    displayName: 'Fraud Detection',
    kind: 'system',
    description:
      'Hệ thống chấm điểm và cảnh báo giao dịch bất thường để giảm rủi ro gian lận và bảo vệ người dùng.'
  }
};

export const HUMAN_ROLE_ACTOR_KEYS: RoleActorKey[] = [
  'customer_buyer',
  'seller_merchant',
  'warehouse_staff',
  'admin_system_admin'
];

export const SYSTEM_ROLE_ACTOR_KEYS: RoleActorKey[] = [
  'payment_gateway',
  'shipping_carrier'
];

export const toBusinessRoleLabel = (runtimeRole?: string | null) => {
  const normalized = (runtimeRole ?? '').toLowerCase();
  switch (normalized) {
    case 'user':
      return 'Customer/Buyer';
    case 'seller':
      return 'Seller/Merchant';
    case 'styles':
      return 'Staff/Vận hành';
    case 'warehouse':
      return 'Staff/Vận hành';
    case 'admin':
      return 'Admin/System Admin';
    default:
      return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Guest';
  }
};

export const getActorDescription = (key: RoleActorKey) => ROLE_ACTORS[key].description;
