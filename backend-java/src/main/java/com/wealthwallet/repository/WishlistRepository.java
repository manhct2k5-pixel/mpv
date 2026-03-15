package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.domain.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {
    List<WishlistItem> findByUserOrderByCreatedAtDesc(UserAccount user);
    Optional<WishlistItem> findByUserAndProduct(UserAccount user, Product product);
    void deleteByUserAndProduct(UserAccount user, Product product);
}
