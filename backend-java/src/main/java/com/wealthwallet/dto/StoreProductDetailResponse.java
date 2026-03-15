package com.wealthwallet.dto;

import java.util.List;

public record StoreProductDetailResponse(
        Long id,
        String name,
        String slug,
        String category,
        String gender,
        Double basePrice,
        Double salePrice,
        Double averageRating,
        Integer reviewCount,
        String description,
        String brand,
        String material,
        String fit,
        List<String> images,
        List<StoreProductVariantResponse> variants
) {
}
