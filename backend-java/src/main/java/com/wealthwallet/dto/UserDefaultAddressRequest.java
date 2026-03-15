package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record UserDefaultAddressRequest(
        @NotBlank String fullName,
        @NotBlank String phone,
        @NotBlank String addressLine1,
        String addressLine2,
        String ward,
        String district,
        @NotBlank String city,
        String province,
        String postalCode
) {
}
