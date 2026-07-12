package com.mirror.memoryservice.memory.model;

import jakarta.persistence.*;

@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(columnDefinition = "TEXT")
    private String coreFacts;

    public UserProfile() {}

    public UserProfile(String userId, String coreFacts) {
        this.userId = userId;
        this.coreFacts = coreFacts;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getCoreFacts() { return coreFacts; }
    public void setCoreFacts(String coreFacts) { this.coreFacts = coreFacts; }
}
