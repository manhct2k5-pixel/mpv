package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.StaffOrderWorkState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StaffOrderWorkStateRepository extends JpaRepository<StaffOrderWorkState, Long> {
    Optional<StaffOrderWorkState> findByOrderId(Long orderId);

    List<StaffOrderWorkState> findByOrderIdIn(Collection<Long> orderIds);
}
