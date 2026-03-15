package com.wealthwallet.dto;

import java.util.List;

public record CartResponse(
        Long id,
        List<CartItemResponse> items,
        Double subtotalBeforeDiscount,
        Double voucherDiscount,
        String appliedVoucherCode,
        Double subtotal,
        Double shippingFee,
        Double discount,
        Double total
) {
}
