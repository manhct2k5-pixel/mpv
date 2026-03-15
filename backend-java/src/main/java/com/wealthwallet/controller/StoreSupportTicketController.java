package com.wealthwallet.controller;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.SupportTicketCommentRequest;
import com.wealthwallet.dto.SupportTicketCreateRequest;
import com.wealthwallet.dto.SupportTicketResponse;
import com.wealthwallet.dto.SupportTicketUpdateRequest;
import com.wealthwallet.service.SupportTicketService;
import com.wealthwallet.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/store/support-tickets")
@RequiredArgsConstructor
public class StoreSupportTicketController {

    private final SupportTicketService supportTicketService;
    private final UserService userService;

    @GetMapping
    public List<SupportTicketResponse> tickets(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "q", required = false) String query
    ) {
        UserAccount user = userService.getCurrentUser();
        return supportTicketService.list(user, status, query);
    }

    @GetMapping("/{id}")
    public SupportTicketResponse ticket(@PathVariable(name = "id") Long id) {
        UserAccount user = userService.getCurrentUser();
        return supportTicketService.detail(user, id);
    }

    @PostMapping
    public SupportTicketResponse create(@Valid @RequestBody SupportTicketCreateRequest request) {
        UserAccount user = userService.getCurrentUser();
        return supportTicketService.create(user, request);
    }

    @PutMapping("/{id}")
    public SupportTicketResponse update(
            @PathVariable(name = "id") Long id,
            @RequestBody SupportTicketUpdateRequest request
    ) {
        UserAccount user = userService.getCurrentUser();
        return supportTicketService.update(user, id, request);
    }

    @PostMapping("/{id}/comments")
    public SupportTicketResponse addComment(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody SupportTicketCommentRequest request
    ) {
        UserAccount user = userService.getCurrentUser();
        return supportTicketService.addComment(user, id, request);
    }
}
