package com.wealthwallet.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ManualOrderItemRequest(
        @NotNull Long variantId,
        @NotNull @Positive Integer quantity
) {
}
