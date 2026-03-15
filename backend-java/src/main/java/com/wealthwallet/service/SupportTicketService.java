package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.SupportTicket;
import com.wealthwallet.domain.entity.SupportTicketComment;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.SupportTicketCommentRequest;
import com.wealthwallet.dto.SupportTicketCommentResponse;
import com.wealthwallet.dto.SupportTicketCreateRequest;
import com.wealthwallet.dto.SupportTicketResponse;
import com.wealthwallet.dto.SupportTicketUpdateRequest;
import com.wealthwallet.repository.OrderRepository;
import com.wealthwallet.repository.ProductRepository;
import com.wealthwallet.repository.SupportTicketRepository;
import com.wealthwallet.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
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
public class SupportTicketService {

    private final SupportTicketRepository supportTicketRepository;
    private final OrderRepository orderRepository;
    private final UserAccountRepository userAccountRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> list(UserAccount actor, String status, String query) {
        SupportTicket.Status statusFilter = parseStatus(status, null);
        String keyword = normalizeKeyword(query);
        return loadTicketsForActor(actor).stream()
                .filter(ticket -> statusFilter == null || ticket.getStatus() == statusFilter)
                .filter(ticket -> keyword == null || matchesKeyword(ticket, keyword))
                .sorted(Comparator.comparing(SupportTicket::getCreatedAt).reversed())
                .map(this::mapResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SupportTicketResponse detail(UserAccount actor, Long ticketId) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Support ticket not found"));
        ensureCanView(actor, ticket);
        return mapResponse(ticket);
    }

    @Transactional
    public SupportTicketResponse create(UserAccount actor, SupportTicketCreateRequest request) {
        Order order = null;
        if (request.orderId() != null) {
            order = orderRepository.findById(request.orderId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
            ensureCanReferenceOrder(actor, order);
        }

        SupportTicket ticket = SupportTicket.builder()
                .ticketCode(generateTicketCode())
                .order(order)
                .createdBy(actor)
                .issueType(requireText(request.issueType(), "Loại ticket là bắt buộc"))
                .description(requireText(request.description(), "Mô tả ticket là bắt buộc"))
                .evidenceUrl(trimToNull(request.evidenceUrl()))
                .priority(parsePriority(request.priority(), SupportTicket.Priority.MEDIUM))
                .status(SupportTicket.Status.NEW)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        if (request.assigneeId() != null) {
            if (!isSupportRole(actor.getRole())) {
                throw new ResponseStatusException(FORBIDDEN, "Chỉ staff hoặc admin mới được gán người xử lý");
            }
            ticket.setAssignee(resolveSupportAssignee(request.assigneeId()));
        }

        if (trimToNull(request.initialNote()) != null) {
            addCommentInternal(ticket, actor, request.initialNote());
        }

        SupportTicket saved = supportTicketRepository.save(ticket);
        return mapResponse(saved);
    }

    @Transactional
    public SupportTicketResponse update(UserAccount actor, Long ticketId, SupportTicketUpdateRequest request) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Support ticket not found"));
        ensureCanView(actor, ticket);

        boolean supportRole = isSupportRole(actor.getRole());
        boolean creator = isCreator(actor, ticket);

        if (request.status() != null) {
            String statusInput = trimToNull(request.status());
            if (statusInput == null) {
                throw new ResponseStatusException(BAD_REQUEST, "Trạng thái ticket không được để trống");
            }
            if (!supportRole) {
                throw new ResponseStatusException(FORBIDDEN, "Chỉ staff hoặc admin mới được cập nhật trạng thái ticket");
            }
            SupportTicket.Status nextStatus = parseStatus(statusInput, null);
            ensureStatusTransition(ticket.getStatus(), nextStatus);
            ticket.setStatus(nextStatus);
        }

        if (request.priority() != null) {
            if (!supportRole) {
                throw new ResponseStatusException(FORBIDDEN, "Chỉ staff hoặc admin mới được cập nhật mức ưu tiên");
            }
            ticket.setPriority(parsePriority(request.priority(), ticket.getPriority()));
        }

        if (request.assigneeId() != null) {
            if (!supportRole) {
                throw new ResponseStatusException(FORBIDDEN, "Chỉ staff hoặc admin mới được gán người xử lý");
            }
            ticket.setAssignee(resolveSupportAssignee(request.assigneeId()));
        }

        if (request.issueType() != null) {
            if (!supportRole && !creator) {
                throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền sửa nội dung ticket");
            }
            ticket.setIssueType(requireText(request.issueType(), "Loại ticket là bắt buộc"));
        }

        if (request.description() != null) {
            if (!supportRole && !creator) {
                throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền sửa nội dung ticket");
            }
            ticket.setDescription(requireText(request.description(), "Mô tả ticket là bắt buộc"));
        }

        if (request.evidenceUrl() != null) {
            if (!supportRole && !creator) {
                throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền sửa bằng chứng ticket");
            }
            ticket.setEvidenceUrl(trimToNull(request.evidenceUrl()));
        }

        if (request.resolution() != null) {
            if (!supportRole) {
                throw new ResponseStatusException(FORBIDDEN, "Chỉ staff hoặc admin mới được cập nhật kết luận");
            }
            ticket.setResolution(trimToNull(request.resolution()));
        }

        if (trimToNull(request.note()) != null) {
            addCommentInternal(ticket, actor, request.note());
        }

        ticket.setUpdatedAt(LocalDateTime.now());
        SupportTicket saved = supportTicketRepository.save(ticket);
        return mapResponse(saved);
    }

    @Transactional
    public SupportTicketResponse addComment(UserAccount actor, Long ticketId, SupportTicketCommentRequest request) {
        SupportTicket ticket = supportTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Support ticket not found"));
        ensureCanView(actor, ticket);
        if (ticket.getStatus() == SupportTicket.Status.CLOSED && !isSupportRole(actor.getRole())) {
            throw new ResponseStatusException(BAD_REQUEST, "Ticket đã đóng, không thể phản hồi thêm");
        }

        addCommentInternal(ticket, actor, request.message());
        ticket.setUpdatedAt(LocalDateTime.now());
        SupportTicket saved = supportTicketRepository.save(ticket);
        return mapResponse(saved);
    }

    private List<SupportTicket> loadTicketsForActor(UserAccount actor) {
        if (isSupportRole(actor.getRole())) {
            return supportTicketRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        if (actor.getRole() == UserAccount.Role.SELLER) {
            Set<SupportTicket> merged = new LinkedHashSet<>(supportTicketRepository.findByCreatedByOrderByCreatedAtDesc(actor));
            List<Long> productIds = productRepository.findBySellerIdOrderByCreatedAtDesc(actor.getId()).stream()
                    .map(Product::getId)
                    .toList();
            if (!productIds.isEmpty()) {
                merged.addAll(supportTicketRepository.findBySellerProductIds(productIds));
            }
            return new ArrayList<>(merged);
        }

        return supportTicketRepository.findByCreatedByOrderByCreatedAtDesc(actor);
    }

    private boolean matchesKeyword(SupportTicket ticket, String keyword) {
        String orderNumber = ticket.getOrder() != null ? ticket.getOrder().getOrderNumber() : "";
        String haystack = (
                nullSafe(ticket.getTicketCode()) + " "
                        + nullSafe(orderNumber) + " "
                        + nullSafe(ticket.getIssueType()) + " "
                        + nullSafe(ticket.getDescription())
        ).toLowerCase(Locale.ROOT);
        return haystack.contains(keyword);
    }

    private void ensureCanView(UserAccount actor, SupportTicket ticket) {
        if (isSupportRole(actor.getRole()) || isCreator(actor, ticket)) {
            return;
        }
        Order order = ticket.getOrder();
        if (order == null) {
            throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền truy cập ticket này");
        }

        if (actor.getRole() == UserAccount.Role.USER && order.getUser().getId().equals(actor.getId())) {
            return;
        }
        if (actor.getRole() == UserAccount.Role.SELLER && isOrderManagedBySeller(actor, order)) {
            return;
        }
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền truy cập ticket này");
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
        throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền tạo ticket cho đơn này");
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
                .anyMatch(item -> item.getProductId() != null && sellerProductIds.contains(item.getProductId()));
    }

    private void ensureStatusTransition(SupportTicket.Status current, SupportTicket.Status next) {
        if (current == next) {
            return;
        }
        boolean valid = switch (current) {
            case NEW -> next == SupportTicket.Status.PROCESSING
                    || next == SupportTicket.Status.WAITING
                    || next == SupportTicket.Status.CLOSED;
            case PROCESSING -> next == SupportTicket.Status.WAITING
                    || next == SupportTicket.Status.RESOLVED
                    || next == SupportTicket.Status.CLOSED;
            case WAITING -> next == SupportTicket.Status.PROCESSING
                    || next == SupportTicket.Status.RESOLVED
                    || next == SupportTicket.Status.CLOSED;
            case RESOLVED -> next == SupportTicket.Status.CLOSED;
            case CLOSED -> false;
        };
        if (!valid) {
            throw new ResponseStatusException(BAD_REQUEST, "Cập nhật trạng thái ticket chưa đúng luồng");
        }
    }

    private SupportTicket.Status parseStatus(String value, SupportTicket.Status fallback) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return fallback;
        }
        try {
            return SupportTicket.Status.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Trạng thái ticket không hợp lệ");
        }
    }

