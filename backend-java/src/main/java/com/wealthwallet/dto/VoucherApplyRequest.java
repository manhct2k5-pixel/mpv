package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record VoucherApplyRequest(@NotBlank String code) {
}
