package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.OrderSummaryResponse;
import com.wealthwallet.dto.SellerProfileResponse;
import com.wealthwallet.dto.SellerProfileUpdateRequest;
import com.wealthwallet.dto.StoreProductSummaryResponse;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class SellerService {

    private final UserAccountRepository userAccountRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public SellerProfileResponse updateSellerProfile(UserAccount user, Long sellerId, SellerProfileUpdateRequest request) {
        UserAccount seller = userAccountRepository.findById(sellerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Seller not found"));
        ensureSellerProfileAccess(user, seller);

        if (request.storeName() != null) {
            seller.setStoreName(trimToNull(request.storeName()));
        }
        if (request.storeDescription() != null) {
            seller.setStoreDescription(trimToNull(request.storeDescription()));
        }
        if (request.storePhone() != null) {
            seller.setStorePhone(trimToNull(request.storePhone()));
        }
        if (request.storeAddress() != null) {
            seller.setStoreAddress(trimToNull(request.storeAddress()));
        }
        if (request.storeLogoUrl() != null) {
            seller.setStoreLogoUrl(trimToNull(request.storeLogoUrl()));
        }
        userAccountRepository.save(seller);
        return mapProfile(seller);
    }

    @Transactional(readOnly = true)
    public List<StoreProductSummaryResponse> listSellerProducts(UserAccount user, Long sellerId) {
        UserAccount seller = userAccountRepository.findById(sellerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Seller not found"));
        ensureSellerProfileAccess(user, seller);
        return productRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId()).stream()
                .map(this::mapProduct)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> listSellerOrders(UserAccount user, Long sellerId) {
        if (user.getRole() == UserAccount.Role.WAREHOUSE || user.getRole() == UserAccount.Role.ADMIN) {
            return orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                    .map(this::mapOrderSummary)
                    .toList();
        }
        UserAccount seller = userAccountRepository.findById(sellerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Seller not found"));
        ensureSellerProfileAccess(user, seller);
        List<Product> products = productRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId());
        if (products.isEmpty()) {
            return List.of();
        }
        List<Long> productIds = products.stream().map(Product::getId).toList();
        return orderRepository.findByProductIds(productIds).stream()
                .map(this::mapOrderSummary)
                .toList();
    }

    private void ensureSellerProfileAccess(UserAccount user, UserAccount seller) {
        if (user.getRole() == UserAccount.Role.ADMIN) {
            return;
        }
        if (seller.getId().equals(user.getId())
                && (seller.getRole() == UserAccount.Role.SELLER || seller.getRole() == UserAccount.Role.STYLES)) {
            return;
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền truy cập seller này");
    }

    private StoreProductSummaryResponse mapProduct(Product product) {
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
                product.getReviewCount()
        );
    }

    private OrderSummaryResponse mapOrderSummary(Order order) {
        return new OrderSummaryResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus().name().toLowerCase(),
                order.getPaymentMethod().name().toLowerCase(),
                order.getPaymentStatus().name().toLowerCase(),
                order.getTotal(),
                order.getItems() != null ? order.getItems().size() : 0,
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getDeliveredAt()
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

    private SellerProfileResponse mapProfile(UserAccount seller) {
        return new SellerProfileResponse(
                seller.getId(),
                seller.getFullName(),
                seller.getRole().name().toLowerCase(),
                seller.getStoreName(),
                seller.getStoreDescription(),
                seller.getStorePhone(),
                seller.getStoreAddress(),
                seller.getStoreLogoUrl()
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
