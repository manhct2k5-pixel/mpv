package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Cart;
import com.wealthwallet.domain.entity.CartItem;
import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.OrderItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.ShippingAddress;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.AdminSystemConfigResponse;
import com.wealthwallet.dto.OrderCreateRequest;
import com.wealthwallet.dto.OrderResponse;
import com.wealthwallet.dto.OrderStatusUpdateRequest;
import com.wealthwallet.dto.OrderSummaryResponse;
import com.wealthwallet.dto.OrderUpdateRequest;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

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

    @Mock
    private AdminSystemConfigService adminSystemConfigService;

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
        processingOrder.setCreatedAt(LocalDateTime.now());

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

    @Test
    void getOrder_shouldNotAutoDeliverBankTransferWhenViewed() {
        UserAccount customer = user(7L, UserAccount.Role.USER);
        Order order = baseOrder(501L, Order.Status.PENDING);
        order.setUser(customer);
        order.setPaymentMethod(Order.PaymentMethod.BANK_TRANSFER);
        order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        order.setCreatedAt(LocalDateTime.now().minusSeconds(6));
        order.setDeliveredAt(null);

        when(orderRepository.findById(501L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrder(customer, 501L);

        assertThat(order.getStatus()).isEqualTo(Order.Status.PENDING);
        assertThat(order.getPaymentStatus()).isEqualTo(Order.PaymentStatus.UNPAID);
        assertThat(order.getDeliveredAt()).isNull();
        assertThat(response.status()).isEqualTo("pending");
        assertThat(response.paymentStatus()).isEqualTo("unpaid");
        assertThat(response.deliveredAt()).isNull();
    }

    @Test
    void getOrder_shouldNotAutoDeliverCodWhenViewed() {
        UserAccount customer = user(7L, UserAccount.Role.USER);
        Order order = baseOrder(502L, Order.Status.PENDING);
        order.setUser(customer);
        order.setPaymentMethod(Order.PaymentMethod.COD);
        order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        order.setCreatedAt(LocalDateTime.now().minusSeconds(11));
        order.setDeliveredAt(null);

        when(orderRepository.findById(502L)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.getOrder(customer, 502L);

        assertThat(order.getStatus()).isEqualTo(Order.Status.PENDING);
        assertThat(order.getPaymentStatus()).isEqualTo(Order.PaymentStatus.UNPAID);
        assertThat(order.getDeliveredAt()).isNull();
        assertThat(response.status()).isEqualTo("pending");
        assertThat(response.paymentStatus()).isEqualTo("unpaid");
        assertThat(response.deliveredAt()).isNull();
    }

    @Test
    void createOrder_shouldMoveCodOrderDirectlyToProcessing() {
        UserAccount customer = user(7L, UserAccount.Role.USER);
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        ProductVariant cartVariant = variant(100L, product(200L, seller), 5);
        ProductVariant lockedVariant = variant(100L, product(200L, seller), 5);
        Cart cart = Cart.builder().id(20L).user(customer).items(new java.util.ArrayList<>()).build();
        cart.getItems().add(CartItem.builder().id(30L).cart(cart).variant(cartVariant).quantity(2).build());

        when(cartRepository.findByUser(customer)).thenReturn(Optional.of(cart));
        when(productVariantRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(lockedVariant));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order saved = invocation.getArgument(0);
            saved.setId(900L);
            return saved;
        });

        OrderResponse response = orderService.createOrder(customer, new OrderCreateRequest(
                "Nguyen Van A",
                "0909000000",
                "12 Nguyen Hue",
                null,
                "Ben Nghe",
                "Quan 1",
                "TP.HCM",
                "TP.HCM",
                null,
                null,
                Order.PaymentMethod.COD,
                null
        ));

        assertThat(response.status()).isEqualTo("processing");
        assertThat(response.paymentStatus()).isEqualTo("unpaid");
        assertThat(lockedVariant.getStockQty()).isEqualTo(3);
        assertThat(cart.getItems()).isEmpty();
    }

    @Test
    void cancelExpiredUnpaidBankTransferOrders_shouldCancelAndReleaseStock() {
        UserAccount customer = user(7L, UserAccount.Role.USER);
        ProductVariant variant = variant(100L, product(200L, user(10L, UserAccount.Role.SELLER)), 1);
        Order order = baseOrder(503L, Order.Status.PENDING);
        order.setUser(customer);
        order.setPaymentMethod(Order.PaymentMethod.BANK_TRANSFER);
        order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        order.setCreatedAt(LocalDateTime.now().minusHours(49));
        order.setItems(List.of(OrderItem.builder()
                .id(1L)
                .variantId(100L)
                .productId(200L)
                .quantity(2)
                .lineTotal(100_000d)
                .build()));

        when(adminSystemConfigService.get()).thenReturn(adminConfig(48));
        when(orderRepository.findByPaymentMethodAndPaymentStatusAndStatusNotInAndCreatedAtBefore(
                any(Order.PaymentMethod.class),
                any(Order.PaymentStatus.class),
                any(),
                any(LocalDateTime.class)
        )).thenReturn(List.of(order));
        when(productVariantRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(variant));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        orderService.cancelExpiredUnpaidBankTransferOrders();

        assertThat(order.getStatus()).isEqualTo(Order.Status.CANCELLED);
        assertThat(variant.getStockQty()).isEqualTo(3);
    }

    @Test
    void getOrder_shouldHideMixedSellerOrderFromSeller() {
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        UserAccount otherSeller = user(11L, UserAccount.Role.SELLER);

        Order order = baseOrder(600L, Order.Status.PENDING);
        order.setItems(List.of(
                OrderItem.builder().id(1L).productId(100L).quantity(1).lineTotal(50_000d).build(),
                OrderItem.builder().id(2L).productId(101L).quantity(1).lineTotal(50_000d).build()
        ));

        when(orderRepository.findById(600L)).thenReturn(Optional.of(order));
        when(productRepository.findAllById(List.of(100L, 101L))).thenReturn(List.of(
                product(100L, seller),
                product(101L, otherSeller)
        ));

        assertThatThrownBy(() -> orderService.getOrder(seller, 600L))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .satisfies(error -> {
                    org.springframework.web.server.ResponseStatusException exception =
                            (org.springframework.web.server.ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(NOT_FOUND);
                });
    }

    @Test
    void updateOrder_shouldRejectBlankRequiredShippingFields() {
        UserAccount customer = user(7L, UserAccount.Role.USER);
        Order order = baseOrder(700L, Order.Status.PENDING);
        order.setUser(customer);
        order.setCreatedAt(LocalDateTime.now());
        order.setShippingAddress(ShippingAddress.builder()
                .order(order)
                .fullName("Nguyen Van A")
                .phone("0909000000")
                .addressLine1("12 Nguyen Hue")
                .city("TP.HCM")
                .build());

        when(orderRepository.findById(700L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateOrder(customer, 700L, new OrderUpdateRequest(
                "   ",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        )))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .satisfies(error -> {
                    org.springframework.web.server.ResponseStatusException exception =
                            (org.springframework.web.server.ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(BAD_REQUEST);
                    assertThat(exception.getReason()).contains("Họ tên người nhận");
                });
    }

    @Test
    void updateOrder_shouldRejectSellerEditingAfterOrderHasEnteredWarehouseFlow() {
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        Order order = baseOrder(710L, Order.Status.SHIPPED);
        order.setShippingAddress(ShippingAddress.builder()
                .order(order)
                .fullName("Nguyen Van A")
                .phone("0909000000")
                .addressLine1("12 Nguyen Hue")
                .city("TP.HCM")
                .build());
        order.setItems(List.of(OrderItem.builder().id(1L).productId(100L).quantity(1).lineTotal(50_000d).build()));

        when(orderRepository.findById(710L)).thenReturn(Optional.of(order));
        when(productRepository.findAllById(List.of(100L))).thenReturn(List.of(product(100L, seller)));

        assertThatThrownBy(() -> orderService.updateOrder(seller, 710L, new OrderUpdateRequest(
                "Nguyen Van B",
                "0911000000",
                "34 Le Loi",
                null,
                null,
                null,
                "Da Nang",
                null,
                null,
                null,
                null
        )))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .satisfies(error -> {
                    org.springframework.web.server.ResponseStatusException exception =
                            (org.springframework.web.server.ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(BAD_REQUEST);
                    assertThat(exception.getReason()).contains("trước khi đơn được xác nhận");
                });
    }

    @Test
    void updateOrder_shouldAllowSellerEditingBeforeWarehouseFlow() {
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        Order order = baseOrder(711L, Order.Status.PROCESSING);
        order.setShippingAddress(ShippingAddress.builder()
                .order(order)
                .fullName("Nguyen Van A")
                .phone("0909000000")
                .addressLine1("12 Nguyen Hue")
                .city("TP.HCM")
                .build());
        order.setItems(List.of(OrderItem.builder().id(1L).productId(100L).quantity(1).lineTotal(50_000d).build()));

        when(orderRepository.findById(711L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.findAllById(List.of(100L))).thenReturn(List.of(product(100L, seller)));

        OrderResponse response = orderService.updateOrder(seller, 711L, new OrderUpdateRequest(
                "Nguyen Van B",
                "0911000000",
                "34 Le Loi",
                null,
                null,
                null,
                "Da Nang",
                null,
                null,
                null,
                null
        ));

        assertThat(response.shippingAddress()).isNotNull();
        assertThat(response.shippingAddress().fullName()).isEqualTo("Nguyen Van B");
        assertThat(response.shippingAddress().city()).isEqualTo("Da Nang");
    }

    @Test
    void cancelOrder_shouldRejectSellerCancellingAfterOrderHasEnteredWarehouseFlow() {
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        Order order = baseOrder(712L, Order.Status.SHIPPED);
        order.setItems(List.of(OrderItem.builder().id(1L).productId(100L).quantity(1).lineTotal(50_000d).build()));

        when(orderRepository.findById(712L)).thenReturn(Optional.of(order));
        when(productRepository.findAllById(List.of(100L))).thenReturn(List.of(product(100L, seller)));

        assertThatThrownBy(() -> orderService.cancelOrder(seller, 712L))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .satisfies(error -> {
                    org.springframework.web.server.ResponseStatusException exception =
                            (org.springframework.web.server.ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(BAD_REQUEST);
                    assertThat(exception.getReason()).contains("trước khi qua kho");
                });
    }

    @Test
    void updateStatus_shouldRejectSellerCancellingViaStatusDropdownAfterOrderHasEnteredWarehouseFlow() {
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        Order order = baseOrder(713L, Order.Status.SHIPPED);
        order.setItems(List.of(OrderItem.builder().id(1L).productId(100L).quantity(1).lineTotal(50_000d).build()));

        when(orderRepository.findById(713L)).thenReturn(Optional.of(order));
        when(productRepository.findAllById(List.of(100L))).thenReturn(List.of(product(100L, seller)));

        assertThatThrownBy(() -> orderService.updateStatus(seller, 713L, new OrderStatusUpdateRequest("cancelled")))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .satisfies(error -> {
                    org.springframework.web.server.ResponseStatusException exception =
                            (org.springframework.web.server.ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(BAD_REQUEST);
                    assertThat(exception.getReason()).contains("trước khi qua kho");
                });
    }

    @Test
    void confirmBankTransferPayment_shouldRejectNonAdminManualConfirmation() {
        UserAccount styles = user(12L, UserAccount.Role.STYLES);
        Order order = baseOrder(714L, Order.Status.CONFIRMED);
        order.setPaymentMethod(Order.PaymentMethod.BANK_TRANSFER);
        order.setPaymentStatus(Order.PaymentStatus.UNPAID);
        order.setItems(List.of(OrderItem.builder().id(1L).productId(100L).quantity(1).lineTotal(50_000d).build()));

        when(orderRepository.findById(714L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.confirmBankTransferPayment(styles, 714L))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .satisfies(error -> {
                    org.springframework.web.server.ResponseStatusException exception =
                            (org.springframework.web.server.ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(FORBIDDEN);
                    assertThat(exception.getReason()).contains("Chỉ admin được xác nhận chuyển khoản");
                });
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

    private ProductVariant variant(Long id, Product product, Integer stockQty) {
        return ProductVariant.builder()
                .id(id)
                .product(product)
                .size("M")
                .color("Be")
                .stockQty(stockQty)
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

    private AdminSystemConfigResponse adminConfig(Integer autoCancelHours) {
        return new AdminSystemConfigResponse(
                "support@example.com",
                "1900",
                autoCancelHours,
                7,
                true,
                false
        );
    }
}
