package com.wealthwallet.dto;

public record OrderItemResponse(
        Long id,
        Long productId,
        Long variantId,
        String productName,
        String productSlug,
        String size,
        String color,
        Double unitPrice,
        Integer quantity,
        Double lineTotal,
        String imageUrl
) {
}
