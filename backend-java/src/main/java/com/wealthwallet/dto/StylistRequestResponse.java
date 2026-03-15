package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record StylistRequestResponse(
        Long id,
        Long requesterId,
        String requesterName,
        Long stylistId,
        String stylistName,
        String note,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
