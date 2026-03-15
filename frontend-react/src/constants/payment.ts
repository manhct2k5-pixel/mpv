export const bankTransferInfo = {
  bankId: 'VCB',
  bankName: 'Vietcombank',
  accountNumber: '1029384756',
  accountName: 'CONG TY TNHH MOC MAM',
  branch: 'CN Ho Chi Minh'
};

export const paymentMethodLabels: Record<string, string> = {
  cod: 'COD',
  bank_transfer: 'Chuyển khoản'
};

export const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền'
};

export const buildTransferContent = (orderNumber: string) => `MOCMAM ${orderNumber}`;

export const buildVietQrUrl = (amount: number, content: string) => {
  const params = new URLSearchParams({
    amount: String(Math.max(0, Math.round(amount))),
    addInfo: content,
    accountName: bankTransferInfo.accountName
  });

  return `https://img.vietqr.io/image/${bankTransferInfo.bankId}-${bankTransferInfo.accountNumber}-compact2.png?${params.toString()}`;
};
