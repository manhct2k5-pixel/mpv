package com.wealthwallet.controller;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.ProductReviewCreateRequest;
import com.wealthwallet.dto.ProductReviewListResponse;
import com.wealthwallet.dto.ProductReviewResponse;
import com.wealthwallet.service.ProductReviewService;
import com.wealthwallet.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreProductReviewController {

    private final ProductReviewService productReviewService;
    private final UserService userService;

    @GetMapping("/products/{slug}/reviews")
    public ProductReviewListResponse listReviews(@PathVariable(name = "slug") String slug) {
        return productReviewService.listByProductSlug(slug);
    }

    @PostMapping("/product-reviews")
    public ProductReviewResponse createReview(@Valid @RequestBody ProductReviewCreateRequest request) {
        UserAccount user = userService.getCurrentUser();
        userService.ensureCustomer(user);
        return productReviewService.create(user, request);
    }
}
