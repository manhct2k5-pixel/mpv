package com.wealthwallet.dto;

public record UserDefaultAddressResponse(
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
        Boolean isDefault
) {
}
