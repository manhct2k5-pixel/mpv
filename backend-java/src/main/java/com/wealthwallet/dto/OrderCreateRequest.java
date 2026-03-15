package com.wealthwallet.dto;

import com.wealthwallet.domain.entity.Order;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OrderCreateRequest(
        @NotBlank String fullName,
        @NotBlank String phone,
        @NotBlank String addressLine1,
        String addressLine2,
        String ward,
        String district,
        @NotBlank String city,
        String province,
        String postalCode,
        String note,
        @NotNull Order.PaymentMethod paymentMethod,
        String notes
) {
}
