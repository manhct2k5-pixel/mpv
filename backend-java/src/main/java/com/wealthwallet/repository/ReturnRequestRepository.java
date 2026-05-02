package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.ReturnRequest;
import com.wealthwallet.domain.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {

    boolean existsByRequestCode(String requestCode);

    boolean existsByOrder(Order order);

    List<ReturnRequest> findByCreatedByOrderByCreatedAtDesc(UserAccount createdBy);

    @Query("""
        select distinct rr from ReturnRequest rr
        join rr.order o
        join o.items i
        where i.productId in :productIds
        order by rr.createdAt desc
        """)
    List<ReturnRequest> findBySellerProductIds(@Param("productIds") List<Long> productIds);
}
