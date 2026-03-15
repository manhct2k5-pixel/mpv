package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.OrderItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductReview;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.ProductReviewCreateRequest;
import com.wealthwallet.dto.ProductReviewListResponse;
import com.wealthwallet.dto.ProductReviewResponse;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.ProductReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class ProductReviewService {

    private final ProductReviewRepository productReviewRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public ProductReviewListResponse listByProductSlug(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));
        List<ProductReviewResponse> items = productReviewRepository.findByProductOrderByCreatedAtDesc(product).stream()
                .map(this::mapResponse)
                .toList();
        return new ProductReviewListResponse(
                safeAverageRating(product.getAverageRating()),
                safeReviewCount(product.getReviewCount()),
                items
        );
    }

    @Transactional
    public ProductReviewResponse create(UserAccount actor, ProductReviewCreateRequest request) {
        if (actor.getRole() != UserAccount.Role.USER) {
            throw new ResponseStatusException(BAD_REQUEST, "Chỉ khách hàng mới được đánh giá sản phẩm");
        }

        Order order = orderRepository.findById(request.orderId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        if (order.getUser() == null || !order.getUser().getId().equals(actor.getId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Bạn không có quyền đánh giá đơn hàng này");
        }
        if (order.getStatus() != Order.Status.DELIVERED) {
            throw new ResponseStatusException(BAD_REQUEST, "Chỉ được đánh giá khi đơn hàng đã giao thành công");
        }

        OrderItem orderItem = order.getItems().stream()
                .filter(item -> item.getId().equals(request.orderItemId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Sản phẩm trong đơn không hợp lệ"));

        if (productReviewRepository.existsByUserAndOrderItemId(actor, request.orderItemId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Bạn đã đánh giá sản phẩm này trong đơn hàng");
        }

        Product product = productRepository.findById(orderItem.getProductId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Product not found"));

        ProductReview review = ProductReview.builder()
                .product(product)
                .order(order)
                .user(actor)
                .orderItemId(orderItem.getId())
                .rating(request.rating())
                .comment(requireText(request.comment(), "Nội dung đánh giá là bắt buộc"))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        ProductReview saved = productReviewRepository.save(review);
        updateProductReviewStats(product, request.rating());
        return mapResponse(saved);
    }

    private void updateProductReviewStats(Product product, int rating) {
        int currentCount = safeReviewCount(product.getReviewCount());
        double currentAverage = safeAverageRating(product.getAverageRating());
        int nextCount = currentCount + 1;
        double nextAverage = ((currentAverage * currentCount) + rating) / nextCount;
        product.setReviewCount(nextCount);
        product.setAverageRating(nextAverage);
        productRepository.save(product);
    }

    private ProductReviewResponse mapResponse(ProductReview review) {
        Product product = review.getProduct();
        UserAccount user = review.getUser();
        String userName = user != null ? trimToNull(user.getFullName()) : null;
        if (userName == null && user != null) {
            userName = user.getEmail();
        }
        return new ProductReviewResponse(
                review.getId(),
                review.getOrder() != null ? review.getOrder().getId() : null,
                review.getOrderItemId(),
                product != null ? product.getId() : null,
                product != null ? product.getSlug() : null,
                user != null ? user.getId() : null,
                userName,
                review.getRating(),
                review.getComment(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }

    private int safeReviewCount(Integer value) {
        return value != null ? Math.max(0, value) : 0;
    }

    private double safeAverageRating(Double value) {
        return value != null ? Math.max(0.0, value) : 0.0;
    }

    private String requireText(String value, String message) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new ResponseStatusException(BAD_REQUEST, message);
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
