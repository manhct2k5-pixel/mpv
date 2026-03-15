package com.wealthwallet.dto;

import java.util.List;

public record ProductReviewListResponse(
        Double averageRating,
        Integer reviewCount,
        List<ProductReviewResponse> reviews
) {
}
