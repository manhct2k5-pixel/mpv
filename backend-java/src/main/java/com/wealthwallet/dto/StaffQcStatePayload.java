package com.wealthwallet.dto;

public record StaffQcStatePayload(
        Boolean checkQuantity,
        Boolean checkModel,
        Boolean checkVisual,
        Boolean checkAccessories,
        String issueNote,
        String packageType,
        String weight,
        String dimensions,
        String packageNote,
        String status
) {
}
