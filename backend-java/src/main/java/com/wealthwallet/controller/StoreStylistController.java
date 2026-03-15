package com.wealthwallet.controller;

import com.wealthwallet.dto.StylistRequestCreateRequest;
import com.wealthwallet.dto.StylistRequestResponse;
import com.wealthwallet.dto.StylistSummaryResponse;
import com.wealthwallet.service.StylistRequestService;
import com.wealthwallet.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreStylistController {

    private final StylistRequestService stylistRequestService;
    private final UserService userService;

    @GetMapping("/stylists")
    public List<StylistSummaryResponse> stylists() {
        return stylistRequestService.listStylists();
    }

    @PostMapping("/stylist-requests")
    public StylistRequestResponse createRequest(@Valid @RequestBody StylistRequestCreateRequest request) {
        return stylistRequestService.create(userService.getCurrentUser(), request);
    }

    @GetMapping("/stylist-requests")
    public List<StylistRequestResponse> requests() {
        return stylistRequestService.list(userService.getCurrentUser());
    }
}
