package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.WishlistItem;
import com.wealthwallet.dto.StoreProductSummaryResponse;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<StoreProductSummaryResponse> list(UserAccount user) {
        return wishlistRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(WishlistItem::getProduct)
                .map(this::mapSummary)
                .toList();
    }

    @Transactional
    public StoreProductSummaryResponse add(UserAccount user, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        if (!Boolean.TRUE.equals(product.getActive())) {
            throw new ResponseStatusException(NOT_FOUND, "Product not found");
        }
        wishlistRepository.findByUserAndProduct(user, product)
                .orElseGet(() -> wishlistRepository.save(WishlistItem.builder()
                        .user(user)
                        .product(product)
                        .build()));
        return mapSummary(product);
    }

    @Transactional
    public void remove(UserAccount user, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        wishlistRepository.deleteByUserAndProduct(user, product);
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

    private String pickPrimaryImage(Product product) {
        if (product.getImageUrls() != null && !product.getImageUrls().isEmpty()) {
            return product.getImageUrls().get(0);
        }
        return product.getVariants().stream()
                .map(ProductVariant::getImageUrl)
                .filter(url -> url != null && !url.isBlank())
                .findFirst()
                .orElse(null);
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
}
