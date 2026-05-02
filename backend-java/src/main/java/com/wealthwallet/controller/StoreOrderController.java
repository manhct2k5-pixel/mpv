package com.wealthwallet.controller;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.CartItemRequest;
import com.wealthwallet.dto.CartItemUpdateRequest;
import com.wealthwallet.dto.CartResponse;
import com.wealthwallet.dto.ManualOrderCreateRequest;
import com.wealthwallet.dto.OrderCreateRequest;
import com.wealthwallet.dto.OrderResponse;
import com.wealthwallet.dto.OrderSummaryResponse;
import com.wealthwallet.dto.OrderStatusUpdateRequest;
import com.wealthwallet.dto.OrderUpdateRequest;
import com.wealthwallet.dto.VoucherApplyRequest;
import com.wealthwallet.dto.VoucherValidationResponse;
import com.wealthwallet.service.CartService;
import com.wealthwallet.service.OrderService;
import com.wealthwallet.service.UserService;
import com.wealthwallet.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

import java.util.List;

@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreOrderController {

    private final CartService cartService;
    private final OrderService orderService;
    private final UserService userService;
    private final VoucherService voucherService;

    @GetMapping("/cart")
    public CartResponse cart() {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return cartService.getCart(user);
    }

    @PostMapping("/cart/items")
    public CartResponse addCartItem(@Valid @RequestBody CartItemRequest request) {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return cartService.addItem(user, request);
    }

    @PutMapping("/cart/items/{id}")
    public CartResponse updateCartItem(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody CartItemUpdateRequest request
    ) {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return cartService.updateItem(user, id, request);
    }

    @DeleteMapping("/cart/items/{id}")
    public CartResponse removeCartItem(@PathVariable(name = "id") Long id) {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return cartService.removeItem(user, id);
    }

    @PostMapping("/cart/clear")
    public CartResponse clearCart() {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return cartService.clear(user);
    }

    @PostMapping("/cart/voucher/apply")
    public CartResponse applyVoucher(@Valid @RequestBody VoucherApplyRequest request) {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return cartService.applyVoucher(user, request.code());
    }

    @DeleteMapping("/cart/voucher")
    public CartResponse removeVoucher() {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return cartService.removeVoucher(user);
    }

    @GetMapping("/vouchers/validate")
    public VoucherValidationResponse validateVoucher(@RequestParam(name = "code") String code) {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return voucherService.validateForPreview(code);
    }

    @PostMapping("/orders")
    public OrderResponse createOrder(@Valid @RequestBody OrderCreateRequest request) {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return orderService.createOrder(user, request);
    }

    @PostMapping("/orders/manual")
    public OrderResponse createManualOrder(@Valid @RequestBody ManualOrderCreateRequest request) {
        UserAccount user = userService.getCurrentUser();
        return orderService.createManualOrder(user, request);
    }

    @GetMapping("/orders")
    public List<OrderSummaryResponse> orders() {
        UserAccount user = userService.getCurrentUser();
        userService.ensureStoreBuyer(user);
        return orderService.listOrders(user);
    }

    @GetMapping("/orders/{id}")
    public OrderResponse order(@PathVariable(name = "id") Long id) {
        UserAccount user = userService.getCurrentUser();
        return orderService.getOrder(user, id);
    }

    @PutMapping("/orders/{id}/status")
    public OrderResponse updateStatus(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody OrderStatusUpdateRequest request
    ) {
        UserAccount user = userService.getCurrentUser();
        return orderService.updateStatus(user, id, request);
    }

    @PostMapping("/orders/{id}/payment/confirm")
    public OrderResponse confirmPayment(@PathVariable(name = "id") Long id) {
        UserAccount user = userService.getCurrentUser();
        return orderService.confirmBankTransferPayment(user, id);
    }

    @PutMapping("/orders/{id}")
    public OrderResponse updateOrder(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody OrderUpdateRequest request
    ) {
        UserAccount user = userService.getCurrentUser();
        return orderService.updateOrder(user, id, request);
    }

    @DeleteMapping("/orders/{id}")
    public ResponseEntity<Void> cancelOrder(@PathVariable(name = "id") Long id) {
        UserAccount user = userService.getCurrentUser();
        orderService.cancelOrder(user, id);
        return ResponseEntity.noContent().build();
    }
}
