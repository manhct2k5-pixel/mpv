package com.wealthwallet.dto;

public record StoreProductVariantResponse(
        Long id,
        String size,
        String color,
        Double price,
        Integer stockQty,
        String imageUrl
) {
}
