package com.wealthwallet.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Positive;

public record AdminSystemConfigUpdateRequest(
        @Email String supportEmail,
        String supportPhone,
        @Positive Integer orderAutoCancelHours,
        @Positive Integer maxRefundDays,
        Boolean allowManualRefund,
        Boolean maintenanceMode
) {
}
