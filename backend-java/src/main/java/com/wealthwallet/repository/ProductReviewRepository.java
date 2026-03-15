package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.Product;
import com.wealthwallet.domain.entity.ProductReview;
import com.wealthwallet.domain.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {
    List<ProductReview> findByProductOrderByCreatedAtDesc(Product product);

    boolean existsByUserAndOrderItemId(UserAccount user, Long orderItemId);
}
