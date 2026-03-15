package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record SupportTicketCreateRequest(
        Long orderId,
        @NotBlank String issueType,
        @NotBlank String description,
        String evidenceUrl,
        String priority,
        Long assigneeId,
        String initialNote
) {
}
