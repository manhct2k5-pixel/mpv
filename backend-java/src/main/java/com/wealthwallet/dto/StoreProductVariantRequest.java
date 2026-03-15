package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record StoreProductVariantRequest(
        @NotBlank String size,
        @NotBlank String color,
        Double priceOverride,
        @PositiveOrZero Integer stockQty,
        String imageUrl
) {
}
