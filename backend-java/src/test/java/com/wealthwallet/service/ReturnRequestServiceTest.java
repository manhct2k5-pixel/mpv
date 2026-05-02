package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.OrderItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ReturnRequest;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.AdminSystemConfigResponse;
import com.wealthwallet.dto.ReturnRequestCreateRequest;
import com.wealthwallet.dto.ReturnRequestResponse;
import com.wealthwallet.dto.ReturnRequestUpdateRequest;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.ReturnRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@ExtendWith(MockitoExtension.class)
class ReturnRequestServiceTest {

    @Mock
    private ReturnRequestRepository returnRequestRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private AdminSystemConfigService adminSystemConfigService;

    @InjectMocks
    private ReturnRequestService returnRequestService;

    @Test
    void create_shouldRejectWhenOrderNotDeliveredForCustomer() {
        UserAccount actor = user(1L, UserAccount.Role.USER);
        Order order = order(100L, actor, Order.Status.SHIPPED, null, LocalDateTime.now(), LocalDateTime.now().minusDays(2));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        ReturnRequestCreateRequest request = new ReturnRequestCreateRequest(100L, "Muốn đổi size", null, null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> returnRequestService.create(actor, request)
        );

        assertThat(exception.getStatusCode().value()).isEqualTo(BAD_REQUEST.value());
        assertThat(exception.getReason()).contains("chưa giao thành công");
        verify(returnRequestRepository, never()).save(any(ReturnRequest.class));
    }

    @Test
    void create_shouldRejectWhenExceededMaxRefundDays() {
        UserAccount actor = user(1L, UserAccount.Role.USER);
        Order order = order(101L, actor, Order.Status.DELIVERED, LocalDateTime.now().minusDays(10), LocalDateTime.now(), LocalDateTime.now().minusDays(12));
        when(orderRepository.findById(101L)).thenReturn(Optional.of(order));
        when(adminSystemConfigService.get()).thenReturn(config(7));

        ReturnRequestCreateRequest request = new ReturnRequestCreateRequest(101L, "Sản phẩm lỗi", "https://example.com/evidence", null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> returnRequestService.create(actor, request)
        );

        assertThat(exception.getStatusCode().value()).isEqualTo(BAD_REQUEST.value());
        assertThat(exception.getReason()).contains("quá thời hạn đổi trả 7 ngày");
        verify(returnRequestRepository, never()).save(any(ReturnRequest.class));
    }

    @Test
    void create_shouldAllowWhenDeliveredAndWithinRefundWindow() {
        UserAccount actor = user(1L, UserAccount.Role.USER);
        Order order = order(102L, actor, Order.Status.DELIVERED, LocalDateTime.now().minusDays(2), LocalDateTime.now(), LocalDateTime.now().minusDays(5));
        when(orderRepository.findById(102L)).thenReturn(Optional.of(order));
        when(adminSystemConfigService.get()).thenReturn(config(7));
        when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(invocation -> {
            ReturnRequest value = invocation.getArgument(0);
            value.setId(900L);
            return value;
        });

        ReturnRequestCreateRequest request = new ReturnRequestCreateRequest(102L, "Không đúng màu", "https://example.com/evidence", "Mong xử lý sớm");
        ReturnRequestResponse response = returnRequestService.create(actor, request);

        assertThat(response.id()).isEqualTo(900L);
        assertThat(response.orderId()).isEqualTo(102L);
        assertThat(response.status()).isEqualTo("pending_verification");
        assertThat(response.evidenceUrl()).isEqualTo("https://example.com/evidence");
        verify(returnRequestRepository).save(any(ReturnRequest.class));
    }

    @Test
    void create_shouldFallbackToUpdatedAtWhenDeliveredAtMissing() {
        UserAccount actor = user(1L, UserAccount.Role.USER);
        Order order = order(103L, actor, Order.Status.DELIVERED, null, LocalDateTime.now().minusDays(3), LocalDateTime.now().minusDays(8));
        when(orderRepository.findById(103L)).thenReturn(Optional.of(order));
        when(adminSystemConfigService.get()).thenReturn(config(7));
        when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(invocation -> {
            ReturnRequest value = invocation.getArgument(0);
            value.setId(901L);
            return value;
        });

        ReturnRequestCreateRequest request = new ReturnRequestCreateRequest(103L, "Muốn trả hàng", null, null);
        ReturnRequestResponse response = returnRequestService.create(actor, request);

        assertThat(response.id()).isEqualTo(901L);
        assertThat(response.orderId()).isEqualTo(103L);
        verify(returnRequestRepository).save(any(ReturnRequest.class));
    }

    @Test
    void create_shouldRejectWhenOrderAlreadyHasReturnRequest() {
        UserAccount actor = user(1L, UserAccount.Role.USER);
        Order order = order(104L, actor, Order.Status.DELIVERED, LocalDateTime.now().minusDays(1), LocalDateTime.now(), LocalDateTime.now().minusDays(3));
        when(orderRepository.findById(104L)).thenReturn(Optional.of(order));
        when(returnRequestRepository.existsByOrder(order)).thenReturn(true);

        ReturnRequestCreateRequest request = new ReturnRequestCreateRequest(104L, "Muốn đổi trả", null, null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> returnRequestService.create(actor, request)
        );

        assertThat(exception.getStatusCode().value()).isEqualTo(BAD_REQUEST.value());
        assertThat(exception.getReason()).contains("đã có yêu cầu đổi trả");
        verify(returnRequestRepository, never()).save(any(ReturnRequest.class));
    }

