package com.wealthwallet.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record SellerRegisterRequest(
        @NotBlank(message = "Họ tên người đại diện là bắt buộc") String fullName,
        @Email(message = "Email chưa đúng định dạng")
        @NotBlank(message = "Email là bắt buộc") String email,
        @NotBlank(message = "Mật khẩu là bắt buộc") String password,
        @Positive Double monthlyIncome,
        @NotBlank(message = "Tên cửa hàng là bắt buộc") String storeName,
        @NotBlank(message = "Số điện thoại cửa hàng là bắt buộc") String storePhone,
        @NotBlank(message = "Địa chỉ lấy hàng là bắt buộc") String storeAddress,
        @NotBlank(message = "Mô tả cửa hàng là bắt buộc") String storeDescription
) {
}
