package com.wealthwallet.dto;

public record StaffOrderWorkStateUpdateRequest(
        String assigneeName,
        Boolean clearAssignee,
        Boolean postponed,
        String internalNote,
        StaffQcStatePayload qc,
        StaffShippingDraftPayload shippingDraft,
        StaffWaybillPayload waybill,
        Boolean clearWaybill,
        StaffTimelineLogPayload timelineLog
) {
}
