package com.wealthwallet.dto;

public record StoreSellerResponse(
        Long id,
        String fullName,
        String role,
        Double averageRating,
        Long ratingCount,
        Integer myRating
) {
}
