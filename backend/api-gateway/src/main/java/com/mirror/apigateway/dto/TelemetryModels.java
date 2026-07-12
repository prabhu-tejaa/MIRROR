package com.mirror.apigateway.dto;

public class TelemetryModels {
    public record LogEntry(String timestamp, String method, String path, int status, int latency, String service) {}
    public record ServiceHealth(String name, int port, String status, int latency, String color) {}
    public record RouteMap(String id, String path, String destination, String service, boolean active) {}
    public record BlockedIp(String ip, String reason, String blockedAt) {}
    public record TelemetryStats(long totalRequestsToday, int whitelistedCount, int globalRateLimit) {}
}
