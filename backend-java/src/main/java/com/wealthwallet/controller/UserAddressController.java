package com.wealthwallet.controller;

import com.wealthwallet.dto.UserAddressResponse;
import com.wealthwallet.dto.UserAddressUpsertRequest;
import com.wealthwallet.service.UserAddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/user/addresses")
@RequiredArgsConstructor
public class UserAddressController {

    private final UserAddressService userAddressService;

    @GetMapping
    public List<UserAddressResponse> list() {
        return userAddressService.listAddresses();
    }

    @PostMapping
    public UserAddressResponse create(@Valid @RequestBody UserAddressUpsertRequest request) {
        return userAddressService.createAddress(request);
    }

    @PutMapping("/{id}")
    public UserAddressResponse update(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody UserAddressUpsertRequest request
    ) {
        return userAddressService.updateAddress(id, request);
    }

    @PutMapping("/{id}/default")
    public UserAddressResponse setDefault(@PathVariable(name = "id") Long id) {
        return userAddressService.setDefaultAddress(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable(name = "id") Long id) {
        userAddressService.deleteAddress(id);
        return ResponseEntity.noContent().build();
    }
}
