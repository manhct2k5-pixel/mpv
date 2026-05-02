package com.wealthwallet.dto;

public record StaffShippingDraftPayload(
        String carrier,
        String service,
        String fee,
        String eta
) {
}
