package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record AdminUserInsightResponse(
        Long id,
        String email,
        String fullName,
        String role,
        Boolean businessRequestPending,
        LocalDateTime businessRequestedAt,
        LocalDateTime createdAt,
        long totalTransactions,
        long flagged,
        long budgets
) {
}