    @Test
    void list_shouldExcludeMixedOrderRequestsFromSellerScope() {
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        UserAccount otherSeller = user(11L, UserAccount.Role.SELLER);
        UserAccount customer = user(12L, UserAccount.Role.USER);

        Product sellerProduct = product(100L, seller);
        Product otherProduct = product(101L, otherSeller);

        ReturnRequest sellerOnlyRequest = request(1L, "RT-1", order(200L, customer, List.of(item(100L))), customer);
        ReturnRequest mixedRequest = request(2L, "RT-2", order(201L, customer, List.of(item(100L), item(101L))), customer);

        when(returnRequestRepository.findByCreatedByOrderByCreatedAtDesc(seller)).thenReturn(List.of());
        when(productRepository.findBySellerIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(sellerProduct));
        when(returnRequestRepository.findBySellerProductIds(List.of(100L))).thenReturn(List.of(sellerOnlyRequest, mixedRequest));
        when(productRepository.findAllById(eq(List.of(100L)))).thenReturn(List.of(sellerProduct));
        when(productRepository.findAllById(eq(List.of(100L, 101L)))).thenReturn(List.of(sellerProduct, otherProduct));

        List<ReturnRequestResponse> response = returnRequestService.list(seller, null);

        assertThat(response).extracting(ReturnRequestResponse::id).containsExactly(1L);
    }

    @Test
    void update_shouldAllowStaffToCompleteReturnInOneApproval() {
        UserAccount staff = user(20L, UserAccount.Role.WAREHOUSE);
        UserAccount customer = user(21L, UserAccount.Role.USER);
        Order order = order(300L, customer, Order.Status.DELIVERED, LocalDateTime.now().minusDays(1), LocalDateTime.now(), LocalDateTime.now().minusDays(3));
        order.setPaymentStatus(Order.PaymentStatus.PAID);

        ReturnRequest request = ReturnRequest.builder()
                .id(10L)
                .requestCode("RT-FAST")
                .order(order)
                .createdBy(customer)
                .reason("Muốn hoàn trả")
                .status(ReturnRequest.Status.PENDING_VERIFICATION)
                .createdAt(LocalDateTime.now().minusHours(2))
                .updatedAt(LocalDateTime.now().minusHours(2))
                .build();

        when(returnRequestRepository.findById(10L)).thenReturn(Optional.of(request));
        when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReturnRequestResponse response = returnRequestService.update(
                staff,
                10L,
                new ReturnRequestUpdateRequest("refunded", "Duyệt hoàn trả thành công", "Kho đã xác nhận hoàn trả", null)
        );

        assertThat(response.status()).isEqualTo("refunded");
        assertThat(response.verdict()).isEqualTo("Duyệt hoàn trả thành công");
        assertThat(response.handledById()).isEqualTo(20L);
        assertThat(order.getPaymentStatus()).isEqualTo(Order.PaymentStatus.REFUNDED);
        verify(orderRepository, atLeastOnce()).save(order);
    }

    private UserAccount user(Long id, UserAccount.Role role) {
        return UserAccount.builder()
                .id(id)
                .role(role)
                .email("user@example.com")
                .passwordHash("hash")
                .fullName("Khách hàng")
                .build();
    }

    private Order order(
            Long id,
            UserAccount owner,
            Order.Status status,
            LocalDateTime deliveredAt,
            LocalDateTime updatedAt,
            LocalDateTime createdAt
    ) {
        return Order.builder()
                .id(id)
                .orderNumber("WW-" + id)
                .status(status)
                .paymentMethod(Order.PaymentMethod.COD)
                .paymentStatus(Order.PaymentStatus.PAID)
                .subtotal(100_000d)
                .shippingFee(0d)
                .discount(0d)
                .total(100_000d)
                .user(owner)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .deliveredAt(deliveredAt)
                .build();
    }

    private Order order(Long id, UserAccount owner, List<OrderItem> items) {
        Order order = Order.builder()
                .id(id)
                .orderNumber("WW-" + id)
                .status(Order.Status.DELIVERED)
                .paymentMethod(Order.PaymentMethod.COD)
                .paymentStatus(Order.PaymentStatus.PAID)
                .subtotal(100_000d)
                .shippingFee(0d)
                .discount(0d)
                .total(100_000d)
                .user(owner)
                .createdAt(LocalDateTime.now().minusDays(3))
                .updatedAt(LocalDateTime.now().minusDays(1))
                .deliveredAt(LocalDateTime.now().minusDays(1))
                .items(items)
                .build();
        items.forEach(item -> item.setOrder(order));
        return order;
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

    private ReturnRequest request(Long id, String code, Order order, UserAccount createdBy) {
        return ReturnRequest.builder()
                .id(id)
                .requestCode(code)
                .order(order)
                .createdBy(createdBy)
                .reason("Muốn đổi trả")
                .status(ReturnRequest.Status.PENDING_VERIFICATION)
                .createdAt(LocalDateTime.now().minusHours(id))
                .updatedAt(LocalDateTime.now().minusHours(id))
                .build();
    }

    private AdminSystemConfigResponse config(int maxRefundDays) {
        return new AdminSystemConfigResponse(
                "support@example.com",
                "0900000000",
                24,
                maxRefundDays,
                true,
                false
        );
    }
}
