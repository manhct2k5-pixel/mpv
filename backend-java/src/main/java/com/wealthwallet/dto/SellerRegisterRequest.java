package com.wealthwallet.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record SellerRegisterRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        @NotBlank String password,
        @Positive Double monthlyIncome,
        String storeName,
        String storePhone,
        String storeAddress,
        String storeDescription
) {
}
