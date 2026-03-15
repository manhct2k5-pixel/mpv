package com.wealthwallet.dto;

import java.time.LocalDateTime;

public record StoreMessageResponse(
        Long id,
        Long senderId,
        Long receiverId,
        String content,
        LocalDateTime createdAt,
        Boolean fromMe
) {
}
