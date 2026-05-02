package com.wealthwallet.controller;

import com.wealthwallet.dto.StaffOrderWorkStateResponse;
import com.wealthwallet.dto.StaffOrderWorkStateUpdateRequest;
import com.wealthwallet.service.StaffOrderWorkStateService;
import com.wealthwallet.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/staff/order-work-states")
@RequiredArgsConstructor
public class StaffOrderWorkStateController {

    private final StaffOrderWorkStateService staffOrderWorkStateService;
    private final UserService userService;

    @GetMapping
    public List<StaffOrderWorkStateResponse> list() {
        return staffOrderWorkStateService.list(userService.getCurrentUser());
    }

    @GetMapping("/{orderId}")
    public StaffOrderWorkStateResponse get(@PathVariable(name = "orderId") Long orderId) {
        return staffOrderWorkStateService.get(userService.getCurrentUser(), orderId);
    }

    @PutMapping("/{orderId}")
    public StaffOrderWorkStateResponse update(
            @PathVariable(name = "orderId") Long orderId,
            @RequestBody StaffOrderWorkStateUpdateRequest request
    ) {
        return staffOrderWorkStateService.update(userService.getCurrentUser(), orderId, request);
    }
}
