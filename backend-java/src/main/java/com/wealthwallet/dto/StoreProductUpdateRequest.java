package com.wealthwallet.dto;

import com.wealthwallet.domain.entity.Gender;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;

public record StoreProductUpdateRequest(
        String name,
        String description,
        Gender gender,
        Long categoryId,
        String brand,
        String material,
        String fit,
        @Positive Double basePrice,
        @PositiveOrZero Double salePrice,
        Boolean featured,
        Boolean active,
        List<String> imageUrls
) {
}
