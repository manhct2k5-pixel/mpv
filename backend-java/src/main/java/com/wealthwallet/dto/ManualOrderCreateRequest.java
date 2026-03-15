package com.wealthwallet.dto;

import com.wealthwallet.domain.entity.Order;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ManualOrderCreateRequest(
        @NotBlank String userEmail,
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
        String notes,
        @NotEmpty List<@Valid ManualOrderItemRequest> items
) {
}
