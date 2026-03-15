package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Lookbook;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.LookbookCreateRequest;
import com.wealthwallet.dto.LookbookResponse;
import com.wealthwallet.dto.LookbookUpdateRequest;
import com.wealthwallet.repository.LookbookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class LookbookService {

    private final LookbookRepository lookbookRepository;

    @Transactional(readOnly = true)
    public List<LookbookResponse> list() {
        return lookbookRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(this::map)
                .toList();
    }

    @Transactional(readOnly = true)
    public LookbookResponse detail(Long id) {
        Lookbook lookbook = lookbookRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Lookbook not found"));
        return map(lookbook);
    }

    @Transactional
    public LookbookResponse create(UserAccount user, LookbookCreateRequest request) {
        ensureCanManage(user);
        Lookbook lookbook = Lookbook.builder()
                .title(request.title().trim())
                .description(trimToNull(request.description()))
                .mood(trimToNull(request.mood()))
                .coverImageUrl(trimToNull(request.coverImageUrl()))
                .tags(new ArrayList<>(request.tags() != null ? request.tags() : List.of()))
                .active(true)
                .createdBy(user)
                .build();
        Lookbook saved = lookbookRepository.save(lookbook);
        return map(saved);
    }

    @Transactional
    public LookbookResponse update(UserAccount user, Long id, LookbookUpdateRequest request) {
        ensureCanManage(user);
        Lookbook lookbook = lookbookRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Lookbook not found"));
        ensureOwnerOrAdmin(user, lookbook);

        if (request.title() != null && !request.title().isBlank()) {
            lookbook.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            lookbook.setDescription(trimToNull(request.description()));
        }
        if (request.mood() != null) {
            lookbook.setMood(trimToNull(request.mood()));
        }
        if (request.coverImageUrl() != null) {
            lookbook.setCoverImageUrl(trimToNull(request.coverImageUrl()));
        }
        if (request.tags() != null) {
            lookbook.setTags(new ArrayList<>(request.tags()));
        }
        if (request.active() != null) {
            lookbook.setActive(request.active());
        }
        lookbook.setUpdatedAt(LocalDateTime.now());
        Lookbook saved = lookbookRepository.save(lookbook);
        return map(saved);
    }

    @Transactional
    public void delete(UserAccount user, Long id) {
        ensureCanManage(user);
        Lookbook lookbook = lookbookRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Lookbook not found"));
        ensureOwnerOrAdmin(user, lookbook);
        lookbook.setActive(false);
        lookbook.setUpdatedAt(LocalDateTime.now());
        lookbookRepository.save(lookbook);
    }

    private LookbookResponse map(Lookbook lookbook) {
        UserAccount creator = lookbook.getCreatedBy();
        return new LookbookResponse(
                lookbook.getId(),
                lookbook.getTitle(),
                lookbook.getDescription(),
                lookbook.getMood(),
                lookbook.getCoverImageUrl(),
                List.copyOf(lookbook.getTags() != null ? lookbook.getTags() : List.of()),
                lookbook.getActive(),
                lookbook.getCreatedAt(),
                lookbook.getUpdatedAt(),
                creator != null ? creator.getId() : null,
                creator != null ? creator.getFullName() : null
        );
    }

    private void ensureCanManage(UserAccount user) {
        if (user.getRole() == UserAccount.Role.USER) {
            throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền tạo lookbook");
        }
    }

    private void ensureOwnerOrAdmin(UserAccount user, Lookbook lookbook) {
        if (user.getRole() == UserAccount.Role.ADMIN) {
            return;
        }
        if (lookbook.getCreatedBy() == null || !lookbook.getCreatedBy().getId().equals(user.getId())) {
            throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền cập nhật lookbook này");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
