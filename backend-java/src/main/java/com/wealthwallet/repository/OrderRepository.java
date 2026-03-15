package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.Order;
import com.wealthwallet.domain.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserOrderByCreatedAtDesc(UserAccount user);

    @Query("""
        select distinct o from Order o
        join o.items i
        where i.productId in :productIds
        order by o.createdAt desc
        """)
    List<Order> findByProductIds(@Param("productIds") List<Long> productIds);
}
