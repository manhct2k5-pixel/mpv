package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record LookbookCreateRequest(
        @NotBlank String title,
        String description,
        String mood,
        String coverImageUrl,
        List<String> tags
) {
}
