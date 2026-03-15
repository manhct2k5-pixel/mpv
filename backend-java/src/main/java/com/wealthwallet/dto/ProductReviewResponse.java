package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record ProductReviewResponse(
        Long id,
        Long orderId,
        Long orderItemId,
        Long productId,
        String productSlug,
        Long userId,
        String userName,
        Integer rating,
        String comment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
