type DeliveryFields = {
  fullName: string;
  phone: string;
  addressLine1: string;
  ward: string;
  district: string;
  city: string;
  province: string;
};

const requiredFieldLabels: Array<{ key: keyof DeliveryFields; label: string }> = [
  { key: 'fullName', label: 'họ và tên' },
  { key: 'phone', label: 'số điện thoại' },
  { key: 'addressLine1', label: 'địa chỉ' },
  { key: 'ward', label: 'phường/xã' },
  { key: 'district', label: 'quận/huyện' },
  { key: 'city', label: 'thành phố' },
  { key: 'province', label: 'tỉnh' }
];

export const getMissingDeliveryFields = (fields: DeliveryFields) =>
  requiredFieldLabels
    .filter(({ key }) => !fields[key]?.trim())
    .map(({ label }) => label);

export const buildMissingDeliveryFieldsMessage = (fields: DeliveryFields) => {
  const missing = getMissingDeliveryFields(fields);
  if (missing.length === 0) {
    return null;
  }
  return `Vui lòng nhập đủ ${missing.join(', ')} trước khi đặt hàng.`;
};
