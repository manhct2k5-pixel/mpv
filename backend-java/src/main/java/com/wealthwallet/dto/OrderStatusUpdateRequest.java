package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record OrderStatusUpdateRequest(
        @NotBlank String status
) {
}
