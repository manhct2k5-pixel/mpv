package com.wealthwallet.dto;

import java.time.LocalDateTime;
import java.util.List;

public record LookbookResponse(
        Long id,
        String title,
        String description,
        String mood,
        String coverImageUrl,
        List<String> tags,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Long createdById,
        String createdByName
) {
}
