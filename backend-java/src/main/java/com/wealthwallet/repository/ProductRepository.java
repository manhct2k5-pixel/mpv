package com.wealthwallet.repository;

import com.wealthwallet.domain.entity.Gender;
import com.wealthwallet.domain.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("""
        select distinct p from Product p
        left join p.variants v
        where p.active = true
          and (:categoryId is null or p.category.id = :categoryId)
          and (:gender is null or p.gender = :gender)
          and (:minPrice is null or coalesce(p.salePrice, p.basePrice) >= :minPrice)
          and (:maxPrice is null or coalesce(p.salePrice, p.basePrice) <= :maxPrice)
          and (:size is null or v.size = :size)
          and (:color is null or v.color = :color)
          and (:query is null
            or lower(p.name) like concat('%', :query, '%')
            or lower(p.slug) like concat('%', :query, '%')
            or lower(p.brand) like concat('%', :query, '%')
            or lower(p.category.name) like concat('%', :query, '%'))
        order by p.createdAt desc
        """)
    Page<Product> search(
            @Param("categoryId") Long categoryId,
            @Param("gender") Gender gender,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice,
            @Param("size") String size,
            @Param("color") String color,
            @Param("query") String query,
            Pageable pageable
    );

    List<Product> findTop8ByFeaturedTrueAndActiveTrueOrderByCreatedAtDesc();

    Optional<Product> findBySlugAndActiveTrue(String slug);

    boolean existsBySlug(String slug);

    List<Product> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    List<Product> findBySellerIdAndActiveTrueOrderByCreatedAtDesc(Long sellerId);

    long countBySellerId(Long sellerId);

    long countByActiveTrue();

    List<Product> findTop40ByActiveTrueOrderByFeaturedDescCreatedAtDesc();
}
