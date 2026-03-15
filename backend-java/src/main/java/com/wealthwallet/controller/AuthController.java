package com.wealthwallet.controller;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.LoginRequest;
import com.wealthwallet.dto.RegisterRequest;
import com.wealthwallet.dto.SellerRegisterRequest;
import com.wealthwallet.dto.UserDefaultAddressRequest;
import com.wealthwallet.dto.UserDefaultAddressResponse;
import com.wealthwallet.dto.UserSettingsRequest;
import com.wealthwallet.service.UserAddressService;
import com.wealthwallet.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final UserAddressService userAddressService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@Valid @RequestBody LoginRequest request) {
        try {
            String token = userService.login(request);
            return ResponseEntity.ok(Map.of("token", token));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(Map.of("error", "Email hoặc mật khẩu chưa đúng"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            return ResponseEntity.ok(userService.register(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/register/seller")
    public ResponseEntity<?> registerSeller(@Valid @RequestBody SellerRegisterRequest request) {
        try {
            return ResponseEntity.ok(userService.registerSeller(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/user")
    public ResponseEntity<UserAccount> me() {
        return ResponseEntity.ok(userService.getCurrentUser());
    }

    @PutMapping("/user")
    public ResponseEntity<UserAccount> update(@Valid @RequestBody UserSettingsRequest request) {
        return ResponseEntity.ok(userService.updateSettings(request));
    }

    @GetMapping("/user/default-address")
    public ResponseEntity<UserDefaultAddressResponse> defaultAddress() {
        return ResponseEntity.ok(userAddressService.getDefaultAddress());
    }

    @PutMapping("/user/default-address")
    public ResponseEntity<UserDefaultAddressResponse> updateDefaultAddress(
            @Valid @RequestBody UserDefaultAddressRequest request
    ) {
        return ResponseEntity.ok(userAddressService.saveDefaultAddress(request));
    }

    @PostMapping("/user/business-request")
    public ResponseEntity<UserAccount> requestBusinessAccess() {
        return ResponseEntity.ok(userService.requestBusinessAccess());
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công"));
    }
}
