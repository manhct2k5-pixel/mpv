package com.wealthwallet.service;

import com.wealthwallet.domain.entity.Voucher;
import com.wealthwallet.dto.VoucherValidationResponse;
import com.wealthwallet.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;

    @Transactional(readOnly = true)
    public Voucher getValidVoucherOrThrow(String code, Double subtotal) {
        Voucher voucher = voucherRepository.findByCodeIgnoreCase(normalizeCode(code))
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Mã voucher không tồn tại"));
        validateVoucher(voucher, subtotal);
        return voucher;
    }

    @Transactional(readOnly = true)
    public VoucherValidationResponse validateForPreview(String code) {
        String normalized = normalizeCode(code);
        Voucher voucher = voucherRepository.findByCodeIgnoreCase(normalized).orElse(null);
        if (voucher == null) {
            return new VoucherValidationResponse(normalized, false, "Mã voucher không tồn tại", null, null, null, null, false);
        }
        String message = "Voucher hợp lệ";
        boolean valid = true;

        if (!Boolean.TRUE.equals(voucher.getActive())) {
            message = "Voucher đang tạm khóa";
            valid = false;
        } else if (voucher.getExpireAt() != null && voucher.getExpireAt().isBefore(LocalDateTime.now())) {
            message = "Voucher đã hết hạn";
            valid = false;
        }

        return new VoucherValidationResponse(
                voucher.getCode(),
                valid,
                message,
                voucher.getType().name().toLowerCase(),
                voucher.getValue(),
                voucher.getMinOrder(),
                voucher.getExpireAt(),
                voucher.getActive()
        );
    }

    public double calculateDiscount(Voucher voucher, double subtotal) {
        if (voucher == null || subtotal <= 0) {
            return 0.0;
        }
        if (!Boolean.TRUE.equals(voucher.getActive())) {
            return 0.0;
        }
        if (voucher.getExpireAt() != null && voucher.getExpireAt().isBefore(LocalDateTime.now())) {
            return 0.0;
        }
        if (voucher.getMinOrder() != null && subtotal < voucher.getMinOrder()) {
            return 0.0;
        }
        double rawDiscount = voucher.getType() == Voucher.Type.PERCENT
                ? subtotal * (voucher.getValue() / 100.0)
                : voucher.getValue();
        return Math.min(Math.max(rawDiscount, 0.0), subtotal);
    }

    public void validateVoucher(Voucher voucher, Double subtotal) {
        if (!Boolean.TRUE.equals(voucher.getActive())) {
            throw new ResponseStatusException(BAD_REQUEST, "Voucher đang tạm khóa");
        }
        if (voucher.getExpireAt() != null && voucher.getExpireAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(BAD_REQUEST, "Voucher đã hết hạn");
        }
        double orderSubtotal = subtotal != null ? subtotal : 0.0;
        double minOrder = voucher.getMinOrder() != null ? voucher.getMinOrder() : 0.0;
        if (orderSubtotal < minOrder) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Đơn hàng chưa đạt giá trị tối thiểu " + formatMoney(minOrder) + " để áp voucher"
            );
        }
    }

    private String normalizeCode(String code) {
        if (code == null || code.trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Mã voucher là bắt buộc");
        }
        return code.trim().toUpperCase();
    }

    private String formatMoney(double value) {
        return String.format("%,.0f đ", value);
    }
}
