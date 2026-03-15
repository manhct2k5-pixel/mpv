package com.wealthwallet.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProductReviewCreateRequest(
        @NotNull Long orderId,
        @NotNull Long orderItemId,
        @NotNull @Min(1) @Max(5) Integer rating,
        @NotBlank String comment
) {
}
