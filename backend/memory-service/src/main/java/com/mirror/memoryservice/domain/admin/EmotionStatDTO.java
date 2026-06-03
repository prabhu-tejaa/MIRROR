package com.mirror.memoryservice.domain.admin;

import java.io.Serializable;

public class EmotionStatDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String key;
    private String pillar;
    private String name;
    private String primaryColor;
    private String secondaryColor;
    private long count;
    private int percentage;

    public EmotionStatDTO() {}

    public EmotionStatDTO(String key, String pillar, String name, String primaryColor, String secondaryColor, long count, int percentage) {
        this.key = key;
        this.pillar = pillar;
        this.name = name;
        this.primaryColor = primaryColor;
        this.secondaryColor = secondaryColor;
        this.count = count;
        this.percentage = percentage;
    }

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getPillar() { return pillar; }
    public void setPillar(String pillar) { this.pillar = pillar; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPrimaryColor() { return primaryColor; }
    public void setPrimaryColor(String primaryColor) { this.primaryColor = primaryColor; }
    public String getSecondaryColor() { return secondaryColor; }
    public void setSecondaryColor(String secondaryColor) { this.secondaryColor = secondaryColor; }
    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
    public int getPercentage() { return percentage; }
    public void setPercentage(int percentage) { this.percentage = percentage; }
}
