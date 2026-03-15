package com.wealthwallet.dto;

public record SupportTicketUpdateRequest(
        String status,
        String priority,
        Long assigneeId,
        String issueType,
        String description,
        String evidenceUrl,
        String resolution,
        String note
) {
}
