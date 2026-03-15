package com.wealthwallet.service;

import com.wealthwallet.domain.entity.SellerRating;
import com.wealthwallet.domain.entity.UserAccount;
import com.wealthwallet.dto.SellerRatingRequest;
import com.wealthwallet.dto.StoreSellerResponse;
import com.wealthwallet.repository.SellerRatingRepository;
import com.wealthwallet.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class SellerRatingService {

    private final UserAccountRepository userAccountRepository;
    private final SellerRatingRepository sellerRatingRepository;

    @Transactional(readOnly = true)
    public List<StoreSellerResponse> listSellers(UserAccount currentUser) {
        List<UserAccount> sellers = userAccountRepository.findByRoleIn(
                List.of(UserAccount.Role.SELLER, UserAccount.Role.STYLES));
        if (sellers.isEmpty()) {
            return List.of();
        }
        List<Long> sellerIds = sellers.stream().map(UserAccount::getId).toList();

        Map<Long, SellerRatingRepository.SellerRatingAggregate> aggregates = sellerRatingRepository
                .summarizeBySellerIds(sellerIds)
                .stream()
                .collect(Collectors.toMap(
                        SellerRatingRepository.SellerRatingAggregate::getSellerId,
                        aggregate -> aggregate
                ));

        Map<Long, Integer> myRatings = sellerRatingRepository.findByUserAndSellerIdIn(currentUser, sellerIds)
                .stream()
                .collect(Collectors.toMap(rating -> rating.getSeller().getId(), SellerRating::getStars));

        return sellers.stream()
                .map(seller -> {
                    SellerRatingRepository.SellerRatingAggregate aggregate = aggregates.get(seller.getId());
                    Double average = aggregate != null ? aggregate.getAvgStars() : 0.0;
                    Long count = aggregate != null ? aggregate.getTotal() : 0L;
                    Integer myRating = myRatings.get(seller.getId());
                    return new StoreSellerResponse(
                            seller.getId(),
                            seller.getFullName(),
                            seller.getRole().name().toLowerCase(),
                            average,
                            count,
                            myRating
                    );
                })
                .toList();
    }

    @Transactional
    public StoreSellerResponse rateSeller(UserAccount currentUser, Long sellerId, SellerRatingRequest request) {
        UserAccount seller = userAccountRepository.findById(sellerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Seller not found"));
        if (!Set.of(UserAccount.Role.SELLER, UserAccount.Role.STYLES).contains(seller.getRole())) {
            throw new ResponseStatusException(BAD_REQUEST, "Chỉ đánh giá seller hoặc styles");
        }
        if (seller.getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Không thể tự đánh giá");
        }

        SellerRating rating = sellerRatingRepository.findByUserAndSeller(currentUser, seller)
                .orElseGet(() -> SellerRating.builder()
                        .user(currentUser)
                        .seller(seller)
                        .build());
        rating.setStars(request.stars());
        rating.setUpdatedAt(LocalDateTime.now());
        sellerRatingRepository.save(rating);

        List<StoreSellerResponse> sellers = listSellers(currentUser);
        return sellers.stream()
                .filter(item -> item.id().equals(sellerId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Seller not found"));
    }
}
