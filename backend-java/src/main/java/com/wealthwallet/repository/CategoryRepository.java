package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findBySlug(String slug);
    List<Category> findByActiveTrueOrderByNameAsc();
    List<Category> findAllByOrderByNameAsc();
}
