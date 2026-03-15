package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.Lookbook;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LookbookRepository extends JpaRepository<Lookbook, Long> {
    List<Lookbook> findByActiveTrueOrderByCreatedAtDesc();

    Optional<Lookbook> findByIdAndActiveTrue(Long id);
}
