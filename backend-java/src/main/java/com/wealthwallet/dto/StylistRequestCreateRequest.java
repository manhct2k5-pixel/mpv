package com.wealthwallet.dto;

import jakarta.validation.constraints.NotNull;

public record StylistRequestCreateRequest(
        @NotNull Long stylistId,
        String note
) {
}
