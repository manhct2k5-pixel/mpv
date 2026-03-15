package com.wealthwallet.service;

import com.wealthwallet.domain.entity.SystemSetting;
import com.wealthwallet.dto.AdminSystemConfigResponse;
import com.wealthwallet.dto.AdminSystemConfigUpdateRequest;
import com.wealthwallet.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
@RequiredArgsConstructor
public class AdminSystemConfigService {

    private static final String KEY_SUPPORT_EMAIL = "support.email";
    private static final String KEY_SUPPORT_PHONE = "support.phone";
    private static final String KEY_ORDER_AUTO_CANCEL_HOURS = "order.auto_cancel_hours";
    private static final String KEY_MAX_REFUND_DAYS = "order.max_refund_days";
    private static final String KEY_ALLOW_MANUAL_REFUND = "order.allow_manual_refund";
    private static final String KEY_MAINTENANCE_MODE = "system.maintenance_mode";

    private static final String DEFAULT_SUPPORT_EMAIL = "cskh@shopvui.local";
    private static final String DEFAULT_SUPPORT_PHONE = "1900 6868";
    private static final int DEFAULT_ORDER_AUTO_CANCEL_HOURS = 48;
    private static final int DEFAULT_MAX_REFUND_DAYS = 7;
    private static final boolean DEFAULT_ALLOW_MANUAL_REFUND = true;
    private static final boolean DEFAULT_MAINTENANCE_MODE = false;

    private final SystemSettingRepository systemSettingRepository;

    @Transactional(readOnly = true)
    public AdminSystemConfigResponse get() {
        return new AdminSystemConfigResponse(
                readString(KEY_SUPPORT_EMAIL, DEFAULT_SUPPORT_EMAIL),
                readString(KEY_SUPPORT_PHONE, DEFAULT_SUPPORT_PHONE),
                readInteger(KEY_ORDER_AUTO_CANCEL_HOURS, DEFAULT_ORDER_AUTO_CANCEL_HOURS),
                readInteger(KEY_MAX_REFUND_DAYS, DEFAULT_MAX_REFUND_DAYS),
                readBoolean(KEY_ALLOW_MANUAL_REFUND, DEFAULT_ALLOW_MANUAL_REFUND),
                readBoolean(KEY_MAINTENANCE_MODE, DEFAULT_MAINTENANCE_MODE)
        );
    }

    @Transactional
    public AdminSystemConfigResponse update(AdminSystemConfigUpdateRequest request) {
        if (request.supportEmail() != null) {
            upsert(KEY_SUPPORT_EMAIL, request.supportEmail().trim().toLowerCase());
        }
        if (request.supportPhone() != null) {
            upsert(KEY_SUPPORT_PHONE, request.supportPhone().trim());
        }
        if (request.orderAutoCancelHours() != null) {
            if (request.orderAutoCancelHours() < 1 || request.orderAutoCancelHours() > 720) {
                throw new ResponseStatusException(BAD_REQUEST, "Giờ tự hủy đơn phải từ 1 đến 720");
            }
            upsert(KEY_ORDER_AUTO_CANCEL_HOURS, String.valueOf(request.orderAutoCancelHours()));
        }
        if (request.maxRefundDays() != null) {
            if (request.maxRefundDays() < 1 || request.maxRefundDays() > 90) {
                throw new ResponseStatusException(BAD_REQUEST, "Số ngày hoàn tiền phải từ 1 đến 90");
            }
            upsert(KEY_MAX_REFUND_DAYS, String.valueOf(request.maxRefundDays()));
        }
        if (request.allowManualRefund() != null) {
            upsert(KEY_ALLOW_MANUAL_REFUND, String.valueOf(request.allowManualRefund()));
        }
        if (request.maintenanceMode() != null) {
            upsert(KEY_MAINTENANCE_MODE, String.valueOf(request.maintenanceMode()));
        }
        return get();
    }

    private void upsert(String key, String value) {
        String normalizedValue = value == null ? "" : value.trim();
        SystemSetting setting = systemSettingRepository.findById(key)
                .orElseGet(() -> SystemSetting.builder().key(key).build());
        setting.setValue(normalizedValue);
        setting.setUpdatedAt(LocalDateTime.now());
        systemSettingRepository.save(setting);
    }

    private String readString(String key, String defaultValue) {
        return systemSettingRepository.findById(key)
                .map(SystemSetting::getValue)
                .filter(value -> value != null && !value.isBlank())
                .orElse(defaultValue);
    }

    private Integer readInteger(String key, int defaultValue) {
        String raw = systemSettingRepository.findById(key)
                .map(SystemSetting::getValue)
                .orElse(null);
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException ex) {
            return defaultValue;
        }
    }

    private Boolean readBoolean(String key, boolean defaultValue) {
        String raw = systemSettingRepository.findById(key)
                .map(SystemSetting::getValue)
                .orElse(null);
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        return Boolean.parseBoolean(raw);
    }
}
