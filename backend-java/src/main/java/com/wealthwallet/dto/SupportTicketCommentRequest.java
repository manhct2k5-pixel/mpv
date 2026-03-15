package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record SupportTicketCommentRequest(
        @NotBlank String message
) {
}
