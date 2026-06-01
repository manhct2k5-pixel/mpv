package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record VoucherResponse(
        Long id,
        String code,
        String type,
        Double value,
        Double minOrder,
        LocalDateTime expireAt,
        Boolean active,
        LocalDateTime createdAt,
        String createdBy
) {}
