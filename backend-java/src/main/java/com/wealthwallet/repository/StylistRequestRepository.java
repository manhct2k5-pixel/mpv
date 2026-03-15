package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.StylistRequest;
import com.wealthwallet.domain.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StylistRequestRepository extends JpaRepository<StylistRequest, Long> {
    List<StylistRequest> findByRequesterOrderByCreatedAtDesc(UserAccount requester);

    List<StylistRequest> findByStylistOrderByCreatedAtDesc(UserAccount stylist);
}
