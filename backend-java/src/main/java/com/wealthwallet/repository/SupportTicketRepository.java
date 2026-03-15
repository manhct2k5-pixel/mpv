package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.SupportTicket;
import com.wealthwallet.domain.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {

    boolean existsByTicketCode(String ticketCode);

    List<SupportTicket> findByCreatedByOrderByCreatedAtDesc(UserAccount createdBy);

    List<SupportTicket> findByAssigneeOrderByCreatedAtDesc(UserAccount assignee);

    @Query("""
        select distinct st from SupportTicket st
        left join st.order o
        left join o.items i
        where i.productId in :productIds
        order by st.createdAt desc
        """)
    List<SupportTicket> findBySellerProductIds(@Param("productIds") List<Long> productIds);
}
