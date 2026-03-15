package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record BusinessRequestResponse(
        Long id,
        String fullName,
        String email,
        String role,
        LocalDateTime requestedAt
) {
}
