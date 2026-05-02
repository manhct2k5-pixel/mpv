package com.wealthwallet.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.StaffOrderWorkState;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.StaffOrderWorkStateResponse;
import com.wealthwallet.dto.StaffOrderWorkStateUpdateRequest;
import com.wealthwallet.dto.StaffQcStatePayload;
import com.wealthwallet.dto.StaffShippingDraftPayload;
import com.wealthwallet.dto.StaffTimelineLogPayload;
import com.wealthwallet.dto.StaffWaybillPayload;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.StaffOrderWorkStateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class StaffOrderWorkStateService {

    private static final TypeReference<List<StaffTimelineLogPayload>> TIMELINE_TYPE = new TypeReference<>() {
    };

    private final StaffOrderWorkStateRepository workStateRepository;
    private final OrderRepository orderRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<StaffOrderWorkStateResponse> list(UserAccount user) {
        ensureStaffOperator(user);
        List<Order> orders = orderRepository.findAll();
        Map<Long, StaffOrderWorkState> stateByOrderId = workStateRepository
                .findByOrderIdIn(orders.stream().map(Order::getId).toList())
                .stream()
                .collect(Collectors.toMap(state -> state.getOrder().getId(), Function.identity()));

        return orders.stream()
                .map(order -> map(order, stateByOrderId.get(order.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public StaffOrderWorkStateResponse get(UserAccount user, Long orderId) {
        ensureStaffOperator(user);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        StaffOrderWorkState state = workStateRepository.findByOrderId(orderId).orElse(null);
        return map(order, state);
    }

    @Transactional
    public StaffOrderWorkStateResponse update(UserAccount user, Long orderId, StaffOrderWorkStateUpdateRequest request) {
        ensureStaffOperator(user);
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        StaffOrderWorkState state = workStateRepository.findByOrderId(orderId)
                .orElseGet(() -> StaffOrderWorkState.builder().order(order).build());

        if (Boolean.TRUE.equals(request.clearAssignee())) {
            state.setAssigneeName(null);
        } else if (request.assigneeName() != null) {
            state.setAssigneeName(trimToNull(request.assigneeName()));
        }
        if (request.postponed() != null) {
            state.setPostponed(request.postponed());
        }
        if (request.internalNote() != null) {
            state.setInternalNote(trimToNull(request.internalNote()));
        }
        if (request.qc() != null) {
            applyQc(state, request.qc());
        }
        if (request.shippingDraft() != null) {
            applyShippingDraft(state, request.shippingDraft());
        }
        if (Boolean.TRUE.equals(request.clearWaybill())) {
            clearWaybill(state);
        } else if (request.waybill() != null) {
            applyWaybill(state, request.waybill());
        }
        if (request.timelineLog() != null) {
            appendTimelineLog(state, request.timelineLog());
        }

        state.setUpdatedBy(user.getFullName());
        state.setUpdatedAt(LocalDateTime.now());
        StaffOrderWorkState saved = workStateRepository.save(state);
        return map(order, saved);
    }

    private void ensureStaffOperator(UserAccount user) {
        if (user.getRole() == UserAccount.Role.ADMIN
                || user.getRole() == UserAccount.Role.WAREHOUSE
                || user.getRole() == UserAccount.Role.STYLES) {
            return;
        }
        throw new ResponseStatusException(FORBIDDEN, "Chỉ staff/admin được cập nhật workflow vận hành");
    }

    private void applyQc(StaffOrderWorkState state, StaffQcStatePayload qc) {
        if (qc.checkQuantity() != null) state.setQcCheckQuantity(qc.checkQuantity());
        if (qc.checkModel() != null) state.setQcCheckModel(qc.checkModel());
        if (qc.checkVisual() != null) state.setQcCheckVisual(qc.checkVisual());
        if (qc.checkAccessories() != null) state.setQcCheckAccessories(qc.checkAccessories());
        if (qc.issueNote() != null) state.setQcIssueNote(trimToNull(qc.issueNote()));
        if (qc.packageType() != null) state.setPackageType(defaultText(qc.packageType(), "Hộp carton tiêu chuẩn"));
        if (qc.weight() != null) state.setPackageWeight(trimToNull(qc.weight()));
        if (qc.dimensions() != null) state.setPackageDimensions(trimToNull(qc.dimensions()));
        if (qc.packageNote() != null) state.setPackageNote(trimToNull(qc.packageNote()));
        if (qc.status() != null) state.setQcStatus(defaultText(qc.status(), "pending"));
    }

    private void applyShippingDraft(StaffOrderWorkState state, StaffShippingDraftPayload draft) {
        if (draft.carrier() != null) state.setShippingCarrier(defaultText(draft.carrier(), "GHN"));
        if (draft.service() != null) state.setShippingService(defaultText(draft.service(), "Giao tiêu chuẩn"));
        if (draft.fee() != null) state.setShippingFee(defaultText(draft.fee(), "32000"));
        if (draft.eta() != null) state.setShippingEta(defaultText(draft.eta(), "2-3 ngày"));
    }

    private void applyWaybill(StaffOrderWorkState state, StaffWaybillPayload waybill) {
        applyShippingDraft(state, new StaffShippingDraftPayload(
                waybill.carrier(),
                waybill.service(),
                waybill.fee(),
                waybill.eta()
        ));
        if (waybill.code() != null) state.setWaybillCode(trimToNull(waybill.code()));
        if (waybill.createdAt() != null) state.setWaybillCreatedAt(parseDateTime(waybill.createdAt()));
        if (waybill.connected() != null) state.setWaybillConnected(waybill.connected());
    }

    private void clearWaybill(StaffOrderWorkState state) {
        state.setWaybillCode(null);
        state.setWaybillCreatedAt(null);
        state.setWaybillConnected(false);
    }

    private void appendTimelineLog(StaffOrderWorkState state, StaffTimelineLogPayload entry) {
        List<StaffTimelineLogPayload> logs = readTimelineLogs(state);
        StaffTimelineLogPayload normalized = new StaffTimelineLogPayload(
                defaultText(entry.at(), LocalDateTime.now().toString()),
                defaultText(entry.actor(), state.getUpdatedBy() != null ? state.getUpdatedBy() : "Staff"),
                defaultText(entry.action(), "Cập nhật nội bộ"),
                defaultText(entry.note(), "Không có ghi chú"),
                trimToNull(entry.attachment()),
                defaultText(entry.kind(), "internal")
        );
        logs.add(0, normalized);
        if (logs.size() > 50) {
            logs = new ArrayList<>(logs.subList(0, 50));
        }
        try {
            state.setTimelineLogsJson(objectMapper.writeValueAsString(logs));
        } catch (Exception ignored) {
            state.setTimelineLogsJson("[]");
        }
    }

    private StaffOrderWorkStateResponse map(Order order, StaffOrderWorkState state) {
        return new StaffOrderWorkStateResponse(
                order.getId(),
                state != null ? state.getAssigneeName() : null,
                state != null ? Boolean.TRUE.equals(state.getPostponed()) : false,
                state != null ? state.getInternalNote() : null,
                new StaffQcStatePayload(
                        state != null && Boolean.TRUE.equals(state.getQcCheckQuantity()),
                        state != null && Boolean.TRUE.equals(state.getQcCheckModel()),
                        state != null && Boolean.TRUE.equals(state.getQcCheckVisual()),
                        state != null && Boolean.TRUE.equals(state.getQcCheckAccessories()),
                        state != null ? nullToEmpty(state.getQcIssueNote()) : "",
                        state != null ? defaultText(state.getPackageType(), "Hộp carton tiêu chuẩn") : "Hộp carton tiêu chuẩn",
                        state != null ? nullToEmpty(state.getPackageWeight()) : "",
                        state != null ? nullToEmpty(state.getPackageDimensions()) : "",
                        state != null ? nullToEmpty(state.getPackageNote()) : "",
                        state != null ? defaultText(state.getQcStatus(), "pending") : "pending"
                ),
                new StaffShippingDraftPayload(
                        state != null ? defaultText(state.getShippingCarrier(), "GHN") : "GHN",
                        state != null ? defaultText(state.getShippingService(), "Giao tiêu chuẩn") : "Giao tiêu chuẩn",
                        state != null ? defaultText(state.getShippingFee(), "32000") : "32000",
                        state != null ? defaultText(state.getShippingEta(), "2-3 ngày") : "2-3 ngày"
                ),
                mapWaybill(state),
                state != null ? readTimelineLogs(state) : List.of(),
                state != null ? state.getUpdatedBy() : null,
                state != null ? state.getUpdatedAt() : null
        );
    }

    private StaffWaybillPayload mapWaybill(StaffOrderWorkState state) {
        if (state == null || state.getWaybillCode() == null) {
            return null;
        }
        return new StaffWaybillPayload(
                defaultText(state.getShippingCarrier(), "GHN"),
                defaultText(state.getShippingService(), "Giao tiêu chuẩn"),
                defaultText(state.getShippingFee(), "32000"),
                defaultText(state.getShippingEta(), "2-3 ngày"),
                state.getWaybillCode(),
                state.getWaybillCreatedAt() != null ? state.getWaybillCreatedAt().toString() : null,
                Boolean.TRUE.equals(state.getWaybillConnected())
        );
    }

    private List<StaffTimelineLogPayload> readTimelineLogs(StaffOrderWorkState state) {
        String raw = state.getTimelineLogsJson();
        if (raw == null || raw.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return new ArrayList<>(objectMapper.readValue(raw, TIMELINE_TYPE));
        } catch (Exception ignored) {
            return new ArrayList<>();
        }
    }

    private LocalDateTime parseDateTime(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return LocalDateTime.now();
        }
        try {
            return LocalDateTime.parse(normalized.replace("Z", ""));
        } catch (DateTimeParseException ignored) {
            return LocalDateTime.now();
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String defaultText(String value, String fallback) {
        String normalized = trimToNull(value);
        return normalized == null ? fallback : normalized;
    }
}
