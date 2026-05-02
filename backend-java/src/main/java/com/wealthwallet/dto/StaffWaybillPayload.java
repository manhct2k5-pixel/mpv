package com.wealthwallet.dto;

public record StaffWaybillPayload(
        String carrier,
        String service,
        String fee,
        String eta,
        String code,
        String createdAt,
        Boolean connected
) {
}
