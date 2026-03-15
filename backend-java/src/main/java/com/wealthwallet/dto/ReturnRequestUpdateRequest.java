package com.wealthwallet.dto;

public record ReturnRequestUpdateRequest(
        String status,
        String verdict,
        String note,
        String evidenceUrl
) {
}
