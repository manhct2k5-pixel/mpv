package com.wealthwallet.dto;

import java.time.LocalDateTime;
import java.util.List;

public record StaffOrderWorkStateResponse(
        Long orderId,
        String assigneeName,
        Boolean postponed,
        String internalNote,
        StaffQcStatePayload qc,
        StaffShippingDraftPayload shippingDraft,
        StaffWaybillPayload waybill,
        List<StaffTimelineLogPayload> timelineLogs,
        String updatedBy,
        LocalDateTime updatedAt
) {
}
