package com.wealthwallet.dto;

public record StaffTimelineLogPayload(
        String at,
        String actor,
        String action,
        String note,
        String attachment,
        String kind
) {
}
