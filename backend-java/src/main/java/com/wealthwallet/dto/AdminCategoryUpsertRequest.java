package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminCategoryUpsertRequest(
        @NotBlank String name,
        String slug,
        @NotBlank String gender,
        String description,
        String imageUrl,
        Boolean active
) {
}
