package com.wealthwallet.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ReturnRequestResponse(
        Long id,
        String requestCode,
        Long orderId,
        String orderNumber,
        String customerName,
        String reason,
        String evidenceUrl,
        String paymentStatus,
        String shippingStatus,
        Long sellerId,
        String sellerName,
        String sellerStoreName,
        List<Long> sellerIds,
        String status,
        String verdict,
        String note,
        Long createdById,
        String createdByName,
        Long handledById,
        String handledByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
