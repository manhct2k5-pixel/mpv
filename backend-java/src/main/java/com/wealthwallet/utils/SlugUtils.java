package com.wealthwallet.utils;

import java.text.Normalizer;

public final class SlugUtils {
    private SlugUtils() {
    }

    public static String toSlug(String input) {
        if (input == null) {
            return "";
        }
        String normalized = Normalizer.normalize(input.trim().toLowerCase(), Normalizer.Form.NFD);
        String slug = normalized.replaceAll("\\p{M}", "");
        slug = slug.replaceAll("[^a-z0-9]+", "-");
        slug = slug.replaceAll("(^-|-$)", "");
        return slug;
    }
}
