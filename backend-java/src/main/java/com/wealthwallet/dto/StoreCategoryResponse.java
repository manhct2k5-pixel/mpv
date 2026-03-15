package com.wealthwallet.dto;

public record StoreCategoryResponse(
        Long id,
        String name,
        String slug,
        String gender,
        String description,
        String imageUrl
) {
}
