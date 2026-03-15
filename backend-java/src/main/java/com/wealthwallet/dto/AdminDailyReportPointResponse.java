package com.wealthwallet.dto;

public record AdminDailyReportPointResponse(
        String date,
        long totalOrders,
        long paidOrders,
        long refundedOrders,
        double grossMerchandiseValue,
        double paidRevenue
) {
}
