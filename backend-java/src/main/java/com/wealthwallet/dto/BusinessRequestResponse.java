package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record BusinessRequestResponse(
        Long id,
        String fullName,
        String email,
        String role,
        LocalDateTime requestedAt,
        String storeName,
        String storePhone,
        String storeAddress,
        String storeDescription,
        String storeLogoUrl,
        String avatarUrl,
        LocalDateTime createdAt
) {
}
