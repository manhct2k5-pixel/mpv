package com.wealthwallet.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
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
@Table(name = "ww_staff_order_work_states")
public class StaffOrderWorkState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    private String assigneeName;

    @Builder.Default
    private Boolean postponed = false;

    @Column(columnDefinition = "TEXT")
    private String internalNote;

    @Builder.Default
    private Boolean qcCheckQuantity = false;

    @Builder.Default
    private Boolean qcCheckModel = false;

    @Builder.Default
    private Boolean qcCheckVisual = false;

    @Builder.Default
    private Boolean qcCheckAccessories = false;

    @Column(columnDefinition = "TEXT")
    private String qcIssueNote;

    @Builder.Default
    private String packageType = "Hộp carton tiêu chuẩn";

    private String packageWeight;

    private String packageDimensions;

    @Column(columnDefinition = "TEXT")
    private String packageNote;

    @Builder.Default
    private String qcStatus = "pending";

    @Builder.Default
    private String shippingCarrier = "GHN";

    @Builder.Default
    private String shippingService = "Giao tiêu chuẩn";

    @Builder.Default
    private String shippingFee = "32000";

    @Builder.Default
    private String shippingEta = "2-3 ngày";

    private String waybillCode;

    private LocalDateTime waybillCreatedAt;

    @Builder.Default
    private Boolean waybillConnected = false;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String timelineLogsJson;

    private String updatedBy;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
