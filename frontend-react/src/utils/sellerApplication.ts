import type { SellerBusinessRequestPayload } from '../types/app';

const SELLER_FIELD_LABELS: Array<{ key: keyof SellerBusinessRequestPayload; label: string }> = [
  { key: 'storeName', label: 'Tên cửa hàng' },
  { key: 'storePhone', label: 'Số điện thoại cửa hàng' },
  { key: 'storeAddress', label: 'Địa chỉ lấy hàng' },
  { key: 'storeDescription', label: 'Mô tả cửa hàng' }
];

export const normalizeSellerBusinessRequestPayload = (
  payload: SellerBusinessRequestPayload
): SellerBusinessRequestPayload => ({
  storeName: payload.storeName.trim(),
  storePhone: payload.storePhone.trim(),
  storeAddress: payload.storeAddress.trim(),
  storeDescription: payload.storeDescription.trim()
});

export const getSellerBusinessRequestValidationMessage = (
  payload: Partial<SellerBusinessRequestPayload>
): string | null => {
  const missingLabels = SELLER_FIELD_LABELS.filter(({ key }) => !(payload[key] ?? '').trim()).map(({ label }) => label);

  if (!missingLabels.length) {
    return null;
  }

  return missingLabels.length === 1
    ? `${missingLabels[0]} là bắt buộc.`
    : `Vui lòng nhập đầy đủ: ${missingLabels.join(', ')}.`;
};
