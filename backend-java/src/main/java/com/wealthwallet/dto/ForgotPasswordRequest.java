package com.wealthwallet.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @Email(message = "Email chưa đúng định dạng")
        @NotBlank(message = "Email là bắt buộc") String email
) {
}
