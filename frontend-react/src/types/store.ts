export type StoreGender = 'men' | 'women' | 'unisex' | string;

export interface StoreCategory {
  id: number;
  name: string;
  slug: string;
  gender: StoreGender;
  description?: string;
  imageUrl?: string;
}

export interface StorePolicy {
  maxRefundDays: number;
}

export interface StoreProductSummary {
  id: number;
  name: string;
  slug: string;
  category?: string;
  gender?: StoreGender;
  basePrice: number;
  salePrice?: number | null;
  imageUrl?: string | null;
  featured?: boolean;
  averageRating?: number;
  reviewCount?: number;
  totalStockQty?: number | null;
}

export interface StoreProductVariant {
  id: number;
  size: string;
  color: string;
  price: number;
  stockQty: number;
  imageUrl?: string | null;
}

export interface StoreProductDetail extends StoreProductSummary {
  description?: string | null;
  brand?: string | null;
  material?: string | null;
  fit?: string | null;
  images: string[];
  variants: StoreProductVariant[];
  averageRating?: number;
  reviewCount?: number;
}

export interface CartItem {
  id: number;
  variantId: number;
  productId?: number | null;
  productName?: string | null;
  productSlug?: string | null;
  imageUrl?: string | null;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stockQty?: number | null;
}

export interface Cart {
  id: number;
  items: CartItem[];
  subtotalBeforeDiscount?: number;
  voucherDiscount?: number;
  appliedVoucherCode?: string | null;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
}

export interface OrderItem {
  id: number;
  productId?: number | null;
  variantId?: number | null;
  productName?: string | null;
  productSlug?: string | null;
  size?: string | null;
  color?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl?: string | null;
}

export interface ShippingAddress {
  fullName?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  note?: string | null;
}

export interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
  items: OrderItem[];
  shippingAddress?: ShippingAddress | null;
}

export interface StaffQcState {
  checkQuantity: boolean;
  checkModel: boolean;
  checkVisual: boolean;
  checkAccessories: boolean;
  issueNote: string;
  packageType: string;
  weight: string;
  dimensions: string;
  packageNote: string;
  status: 'pending' | 'passed' | 'failed' | 'packing' | 'packed';
}

export interface StaffShippingDraft {
  carrier: string;
  service: string;
  fee: string;
  eta: string;
}

export interface StaffWaybillState extends StaffShippingDraft {
  code: string;
  createdAt: string;
  connected: boolean;
}

export interface StaffTimelineLog {
  at: string;
  actor: string;
  action: string;
  note: string;
  attachment?: string;
  kind?: 'status' | 'internal' | 'notify_customer' | 'notify_seller';
}

export interface StaffOrderWorkState {
  orderId: number;
  assigneeName?: string | null;
  postponed: boolean;
  internalNote?: string | null;
  qc: StaffQcState;
  shippingDraft: StaffShippingDraft;
  waybill?: StaffWaybillState | null;
  timelineLogs: StaffTimelineLog[];
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface StoreSellerSummary {
  id: number;
  fullName: string;
  role: string;
  averageRating: number;
  ratingCount: number;
  myRating?: number | null;
}

export interface StoreMessagePartner {
  id: number;
  fullName: string;
  role: string;
}

export interface StoreMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  fromMe: boolean;
}

export interface Lookbook {
  id: number;
  title: string;
  description?: string | null;
  mood?: string | null;
  coverImageUrl?: string | null;
  tags?: string[] | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdById?: number | null;
  createdByName?: string | null;
}

export interface StylistSummary {
  id: number;
  fullName: string;
  role: string;
}

export interface StylistRequest {
  id: number;
  requesterId?: number | null;
  requesterName?: string | null;
  stylistId?: number | null;
  stylistName?: string | null;
  note?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SellerProfile {
  id: number;
  fullName: string;
  role: string;
  storeName?: string | null;
  storeDescription?: string | null;
  storePhone?: string | null;
  storeAddress?: string | null;
  storeLogoUrl?: string | null;
  sellerBankName?: string | null;
  sellerBankAccountName?: string | null;
  sellerBankAccountNumber?: string | null;
  sellerOrderNotificationsEnabled?: boolean;
  sellerMarketingNotificationsEnabled?: boolean;
  sellerOperationAlertsEnabled?: boolean;
}

export interface SellerReview {
  id: number;
  orderId?: number | null;
  orderItemId?: number | null;
  productId?: number | null;
  productSlug?: string | null;
  productName?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  rating: number;
  comment?: string | null;
  note?: string | null;
  replied: boolean;
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SupportTicketStatus = 'new' | 'processing' | 'waiting' | 'resolved' | 'closed';
export type SupportTicketPriority = 'high' | 'medium' | 'low';

export interface SupportTicketComment {
  id: number;
  actorId?: number | null;
  actorName?: string | null;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  ticketCode: string;
  orderId?: number | null;
  orderNumber?: string | null;
  issueType: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  description: string;
  evidenceUrl?: string | null;
  resolution?: string | null;
  createdById?: number | null;
  createdByName?: string | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
  createdAt: string;
  updatedAt: string;
  comments: SupportTicketComment[];
}

export type ReturnRequestStatus =
  | 'pending_verification'
  | 'approved'
  | 'collecting'
  | 'received'
  | 'refunded'
  | 'rejected'
  | 'pending_admin';

export interface ReturnRequest {
  id: number;
  requestCode: string;
  orderId: number;
  orderNumber: string;
  customerName: string;
  reason: string;
  evidenceUrl?: string | null;
  paymentStatus: string;
  shippingStatus: string;
  status: ReturnRequestStatus;
  verdict?: string | null;
  note?: string | null;
  createdById?: number | null;
  createdByName?: string | null;
  handledById?: number | null;
  handledByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReview {
  id: number;
  orderId: number;
  orderItemId: number;
  productId: number;
  productSlug?: string | null;
  userId: number;
  userName?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewList {
  averageRating: number;
  reviewCount: number;
  reviews: ProductReview[];
}

export interface VoucherValidationResult {
  code?: string | null;
  valid: boolean;
  message?: string | null;
  type?: string | null;
  value?: number | null;
  minOrder?: number | null;
  expireAt?: string | null;
  active?: boolean;
}
