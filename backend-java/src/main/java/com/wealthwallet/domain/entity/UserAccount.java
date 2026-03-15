package com.wealthwallet.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
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
@Table(name = "ww_users")
public class UserAccount {

    public enum Role {
        USER,
        SELLER,
        STYLES,
        WAREHOUSE,
        ADMIN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Role role = Role.USER;

    @Builder.Default
    private Boolean businessRequestPending = Boolean.FALSE;

    private LocalDateTime businessRequestedAt;

    private Double monthlyIncome;

    private Double monthlyExpenseTarget;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private String avatarUrl;

    private String storeName;

    @Column(columnDefinition = "TEXT")
    private String storeDescription;

    private String storePhone;

    private String storeAddress;

    private String storeLogoUrl;

    @Builder.Default
    private Boolean darkModeEnabled = Boolean.TRUE;

    @Builder.Default
    private Boolean emailNotificationEnabled = Boolean.TRUE;

    @Builder.Default
    private Boolean autoSyncEnabled = Boolean.FALSE;
}
