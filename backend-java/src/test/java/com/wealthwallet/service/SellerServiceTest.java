package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.OrderItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.OrderSummaryResponse;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SellerServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private SellerService sellerService;

    @Test
    void listSellerOrders_shouldExcludeMixedSellerOrders() {
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        Product sellerProduct = product(100L, seller);
        Product otherProduct = product(101L, user(11L, UserAccount.Role.SELLER));

        Order sellerOnlyOrder = order(1L, List.of(item(100L)));
        Order mixedOrder = order(2L, List.of(item(100L), item(101L)));

        when(userAccountRepository.findById(10L)).thenReturn(Optional.of(seller));
        when(productRepository.findBySellerIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(sellerProduct));
        when(orderRepository.findByProductIds(List.of(100L))).thenReturn(List.of(sellerOnlyOrder, mixedOrder));

        List<OrderSummaryResponse> orders = sellerService.listSellerOrders(seller, 10L);

        assertThat(orders).extracting(OrderSummaryResponse::id).containsExactly(1L);
    }

    @Test
    void listSellerOrders_shouldTreatLegacyStylesRoleAsWarehouseAndReturnAllOrders() {
        UserAccount styles = user(12L, UserAccount.Role.STYLES);
        Order firstOrder = order(1L, List.of(item(100L)));
        Order secondOrder = order(2L, List.of(item(101L)));

        when(orderRepository.findAll(org.mockito.ArgumentMatchers.any(org.springframework.data.domain.Sort.class)))
                .thenReturn(List.of(firstOrder, secondOrder));

        List<OrderSummaryResponse> orders = sellerService.listSellerOrders(styles, 12L);

        assertThat(orders).extracting(OrderSummaryResponse::id).containsExactly(1L, 2L);
    }

    private Order order(Long id, List<OrderItem> items) {
        return Order.builder()
                .id(id)
                .orderNumber("WW-" + id)
                .status(Order.Status.PENDING)
                .paymentMethod(Order.PaymentMethod.COD)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .subtotal(100_000d)
                .shippingFee(30_000d)
                .discount(0d)
                .total(130_000d)
                .createdAt(LocalDateTime.now().minusHours(id))
                .updatedAt(LocalDateTime.now())
                .items(items)
                .build();
    }

    private OrderItem item(Long productId) {
        return OrderItem.builder()
                .id(productId)
                .productId(productId)
                .quantity(1)
                .lineTotal(100_000d)
                .build();
    }

    private Product product(Long id, UserAccount seller) {
        return Product.builder()
                .id(id)
                .name("Product " + id)
                .slug("product-" + id)
                .basePrice(100_000d)
                .seller(seller)
                .build();
    }

    private UserAccount user(Long id, UserAccount.Role role) {
        return UserAccount.builder()
                .id(id)
                .role(role)
                .email("user-" + id + "@example.com")
                .passwordHash("hash")
                .fullName("User " + id)
                .build();
    }
}
