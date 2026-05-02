package com.wealthwallet.utils;

import org.springframework.web.server.ResponseStatusException;

import java.util.regex.Pattern;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

public final class PhoneUtils {

    private static final Pattern ALLOWED_PHONE_PATTERN = Pattern.compile("^[0-9\\s().+-]+$");
    private static final int MIN_PHONE_DIGITS = 9;
    private static final int MAX_PHONE_DIGITS = 15;

    private PhoneUtils() {
    }

    public static String normalizeRequiredPhone(String value, String requiredMessage, String invalidMessage) {
        String normalized = normalizeOptionalPhone(value, invalidMessage);
        if (normalized == null) {
            throw new ResponseStatusException(BAD_REQUEST, requiredMessage);
        }
        return normalized;
    }

    public static String normalizeOptionalPhone(String value, String invalidMessage) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (!ALLOWED_PHONE_PATTERN.matcher(trimmed).matches()) {
            throw new ResponseStatusException(BAD_REQUEST, invalidMessage);
        }
        String digitsOnly = trimmed.replaceAll("\\D", "");
        if (digitsOnly.length() < MIN_PHONE_DIGITS || digitsOnly.length() > MAX_PHONE_DIGITS) {
            throw new ResponseStatusException(BAD_REQUEST, invalidMessage);
        }
        return digitsOnly;
    }
}