    private SupportTicket.Priority parsePriority(String value, SupportTicket.Priority fallback) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return fallback;
        }
        try {
            return SupportTicket.Priority.valueOf(normalized.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Mức ưu tiên ticket không hợp lệ");
        }
    }

    private UserAccount resolveSupportAssignee(Long assigneeId) {
        UserAccount assignee = userAccountRepository.findById(assigneeId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Assignee not found"));
        if (!isSupportRole(assignee.getRole())) {
            throw new ResponseStatusException(BAD_REQUEST, "Người xử lý phải là admin hoặc staff");
        }
        return assignee;
    }

    private void addCommentInternal(SupportTicket ticket, UserAccount actor, String message) {
        String content = requireText(message, "Nội dung phản hồi ticket là bắt buộc");
        SupportTicketComment comment = SupportTicketComment.builder()
                .ticket(ticket)
                .actor(actor)
                .message(content)
                .createdAt(LocalDateTime.now())
                .build();
        ticket.getComments().add(comment);
    }

    private boolean isCreator(UserAccount actor, SupportTicket ticket) {
        return ticket.getCreatedBy() != null && ticket.getCreatedBy().getId().equals(actor.getId());
    }

    private boolean isSupportRole(UserAccount.Role role) {
        return role == UserAccount.Role.ADMIN
                || role == UserAccount.Role.WAREHOUSE
                || role == UserAccount.Role.STYLES;
    }

    private String generateTicketCode() {
        String code;
        do {
            code = "TK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        } while (supportTicketRepository.existsByTicketCode(code));
        return code;
    }

    private SupportTicketResponse mapResponse(SupportTicket ticket) {
        List<SupportTicketCommentResponse> comments = ticket.getComments().stream()
                .sorted(Comparator.comparing(SupportTicketComment::getCreatedAt).reversed())
                .map(this::mapComment)
                .toList();
        Order order = ticket.getOrder();
        UserAccount createdBy = ticket.getCreatedBy();
        UserAccount assignee = ticket.getAssignee();
        return new SupportTicketResponse(
                ticket.getId(),
                ticket.getTicketCode(),
                order != null ? order.getId() : null,
                order != null ? order.getOrderNumber() : null,
                ticket.getIssueType(),
                ticket.getPriority().name().toLowerCase(Locale.ROOT),
                ticket.getStatus().name().toLowerCase(Locale.ROOT),
                ticket.getDescription(),
                ticket.getEvidenceUrl(),
                ticket.getResolution(),
                createdBy != null ? createdBy.getId() : null,
                createdBy != null ? createdBy.getFullName() : null,
                assignee != null ? assignee.getId() : null,
                assignee != null ? assignee.getFullName() : null,
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                comments
        );
    }

    private SupportTicketCommentResponse mapComment(SupportTicketComment comment) {
        UserAccount actor = comment.getActor();
        return new SupportTicketCommentResponse(
                comment.getId(),
                actor != null ? actor.getId() : null,
                actor != null ? actor.getFullName() : null,
                comment.getMessage(),
                comment.getCreatedAt()
        );
    }

    private String requireText(String value, String errorMessage) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new ResponseStatusException(BAD_REQUEST, errorMessage);
        }
        return normalized;
    }

    private String normalizeKeyword(String value) {
        String normalized = trimToNull(value);
        return normalized != null ? normalized.toLowerCase(Locale.ROOT) : null;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
