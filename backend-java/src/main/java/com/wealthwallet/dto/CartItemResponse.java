package com.wealthwallet.dto;

public record CartItemResponse(
        Long id,
        Long variantId,
        Long productId,
        String productName,
        String productSlug,
        String imageUrl,
        String size,
        String color,
        Double unitPrice,
        Integer quantity,
        Double lineTotal
) {
}
