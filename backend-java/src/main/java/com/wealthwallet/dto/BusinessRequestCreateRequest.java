package com.wealthwallet.dto;

import jakarta.validation.constraints.NotBlank;

public record BusinessRequestCreateRequest(
        @NotBlank(message = "Tên cửa hàng là bắt buộc") String storeName,
        @NotBlank(message = "Số điện thoại cửa hàng là bắt buộc") String storePhone,
        @NotBlank(message = "Địa chỉ lấy hàng là bắt buộc") String storeAddress,
        @NotBlank(message = "Mô tả cửa hàng là bắt buộc") String storeDescription
) {
}
