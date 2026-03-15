package com.wealthwallet.dto;

import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        String orderNumber,
        String status,
        String paymentMethod,
        String paymentStatus,
        Double subtotal,
        Double shippingFee,
        Double discount,
        Double total,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime deliveredAt,
        List<OrderItemResponse> items,
        ShippingAddressResponse shippingAddress
) {
}
