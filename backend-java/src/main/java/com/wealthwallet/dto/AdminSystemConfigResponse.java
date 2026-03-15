package com.wealthwallet.dto;

public record AdminSystemConfigResponse(
        String supportEmail,
        String supportPhone,
        Integer orderAutoCancelHours,
        Integer maxRefundDays,
        Boolean allowManualRefund,
        Boolean maintenanceMode
) {
}
