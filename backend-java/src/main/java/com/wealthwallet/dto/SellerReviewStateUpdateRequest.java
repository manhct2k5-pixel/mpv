package com.wealthwallet.dto;

public record SellerReviewStateUpdateRequest(
        String note,
        Boolean replied,
        Boolean flagged
) {
}
