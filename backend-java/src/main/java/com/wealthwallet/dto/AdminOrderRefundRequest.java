package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminOrderRefundRequest(
        @NotBlank String reason
) {
}
