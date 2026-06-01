package com.wealthwallet.controller;

import com.wealthwallet.domain.entity.UserAccount;
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
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.FORBIDDEN;

@RestController
@RequestMapping("/api/seller/vouchers")
@RequiredArgsConstructor
public class SellerVoucherController {

    private final VoucherService voucherService;
    private final UserService userService;

    @GetMapping
    public List<VoucherResponse> list() {
        UserAccount me = userService.getCurrentUser();
        if (me.getRole() == UserAccount.Role.ADMIN) {
            return voucherService.listAll();
        }
        return voucherService.listBySeller(me.getId());
    }

    @PostMapping
    public ResponseEntity<VoucherResponse> create(@Valid @RequestBody VoucherUpsertRequest request) {
        UserAccount me = userService.getCurrentUser();
        requireSellerOrAdmin(me);
        return ResponseEntity.status(201).body(voucherService.create(request, me));
    }

    @PutMapping("/{id}")
    public VoucherResponse update(@PathVariable Long id, @Valid @RequestBody VoucherUpsertRequest request) {
        UserAccount me = userService.getCurrentUser();
        requireSellerOrAdmin(me);
        return voucherService.update(id, request, me);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        UserAccount me = userService.getCurrentUser();
        requireSellerOrAdmin(me);
        voucherService.delete(id, me);
        return ResponseEntity.noContent().build();
    }

    private void requireSellerOrAdmin(UserAccount user) {
        if (user.getRole() != UserAccount.Role.ADMIN && user.getRole() != UserAccount.Role.SELLER) {
            throw new ResponseStatusException(FORBIDDEN, "Chỉ seller hoặc admin mới có quyền quản lý voucher");
        }
    }
}
