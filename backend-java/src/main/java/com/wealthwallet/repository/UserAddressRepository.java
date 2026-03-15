package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAddressRepository extends JpaRepository<UserAddress, Long> {
    List<UserAddress> findByUserOrderByIsDefaultDescCreatedAtDesc(UserAccount user);

    Optional<UserAddress> findByIdAndUser(Long id, UserAccount user);

    long countByUser(UserAccount user);
}
