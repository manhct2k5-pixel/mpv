package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReturnRequestCreateRequest(
        @NotNull Long orderId,
        @NotBlank String reason,
        String evidenceUrl,
        String note
) {
}
