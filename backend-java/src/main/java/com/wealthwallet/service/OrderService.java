package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Cart;
import com.wealthwallet.domain.entity.CartItem;
import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.OrderItem;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductVariant;
import com.wealthwallet.domain.entity.ShippingAddress;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.Voucher;
import com.wealthwallet.dto.AdminSystemConfigResponse;
import com.wealthwallet.dto.ManualOrderCreateRequest;
import com.wealthwallet.dto.ManualOrderItemRequest;
import com.wealthwallet.dto.OrderCreateRequest;
import com.wealthwallet.dto.OrderItemResponse;
import com.wealthwallet.dto.OrderResponse;
import com.wealthwallet.dto.OrderSummaryResponse;
import com.wealthwallet.dto.OrderStatusUpdateRequest;
import com.wealthwallet.dto.OrderUpdateRequest;
import com.wealthwallet.dto.ShippingAddressResponse;
import com.wealthwallet.repository.CartRepository;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.ProductVariantRepository;
import com.wealthwallet.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final double FREE_SHIPPING_THRESHOLD = 500_000;
    private static final double BASE_SHIPPING_FEE = 30_000;
    private static final int DEFAULT_ORDER_AUTO_CANCEL_HOURS = 48;

    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final UserAccountRepository userAccountRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;
    private final StoreMessageService storeMessageService;
    private final VoucherService voucherService;
    private final AdminSystemConfigService adminSystemConfigService;

    private record OrderSellerSnapshot(
            Long sellerId,
            String sellerName,
            String sellerStoreName,
            List<Long> sellerIds
    ) {
    }

    @Transactional
    public OrderResponse createOrder(UserAccount user, OrderCreateRequest request) {
        Cart cart = cartRepository.findByUser(user)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Giỏ hàng trống"));
        if (cart.getItems().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Giỏ hàng trống");
        }

        Map<Long, Integer> requestedQuantities = collectCartQuantities(cart.getItems());
        Map<Long, ProductVariant> lockedVariants = loadVariantsForUpdate(requestedQuantities.keySet());
        reserveStock(lockedVariants, requestedQuantities);

        double subtotal = cart.getItems().stream()
                .mapToDouble(item -> {
                    ProductVariant variant = lockedVariants.get(item.getVariant().getId());
                    return calculateLineTotal(variant, item.getQuantity());
                })
                .sum();
        double shippingFee = calculateShippingFee(subtotal, request.city(), request.province());
        Voucher appliedVoucher = cart.getAppliedVoucher();
        if (appliedVoucher != null) {
            voucherService.validateVoucher(appliedVoucher, subtotal, resolveCartSellerId(cart));
        }
        double discount = voucherService.calculateDiscount(appliedVoucher, subtotal);
        double total = subtotal + shippingFee - discount;

        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .status(initialOrderStatus(request.paymentMethod()))
                .paymentMethod(request.paymentMethod())
                .paymentStatus(initialPaymentStatus(request.paymentMethod()))
                .subtotal(subtotal)
                .shippingFee(shippingFee)
                .discount(discount)
                .total(total)
                .notes(request.notes())
                .user(user)
                .build();

        List<OrderItem> orderItems = cart.getItems().stream()
                .map(item -> mapOrderItem(order, item, lockedVariants.get(item.getVariant().getId())))
                .toList();
        order.getItems().addAll(orderItems);

        ShippingAddress shippingAddress = ShippingAddress.builder()
                .order(order)
                .fullName(request.fullName())
                .phone(request.phone())
                .addressLine1(request.addressLine1())
                .addressLine2(request.addressLine2())
                .ward(request.ward())
                .district(request.district())
                .city(request.city())
                .province(request.province())
                .postalCode(request.postalCode())
                .note(request.note())
                .build();
        validateCheckoutAddress(shippingAddress);
        order.setShippingAddress(shippingAddress);

        Order saved = orderRepository.save(order);

        cart.getItems().clear();
        cart.setAppliedVoucher(null);
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);

        return mapOrder(saved);
    }

    @Transactional
    public OrderResponse createManualOrder(UserAccount creator, ManualOrderCreateRequest request) {
        if (!canCreateManualOrder(creator)) {
            throw new ResponseStatusException(FORBIDDEN, "Chỉ admin mới được tạo đơn thủ công");
        }
        UserAccount buyer = userAccountRepository.findByEmail(request.userEmail())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));
        if (buyer.getRole() != UserAccount.Role.USER) {
            throw new ResponseStatusException(BAD_REQUEST, "Chỉ gửi đơn cho user");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Danh sách sản phẩm trống");
        }

        // Tối ưu: Fetch tất cả variants trong 1 query thay vì N query
        Set<Long> variantIds = request.items().stream().map(ManualOrderItemRequest::variantId).collect(Collectors.toSet());
        Map<Long, Integer> requestedQuantities = collectManualQuantities(request.items());
        Map<Long, ProductVariant> variants = loadVariantsForUpdate(variantIds);
        reserveStock(variants, requestedQuantities);

        double subtotal = request.items().stream()
                .mapToDouble(item -> calculateLineTotal(variants.get(item.variantId()), item.quantity()))
                .sum();
        double shippingFee = calculateShippingFee(subtotal, request.city(), request.province());
        double discount = 0.0;
        double total = subtotal + shippingFee - discount;

        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .status(Order.Status.PENDING)
                .paymentMethod(request.paymentMethod())
                .paymentStatus(initialPaymentStatus(request.paymentMethod()))
                .subtotal(subtotal)
                .shippingFee(shippingFee)
                .discount(discount)
                .total(total)
                .notes(request.notes())
                .user(buyer)
                .build();

        List<OrderItem> orderItems = request.items().stream()
                .map(item -> mapManualOrderItem(order, item, variants.get(item.variantId())))
                .toList();
        order.getItems().addAll(orderItems);

        ShippingAddress shippingAddress = ShippingAddress.builder()
                .order(order)
                .fullName(request.fullName())
                .phone(request.phone())
                .addressLine1(request.addressLine1())
                .addressLine2(request.addressLine2())
                .ward(request.ward())
                .district(request.district())
                .city(request.city())
                .province(request.province())
                .postalCode(request.postalCode())
                .note(request.note())
                .build();
        validateCheckoutAddress(shippingAddress);
        order.setShippingAddress(shippingAddress);

        Order saved = orderRepository.save(order);

        String creatorDisplayName = trimToNull(creator.getFullName());
        if (creatorDisplayName == null) {
            creatorDisplayName = creator.getEmail();
        }
        storeMessageService.sendSystemMessage(
                creator,
                buyer,
                manualOrderCreatorLabel(creator.getRole()) + " " + creatorDisplayName
                        + " đã tạo đơn hàng " + saved.getOrderNumber() + " cho bạn."
        );

        return mapOrder(saved);
    }

    @Transactional
    public List<OrderSummaryResponse> listOrders(UserAccount user) {
        List<Order> orders = orderRepository.findByUserOrderByCreatedAtDesc(user);
        applyAutoStatusTransitions(orders);
        return orders.stream()
                .map(this::mapOrderSummary)
                .toList();
    }

    @Transactional
    public OrderResponse getOrder(UserAccount user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        ensureCanViewOrder(user, order);
        applyAutoStatusTransition(order);
        return mapOrder(order);
    }

    @Transactional
    public OrderResponse updateStatus(UserAccount user, Long orderId, OrderStatusUpdateRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        ensureCanViewOrder(user, order);
        applyAutoStatusTransition(order);
        Order.Status nextStatus = parseStatus(request.status());
        ensureCanManageOrder(user, order, nextStatus);
        if (isWarehouseSupportRole(user.getRole())) {
            ensureWarehouseCanUpdateStatus(nextStatus);
        }
        if (nextStatus == order.getStatus()) {
            return mapOrder(order);
        }
        if (order.getStatus() == Order.Status.CANCELLED || order.getStatus() == Order.Status.DELIVERED) {
            throw new ResponseStatusException(BAD_REQUEST, "Không thể cập nhật trạng thái đơn hàng");
        }

        if (nextStatus == Order.Status.CANCELLED) {
            if (user.getRole() == UserAccount.Role.SELLER && !isSellerEditableStage(order.getStatus())) {
                throw new ResponseStatusException(BAD_REQUEST, "Seller chỉ được hủy đơn trước khi qua kho");
            }
            return cancelWithSideEffects(order);
        }

        ensureSequentialStatusTransition(order.getStatus(), nextStatus);

        if (nextStatus == Order.Status.DELIVERED
                && order.getPaymentMethod() == Order.PaymentMethod.COD
                && order.getPaymentStatus() == Order.PaymentStatus.UNPAID) {
            order.setPaymentStatus(Order.PaymentStatus.PAID);
        }

        if (nextStatus == Order.Status.DELIVERED && order.getDeliveredAt() == null) {
            order.setDeliveredAt(LocalDateTime.now());
        }

        order.setStatus(nextStatus);
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);
        return mapOrder(saved);
    }

    @Transactional
    public OrderResponse confirmBankTransferPayment(UserAccount user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        if (user.getRole() != UserAccount.Role.ADMIN) {
            throw new ResponseStatusException(FORBIDDEN, "Chỉ admin được xác nhận chuyển khoản");
        }
        applyAutoStatusTransition(order);

        if (order.getPaymentMethod() != Order.PaymentMethod.BANK_TRANSFER) {
            throw new ResponseStatusException(BAD_REQUEST, "Đơn hàng không dùng phương thức chuyển khoản");
        }
        if (order.getStatus() == Order.Status.CANCELLED) {
            throw new ResponseStatusException(BAD_REQUEST, "Không thể xác nhận thanh toán cho đơn đã hủy");
        }
        if (order.getPaymentStatus() == Order.PaymentStatus.PAID) {
            return mapOrder(order);
        }
        if (order.getPaymentStatus() == Order.PaymentStatus.REFUNDED) {
            throw new ResponseStatusException(BAD_REQUEST, "Đơn hàng đã hoàn tiền");
        }

        order.setPaymentStatus(Order.PaymentStatus.PAID);
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);
        return mapOrder(saved);
    }

    @Transactional
    public OrderResponse refundByAdmin(UserAccount user, Long orderId, String reason) {
        if (user.getRole() != UserAccount.Role.ADMIN) {
            throw new ResponseStatusException(FORBIDDEN, "Chỉ admin được hoàn tiền thủ công");
        }
        String normalizedReason = trimToNull(reason);
        if (normalizedReason == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Lý do hoàn tiền là bắt buộc");
        }

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));

        if (order.getPaymentStatus() == Order.PaymentStatus.REFUNDED) {
            return mapOrder(order);
        }
        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            throw new ResponseStatusException(BAD_REQUEST, "Chỉ hoàn tiền cho đơn đã thanh toán");
        }

        order.setPaymentStatus(Order.PaymentStatus.REFUNDED);
        order.setNotes(appendAdminRefundNote(order.getNotes(), normalizedReason));
        UserAccount buyer = order.getUser();
        if (buyer != null) {
            double currentWallet = buyer.getWalletBalance() != null ? buyer.getWalletBalance() : 0.0;
            double refundAmount = order.getTotal() != null ? order.getTotal() : 0.0;
            buyer.setWalletBalance(currentWallet + refundAmount);
            userAccountRepository.save(buyer);
        }
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);
        return mapOrder(saved);
    }

    @Transactional
    public OrderResponse updateOrder(UserAccount user, Long orderId, OrderUpdateRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        ensureCanViewOrder(user, order);
        applyAutoStatusTransition(order);
        ensureCanEditOrder(user, order);
        ShippingAddress address = order.getShippingAddress();
        if (address == null) {
            address = ShippingAddress.builder().order(order).build();
            order.setShippingAddress(address);
        }

        if (request.fullName() != null) {
            address.setFullName(trimToNull(request.fullName()));
        }
        if (request.phone() != null) {
            address.setPhone(trimToNull(request.phone()));
        }
        if (request.addressLine1() != null) {
            address.setAddressLine1(trimToNull(request.addressLine1()));
        }
        if (request.addressLine2() != null) {
            address.setAddressLine2(trimToNull(request.addressLine2()));
        }
        if (request.ward() != null) {
            address.setWard(trimToNull(request.ward()));
        }
        if (request.district() != null) {
            address.setDistrict(trimToNull(request.district()));
        }
        if (request.city() != null) {
            address.setCity(trimToNull(request.city()));
        }
        if (request.province() != null) {
            address.setProvince(trimToNull(request.province()));
        }
        if (request.postalCode() != null) {
            address.setPostalCode(trimToNull(request.postalCode()));
        }
        if (request.note() != null) {
            address.setNote(trimToNull(request.note()));
        }
        if (request.notes() != null) {
            order.setNotes(trimToNull(request.notes()));
        }
        validateEditableShippingAddress(address);
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);
        return mapOrder(saved);
    }

    @Transactional
    public OrderResponse cancelOrder(UserAccount user, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        ensureCanViewOrder(user, order);
        applyAutoStatusTransition(order);
        ensureCanCancelOrder(user, order);
        return cancelWithSideEffects(order);
    }

    @Transactional
    public List<Order> synchronizeAutoStatuses(List<Order> orders) {
        applyAutoStatusTransitions(orders);
        return orders;
    }

    @Transactional
    public Order synchronizeAutoStatus(Order order) {
        applyAutoStatusTransition(order);
        return order;
    }

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void autoTransitionPackingToShipped() {
        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(5);
        List<Order> packingOrders = orderRepository.findByStatusAndUpdatedAtBefore(Order.Status.PACKING, cutoff);
        for (Order order : packingOrders) {
            order.setStatus(Order.Status.SHIPPED);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);
        }
    }

    @Scheduled(fixedDelayString = "${app.order-auto-cancel-scan-ms:300000}")
    @Transactional
    public void cancelExpiredUnpaidBankTransferOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(resolveOrderAutoCancelHours());
        List<Order> expiredOrders = orderRepository.findByPaymentMethodAndPaymentStatusAndStatusNotInAndCreatedAtBefore(
                Order.PaymentMethod.BANK_TRANSFER,
                Order.PaymentStatus.UNPAID,
                List.of(Order.Status.CANCELLED, Order.Status.DELIVERED,
                        Order.Status.PACKING, Order.Status.SHIPPED),
                cutoff
        );
        expiredOrders.forEach(this::cancelExpiredUnpaidBankTransferOrder);
    }

    private OrderResponse mapOrder(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .sorted(Comparator.comparing(OrderItem::getId))
                .map(item -> new OrderItemResponse(
                        item.getId(),
                        item.getProductId(),
                        item.getVariantId(),
                        item.getProductName(),
                        item.getProductSlug(),
                        item.getSize(),
                        item.getColor(),
                        item.getUnitPrice(),
                        item.getQuantity(),
                        item.getLineTotal(),
                        item.getImageUrl()
                ))
                .toList();
        ShippingAddress address = order.getShippingAddress();
        ShippingAddressResponse addressResponse = null;
        if (address != null) {
            addressResponse = new ShippingAddressResponse(
                    address.getFullName(),
                    address.getPhone(),
                    address.getAddressLine1(),
                    address.getAddressLine2(),
                    address.getWard(),
                    address.getDistrict(),
                    address.getCity(),
                    address.getProvince(),
                    address.getPostalCode(),
                    address.getNote()
            );
        }

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus().name().toLowerCase(),
                order.getPaymentMethod().name().toLowerCase(),
                order.getPaymentStatus().name().toLowerCase(),
                order.getSubtotal(),
                order.getShippingFee(),
                order.getDiscount(),
                order.getTotal(),
                order.getNotes(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getDeliveredAt(),
                items,
                addressResponse
        );
    }

    private OrderSummaryResponse mapOrderSummary(Order order) {
        ShippingAddress address = order.getShippingAddress();
        OrderSellerSnapshot seller = resolveOrderSellerSnapshot(order);
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
                order.getDeliveredAt(),
                Boolean.TRUE.equals(order.getSellerPaid()),
                order.getSellerPaidAt(),
                address != null ? trimToNull(address.getFullName()) : null,
                address != null ? trimToNull(address.getPhone()) : null,
                seller.sellerId(),
                seller.sellerName(),
                seller.sellerStoreName(),
                seller.sellerIds()
        );
    }

    private OrderSellerSnapshot resolveOrderSellerSnapshot(Order order) {
        Set<Long> productIds = order.getItems().stream()
                .map(OrderItem::getProductId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        if (productIds.isEmpty()) {
            return new OrderSellerSnapshot(null, null, null, List.of());
        }
        Map<Long, Product> productById = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, product -> product));
        Map<Long, UserAccount> sellers = new LinkedHashMap<>();
        order.getItems().forEach(item -> {
            Long productId = item.getProductId();
            if (productId == null) {
                return;
            }
            Product product = productById.get(productId);
            if (product == null || product.getSeller() == null || product.getSeller().getId() == null) {
                return;
            }
            UserAccount seller = product.getSeller();
            sellers.putIfAbsent(seller.getId(), seller);
        });

        List<Long> sellerIds = List.copyOf(sellers.keySet());
        if (sellerIds.isEmpty()) {
            return new OrderSellerSnapshot(null, null, null, List.of());
        }
        if (sellerIds.size() == 1) {
            UserAccount seller = sellers.get(sellerIds.get(0));
            return new OrderSellerSnapshot(
                    seller.getId(),
                    trimToNull(seller.getFullName()),
                    trimToNull(seller.getStoreName()),
                    sellerIds
            );
        }
        String sellerNames = sellers.values().stream()
                .map(UserAccount::getFullName)
                .map(this::trimToNull)
                .filter(name -> name != null)
                .collect(Collectors.joining(", "));
        return new OrderSellerSnapshot(
                sellerIds.get(0),
                sellerNames.isBlank() ? "Nhiều seller" : sellerNames,
                "Nhiều seller",
                sellerIds
        );
    }

    private OrderItem mapOrderItem(Order order, CartItem item, ProductVariant variant) {
        Product product = variant.getProduct();
        double unitPrice = resolveUnitPrice(variant);
        return OrderItem.builder()
                .order(order)
                .productId(product != null ? product.getId() : null)
                .variantId(variant.getId())
                .productName(product != null ? product.getName() : null)
                .productSlug(product != null ? product.getSlug() : null)
                .size(variant.getSize())
                .color(variant.getColor())
                .unitPrice(unitPrice)
                .quantity(item.getQuantity())
                .lineTotal(unitPrice * item.getQuantity())
                .imageUrl(firstImage(product, variant))
                .build();
    }

    private OrderItem mapManualOrderItem(Order order, ManualOrderItemRequest item, ProductVariant variant) {
        Product product = variant.getProduct();
        double unitPrice = resolveUnitPrice(variant);
        return OrderItem.builder()
                .order(order)
                .productId(product != null ? product.getId() : null)
                .variantId(variant.getId())
                .productName(product != null ? product.getName() : null)
                .productSlug(product != null ? product.getSlug() : null)
                .size(variant.getSize())
                .color(variant.getColor())
                .unitPrice(unitPrice)
                .quantity(item.quantity())
                .lineTotal(unitPrice * item.quantity())
                .imageUrl(firstImage(product, variant))
                .build();
    }

    private double calculateLineTotal(ProductVariant variant, Integer quantity) {
        if (variant == null || quantity == null || quantity <= 0) {
            return 0.0;
        }
        return resolveUnitPrice(variant) * quantity;
    }

    private double calculateShippingFee(double subtotal, String city, String province) {
        if (subtotal <= 0 || subtotal >= FREE_SHIPPING_THRESHOLD) {
            return 0.0;
        }

        String region = normalizeRegion((city == null ? "" : city) + " " + (province == null ? "" : province));
        if (region.contains("tp hcm") || region.contains("hcm") || region.contains("ho chi minh")) {
            return BASE_SHIPPING_FEE;
        }
        if (region.contains("ha noi") || region.contains("hanoi")) {
            return 40_000;
        }
        return 50_000;
    }

    private String normalizeRegion(String value) {
        return java.text.Normalizer.normalize(value == null ? "" : value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9]+", " ")
                .trim();
    }

    private double resolveUnitPrice(ProductVariant variant) {
        if (variant.getPriceOverride() != null) {
            return variant.getPriceOverride();
        }
        Product product = variant.getProduct();
        if (product != null && product.getSalePrice() != null) {
            return product.getSalePrice();
        }
        return product != null ? product.getBasePrice() : 0.0;
    }

    private String firstImage(Product product, ProductVariant variant) {
        if (variant.getImageUrl() != null && !variant.getImageUrl().isBlank()) {
            return variant.getImageUrl();
        }
        if (product != null && product.getImageUrls() != null) {
            return product.getImageUrls().stream()
                    .filter(url -> url != null && !url.isBlank())
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private String generateOrderNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "WW-" + datePart + "-" + randomPart;
    }

    private Order.Status initialOrderStatus(Order.PaymentMethod paymentMethod) {
        return paymentMethod == Order.PaymentMethod.COD
                ? Order.Status.PROCESSING
                : Order.Status.PENDING;
    }

    /**
     * Trạng thái thanh toán khởi tạo theo phương thức.
     * BANK_TRANSFER (QR) → mặc định PAID để admin/staff/seller không cần xác nhận thủ công
     * (đơn QR coi như đã thu tiền ngay khi tạo, phù hợp luồng demo).
     * COD → UNPAID, sẽ chuyển PAID khi đơn DELIVERED (xem applyStatusChange).
     */
    private Order.PaymentStatus initialPaymentStatus(Order.PaymentMethod paymentMethod) {
        return paymentMethod == Order.PaymentMethod.BANK_TRANSFER
                ? Order.PaymentStatus.PAID
                : Order.PaymentStatus.UNPAID;
    }

    private Map<Long, Integer> collectCartQuantities(List<CartItem> cartItems) {
        return cartItems.stream()
                .filter(item -> item.getVariant() != null && item.getVariant().getId() != null)
                .collect(Collectors.toMap(
                        item -> item.getVariant().getId(),
                        CartItem::getQuantity,
                        Integer::sum
                ));
    }

    private Map<Long, Integer> collectManualQuantities(List<ManualOrderItemRequest> items) {
        return items.stream()
                .collect(Collectors.toMap(
                        ManualOrderItemRequest::variantId,
                        ManualOrderItemRequest::quantity,
                        Integer::sum
                ));
    }

    private Map<Long, ProductVariant> loadVariantsForUpdate(Set<Long> variantIds) {
        return variantIds.stream()
                .collect(Collectors.toMap(
                        variantId -> variantId,
                        variantId -> productVariantRepository.findByIdForUpdate(variantId)
                                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Variant not found"))
                ));
    }

    private void reserveStock(Map<Long, ProductVariant> variants, Map<Long, Integer> requestedQuantities) {
        List<ProductVariant> updatedVariants = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : requestedQuantities.entrySet()) {
            Long variantId = entry.getKey();
            int requested = entry.getValue() != null ? entry.getValue() : 0;
            if (requested <= 0) {
                continue;
            }

            ProductVariant variant = variants.get(variantId);
            if (variant == null) {
                throw new ResponseStatusException(NOT_FOUND, "Variant not found");
            }
            Integer stock = variant.getStockQty();
            if (stock == null) {
                continue;
            }
            if (requested > stock) {
                if (stock <= 0) {
                    throw new ResponseStatusException(BAD_REQUEST, "Biến thể bạn chọn hiện đã hết hàng");
                }
                throw new ResponseStatusException(BAD_REQUEST, "Chỉ còn " + stock + " sản phẩm trong kho");
            }

            variant.setStockQty(stock - requested);
            updatedVariants.add(variant);
        }
        if (!updatedVariants.isEmpty()) {
            productVariantRepository.saveAll(updatedVariants);
        }
    }

    private void releaseStock(Order order) {
        Map<Long, Integer> quantities = order.getItems().stream()
                .filter(item -> item.getVariantId() != null && item.getQuantity() != null && item.getQuantity() > 0)
                .collect(Collectors.toMap(
                        OrderItem::getVariantId,
                        OrderItem::getQuantity,
                        Integer::sum
                ));
        if (quantities.isEmpty()) {
            return;
        }

        List<ProductVariant> updatedVariants = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
            productVariantRepository.findByIdForUpdate(entry.getKey()).ifPresent(variant -> {
                Integer stock = variant.getStockQty();
                if (stock == null) {
                    return;
                }
                variant.setStockQty(stock + entry.getValue());
                updatedVariants.add(variant);
            });
        }
        if (!updatedVariants.isEmpty()) {
            productVariantRepository.saveAll(updatedVariants);
        }
    }

    private void ensureCanViewOrder(UserAccount user, Order order) {
        if (user.getRole() == UserAccount.Role.ADMIN || isWarehouseSupportRole(user.getRole())) {
            return;
        }
        if (order.getUser().getId().equals(user.getId())) {
            return;
        }
        if (user.getRole() == UserAccount.Role.SELLER) {
            if (isOrderManagedBySeller(user, order)) {
                return;
            }
        }
        throw new ResponseStatusException(NOT_FOUND, "Order not found");
    }

    private void ensureCanManageOrder(UserAccount user, Order order) {
        if (user.getRole() == UserAccount.Role.ADMIN || isWarehouseSupportRole(user.getRole())) {
            return;
        }
        if (user.getRole() == UserAccount.Role.SELLER) {
            if (isOrderManagedBySeller(user, order)) {
                if (isSellerEditableStage(order.getStatus())) {
                    return;
                }
                throw new ResponseStatusException(BAD_REQUEST, "Seller chỉ được cập nhật đơn trước khi qua kho");
            }
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền cập nhật đơn hàng");
    }

    private void ensureCanManageOrder(UserAccount user, Order order, Order.Status nextStatus) {
        if (canBuyerConfirmReceipt(user, order, nextStatus)) {
            return;
        }
        ensureCanManageOrder(user, order);
    }

    private boolean canBuyerConfirmReceipt(UserAccount user, Order order, Order.Status nextStatus) {
        return user.getRole() == UserAccount.Role.USER
                && order.getUser().getId().equals(user.getId())
                && order.getStatus() == Order.Status.SHIPPED
                && nextStatus == Order.Status.DELIVERED;
    }

    private void ensureWarehouseCanUpdateStatus(Order.Status nextStatus) {
        if (nextStatus == Order.Status.PACKING) {
            return;
        }
        throw new ResponseStatusException(FORBIDDEN, "Nhân viên chỉ được tạo vận đơn (chuyển sang trạng thái đóng gói)");
    }

    private void ensureCanEditOrder(UserAccount user, Order order) {
        if (user.getRole() == UserAccount.Role.ADMIN) {
            return;
        }
        if (order.getUser().getId().equals(user.getId())) {
            if (isAddressEditableStage(order.getStatus())) {
                return;
            }
            throw new ResponseStatusException(BAD_REQUEST, "Không thể cập nhật thông tin đơn hàng");
        }
        if (user.getRole() == UserAccount.Role.SELLER) {
            if (isOrderManagedBySeller(user, order)) {
                if (isSellerEditableStage(order.getStatus())) {
                    return;
                }
                throw new ResponseStatusException(BAD_REQUEST, "Chỉ được cập nhật địa chỉ trước khi đơn được xác nhận");
            }
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền cập nhật đơn hàng");
    }

    private void ensureCanCancelOrder(UserAccount user, Order order) {
        if (user.getRole() == UserAccount.Role.ADMIN) {
            return;
        }
        if (order.getUser().getId().equals(user.getId())) {
            if (order.getStatus() == Order.Status.PENDING) {
                return;
            }
            throw new ResponseStatusException(BAD_REQUEST, "Không thể hủy đơn hàng");
        }
        if (user.getRole() == UserAccount.Role.SELLER && isOrderManagedBySeller(user, order)) {
            if (isSellerEditableStage(order.getStatus())) {
                return;
            }
            throw new ResponseStatusException(BAD_REQUEST, "Seller chỉ được hủy đơn trước khi qua kho");
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền hủy đơn hàng");
    }

    private boolean isSellerEditableStage(Order.Status status) {
        return status == Order.Status.PENDING
                || status == Order.Status.PROCESSING;
    }

    private boolean isAddressEditableStage(Order.Status status) {
        return status == Order.Status.PENDING;
    }

    private boolean isWarehouseSupportRole(UserAccount.Role role) {
        return role == UserAccount.Role.WAREHOUSE || role == UserAccount.Role.STYLES;
    }

    private boolean isOrderManagedBySeller(UserAccount user, Order order) {
        List<Long> productIds = order.getItems().stream()
                .map(OrderItem::getProductId)
                .filter(id -> id != null)
                .toList();
        if (productIds.isEmpty()) {
            return false;
        }
        Set<Long> sellerProductIds = productRepository.findAllById(productIds).stream()
                .filter(product -> product.getSeller() != null)
                .filter(product -> product.getSeller().getId().equals(user.getId()))
                .map(product -> product.getId())
                .collect(Collectors.toSet());
        return order.getItems().stream()
                .allMatch(item -> item.getProductId() != null && sellerProductIds.contains(item.getProductId()));
    }

    private void ensureSequentialStatusTransition(Order.Status current, Order.Status next) {
        boolean valid = switch (current) {
            case PENDING -> next == Order.Status.CONFIRMED;
            case PROCESSING -> next == Order.Status.CONFIRMED;
            case CONFIRMED -> next == Order.Status.PACKING;
            case PACKING -> next == Order.Status.SHIPPED;
            case SHIPPED -> next == Order.Status.DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };
        if (!valid) {
            throw new ResponseStatusException(BAD_REQUEST, "Cập nhật trạng thái chưa đúng trình tự");
        }
    }

    private OrderResponse cancelWithSideEffects(Order order) {
        if (order.getStatus() == Order.Status.CANCELLED) {
            throw new ResponseStatusException(BAD_REQUEST, "Đơn hàng đã hủy");
        }
        if (order.getStatus() == Order.Status.DELIVERED) {
            throw new ResponseStatusException(BAD_REQUEST, "Không thể hủy đơn hàng đã giao");
        }
        releaseStock(order);
        order.setStatus(Order.Status.CANCELLED);
        if (order.getPaymentStatus() == Order.PaymentStatus.PAID) {
            order.setPaymentStatus(Order.PaymentStatus.REFUNDED);
        }
        order.setUpdatedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);
        return mapOrder(saved);
    }

    private void cancelExpiredUnpaidBankTransferOrder(Order order) {
        if (!isExpiredUnpaidBankTransferOrder(order, LocalDateTime.now())) {
            return;
        }
        cancelWithSideEffects(order);
    }

    private Order.Status parseStatus(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Status is required");
        }
        try {
            return Order.Status.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid status");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void applyAutoStatusTransitions(List<Order> orders) {
        orders.forEach(this::applyAutoStatusTransition);
    }

    private void applyAutoStatusTransition(Order order) {
        LocalDateTime now = LocalDateTime.now();
        if (isExpiredUnpaidBankTransferOrder(order, now)) {
            cancelWithSideEffects(order);
            return;
        }
        if (order.getStatus() == Order.Status.PACKING
                && order.getUpdatedAt() != null
                && order.getUpdatedAt().plusSeconds(5).isBefore(now)) {
            order.setStatus(Order.Status.SHIPPED);
            order.setUpdatedAt(now);
            orderRepository.save(order);
        }
    }

    private boolean isExpiredUnpaidBankTransferOrder(Order order, LocalDateTime now) {
        if (order == null || order.getCreatedAt() == null) {
            return false;
        }
        if (order.getPaymentMethod() != Order.PaymentMethod.BANK_TRANSFER
                || order.getPaymentStatus() != Order.PaymentStatus.UNPAID) {
            return false;
        }
        if (order.getStatus() == Order.Status.CANCELLED
                || order.getStatus() == Order.Status.DELIVERED
                || order.getStatus() == Order.Status.PACKING
                || order.getStatus() == Order.Status.SHIPPED) {
            return false;
        }
        return order.getCreatedAt().plusHours(resolveOrderAutoCancelHours()).isBefore(now);
    }

    private int resolveOrderAutoCancelHours() {
        if (adminSystemConfigService == null) {
            return DEFAULT_ORDER_AUTO_CANCEL_HOURS;
        }
        AdminSystemConfigResponse config = adminSystemConfigService.get();
        if (config == null) {
            return DEFAULT_ORDER_AUTO_CANCEL_HOURS;
        }
        Integer configured = config.orderAutoCancelHours();
        return configured != null && configured > 0 ? configured : DEFAULT_ORDER_AUTO_CANCEL_HOURS;
    }

    private void validateCheckoutAddress(ShippingAddress address) {
        address.setFullName(requireText(address.getFullName(), "Họ tên người nhận là bắt buộc"));
        address.setPhone(requireText(address.getPhone(), "Số điện thoại là bắt buộc"));
        address.setAddressLine1(requireText(address.getAddressLine1(), "Địa chỉ là bắt buộc"));
        address.setWard(requireText(address.getWard(), "Phường/Xã là bắt buộc"));
        address.setDistrict(requireText(address.getDistrict(), "Quận/Huyện là bắt buộc"));
        address.setCity(requireText(address.getCity(), "Thành phố là bắt buộc"));
        address.setProvince(requireText(address.getProvince(), "Tỉnh là bắt buộc"));
    }

    private void validateEditableShippingAddress(ShippingAddress address) {
        address.setFullName(requireText(address.getFullName(), "Họ tên người nhận là bắt buộc"));
        address.setPhone(requireText(address.getPhone(), "Số điện thoại là bắt buộc"));
        address.setAddressLine1(requireText(address.getAddressLine1(), "Địa chỉ là bắt buộc"));
        address.setCity(requireText(address.getCity(), "Thành phố là bắt buộc"));
        address.setWard(trimToNull(address.getWard()));
        address.setDistrict(trimToNull(address.getDistrict()));
        address.setProvince(trimToNull(address.getProvince()));
        address.setPostalCode(trimToNull(address.getPostalCode()));
    }

    private Long resolveCartSellerId(Cart cart) {
        return cart.getItems().stream()
                .map(CartItem::getVariant)
                .filter(variant -> variant != null && variant.getProduct() != null)
                .map(variant -> variant.getProduct().getSeller())
                .filter(seller -> seller != null && seller.getId() != null)
                .map(UserAccount::getId)
                .findFirst()
                .orElse(null);
    }

    private String requireText(String value, String message) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new ResponseStatusException(BAD_REQUEST, message);
        }
        return normalized;
    }

    private boolean canCreateManualOrder(UserAccount creator) {
        return creator.getRole() == UserAccount.Role.ADMIN;
    }

    private String manualOrderCreatorLabel(UserAccount.Role role) {
        return switch (role) {
            case ADMIN -> "Admin";
            case WAREHOUSE, STYLES -> "Nhân viên vận hành";
            case SELLER -> "Seller";
            case USER -> "Khách hàng";
        };
    }

    private String appendAdminRefundNote(String existing, String reason) {
        String stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        String line = "[ADMIN_REFUND " + stamp + "] " + reason;
        if (existing == null || existing.isBlank()) {
            return line;
        }
        return existing + "\n" + line;
    }
}
