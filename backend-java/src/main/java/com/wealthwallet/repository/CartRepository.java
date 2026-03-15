package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.Cart;
import com.wealthwallet.domain.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {
    Optional<Cart> findByUser(UserAccount user);
}
