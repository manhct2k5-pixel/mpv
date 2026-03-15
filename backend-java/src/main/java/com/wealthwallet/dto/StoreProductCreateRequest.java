package com.wealthwallet.dto;

import com.wealthwallet.domain.entity.Gender;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record StoreProductCreateRequest(
        @NotBlank String name,
        String description,
        @NotNull Gender gender,
        @NotNull Long categoryId,
        String brand,
        String material,
        String fit,
        @NotNull @Positive Double basePrice,
        Double salePrice,
        Boolean featured,
        List<String> imageUrls,
        @NotEmpty List<@Valid StoreProductVariantRequest> variants
) {
}
