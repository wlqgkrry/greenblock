package com.greenblock.backend.entity;

import com.greenblock.backend.domain.CalendarType;
import com.greenblock.backend.domain.Gender;
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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "birth_profiles")
public class BirthProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserAccount user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Gender gender;

    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    @Column(name = "birth_time", nullable = false)
    private LocalTime birthTime;

    @Column(name = "birth_place_name", nullable = false, length = 120)
    private String birthPlaceName;

    @Column(name = "birth_place_latitude", precision = 10, scale = 7)
    private BigDecimal birthPlaceLatitude;

    @Column(name = "birth_place_longitude", precision = 10, scale = 7)
    private BigDecimal birthPlaceLongitude;

    @Column(name = "birth_place_utc_offset", nullable = false)
    private Integer birthPlaceUtcOffset;

    @Enumerated(EnumType.STRING)
    @Column(name = "calendar_type", nullable = false, length = 16)
    private CalendarType calendarType;

    @Column(name = "timezone_name", nullable = false, length = 60)
    private String timezoneName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

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

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public LocalTime getBirthTime() {
        return birthTime;
    }

    public void setBirthTime(LocalTime birthTime) {
        this.birthTime = birthTime;
    }

    public String getBirthPlaceName() {
        return birthPlaceName;
    }

    public void setBirthPlaceName(String birthPlaceName) {
        this.birthPlaceName = birthPlaceName;
    }

    public BigDecimal getBirthPlaceLatitude() {
        return birthPlaceLatitude;
    }

    public void setBirthPlaceLatitude(BigDecimal birthPlaceLatitude) {
        this.birthPlaceLatitude = birthPlaceLatitude;
    }

    public BigDecimal getBirthPlaceLongitude() {
        return birthPlaceLongitude;
    }

    public void setBirthPlaceLongitude(BigDecimal birthPlaceLongitude) {
        this.birthPlaceLongitude = birthPlaceLongitude;
    }

    public Integer getBirthPlaceUtcOffset() {
        return birthPlaceUtcOffset;
    }

    public void setBirthPlaceUtcOffset(Integer birthPlaceUtcOffset) {
        this.birthPlaceUtcOffset = birthPlaceUtcOffset;
    }

    public CalendarType getCalendarType() {
        return calendarType;
    }

    public void setCalendarType(CalendarType calendarType) {
        this.calendarType = calendarType;
    }

    public String getTimezoneName() {
        return timezoneName;
    }

    public void setTimezoneName(String timezoneName) {
        this.timezoneName = timezoneName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
