package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.OrderResponse;
import com.wealthwallet.dto.OrderStatusUpdateRequest;
import com.wealthwallet.dto.OrderSummaryResponse;
import com.wealthwallet.repository.CartRepository;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.ProductVariantRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private StoreMessageService storeMessageService;

    @Mock
    private VoucherService voucherService;

    @InjectMocks
    private OrderService orderService;

    @Test
    void updateStatus_shouldSetDeliveredAtWhenOrderBecomesDelivered() {
        UserAccount admin = user(1L, UserAccount.Role.ADMIN);
        Order order = baseOrder(200L, Order.Status.SHIPPED);
        order.setPaymentMethod(Order.PaymentMethod.COD);
        order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        order.setDeliveredAt(null);

        when(orderRepository.findById(200L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.updateStatus(admin, 200L, new OrderStatusUpdateRequest("delivered"));

        assertThat(order.getStatus()).isEqualTo(Order.Status.DELIVERED);
        assertThat(order.getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        assertThat(order.getDeliveredAt()).isNotNull();
        assertThat(response.deliveredAt()).isEqualTo(order.getDeliveredAt());
        assertThat(response.status()).isEqualTo("delivered");
    }

    @Test
    void updateStatus_shouldNotOverwriteDeliveredAtIfAlreadySet() {
        UserAccount admin = user(1L, UserAccount.Role.ADMIN);
        Order order = baseOrder(201L, Order.Status.SHIPPED);
        LocalDateTime existingDeliveredAt = LocalDateTime.now().minusDays(1);
        order.setPaymentMethod(Order.PaymentMethod.COD);
        order.setPaymentStatus(Order.PaymentStatus.PAID);
        order.setDeliveredAt(existingDeliveredAt);

        when(orderRepository.findById(201L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse response = orderService.updateStatus(admin, 201L, new OrderStatusUpdateRequest("DELIVERED"));

        assertThat(order.getDeliveredAt()).isEqualTo(existingDeliveredAt);
        assertThat(response.deliveredAt()).isEqualTo(existingDeliveredAt);
        assertThat(response.status()).isEqualTo("delivered");
    }

    @Test
    void listOrders_shouldExposeDeliveredAtForDeliveredAndNullForUndelivered() {
        UserAccount customer = user(2L, UserAccount.Role.USER);
        LocalDateTime deliveredAt = LocalDateTime.now().minusHours(8);

        Order deliveredOrder = baseOrder(300L, Order.Status.DELIVERED);
        deliveredOrder.setDeliveredAt(deliveredAt);
        deliveredOrder.setCreatedAt(LocalDateTime.now().minusDays(2));

        Order processingOrder = baseOrder(301L, Order.Status.PROCESSING);
        processingOrder.setDeliveredAt(null);
        processingOrder.setCreatedAt(LocalDateTime.now().minusDays(1));

        when(orderRepository.findByUserOrderByCreatedAtDesc(customer)).thenReturn(List.of(deliveredOrder, processingOrder));

        List<OrderSummaryResponse> response = orderService.listOrders(customer);

        assertThat(response).hasSize(2);
        assertThat(response.get(0).id()).isEqualTo(300L);
        assertThat(response.get(0).deliveredAt()).isEqualTo(deliveredAt);
        assertThat(response.get(1).id()).isEqualTo(301L);
        assertThat(response.get(1).deliveredAt()).isNull();
    }

    @Test
    void getOrder_shouldExposeDeliveredAtInOrderResponse() {
        UserAccount customer = user(7L, UserAccount.Role.USER);
        LocalDateTime deliveredAt = LocalDateTime.now().minusHours(3);

        Order order = baseOrder(500L, Order.Status.DELIVERED);
        order.setDeliveredAt(deliveredAt);
        order.setUser(customer);
        when(orderRepository.findById(500L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrder(customer, 500L);

        assertThat(response.id()).isEqualTo(500L);
        assertThat(response.deliveredAt()).isEqualTo(deliveredAt);
    }

    private Order baseOrder(Long id, Order.Status status) {
        UserAccount customer = user(7L, UserAccount.Role.USER);
        return Order.builder()
                .id(id)
                .orderNumber("WW-" + id)
                .status(status)
                .paymentMethod(Order.PaymentMethod.COD)
                .paymentStatus(Order.PaymentStatus.PAID)
                .subtotal(100_000d)
                .shippingFee(30_000d)
                .discount(0d)
                .total(130_000d)
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now())
                .user(customer)
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
