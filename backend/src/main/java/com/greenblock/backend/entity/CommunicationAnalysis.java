package com.greenblock.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "communication_analyses")
public class CommunicationAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_user_id", nullable = false)
    private UserAccount subjectUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewer_user_id")
    private UserAccount viewerUser;

    @Column(nullable = false, length = 80)
    private String archetype;

    @Column(name = "personality_summary", nullable = false, columnDefinition = "TEXT")
    private String personalitySummary;

    @Column(name = "work_style_summary", nullable = false, columnDefinition = "TEXT")
    private String workStyleSummary;

    @Column(name = "message_guide", nullable = false, columnDefinition = "TEXT")
    private String messageGuide;

    @Column(name = "recommendation_json", nullable = false, columnDefinition = "json")
    private String recommendationJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UserAccount getSubjectUser() {
        return subjectUser;
    }

    public void setSubjectUser(UserAccount subjectUser) {
        this.subjectUser = subjectUser;
    }

    public UserAccount getViewerUser() {
        return viewerUser;
    }

    public void setViewerUser(UserAccount viewerUser) {
        this.viewerUser = viewerUser;
    }

    public String getArchetype() {
        return archetype;
    }

    public void setArchetype(String archetype) {
        this.archetype = archetype;
    }

    public String getPersonalitySummary() {
        return personalitySummary;
    }

    public void setPersonalitySummary(String personalitySummary) {
        this.personalitySummary = personalitySummary;
    }

    public String getWorkStyleSummary() {
        return workStyleSummary;
    }

    public void setWorkStyleSummary(String workStyleSummary) {
        this.workStyleSummary = workStyleSummary;
    }

    public String getMessageGuide() {
        return messageGuide;
    }

    public void setMessageGuide(String messageGuide) {
        this.messageGuide = messageGuide;
    }

    public String getRecommendationJson() {
        return recommendationJson;
    }

    public void setRecommendationJson(String recommendationJson) {
        this.recommendationJson = recommendationJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
