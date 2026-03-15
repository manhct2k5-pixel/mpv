package com.wealthwallet.controller;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.ReturnRequestCreateRequest;
import com.wealthwallet.dto.ReturnRequestResponse;
import com.wealthwallet.dto.ReturnRequestUpdateRequest;
import com.wealthwallet.service.ReturnRequestService;
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
@RequestMapping("/api/store/return-requests")
@RequiredArgsConstructor
public class StoreReturnRequestController {

    private final ReturnRequestService returnRequestService;
    private final UserService userService;

    @GetMapping
    public List<ReturnRequestResponse> requests(
            @RequestParam(name = "status", required = false) String status
    ) {
        UserAccount user = userService.getCurrentUser();
        return returnRequestService.list(user, status);
    }

    @GetMapping("/{id}")
    public ReturnRequestResponse request(@PathVariable(name = "id") Long id) {
        UserAccount user = userService.getCurrentUser();
        return returnRequestService.detail(user, id);
    }

    @PostMapping
    public ReturnRequestResponse create(@Valid @RequestBody ReturnRequestCreateRequest request) {
        UserAccount user = userService.getCurrentUser();
        return returnRequestService.create(user, request);
    }

    @PutMapping("/{id}")
    public ReturnRequestResponse update(
            @PathVariable(name = "id") Long id,
            @RequestBody ReturnRequestUpdateRequest request
    ) {
        UserAccount user = userService.getCurrentUser();
        return returnRequestService.update(user, id, request);
    }
}
