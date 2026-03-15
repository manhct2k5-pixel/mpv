package com.wealthwallet.controller;

import com.wealthwallet.dto.PaginatedResponse;
import com.wealthwallet.dto.StoreCategoryResponse;
import com.wealthwallet.dto.StoreProductCreateRequest;
import com.wealthwallet.dto.StoreProductDetailResponse;
import com.wealthwallet.dto.StoreProductSummaryResponse;
import com.wealthwallet.dto.StoreProductUpdateRequest;
import com.wealthwallet.dto.StoreProductVariantRequest;
import com.wealthwallet.dto.StoreProductVariantResponse;
import com.wealthwallet.dto.StoreProductVariantUpdateRequest;
import com.wealthwallet.service.StoreCatalogService;
import com.wealthwallet.service.StoreProductManagementService;
import com.wealthwallet.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;

import java.util.List;

@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreCatalogController {

    private final StoreCatalogService storeCatalogService;
    private final StoreProductManagementService storeProductManagementService;
    private final UserService userService;

    @GetMapping("/categories")
    public List<StoreCategoryResponse> categories() {
        return storeCatalogService.categories();
    }

    @GetMapping("/categories/{slug}")
    public StoreCategoryResponse category(@PathVariable(name = "slug") String slug) {
        return storeCatalogService.categoryBySlug(slug);
    }

    @GetMapping("/products")
    public PaginatedResponse<StoreProductSummaryResponse> products(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "pageSize", defaultValue = "12") int pageSize,
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(name = "categoryId", required = false) Long categoryId,
            @RequestParam(name = "gender", required = false) String gender,
            @RequestParam(name = "minPrice", required = false) Double minPrice,
            @RequestParam(name = "maxPrice", required = false) Double maxPrice,
            @RequestParam(name = "size", required = false) String size,
            @RequestParam(name = "color", required = false) String color
    ) {
        return storeCatalogService.products(query, categoryId, gender, minPrice, maxPrice, size, color, page, pageSize);
    }

    @GetMapping("/products/featured")
    public List<StoreProductSummaryResponse> featuredProducts() {
        return storeCatalogService.featuredProducts();
    }

    @GetMapping("/products/{slug}")
    public StoreProductDetailResponse product(@PathVariable(name = "slug") String slug) {
        return storeCatalogService.productDetail(slug);
    }

    @PostMapping("/products")
    public StoreProductDetailResponse createProduct(@Valid @RequestBody StoreProductCreateRequest request) {
        return storeProductManagementService.create(userService.getCurrentUser(), request);
    }

    @PutMapping("/products/{id}")
    public StoreProductDetailResponse updateProduct(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody StoreProductUpdateRequest request
    ) {
        return storeProductManagementService.update(userService.getCurrentUser(), id, request);
    }

    @DeleteMapping("/products/{id}")
    public void deleteProduct(@PathVariable(name = "id") Long id) {
        storeProductManagementService.delete(userService.getCurrentUser(), id);
    }

    @PutMapping("/products/{id}/variants/{variantId}")
    public StoreProductVariantResponse updateVariant(
            @PathVariable(name = "id") Long id,
            @PathVariable(name = "variantId") Long variantId,
            @Valid @RequestBody StoreProductVariantUpdateRequest request
    ) {
        return storeProductManagementService.updateVariant(userService.getCurrentUser(), id, variantId, request);
    }

    @PostMapping("/products/{id}/variants")
    public StoreProductVariantResponse addVariant(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody StoreProductVariantRequest request
    ) {
        return storeProductManagementService.addVariant(userService.getCurrentUser(), id, request);
    }

    @DeleteMapping("/products/{id}/variants/{variantId}")
    public void deleteVariant(
            @PathVariable(name = "id") Long id,
            @PathVariable(name = "variantId") Long variantId
    ) {
        storeProductManagementService.deleteVariant(userService.getCurrentUser(), id, variantId);
    }
}
