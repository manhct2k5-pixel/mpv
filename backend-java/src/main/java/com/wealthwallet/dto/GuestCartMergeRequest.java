package com.wealthwallet.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record GuestCartMergeRequest(
        @NotNull @Valid List<CartItemRequest> items
) {
}
