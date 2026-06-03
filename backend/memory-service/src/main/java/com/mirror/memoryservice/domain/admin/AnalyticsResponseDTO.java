package com.mirror.memoryservice.domain.admin;

import java.io.Serializable;
import java.util.List;

public class AnalyticsResponseDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private long totalMemories;
    private String dominantEmotion;
    private int activeStreak;
    private List<EmotionStatDTO> emotionStats;
    private String auraGradient;

    public AnalyticsResponseDTO() {}

    public AnalyticsResponseDTO(long totalMemories, String dominantEmotion, int activeStreak, List<EmotionStatDTO> emotionStats, String auraGradient) {
        this.totalMemories = totalMemories;
        this.dominantEmotion = dominantEmotion;
        this.activeStreak = activeStreak;
        this.emotionStats = emotionStats;
        this.auraGradient = auraGradient;
    }

    public long getTotalMemories() { return totalMemories; }
    public void setTotalMemories(long totalMemories) { this.totalMemories = totalMemories; }
    public String getDominantEmotion() { return dominantEmotion; }
    public void setDominantEmotion(String dominantEmotion) { this.dominantEmotion = dominantEmotion; }
    public int getActiveStreak() { return activeStreak; }
    public void setActiveStreak(int activeStreak) { this.activeStreak = activeStreak; }
    public List<EmotionStatDTO> getEmotionStats() { return emotionStats; }
    public void setEmotionStats(List<EmotionStatDTO> emotionStats) { this.emotionStats = emotionStats; }
    public String getAuraGradient() { return auraGradient; }
    public void setAuraGradient(String auraGradient) { this.auraGradient = auraGradient; }
}
