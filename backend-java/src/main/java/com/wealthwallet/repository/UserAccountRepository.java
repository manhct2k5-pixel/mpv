package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByEmail(String email);

    List<UserAccount> findByBusinessRequestPendingTrueOrderByBusinessRequestedAtDesc();

    List<UserAccount> findByRoleIn(List<UserAccount.Role> roles);

    List<UserAccount> findAllByOrderByCreatedAtDesc();

    long countByRole(UserAccount.Role role);

    long countByBusinessRequestPendingTrue();
}
