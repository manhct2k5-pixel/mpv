package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.OrderItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.SupportTicket;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.SupportTicketResponse;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.SupportTicketRepository;
import com.wealthwallet.repository.UserAccountRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.FORBIDDEN;

@ExtendWith(MockitoExtension.class)
class SupportTicketServiceTest {

    @Mock
    private SupportTicketRepository supportTicketRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private SupportTicketService supportTicketService;

    @Test
    void list_shouldExcludeMixedOrderTicketsFromSellerScope() {
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        UserAccount otherSeller = user(11L, UserAccount.Role.SELLER);
        UserAccount customer = user(12L, UserAccount.Role.USER);

        Product sellerProduct = product(100L, seller);
        Product otherProduct = product(101L, otherSeller);

        SupportTicket genericTicket = ticket(1L, "TK-1", null, seller);
        SupportTicket sellerOnlyTicket = ticket(2L, "TK-2", order(200L, customer, List.of(item(100L))), customer);
        SupportTicket mixedTicket = ticket(3L, "TK-3", order(201L, customer, List.of(item(100L), item(101L))), customer);

        when(supportTicketRepository.findByCreatedByOrderByCreatedAtDesc(seller)).thenReturn(List.of(genericTicket));
        when(productRepository.findBySellerIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(sellerProduct));
        when(supportTicketRepository.findBySellerProductIds(List.of(100L))).thenReturn(List.of(sellerOnlyTicket, mixedTicket));
        when(productRepository.findAllById(List.of(100L))).thenReturn(List.of(sellerProduct));
        when(productRepository.findAllById(List.of(100L, 101L))).thenReturn(List.of(sellerProduct, otherProduct));

        List<SupportTicketResponse> response = supportTicketService.list(seller, null, null);

        assertThat(response).extracting(SupportTicketResponse::id).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void detail_shouldRejectSellerViewingMixedOrderTicket() {
        UserAccount seller = user(10L, UserAccount.Role.SELLER);
        UserAccount otherSeller = user(11L, UserAccount.Role.SELLER);
        UserAccount customer = user(12L, UserAccount.Role.USER);

        Product sellerProduct = product(100L, seller);
        Product otherProduct = product(101L, otherSeller);
        SupportTicket mixedTicket = ticket(3L, "TK-3", order(201L, customer, List.of(item(100L), item(101L))), customer);

        when(supportTicketRepository.findById(3L)).thenReturn(Optional.of(mixedTicket));
        when(productRepository.findAllById(List.of(100L, 101L))).thenReturn(List.of(sellerProduct, otherProduct));

        assertThatThrownBy(() -> supportTicketService.detail(seller, 3L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> {
                    ResponseStatusException exception = (ResponseStatusException) error;
                    assertThat(exception.getStatusCode()).isEqualTo(FORBIDDEN);
                });
    }

    private SupportTicket ticket(Long id, String code, Order order, UserAccount createdBy) {
        return SupportTicket.builder()
                .id(id)
                .ticketCode(code)
                .order(order)
                .createdBy(createdBy)
                .issueType("Vấn đề vận chuyển")
                .description("Cần kiểm tra lại đơn hàng")
                .priority(SupportTicket.Priority.MEDIUM)
                .status(SupportTicket.Status.NEW)
                .createdAt(LocalDateTime.now().minusHours(id))
                .updatedAt(LocalDateTime.now().minusHours(id))
                .build();
    }

    private Order order(Long id, UserAccount owner, List<OrderItem> items) {
        Order order = Order.builder()
                .id(id)
                .orderNumber("WW-" + id)
                .status(Order.Status.PENDING)
                .paymentMethod(Order.PaymentMethod.COD)
                .paymentStatus(Order.PaymentStatus.UNPAID)
                .subtotal(100_000d)
                .shippingFee(30_000d)
                .discount(0d)
                .total(130_000d)
                .user(owner)
                .createdAt(LocalDateTime.now().minusDays(1))
                .updatedAt(LocalDateTime.now())
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
