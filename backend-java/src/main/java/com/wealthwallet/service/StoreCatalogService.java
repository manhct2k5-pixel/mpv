package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Category;
import com.wealthwallet.domain.entity.Gender;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.dto.PaginatedResponse;
import com.wealthwallet.dto.StoreCategoryResponse;
import com.wealthwallet.dto.StoreProductDetailResponse;
import com.wealthwallet.dto.StoreProductSummaryResponse;
import com.wealthwallet.dto.StoreProductVariantResponse;
import com.wealthwallet.repository.CategoryRepository;
import com.wealthwallet.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class StoreCatalogService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<StoreCategoryResponse> categories() {
        return categoryRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(this::mapCategory)
                .toList();
    }

    @Transactional(readOnly = true)
    public StoreCategoryResponse categoryBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));
        return mapCategory(category);
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<StoreProductSummaryResponse> products(
            String query,
            Long categoryId,
            String gender,
            Double minPrice,
            Double maxPrice,
            String size,
            String color,
            int page,
            int pageSize
    ) {
        Gender genderFilter = parseGender(gender);
        Page<Product> results = productRepository.search(
                categoryId,
                genderFilter,
                minPrice,
                maxPrice,
                normalizeFilter(size),
                normalizeFilter(color),
                normalizeQuery(query),
                PageRequest.of(page, pageSize)
        );
        List<StoreProductSummaryResponse> items = results.getContent().stream()
                .map(this::mapSummary)
                .toList();
        return new PaginatedResponse<>(items, results.getTotalElements(), page, pageSize);
    }

    @Transactional(readOnly = true)
    public List<StoreProductSummaryResponse> featuredProducts() {
        return productRepository.findTop8ByFeaturedTrueAndActiveTrueOrderByCreatedAtDesc().stream()
                .map(this::mapSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public StoreProductDetailResponse productDetail(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        List<StoreProductVariantResponse> variants = product.getVariants().stream()
                .map(this::mapVariant)
                .toList();
        return new StoreProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getGender().name().toLowerCase(),
                product.getBasePrice(),
                product.getSalePrice(),
                product.getAverageRating(),
                product.getReviewCount(),
                product.getDescription(),
                product.getBrand(),
                product.getMaterial(),
                product.getFit(),
                normalizeImageUrls(product.getImageUrls()),
                variants
        );
    }

    private StoreCategoryResponse mapCategory(Category category) {
        return new StoreCategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getGender().name().toLowerCase(),
                category.getDescription(),
                category.getImageUrl()
        );
    }

    private StoreProductSummaryResponse mapSummary(Product product) {
        return new StoreProductSummaryResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getGender().name().toLowerCase(),
                product.getBasePrice(),
                product.getSalePrice(),
                pickPrimaryImage(product),
                product.getFeatured(),
                product.getAverageRating(),
                product.getReviewCount(),
                totalStock(product)
        );
    }

    private StoreProductVariantResponse mapVariant(ProductVariant variant) {
        return new StoreProductVariantResponse(
                variant.getId(),
                variant.getSize(),
                variant.getColor(),
                resolveVariantPrice(variant),
                variant.getStockQty(),
                normalizeImageUrl(variant.getImageUrl())
        );
    }

    private String pickPrimaryImage(Product product) {
        List<String> normalizedProductImages = normalizeImageUrls(product.getImageUrls());
        if (!normalizedProductImages.isEmpty()) {
            String primary = normalizedProductImages.get(0);
            if (primary != null) {
                return primary;
            }
        }
        return product.getVariants().stream()
                .map(ProductVariant::getImageUrl)
                .map(this::normalizeImageUrl)
                .filter(url -> url != null)
                .findFirst()
                .orElse(null);
    }

    private String normalizeImageUrl(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<String> normalizeImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }

        LinkedHashSet<String> uniqueUrls = new LinkedHashSet<>();
        for (String imageUrl : imageUrls) {
            String normalized = normalizeImageUrl(imageUrl);
            if (normalized != null) {
                uniqueUrls.add(normalized);
            }
        }
        return new ArrayList<>(uniqueUrls);
    }

    private Double resolveVariantPrice(ProductVariant variant) {
        if (variant.getPriceOverride() != null) {
            return variant.getPriceOverride();
        }
        Product product = variant.getProduct();
        if (product != null && product.getSalePrice() != null) {
            return product.getSalePrice();
        }
        return product != null ? product.getBasePrice() : null;
    }

    private Integer totalStock(Product product) {
        if (product.getVariants() == null || product.getVariants().isEmpty()) {
            return 0;
        }
        return product.getVariants().stream()
                .map(ProductVariant::getStockQty)
                .filter(stock -> stock != null && stock > 0)
                .reduce(0, Integer::sum);
    }

    private Gender parseGender(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        try {
            return Gender.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid gender");
        }
    }

    private String normalizeFilter(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeQuery(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
