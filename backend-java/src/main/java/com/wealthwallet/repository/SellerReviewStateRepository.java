package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.SellerReviewState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SellerReviewStateRepository extends JpaRepository<SellerReviewState, Long> {
    Optional<SellerReviewState> findByReviewId(Long reviewId);

    List<SellerReviewState> findByReviewIdIn(Collection<Long> reviewIds);
}
