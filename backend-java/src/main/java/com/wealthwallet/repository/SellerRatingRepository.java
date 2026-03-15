package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.SellerRating;
import com.wealthwallet.domain.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SellerRatingRepository extends JpaRepository<SellerRating, Long> {
    Optional<SellerRating> findByUserAndSeller(UserAccount user, UserAccount seller);
    List<SellerRating> findByUserAndSellerIdIn(UserAccount user, List<Long> sellerIds);

    @Query("""
        select sr.seller.id as sellerId, avg(sr.stars) as avgStars, count(sr) as total
        from SellerRating sr
        where sr.seller.id in :sellerIds
        group by sr.seller.id
        """)
    List<SellerRatingAggregate> summarizeBySellerIds(@Param("sellerIds") List<Long> sellerIds);

    interface SellerRatingAggregate {
        Long getSellerId();
        Double getAvgStars();
        Long getTotal();
    }
}
