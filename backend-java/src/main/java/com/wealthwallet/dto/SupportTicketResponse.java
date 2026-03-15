package com.wealthwallet.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SupportTicketResponse(
        Long id,
        String ticketCode,
        Long orderId,
        String orderNumber,
        String issueType,
        String priority,
        String status,
        String description,
        String evidenceUrl,
        String resolution,
        Long createdById,
        String createdByName,
        Long assigneeId,
        String assigneeName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<SupportTicketCommentResponse> comments
) {
}
