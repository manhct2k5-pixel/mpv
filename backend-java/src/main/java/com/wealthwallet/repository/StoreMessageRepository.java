package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.StoreMessage;
import com.wealthwallet.domain.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StoreMessageRepository extends JpaRepository<StoreMessage, Long> {

    @Query("""
        select m from StoreMessage m
        where (m.sender = :user and m.receiver = :other)
           or (m.sender = :other and m.receiver = :user)
        order by m.createdAt asc
        """)
    List<StoreMessage> findConversation(@Param("user") UserAccount user, @Param("other") UserAccount other);

    List<StoreMessage> findBySenderIdOrReceiverIdOrderByCreatedAtDesc(Long senderId, Long receiverId);
}
