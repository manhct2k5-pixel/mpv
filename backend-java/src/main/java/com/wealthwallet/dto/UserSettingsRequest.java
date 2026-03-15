package com.wealthwallet.dto;

public record UserSettingsRequest(
        String fullName,
        Double monthlyIncome,
        Double monthlyExpenseTarget,
        String avatarUrl,
        Boolean darkModeEnabled,
        Boolean emailNotificationEnabled,
        Boolean autoSyncEnabled
) {
}
