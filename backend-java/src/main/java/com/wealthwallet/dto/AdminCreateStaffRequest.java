package com.wealthwallet.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AdminCreateStaffRequest(
        @NotBlank String fullName,
        @Email @NotBlank String email,
        @NotBlank String password,
        @NotBlank String role
) {
}
