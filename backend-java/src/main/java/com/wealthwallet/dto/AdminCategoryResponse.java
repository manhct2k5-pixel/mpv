package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record AdminCategoryResponse(
        Long id,
        String name,
        String slug,
        String gender,
        String description,
        String imageUrl,
        Boolean active,
        LocalDateTime createdAt
) {
}
