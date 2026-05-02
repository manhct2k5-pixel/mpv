package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record SellerReviewResponse(
        Long id,
        Long orderId,
        Long orderItemId,
        Long productId,
        String productSlug,
        String productName,
        Long customerId,
        String customerName,
        Integer rating,
        String comment,
        String note,
        Boolean replied,
        Boolean flagged,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
