package com.wealthwallet.controller;

import com.wealthwallet.dto.SellerProfileResponse;
import com.wealthwallet.dto.SellerProfileUpdateRequest;
import com.wealthwallet.dto.SellerRatingRequest;
import com.wealthwallet.dto.OrderSummaryResponse;
import com.wealthwallet.dto.StoreProductSummaryResponse;
import com.wealthwallet.dto.StoreSellerResponse;
import com.wealthwallet.service.SellerRatingService;
import com.wealthwallet.service.SellerService;
import com.wealthwallet.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreSellerController {

    private final SellerRatingService sellerRatingService;
    private final SellerService sellerService;
    private final UserService userService;

    @GetMapping("/sellers")
    public List<StoreSellerResponse> sellers() {
        return sellerRatingService.listSellers(userService.getCurrentUser());
    }

    @PostMapping("/sellers/{id}/ratings")
    public StoreSellerResponse rateSeller(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody SellerRatingRequest request
    ) {
        return sellerRatingService.rateSeller(userService.getCurrentUser(), id, request);
    }

    @PutMapping("/sellers/{id}")
    public SellerProfileResponse updateSeller(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody SellerProfileUpdateRequest request
    ) {
        return sellerService.updateSellerProfile(userService.getCurrentUser(), id, request);
    }

    @GetMapping("/sellers/{id}/orders")
    public List<OrderSummaryResponse> sellerOrders(@PathVariable(name = "id") Long id) {
        return sellerService.listSellerOrders(userService.getCurrentUser(), id);
    }

    @GetMapping("/sellers/{id}/products")
    public List<StoreProductSummaryResponse> sellerProducts(@PathVariable(name = "id") Long id) {
        return sellerService.listSellerProducts(userService.getCurrentUser(), id);
    }
}
