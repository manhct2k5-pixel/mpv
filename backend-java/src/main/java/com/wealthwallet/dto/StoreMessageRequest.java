package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record StoreMessageRequest(
        @NotBlank String content
) {
}
