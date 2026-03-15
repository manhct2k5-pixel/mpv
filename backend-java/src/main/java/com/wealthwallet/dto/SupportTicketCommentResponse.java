package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record SupportTicketCommentResponse(
        Long id,
        Long actorId,
        String actorName,
        String message,
        LocalDateTime createdAt
) {
}
