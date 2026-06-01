package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    Optional<Voucher> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
    List<Voucher> findAllBySellerId(Long sellerId);
    List<Voucher> findAllBySellerIsNull();
}
