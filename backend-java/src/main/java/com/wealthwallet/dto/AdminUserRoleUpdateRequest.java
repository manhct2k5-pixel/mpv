package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminUserRoleUpdateRequest(
        @NotBlank String role
) {
}
