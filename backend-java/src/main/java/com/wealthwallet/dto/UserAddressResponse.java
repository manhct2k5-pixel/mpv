package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record UserAddressResponse(
        Long id,
        String fullName,
        String phone,
        String addressLine1,
        String addressLine2,
        String ward,
        String district,
        String city,
        String province,
        String postalCode,
        Boolean isDefault,
        LocalDateTime createdAt
) {
}
