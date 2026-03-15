package com.wealthwallet.dto;

import java.time.LocalDateTime;

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
        LocalDateTime deliveredAt
) {
}
