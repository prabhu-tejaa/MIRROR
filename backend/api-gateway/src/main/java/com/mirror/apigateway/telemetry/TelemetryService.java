package com.mirror.apigateway.telemetry;

import com.mirror.apigateway.dto.TelemetryModels.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class TelemetryService {

    @Autowired
    private RouteLocator routeLocator;

    private final WebClient webClient = WebClient.builder().build();

    private final ConcurrentLinkedDeque<LogEntry> logs = new ConcurrentLinkedDeque<>();
    private final Set<String> blockedIps = ConcurrentHashMap.newKeySet();
    private final Set<String> suspendedRoutes = ConcurrentHashMap.newKeySet();
    private final ConcurrentHashMap<String, Long> ipLastResetTime = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> ipRequestCounts = new ConcurrentHashMap<>();
    
    private int globalRateLimit = 120;
    private final AtomicLong totalRequestsToday = new AtomicLong(0);
    private final AtomicInteger whitelistedCount = new AtomicInteger(0);

    public TelemetryService() {
    }

    public boolean isRateLimited(String ip) {
        long now = System.currentTimeMillis();
        
        int count = ipRequestCounts.compute(ip, (key, currentCount) -> {
            Long lastReset = ipLastResetTime.get(ip);
            if (lastReset == null || now - lastReset > 60000) {
                ipLastResetTime.put(ip, now);
                return 1;
            }
            return (currentCount == null) ? 1 : currentCount + 1;
        });

        return count > globalRateLimit;
    }

    public void incrementRequestCount() {
        totalRequestsToday.incrementAndGet();
    }

    public Set<String> getBlockedIpsSet() {
        return blockedIps;
    }

    public List<BlockedIp> getBlockedIps() {
        List<BlockedIp> list = new ArrayList<>();
        String timeStr = LocalDateTime.now().minusHours(1).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        for (String ip : blockedIps) {
            list.add(new BlockedIp(ip, "High frequency requests / Admin block", timeStr));
        }
        return list;
    }

    public void blockIp(String ip) {
        blockedIps.add(ip);
    }

    public void unblockIp(String ip) {
        if (blockedIps.remove(ip)) {
            whitelistedCount.incrementAndGet();
        }
    }

    public Set<String> getSuspendedRoutes() {
        return suspendedRoutes;
    }

    public void toggleRoute(String routeId, boolean active) {
        if (active) {
            suspendedRoutes.remove(routeId);
        } else {
            suspendedRoutes.add(routeId);
        }
    }

    public int getGlobalRateLimit() {
        return globalRateLimit;
    }

    public void setGlobalRateLimit(int limit) {
        this.globalRateLimit = limit;
    }

    public List<LogEntry> getLogs() {
        return new ArrayList<>(logs);
    }

    public void addLog(String method, String path, int status, int latency, String service) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        logs.addFirst(new LogEntry(timestamp, method, path, status, latency, service));
        if (logs.size() > 50) {
            logs.removeLast();
        }
    }

    public TelemetryStats getStats() {
        return new TelemetryStats(totalRequestsToday.get(), whitelistedCount.get(), globalRateLimit);
    }

    public Mono<List<ServiceHealth>> getServicesHealth() {
        Mono<ServiceHealth> authHealth = probeServiceHealth("Auth Service", "auth-service-route", 8080);
        Mono<ServiceHealth> memoryHealth = probeServiceHealth("Memory Service", "memory-service-route", 8081);

        return Mono.zip(authHealth, memoryHealth)
                .map(tuple -> Arrays.asList(tuple.getT1(), tuple.getT2()));
    }

    private Mono<ServiceHealth> probeServiceHealth(String displayName, String routeId, int fallbackPort) {
        String destinationUri = "http://localhost:" + fallbackPort;
        String keepAlivePath = routeId.equals("auth-service-route") ? "/api/auth/keepalive" : "/api/memory/keepalive";
        String pingUrl = destinationUri + keepAlivePath;

        long start = System.currentTimeMillis();
        return webClient.get()
                .uri(pingUrl)
                .exchangeToMono(response -> Mono.just(response.statusCode().is2xxSuccessful()))
                .onErrorReturn(false)
                .map(ok -> {
                    int latency = (int) (System.currentTimeMillis() - start);
                    return new ServiceHealth(displayName, fallbackPort, ok ? "ONLINE" : "OFFLINE", ok ? latency : 0, ok ? "success" : "danger");
                });
    }

    @Scheduled(fixedRate = 240000)
    public void executeKeepAlive() {
        getServicesHealth().subscribe();
    }
}
