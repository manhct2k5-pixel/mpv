package com.wealthwallet.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record StoreProductVariantUpdateRequest(
        String size,
        String color,
        Double priceOverride,
        @PositiveOrZero Integer stockQty,
        String imageUrl
) {
}
