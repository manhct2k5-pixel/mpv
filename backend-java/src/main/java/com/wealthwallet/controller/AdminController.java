package com.wealthwallet.controller;

import com.wealthwallet.domain.entity.Category;
import com.wealthwallet.domain.entity.Gender;
import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.AdminCategoryResponse;
import com.wealthwallet.dto.AdminCategoryUpsertRequest;
import com.wealthwallet.dto.AdminCreateStaffRequest;
import com.wealthwallet.dto.AdminDailyReportPointResponse;
import com.wealthwallet.dto.AdminOrderRefundRequest;
import com.wealthwallet.dto.AdminOverviewResponse;
import com.wealthwallet.dto.AdminSystemConfigResponse;
import com.wealthwallet.dto.AdminSystemConfigUpdateRequest;
import com.wealthwallet.dto.AdminUserInsightResponse;
import com.wealthwallet.dto.AdminUserRoleUpdateRequest;
import com.wealthwallet.dto.BusinessRequestResponse;
import com.wealthwallet.dto.OrderResponse;
import com.wealthwallet.dto.OrderStatusUpdateRequest;
import com.wealthwallet.dto.OrderSummaryResponse;
import com.wealthwallet.repository.CategoryRepository;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.UserAccountRepository;
import com.wealthwallet.service.AdminSystemConfigService;
import com.wealthwallet.service.OrderService;
import com.wealthwallet.service.UserService;
import com.wealthwallet.utils.SlugUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CREATED;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserAccountRepository userAccountRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final CategoryRepository categoryRepository;
    private final UserService userService;
    private final OrderService orderService;
    private final AdminSystemConfigService adminSystemConfigService;

    @GetMapping("/overview")
    public AdminOverviewResponse overview() {
        List<Order> orders = orderRepository.findAll();
        long totalStaff = userAccountRepository.countByRole(UserAccount.Role.WAREHOUSE)
                + userAccountRepository.countByRole(UserAccount.Role.STYLES);
        double grossMerchandiseValue = orders.stream()
                .filter(order -> order.getStatus() != Order.Status.CANCELLED)
                .mapToDouble(order -> order.getTotal() != null ? order.getTotal() : 0.0)
                .sum();
        double paidRevenue = orders.stream()
                .filter(order -> order.getPaymentStatus() == Order.PaymentStatus.PAID)
                .mapToDouble(order -> order.getTotal() != null ? order.getTotal() : 0.0)
                .sum();
        long openOrders = orders.stream()
                .filter(order -> order.getStatus() != Order.Status.CANCELLED)
                .filter(order -> order.getStatus() != Order.Status.DELIVERED)
                .count();
        long unpaidOrders = orders.stream()
                .filter(order -> order.getPaymentStatus() == Order.PaymentStatus.UNPAID)
                .count();

        return new AdminOverviewResponse(
                userAccountRepository.count(),
                userAccountRepository.countByRole(UserAccount.Role.USER),
                userAccountRepository.countByRole(UserAccount.Role.SELLER),
                userAccountRepository.countByRole(UserAccount.Role.ADMIN),
                totalStaff,
                userAccountRepository.countByBusinessRequestPendingTrue(),
                productRepository.count(),
                productRepository.countByActiveTrue(),
                orders.size(),
                openOrders,
                unpaidOrders,
                0,
                grossMerchandiseValue,
                paidRevenue
        );
    }

    @GetMapping("/users")
    public List<AdminUserInsightResponse> users() {
        return userAccountRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapUser)
                .toList();
    }

    @PostMapping("/staff-accounts")
    public ResponseEntity<AdminUserInsightResponse> createStaffAccount(
            @Valid @RequestBody AdminCreateStaffRequest request
    ) {
        try {
            UserAccount created = userService.createStaffAccount(request);
            return ResponseEntity.status(CREATED).body(mapUser(created));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(BAD_REQUEST, e.getMessage());
        }
    }

    @PutMapping("/users/{id}/role")
    public AdminUserInsightResponse updateUserRole(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody AdminUserRoleUpdateRequest request
    ) {
        UserAccount currentAdmin = userService.getCurrentUser();
        UserAccount user = userAccountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        UserAccount.Role nextRole = parseRole(request.role());
        if (user.getRole() == nextRole) {
            return mapUser(user);
        }

        if (currentAdmin.getId().equals(user.getId()) && nextRole != UserAccount.Role.ADMIN) {
            throw new ResponseStatusException(BAD_REQUEST, "Không thể tự hạ quyền admin");
        }
        if (user.getRole() == UserAccount.Role.ADMIN && nextRole != UserAccount.Role.ADMIN) {
            long adminCount = userAccountRepository.countByRole(UserAccount.Role.ADMIN);
            if (adminCount <= 1) {
                throw new ResponseStatusException(BAD_REQUEST, "Hệ thống cần ít nhất một admin");
            }
        }

        user.setRole(nextRole);
        user.setBusinessRequestPending(false);
        user.setBusinessRequestedAt(null);
        UserAccount saved = userAccountRepository.save(user);
        return mapUser(saved);
    }

    @GetMapping("/business-requests")
    public List<BusinessRequestResponse> businessRequests() {
        return userAccountRepository.findByBusinessRequestPendingTrueOrderByBusinessRequestedAtDesc().stream()
                .map(user -> new BusinessRequestResponse(
                        user.getId(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getRole().name(),
                        user.getBusinessRequestedAt()
                ))
                .toList();
    }

    @PostMapping("/business-requests/{id}/approve")
    public ResponseEntity<UserAccount> approveBusinessRequest(@PathVariable(name = "id") Long id) {
        UserAccount user = userAccountRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        if (user.getRole() != UserAccount.Role.ADMIN) {
            user.setRole(UserAccount.Role.SELLER);
            user.setBusinessRequestPending(false);
            user.setBusinessRequestedAt(null);
            userAccountRepository.save(user);
        }
        return ResponseEntity.ok(user);
    }

    @PostMapping("/business-requests/{id}/reject")
    public ResponseEntity<UserAccount> rejectBusinessRequest(@PathVariable(name = "id") Long id) {
        UserAccount user = userAccountRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }
        if (user.getRole() == UserAccount.Role.USER) {
            user.setBusinessRequestPending(false);
            user.setBusinessRequestedAt(null);
            userAccountRepository.save(user);
        }
        return ResponseEntity.ok(user);
    }

    @GetMapping("/orders")
    public List<OrderSummaryResponse> orders(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "paymentStatus", required = false) String paymentStatus
    ) {
        Order.Status statusFilter = parseOrderStatus(status);
        Order.PaymentStatus paymentStatusFilter = parsePaymentStatus(paymentStatus);

        return orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .filter(order -> statusFilter == null || order.getStatus() == statusFilter)
                .filter(order -> paymentStatusFilter == null || order.getPaymentStatus() == paymentStatusFilter)
                .map(this::mapOrderSummary)
                .toList();
    }

    @PutMapping("/orders/{id}/status")
    public OrderResponse updateOrderStatus(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody OrderStatusUpdateRequest request
    ) {
        return orderService.updateStatus(userService.getCurrentUser(), id, request);
    }

    @PostMapping("/orders/{id}/payment/confirm")
    public OrderResponse confirmOrderPayment(@PathVariable(name = "id") Long id) {
        return orderService.confirmBankTransferPayment(userService.getCurrentUser(), id);
    }

    @PostMapping("/orders/{id}/refund")
    public OrderResponse refundOrder(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody AdminOrderRefundRequest request
    ) {
        AdminSystemConfigResponse config = adminSystemConfigService.get();
        if (!Boolean.TRUE.equals(config.allowManualRefund())) {
            throw new ResponseStatusException(BAD_REQUEST, "Hệ thống đang tắt hoàn tiền thủ công");
        }

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        LocalDate orderDate = order.getCreatedAt() != null ? order.getCreatedAt().toLocalDate() : LocalDate.now();
        long elapsedDays = Math.max(0, ChronoUnit.DAYS.between(orderDate, LocalDate.now()));
        if (elapsedDays > config.maxRefundDays()) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Đơn đã quá hạn hoàn tiền " + config.maxRefundDays() + " ngày"
            );
        }

        return orderService.refundByAdmin(userService.getCurrentUser(), id, request.reason());
    }

    @GetMapping("/reports/daily")
    public List<AdminDailyReportPointResponse> dailyReports(
            @RequestParam(name = "days", defaultValue = "7") Integer days
    ) {
        int reportDays = normalizeReportDays(days);
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(reportDays - 1L);

        Map<LocalDate, List<Order>> grouped = orderRepository.findAll().stream()
                .filter(order -> order.getCreatedAt() != null)
                .filter(order -> {
                    LocalDate date = order.getCreatedAt().toLocalDate();
                    return !date.isBefore(startDate) && !date.isAfter(endDate);
                })
                .collect(Collectors.groupingBy(order -> order.getCreatedAt().toLocalDate()));

        List<AdminDailyReportPointResponse> points = new ArrayList<>();
        for (int i = 0; i < reportDays; i++) {
            LocalDate date = startDate.plusDays(i);
            List<Order> dayOrders = grouped.getOrDefault(date, List.of());
            long totalOrders = dayOrders.size();
            long paidOrders = dayOrders.stream()
                    .filter(order -> order.getPaymentStatus() == Order.PaymentStatus.PAID)
                    .count();
            long refundedOrders = dayOrders.stream()
                    .filter(order -> order.getPaymentStatus() == Order.PaymentStatus.REFUNDED)
                    .count();
            double grossMerchandiseValue = dayOrders.stream()
                    .filter(order -> order.getStatus() != Order.Status.CANCELLED)
                    .mapToDouble(order -> order.getTotal() != null ? order.getTotal() : 0.0)
                    .sum();
            double paidRevenue = dayOrders.stream()
                    .filter(order -> order.getPaymentStatus() == Order.PaymentStatus.PAID)
                    .mapToDouble(order -> order.getTotal() != null ? order.getTotal() : 0.0)
                    .sum();

            points.add(new AdminDailyReportPointResponse(
                    date.toString(),
                    totalOrders,
                    paidOrders,
                    refundedOrders,
                    grossMerchandiseValue,
                    paidRevenue
            ));
        }
        return points;
    }

    @GetMapping("/categories")
    public List<AdminCategoryResponse> categories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(this::mapCategory)
                .toList();
    }

    @PostMapping("/categories")
    public ResponseEntity<AdminCategoryResponse> createCategory(
            @Valid @RequestBody AdminCategoryUpsertRequest request
    ) {
        Category category = new Category();
        applyCategoryPayload(category, request, true);
        Category saved = categoryRepository.save(category);
        return ResponseEntity.status(CREATED).body(mapCategory(saved));
    }

    @PutMapping("/categories/{id}")
    public AdminCategoryResponse updateCategory(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody AdminCategoryUpsertRequest request
    ) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));
        applyCategoryPayload(category, request, false);
        Category saved = categoryRepository.save(category);
        return mapCategory(saved);
    }

    @PutMapping("/categories/{id}/active")
    public AdminCategoryResponse updateCategoryActive(
            @PathVariable(name = "id") Long id,
            @RequestParam(name = "active") boolean active
    ) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Category not found"));
        category.setActive(active);
        Category saved = categoryRepository.save(category);
        return mapCategory(saved);
    }

    @GetMapping("/settings")
    public AdminSystemConfigResponse settings() {
        return adminSystemConfigService.get();
    }

    @PutMapping("/settings")
    public AdminSystemConfigResponse updateSettings(
            @Valid @RequestBody AdminSystemConfigUpdateRequest request
    ) {
        return adminSystemConfigService.update(request);
    }

    @PostMapping("/users/{email}/flag")
    public ResponseEntity<Map<String, Object>> flagUser(
            @PathVariable(name = "email") String email,
            @RequestParam(name = "highlight") boolean highlight
    ) {
        UserAccount user = userAccountRepository.findByEmail(email)
                .orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of("email", email, "highlighted", highlight));
    }

    private void applyCategoryPayload(Category category, AdminCategoryUpsertRequest request, boolean creating) {
        String name = trimToNull(request.name());
        if (name == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Tên danh mục là bắt buộc");
        }
        category.setName(name);

        String rawSlug = trimToNull(request.slug());
        String nextSlug = SlugUtils.toSlug(rawSlug != null ? rawSlug : name);
        if (nextSlug.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Slug danh mục không hợp lệ");
        }
        categoryRepository.findBySlug(nextSlug).ifPresent(existing -> {
            if (creating || !existing.getId().equals(category.getId())) {
                throw new ResponseStatusException(BAD_REQUEST, "Slug danh mục đã tồn tại");
            }
        });
        category.setSlug(nextSlug);

        category.setGender(parseGender(request.gender()));
        category.setDescription(trimToNull(request.description()));
        category.setImageUrl(trimToNull(request.imageUrl()));
        if (request.active() != null) {
            category.setActive(request.active());
        } else if (creating && category.getActive() == null) {
            category.setActive(true);
        }
    }

    private AdminCategoryResponse mapCategory(Category category) {
        return new AdminCategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getGender().name().toLowerCase(),
                category.getDescription(),
                category.getImageUrl(),
                category.getActive(),
                category.getCreatedAt()
        );
    }

    private AdminUserInsightResponse mapUser(UserAccount user) {
        return new AdminUserInsightResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name().toLowerCase(),
                Boolean.TRUE.equals(user.getBusinessRequestPending()),
                user.getBusinessRequestedAt(),
                user.getCreatedAt(),
                0,
                0,
                0
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

    private UserAccount.Role parseRole(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Role is required");
        }
        try {
            return UserAccount.Role.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid role");
        }
    }

    private Gender parseGender(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Gender is required");
        }
        try {
            return Gender.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid gender");
        }
    }

    private Order.Status parseOrderStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Order.Status.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid order status");
        }
    }

    private Order.PaymentStatus parsePaymentStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Order.PaymentStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid payment status");
        }
    }

    private int normalizeReportDays(Integer rawDays) {
        int value = rawDays == null ? 7 : rawDays;
        if (value < 1 || value > 60) {
            throw new ResponseStatusException(BAD_REQUEST, "Số ngày báo cáo phải từ 1 đến 60");
        }
        return value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
