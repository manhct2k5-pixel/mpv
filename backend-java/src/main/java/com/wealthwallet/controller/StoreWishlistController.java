package com.wealthwallet.controller;

import com.wealthwallet.dto.StoreProductSummaryResponse;
import com.wealthwallet.service.UserService;
import com.wealthwallet.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreWishlistController {

    private final WishlistService wishlistService;
    private final UserService userService;

    @GetMapping("/wishlist")
    public List<StoreProductSummaryResponse> wishlist() {
        var user = userService.getCurrentUser();
        userService.ensureCustomer(user);
        return wishlistService.list(user);
    }

    @PostMapping("/wishlist/{productId}")
    public StoreProductSummaryResponse add(@PathVariable(name = "productId") Long productId) {
        var user = userService.getCurrentUser();
        userService.ensureCustomer(user);
        return wishlistService.add(user, productId);
    }

    @DeleteMapping("/wishlist/{productId}")
    public ResponseEntity<Void> remove(@PathVariable(name = "productId") Long productId) {
        var user = userService.getCurrentUser();
        userService.ensureCustomer(user);
        wishlistService.remove(user, productId);
        return ResponseEntity.noContent().build();
    }
}
