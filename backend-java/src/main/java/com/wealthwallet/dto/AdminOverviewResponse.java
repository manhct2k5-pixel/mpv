package com.wealthwallet.dto;

public record AdminOverviewResponse(
        long totalUsers,
        long totalCustomers,
        long totalSellers,
        long totalAdmins,
        long totalStaff,
        long pendingBusinessRequests,
        long totalProducts,
        long activeProducts,
        long totalOrders,
        long openOrders,
        long unpaidOrders,
        long flaggedTransactions,
        double grossMerchandiseValue,
        double paidRevenue
) {
}
