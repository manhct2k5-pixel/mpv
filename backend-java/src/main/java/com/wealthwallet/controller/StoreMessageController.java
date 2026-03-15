package com.wealthwallet.controller;

import com.wealthwallet.dto.StoreMessagePartnerResponse;
import com.wealthwallet.dto.StoreMessageRequest;
import com.wealthwallet.dto.StoreMessageResponse;
import com.wealthwallet.service.StoreMessageService;
import com.wealthwallet.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/store/messages")
@RequiredArgsConstructor
public class StoreMessageController {

    private final StoreMessageService storeMessageService;
    private final UserService userService;

    @GetMapping("/partners")
    public List<StoreMessagePartnerResponse> partners() {
        return storeMessageService.listPartners(userService.getCurrentUser());
    }

    @GetMapping("/{userId}")
    public List<StoreMessageResponse> messages(@PathVariable(name = "userId") Long userId) {
        return storeMessageService.listMessages(userService.getCurrentUser(), userId);
    }

    @PostMapping("/{userId}")
    public StoreMessageResponse sendMessage(
            @PathVariable(name = "userId") Long userId,
            @Valid @RequestBody StoreMessageRequest request
    ) {
        return storeMessageService.sendMessage(userService.getCurrentUser(), userId, request);
    }
}
