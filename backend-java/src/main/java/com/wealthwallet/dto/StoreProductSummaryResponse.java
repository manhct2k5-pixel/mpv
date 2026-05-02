package com.wealthwallet.dto;

public record StoreProductSummaryResponse(
        Long id,
        String name,
        String slug,
        String category,
        String gender,
        Double basePrice,
        Double salePrice,
        String imageUrl,
        Boolean featured,
        Double averageRating,
        Integer reviewCount,
        Integer totalStockQty
) {
}
