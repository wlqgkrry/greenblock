package com.greenblock.backend.entity;

import com.greenblock.backend.domain.MansaeSourceStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "mansae_profiles")
public class MansaeProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserAccount user;

    @Column(name = "source_provider", nullable = false, length = 80)
    private String sourceProvider;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_status", nullable = false, length = 40)
    private MansaeSourceStatus sourceStatus;

    @Column(name = "year_pillar", length = 40)
    private String yearPillar;

    @Column(name = "month_pillar", length = 40)
    private String monthPillar;

    @Column(name = "day_pillar", length = 40)
    private String dayPillar;

    @Column(name = "hour_pillar", length = 40)
    private String hourPillar;

    @Column(name = "raw_payload_json", columnDefinition = "json")
    private String rawPayloadJson;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UserAccount getUser() {
        return user;
    }

    public void setUser(UserAccount user) {
        this.user = user;
    }

    public String getSourceProvider() {
        return sourceProvider;
    }

    public void setSourceProvider(String sourceProvider) {
        this.sourceProvider = sourceProvider;
    }

    public MansaeSourceStatus getSourceStatus() {
        return sourceStatus;
    }

    public void setSourceStatus(MansaeSourceStatus sourceStatus) {
        this.sourceStatus = sourceStatus;
    }

    public String getYearPillar() {
        return yearPillar;
    }

    public void setYearPillar(String yearPillar) {
        this.yearPillar = yearPillar;
    }

    public String getMonthPillar() {
        return monthPillar;
    }

    public void setMonthPillar(String monthPillar) {
        this.monthPillar = monthPillar;
    }

    public String getDayPillar() {
        return dayPillar;
    }

    public void setDayPillar(String dayPillar) {
        this.dayPillar = dayPillar;
    }

    public String getHourPillar() {
        return hourPillar;
    }

    public void setHourPillar(String hourPillar) {
        this.hourPillar = hourPillar;
    }

    public String getRawPayloadJson() {
        return rawPayloadJson;
    }

    public void setRawPayloadJson(String rawPayloadJson) {
        this.rawPayloadJson = rawPayloadJson;
    }

    public LocalDateTime getCalculatedAt() {
        return calculatedAt;
    }

    public void setCalculatedAt(LocalDateTime calculatedAt) {
        this.calculatedAt = calculatedAt;
    }
}
