package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select variant from ProductVariant variant where variant.id = :id")
    Optional<ProductVariant> findByIdForUpdate(@Param("id") Long id);

    List<ProductVariant> findByProductId(Long productId);
}
