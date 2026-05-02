package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, message = "Mật khẩu mới cần tối thiểu 8 ký tự") String newPassword
) {
}
