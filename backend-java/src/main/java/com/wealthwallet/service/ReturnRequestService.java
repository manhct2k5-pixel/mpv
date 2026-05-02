package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ReturnRequest;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.ReturnRequestCreateRequest;
import com.wealthwallet.dto.ReturnRequestResponse;
import com.wealthwallet.dto.ReturnRequestUpdateRequest;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.ReturnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class ReturnRequestService {

    private final ReturnRequestRepository returnRequestRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final AdminSystemConfigService adminSystemConfigService;

    @Transactional(readOnly = true)
    public List<ReturnRequestResponse> list(UserAccount actor, String status) {
        ReturnRequest.Status statusFilter = parseStatus(status, null);
        return loadRequestsForActor(actor).stream()
                .filter(request -> statusFilter == null || request.getStatus() == statusFilter)
                .sorted(Comparator.comparing(ReturnRequest::getCreatedAt).reversed())
                .map(this::mapResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReturnRequestResponse detail(UserAccount actor, Long requestId) {
        ReturnRequest request = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Return request not found"));
        ensureCanView(actor, request);
        return mapResponse(request);
    }

    @Transactional
    public ReturnRequestResponse create(UserAccount actor, ReturnRequestCreateRequest request) {
        Order order = orderRepository.findById(request.orderId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        ensureCanReferenceOrder(actor, order);
        if (returnRequestRepository.existsByOrder(order)) {
            throw new ResponseStatusException(BAD_REQUEST, "Đơn hàng này đã có yêu cầu đổi trả");
        }
        enforceCustomerReturnPolicy(actor, order);

        ReturnRequest saved = returnRequestRepository.save(
                ReturnRequest.builder()
                        .requestCode(generateRequestCode())
                        .order(order)
                        .createdBy(actor)
                        .reason(requireText(request.reason(), "Lý do đổi trả là bắt buộc"))
                        .evidenceUrl(trimToNull(request.evidenceUrl()))
                        .note(trimToNull(request.note()))
                        .status(ReturnRequest.Status.PENDING_VERIFICATION)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build()
        );
        return mapResponse(saved);
    }

    private void enforceCustomerReturnPolicy(UserAccount actor, Order order) {
        if (actor.getRole() != UserAccount.Role.USER) {
            return;
        }

        if (order.getStatus() != Order.Status.DELIVERED) {
            throw new ResponseStatusException(BAD_REQUEST, "Đơn hàng chưa giao thành công, chưa thể tạo yêu cầu đổi trả");
        }

        LocalDateTime deliveredAt = order.getDeliveredAt();
        if (deliveredAt == null) {
            deliveredAt = order.getUpdatedAt();
        }
        if (deliveredAt == null) {
            deliveredAt = order.getCreatedAt();
        }

        LocalDate deliveredDate = deliveredAt != null ? deliveredAt.toLocalDate() : LocalDate.now();
        int maxRefundDays = adminSystemConfigService.get().maxRefundDays();
        long elapsedDays = Math.max(0, ChronoUnit.DAYS.between(deliveredDate, LocalDate.now()));
        if (elapsedDays > maxRefundDays) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Đơn hàng đã quá thời hạn đổi trả " + maxRefundDays + " ngày"
            );
        }
    }

    @Transactional
    public ReturnRequestResponse update(UserAccount actor, Long requestId, ReturnRequestUpdateRequest request) {
        ReturnRequest returnRequest = returnRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Return request not found"));
        ensureCanView(actor, returnRequest);

        boolean supportRole = isSupportRole(actor.getRole());
        boolean creator = isCreator(actor, returnRequest);

        if (request.status() != null) {
            String statusInput = trimToNull(request.status());
            if (statusInput == null) {
                throw new ResponseStatusException(BAD_REQUEST, "Trạng thái đổi trả không được để trống");
            }
            ReturnRequest.Status nextStatus = parseStatus(statusInput, null);
            if (supportRole) {
                ensureStatusTransition(returnRequest.getStatus(), nextStatus);
                returnRequest.setStatus(nextStatus);
                returnRequest.setHandledBy(actor);
            } else {
                if (!creator) {
                    throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền cập nhật trạng thái yêu cầu");
                }
                if (nextStatus != ReturnRequest.Status.PENDING_ADMIN) {
                    throw new ResponseStatusException(FORBIDDEN, "Bạn chỉ có thể chuyển yêu cầu sang admin duyệt");
                }
                if (returnRequest.getStatus() != ReturnRequest.Status.PENDING_VERIFICATION
                        && returnRequest.getStatus() != ReturnRequest.Status.APPROVED) {
                    throw new ResponseStatusException(BAD_REQUEST, "Yêu cầu hiện tại không thể chuyển admin duyệt");
                }
                returnRequest.setStatus(ReturnRequest.Status.PENDING_ADMIN);
            }
        }

        if (request.verdict() != null) {
            if (!supportRole) {
                throw new ResponseStatusException(FORBIDDEN, "Chỉ staff hoặc admin mới được cập nhật kết quả xử lý");
            }
            returnRequest.setVerdict(trimToNull(request.verdict()));
        }

        if (request.note() != null) {
            if (!supportRole && !creator) {
                throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền cập nhật ghi chú yêu cầu");
            }
            returnRequest.setNote(trimToNull(request.note()));
        }

        if (request.evidenceUrl() != null) {
            if (!supportRole && !creator) {
                throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền cập nhật bằng chứng yêu cầu");
            }
            returnRequest.setEvidenceUrl(trimToNull(request.evidenceUrl()));
        }

        if (supportRole && returnRequest.getStatus() == ReturnRequest.Status.REFUNDED) {
            Order order = returnRequest.getOrder();
            if (order.getPaymentStatus() == Order.PaymentStatus.PAID) {
                order.setPaymentStatus(Order.PaymentStatus.REFUNDED);
                order.setUpdatedAt(LocalDateTime.now());
                orderRepository.save(order);
            }
        }

        returnRequest.setUpdatedAt(LocalDateTime.now());
        ReturnRequest saved = returnRequestRepository.save(returnRequest);
        return mapResponse(saved);
    }

    private List<ReturnRequest> loadRequestsForActor(UserAccount actor) {
        if (isSupportRole(actor.getRole())) {
            return returnRequestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        if (actor.getRole() == UserAccount.Role.SELLER) {
            Set<ReturnRequest> merged = new LinkedHashSet<>(returnRequestRepository.findByCreatedByOrderByCreatedAtDesc(actor).stream()
                    .filter(request -> canSellerAccessRequest(actor, request))
                    .toList());
            List<Long> productIds = productRepository.findBySellerIdOrderByCreatedAtDesc(actor.getId()).stream()
                    .map(Product::getId)
                    .toList();
            if (!productIds.isEmpty()) {
                merged.addAll(returnRequestRepository.findBySellerProductIds(productIds).stream()
                        .filter(request -> canSellerAccessRequest(actor, request))
                        .toList());
            }
            return new ArrayList<>(merged);
        }

        return returnRequestRepository.findByCreatedByOrderByCreatedAtDesc(actor);
    }

    private void ensureCanView(UserAccount actor, ReturnRequest request) {
        if (isSupportRole(actor.getRole()) || isCreator(actor, request)) {
            return;
        }
        Order order = request.getOrder();
        if (actor.getRole() == UserAccount.Role.USER && order.getUser().getId().equals(actor.getId())) {
            return;
        }
        if (actor.getRole() == UserAccount.Role.SELLER && isOrderManagedBySeller(actor, order)) {
            return;
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền truy cập yêu cầu đổi trả này");
    }

    private void ensureCanReferenceOrder(UserAccount actor, Order order) {
        if (isSupportRole(actor.getRole())) {
            return;
        }
        if (actor.getRole() == UserAccount.Role.USER && order.getUser().getId().equals(actor.getId())) {
            return;
        }
        if (actor.getRole() == UserAccount.Role.SELLER && isOrderManagedBySeller(actor, order)) {
            return;
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền tạo yêu cầu cho đơn này");
    }

    private void ensureStatusTransition(ReturnRequest.Status current, ReturnRequest.Status next) {
        if (current == next) {
            return;
        }
        boolean valid = switch (current) {
            case PENDING_VERIFICATION -> next == ReturnRequest.Status.APPROVED
                    || next == ReturnRequest.Status.REJECTED
                    || next == ReturnRequest.Status.PENDING_ADMIN
                    || next == ReturnRequest.Status.REFUNDED;
            case PENDING_ADMIN -> next == ReturnRequest.Status.APPROVED
                    || next == ReturnRequest.Status.REJECTED
                    || next == ReturnRequest.Status.REFUNDED;
            case APPROVED -> next == ReturnRequest.Status.COLLECTING
                    || next == ReturnRequest.Status.REJECTED
                    || next == ReturnRequest.Status.PENDING_ADMIN
                    || next == ReturnRequest.Status.REFUNDED;
            case COLLECTING -> next == ReturnRequest.Status.RECEIVED;
            case RECEIVED -> next == ReturnRequest.Status.REFUNDED;
            case REFUNDED, REJECTED -> false;
        };
        if (!valid) {
            throw new ResponseStatusException(BAD_REQUEST, "Cập nhật trạng thái đổi trả chưa đúng luồng");
        }
    }

    private ReturnRequest.Status parseStatus(String value, ReturnRequest.Status fallback) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return fallback;
        }
        try {
            return ReturnRequest.Status.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Trạng thái đổi trả không hợp lệ");
        }
    }

    private boolean isOrderManagedBySeller(UserAccount actor, Order order) {
        List<Long> productIds = order.getItems().stream()
                .map(item -> item.getProductId())
                .filter(id -> id != null)
                .toList();
        if (productIds.isEmpty()) {
            return false;
        }
        Set<Long> sellerProductIds = productRepository.findAllById(productIds).stream()
                .filter(product -> product.getSeller() != null)
                .filter(product -> product.getSeller().getId().equals(actor.getId()))
                .map(Product::getId)
                .collect(Collectors.toSet());
        return order.getItems().stream()
                .allMatch(item -> item.getProductId() != null && sellerProductIds.contains(item.getProductId()));
    }

    private boolean canSellerAccessRequest(UserAccount actor, ReturnRequest request) {
        Order order = request.getOrder();
        if (order == null) {
            return isCreator(actor, request);
        }
        return isOrderManagedBySeller(actor, order);
    }

    private boolean isSupportRole(UserAccount.Role role) {
        return role == UserAccount.Role.ADMIN
                || role == UserAccount.Role.WAREHOUSE
                || role == UserAccount.Role.STYLES;
    }

    private boolean isCreator(UserAccount actor, ReturnRequest request) {
        return request.getCreatedBy() != null && request.getCreatedBy().getId().equals(actor.getId());
    }

    private String generateRequestCode() {
        String code;
        do {
            code = "RT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        } while (returnRequestRepository.existsByRequestCode(code));
        return code;
    }

    private ReturnRequestResponse mapResponse(ReturnRequest request) {
        Order order = request.getOrder();
        UserAccount createdBy = request.getCreatedBy();
        UserAccount handledBy = request.getHandledBy();
        String customerName = order.getShippingAddress() != null
                ? trimToNull(order.getShippingAddress().getFullName())
                : null;
        if (customerName == null) {
            customerName = "Khách #" + order.getId();
        }
        return new ReturnRequestResponse(
                request.getId(),
                request.getRequestCode(),
                order.getId(),
                order.getOrderNumber(),
                customerName,
                request.getReason(),
                request.getEvidenceUrl(),
                order.getPaymentStatus().name().toLowerCase(Locale.ROOT),
                order.getStatus().name().toLowerCase(Locale.ROOT),
                request.getStatus().name().toLowerCase(Locale.ROOT),
                request.getVerdict(),
                request.getNote(),
                createdBy != null ? createdBy.getId() : null,
                createdBy != null ? createdBy.getFullName() : null,
                handledBy != null ? handledBy.getId() : null,
                handledBy != null ? handledBy.getFullName() : null,
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }

    private String requireText(String value, String errorMessage) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new ResponseStatusException(BAD_REQUEST, errorMessage);
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
