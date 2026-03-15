package com.wealthwallet.service;

import com.wealthwallet.domain.entity.StylistRequest;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.StylistRequestCreateRequest;
import com.wealthwallet.dto.StylistRequestResponse;
import com.wealthwallet.dto.StylistSummaryResponse;
import com.wealthwallet.repository.StylistRequestRepository;
import com.wealthwallet.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class StylistRequestService {

    private final StylistRequestRepository stylistRequestRepository;
    private final UserAccountRepository userAccountRepository;

    @Transactional(readOnly = true)
    public List<StylistSummaryResponse> listStylists() {
        return userAccountRepository.findByRoleIn(List.of(UserAccount.Role.WAREHOUSE, UserAccount.Role.STYLES)).stream()
                .map(stylist -> new StylistSummaryResponse(
                        stylist.getId(),
                        stylist.getFullName(),
                        normalizeRole(stylist.getRole())
                ))
                .toList();
    }

    @Transactional
    public StylistRequestResponse create(UserAccount user, StylistRequestCreateRequest request) {
        if (user.getRole() != UserAccount.Role.USER) {
            throw new ResponseStatusException(FORBIDDEN, "Chỉ user mới được gửi yêu cầu staff tư vấn");
        }
        UserAccount stylist = userAccountRepository.findById(request.stylistId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Stylist not found"));
        if (!isAdvisorRole(stylist.getRole())) {
            throw new ResponseStatusException(BAD_REQUEST, "Chỉ gửi yêu cầu cho staff tư vấn");
        }
        StylistRequest stylistRequest = StylistRequest.builder()
                .requester(user)
                .stylist(stylist)
                .note(trimToNull(request.note()))
                .status(StylistRequest.Status.PENDING)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        StylistRequest saved = stylistRequestRepository.save(stylistRequest);
        return map(saved);
    }

    @Transactional(readOnly = true)
    public List<StylistRequestResponse> list(UserAccount user) {
        List<StylistRequest> requests;
        if (user.getRole() == UserAccount.Role.ADMIN) {
            requests = stylistRequestRepository.findAll();
        } else if (isAdvisorRole(user.getRole())) {
            requests = stylistRequestRepository.findByStylistOrderByCreatedAtDesc(user);
        } else if (user.getRole() == UserAccount.Role.USER) {
            requests = stylistRequestRepository.findByRequesterOrderByCreatedAtDesc(user);
        } else {
            throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền xem yêu cầu staff tư vấn");
        }
        return requests.stream()
                .sorted(Comparator.comparing(StylistRequest::getCreatedAt).reversed())
                .map(this::map)
                .toList();
    }

    private StylistRequestResponse map(StylistRequest request) {
        UserAccount requester = request.getRequester();
        UserAccount stylist = request.getStylist();
        return new StylistRequestResponse(
                request.getId(),
                requester != null ? requester.getId() : null,
                requester != null ? requester.getFullName() : null,
                stylist != null ? stylist.getId() : null,
                stylist != null ? stylist.getFullName() : null,
                request.getNote(),
                request.getStatus().name().toLowerCase(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isAdvisorRole(UserAccount.Role role) {
        return role == UserAccount.Role.WAREHOUSE || role == UserAccount.Role.STYLES;
    }

    private String normalizeRole(UserAccount.Role role) {
        if (role == UserAccount.Role.STYLES) {
            return UserAccount.Role.WAREHOUSE.name().toLowerCase();
        }
        return role.name().toLowerCase();
    }
}
