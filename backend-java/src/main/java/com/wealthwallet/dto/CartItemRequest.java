package com.wealthwallet.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CartItemRequest(
        @NotNull @Positive Long variantId,
        @NotNull @Positive Integer quantity
) {
}
