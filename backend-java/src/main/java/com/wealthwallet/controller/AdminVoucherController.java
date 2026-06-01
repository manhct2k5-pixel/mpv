package com.wealthwallet.controller;

import com.wealthwallet.dto.VoucherResponse;
import com.wealthwallet.dto.VoucherUpsertRequest;
import com.wealthwallet.service.UserService;
import com.wealthwallet.service.VoucherService;
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
@RequestMapping("/api/admin/vouchers")
@RequiredArgsConstructor
public class AdminVoucherController {

    private final VoucherService voucherService;
    private final UserService userService;

    @GetMapping
    public List<VoucherResponse> list() {
        return voucherService.listAll();
    }

    @PostMapping
    public ResponseEntity<VoucherResponse> create(@Valid @RequestBody VoucherUpsertRequest request) {
        return ResponseEntity.status(201).body(voucherService.create(request, userService.getCurrentUser()));
    }

    @PutMapping("/{id}")
    public VoucherResponse update(@PathVariable Long id, @Valid @RequestBody VoucherUpsertRequest request) {
        return voucherService.update(id, request, userService.getCurrentUser());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        voucherService.delete(id, userService.getCurrentUser());
        return ResponseEntity.noContent().build();
    }
}
