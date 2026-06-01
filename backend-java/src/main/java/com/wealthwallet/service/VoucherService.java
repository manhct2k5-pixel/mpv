package com.wealthwallet.service;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.Voucher;
import com.wealthwallet.dto.VoucherResponse;
import com.wealthwallet.dto.VoucherUpsertRequest;
import com.wealthwallet.dto.VoucherValidationResponse;
import com.wealthwallet.repository.VoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class VoucherService {

    private final VoucherRepository voucherRepository;

    @Transactional(readOnly = true)
    public Voucher getValidVoucherOrThrow(String code, Double subtotal) {
        return getValidVoucherOrThrow(code, subtotal, null);
    }

    @Transactional(readOnly = true)
    public Voucher getValidVoucherOrThrow(String code, Double subtotal, Long sellerId) {
        Voucher voucher = voucherRepository.findByCodeIgnoreCase(normalizeCode(code))
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Mã voucher không tồn tại"));
        validateVoucher(voucher, subtotal, sellerId);
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
        validateVoucher(voucher, subtotal, null);
    }

    public void validateVoucher(Voucher voucher, Double subtotal, Long sellerId) {
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
        UserAccount voucherSeller = voucher.getSeller();
        if (voucherSeller != null && (sellerId == null || !voucherSeller.getId().equals(sellerId))) {
            throw new ResponseStatusException(BAD_REQUEST, "Voucher này chỉ áp dụng cho shop phát hành");
        }
    }

    private String normalizeCode(String code) {
        if (code == null || code.trim().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Mã voucher là bắt buộc");
        }
        return code.trim().toUpperCase();
    }

    private void validatePercentValue(VoucherUpsertRequest req) {
        if (req.type() == Voucher.Type.PERCENT && req.value() != null && req.value() > 100) {
            throw new ResponseStatusException(BAD_REQUEST, "Voucher phần trăm không được vượt quá 100%");
        }
    }

    private String formatMoney(double value) {
        return String.format("%,.0f đ", value);
    }

    // ── CRUD for admin/seller ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<VoucherResponse> listAll() {
        return voucherRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<VoucherResponse> listBySeller(Long sellerId) {
        return voucherRepository.findAllBySellerId(sellerId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public VoucherResponse create(VoucherUpsertRequest req, UserAccount creator) {
        validatePercentValue(req);
        String code = normalizeCode(req.code());
        if (voucherRepository.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(BAD_REQUEST, "Mã voucher '" + code + "' đã tồn tại");
        }
        boolean isAdmin = creator.getRole() == UserAccount.Role.ADMIN;
        Voucher voucher = Voucher.builder()
                .code(code)
                .type(req.type())
                .value(req.value())
                .minOrder(req.minOrder() != null ? req.minOrder() : 0.0)
                .expireAt(req.expireAt())
                .active(req.active() != null ? req.active() : Boolean.TRUE)
                .seller(isAdmin ? null : creator)
                .build();
        return toResponse(voucherRepository.save(voucher));
    }

    @Transactional
    public VoucherResponse update(Long id, VoucherUpsertRequest req, UserAccount actor) {
        validatePercentValue(req);
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Voucher không tồn tại"));
        checkOwnership(voucher, actor);
        String code = normalizeCode(req.code());
        if (!code.equalsIgnoreCase(voucher.getCode()) && voucherRepository.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(BAD_REQUEST, "Mã voucher '" + code + "' đã tồn tại");
        }
        voucher.setCode(code);
        voucher.setType(req.type());
        voucher.setValue(req.value());
        voucher.setMinOrder(req.minOrder() != null ? req.minOrder() : 0.0);
        voucher.setExpireAt(req.expireAt());
        if (req.active() != null) voucher.setActive(req.active());
        return toResponse(voucherRepository.save(voucher));
    }

    @Transactional
    public void delete(Long id, UserAccount actor) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Voucher không tồn tại"));
        checkOwnership(voucher, actor);
        voucherRepository.delete(voucher);
    }

    private void checkOwnership(Voucher voucher, UserAccount actor) {
        if (actor.getRole() == UserAccount.Role.ADMIN) return;
        if (voucher.getSeller() == null || !voucher.getSeller().getId().equals(actor.getId())) {
            throw new ResponseStatusException(FORBIDDEN, "Bạn không có quyền chỉnh sửa voucher này");
        }
    }

    private VoucherResponse toResponse(Voucher v) {
        String createdBy = v.getSeller() != null ? v.getSeller().getFullName() : "Admin";
        return new VoucherResponse(
                v.getId(), v.getCode(), v.getType().name().toLowerCase(),
                v.getValue(), v.getMinOrder(), v.getExpireAt(),
                v.getActive(), v.getCreatedAt(), createdBy
        );
    }
}
