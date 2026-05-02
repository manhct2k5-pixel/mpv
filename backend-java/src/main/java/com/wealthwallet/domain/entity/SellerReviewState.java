package com.wealthwallet.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "ww_seller_review_states",
        uniqueConstraints = @UniqueConstraint(name = "uk_seller_review_state_review", columnNames = "review_id")
)
public class SellerReviewState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_id", nullable = false)
    private ProductReview review;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Builder.Default
    @Column(nullable = false)
    private Boolean replied = Boolean.FALSE;

    @Builder.Default
    @Column(nullable = false)
    private Boolean flagged = Boolean.FALSE;

    private Long updatedById;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
