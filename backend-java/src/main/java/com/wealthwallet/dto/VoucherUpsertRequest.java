package com.wealthwallet.dto;

import com.wealthwallet.domain.entity.Voucher;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDateTime;

public record VoucherUpsertRequest(
        @NotBlank String code,
        @NotNull Voucher.Type type,
        @NotNull @Positive Double value,
        Double minOrder,
        LocalDateTime expireAt,
        Boolean active
) {}
