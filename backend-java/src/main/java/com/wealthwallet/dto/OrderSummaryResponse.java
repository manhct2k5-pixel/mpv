package com.wealthwallet.dto;

import java.time.LocalDateTime;
import java.util.List;

public record OrderSummaryResponse(
        Long id,
        String orderNumber,
        String status,
        String paymentMethod,
        String paymentStatus,
        Double total,
        Integer itemCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime deliveredAt,
        Boolean sellerPaid,
        LocalDateTime sellerPaidAt,
        String customerName,
        String customerPhone,
        Long sellerId,
        String sellerName,
        String sellerStoreName,
        List<Long> sellerIds
) {
}
