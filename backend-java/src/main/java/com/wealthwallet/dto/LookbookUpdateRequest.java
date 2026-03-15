package com.wealthwallet.dto;

import java.util.List;

public record LookbookUpdateRequest(
        String title,
        String description,
        String mood,
        String coverImageUrl,
        List<String> tags,
        Boolean active
) {
}
