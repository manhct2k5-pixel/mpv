package com.wealthwallet.dto;

import java.util.List;

public record PaginatedResponse<T>(
        List<T> items,
        long total,
        int page,
        int pageSize
) {
}
