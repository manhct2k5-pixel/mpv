package com.wealthwallet.dto;

public record SellerProfileUpdateRequest(
        String storeName,
        String storeDescription,
        String storePhone,
        String storeAddress,
        String storeLogoUrl,
        String sellerBankName,
        String sellerBankAccountName,
        String sellerBankAccountNumber,
        Boolean sellerOrderNotificationsEnabled,
        Boolean sellerMarketingNotificationsEnabled,
        Boolean sellerOperationAlertsEnabled
) {
}
