package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record VoucherValidationResponse(
        String code,
        Boolean valid,
        String message,
        String type,
        Double value,
        Double minOrder,
        LocalDateTime expireAt,
        Boolean active
) {
}
