package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductReview;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.SellerReviewState;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.OrderSummaryResponse;
import com.wealthwallet.dto.SellerProfileResponse;
import com.wealthwallet.dto.SellerProfileUpdateRequest;
import com.wealthwallet.dto.SellerReviewResponse;
import com.wealthwallet.dto.SellerReviewStateUpdateRequest;
import com.wealthwallet.dto.StoreProductSummaryResponse;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.ProductReviewRepository;
import com.wealthwallet.repository.SellerReviewStateRepository;
import com.wealthwallet.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class SellerService {

    private final UserAccountRepository userAccountRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final ProductReviewRepository productReviewRepository;
    private final SellerReviewStateRepository sellerReviewStateRepository;
    private final OrderService orderService;

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
        if (request.sellerBankName() != null) {
            seller.setSellerBankName(trimToNull(request.sellerBankName()));
        }
        if (request.sellerBankAccountName() != null) {
            seller.setSellerBankAccountName(trimToNull(request.sellerBankAccountName()));
        }
        if (request.sellerBankAccountNumber() != null) {
            seller.setSellerBankAccountNumber(trimToNull(request.sellerBankAccountNumber()));
        }
        if (request.sellerOrderNotificationsEnabled() != null) {
            seller.setSellerOrderNotificationsEnabled(request.sellerOrderNotificationsEnabled());
        }
        if (request.sellerMarketingNotificationsEnabled() != null) {
            seller.setSellerMarketingNotificationsEnabled(request.sellerMarketingNotificationsEnabled());
        }
        if (request.sellerOperationAlertsEnabled() != null) {
            seller.setSellerOperationAlertsEnabled(request.sellerOperationAlertsEnabled());
        }
        userAccountRepository.save(seller);
        return mapProfile(seller);
    }

    @Transactional(readOnly = true)
    public List<SellerReviewResponse> listSellerReviews(UserAccount user, Long sellerId) {
        UserAccount seller = userAccountRepository.findById(sellerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Seller not found"));
        ensureSellerProfileAccess(user, seller);

        List<ProductReview> reviews = productReviewRepository.findByProductSellerIdOrderByCreatedAtDesc(seller.getId());
        if (reviews.isEmpty()) {
            return List.of();
        }

        List<Long> reviewIds = reviews.stream().map(ProductReview::getId).toList();
        Map<Long, SellerReviewState> states = sellerReviewStateRepository.findByReviewIdIn(reviewIds).stream()
                .collect(Collectors.toMap(state -> state.getReview().getId(), Function.identity()));

        return reviews.stream()
                .map(review -> mapSellerReview(review, states.get(review.getId())))
                .toList();
    }

    @Transactional
    public SellerReviewResponse updateSellerReviewState(
            UserAccount user,
            Long sellerId,
            Long reviewId,
            SellerReviewStateUpdateRequest request
    ) {
        UserAccount seller = userAccountRepository.findById(sellerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Seller not found"));
        ensureSellerProfileAccess(user, seller);

        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Review not found"));
        ensureReviewBelongsToSeller(review, seller);

        SellerReviewState state = sellerReviewStateRepository.findByReviewId(reviewId)
                .orElseGet(() -> SellerReviewState.builder().review(review).build());
        if (request.note() != null) {
            state.setNote(trimToNull(request.note()));
        }
        if (request.replied() != null) {
            state.setReplied(request.replied());
        }
        if (request.flagged() != null) {
            state.setFlagged(request.flagged());
        }
        state.setUpdatedById(user.getId());
        state.setUpdatedAt(LocalDateTime.now());
        SellerReviewState saved = sellerReviewStateRepository.save(state);
        return mapSellerReview(review, saved);
    }

    @Transactional(readOnly = true)
    public List<StoreProductSummaryResponse> listSellerProducts(UserAccount user, Long sellerId) {
        UserAccount seller = userAccountRepository.findById(sellerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Seller not found"));
        ensureSellerProfileAccess(user, seller);
        return productRepository.findBySellerIdAndActiveTrueOrderByCreatedAtDesc(seller.getId()).stream()
                .map(this::mapProduct)
                .toList();
    }

    @Transactional
    public List<OrderSummaryResponse> listSellerOrders(UserAccount user, Long sellerId) {
        if (user.getRole() == UserAccount.Role.WAREHOUSE
                || user.getRole() == UserAccount.Role.STYLES
                || user.getRole() == UserAccount.Role.ADMIN) {
            List<Order> orders = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            if (orderService != null) {
                orderService.synchronizeAutoStatuses(orders);
            }
            return orders.stream()
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
        Set<Long> sellerProductIds = productIds.stream().collect(Collectors.toSet());
        List<Order> orders = orderRepository.findByProductIds(productIds);
        if (orderService != null) {
            orderService.synchronizeAutoStatuses(orders);
        }
        return orders.stream()
                .filter(order -> orderContainsOnlySellerProducts(order, sellerProductIds))
                .map(this::mapOrderSummary)
                .toList();
    }

    private void ensureSellerProfileAccess(UserAccount user, UserAccount seller) {
        if (user.getRole() == UserAccount.Role.ADMIN) {
            return;
        }
        if (seller.getId().equals(user.getId()) && seller.getRole() == UserAccount.Role.SELLER) {
            return;
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền truy cập seller này");
    }

    private void ensureReviewBelongsToSeller(ProductReview review, UserAccount seller) {
        Product product = review.getProduct();
        UserAccount productSeller = product != null ? product.getSeller() : null;
        if (productSeller == null || !seller.getId().equals(productSeller.getId())) {
            throw new ResponseStatusException(NOT_FOUND, "Review not found for seller");
        }
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
                product.getReviewCount(),
                totalStock(product)
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
                seller.getStoreLogoUrl(),
                seller.getSellerBankName(),
                seller.getSellerBankAccountName(),
                seller.getSellerBankAccountNumber(),
                seller.getSellerOrderNotificationsEnabled(),
                seller.getSellerMarketingNotificationsEnabled(),
                seller.getSellerOperationAlertsEnabled()
        );
    }

    private SellerReviewResponse mapSellerReview(ProductReview review, SellerReviewState state) {
        Product product = review.getProduct();
        UserAccount customer = review.getUser();
        return new SellerReviewResponse(
                review.getId(),
                review.getOrder() != null ? review.getOrder().getId() : null,
                review.getOrderItemId(),
                product != null ? product.getId() : null,
                product != null ? product.getSlug() : null,
                product != null ? product.getName() : null,
                customer != null ? customer.getId() : null,
                customer != null ? customer.getFullName() : null,
                review.getRating(),
                review.getComment(),
                state != null ? state.getNote() : null,
                state != null && Boolean.TRUE.equals(state.getReplied()),
                state != null && Boolean.TRUE.equals(state.getFlagged()),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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

    private boolean orderContainsOnlySellerProducts(Order order, Set<Long> sellerProductIds) {
        return order.getItems().stream()
                .allMatch(item -> item.getProductId() != null && sellerProductIds.contains(item.getProductId()));
    }
}
