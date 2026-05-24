package com.mirror.apigateway.telemetry;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import reactor.core.publisher.Flux;

import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class TelemetryService {

    @Autowired(required = false)
    private DiscoveryClient discoveryClient;

    @Autowired
    private RouteLocator routeLocator;

    private final ConcurrentLinkedDeque<LogEntry> logs = new ConcurrentLinkedDeque<>();
    private final Set<String> blockedIps = ConcurrentHashMap.newKeySet();
    private final Set<String> suspendedRoutes = ConcurrentHashMap.newKeySet();
    private final ConcurrentHashMap<String, Long> ipLastResetTime = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> ipRequestCounts = new ConcurrentHashMap<>();
    
    private int globalRateLimit = 120;
    private final AtomicLong totalRequestsToday = new AtomicLong(48512);
    private final AtomicInteger whitelistedCount = new AtomicInteger(4);

    public TelemetryService() {
        blockedIps.add("192.168.1.45");
        blockedIps.add("45.123.44.89");

        addLog("GET", "/api/auth/admin/users", 200, 18, "auth-service");
        addLog("GET", "/api/memory/feed", 200, 24, "memory-service");
        addLog("POST", "/api/auth/login", 200, 45, "auth-service");
    }

    public record LogEntry(String timestamp, String method, String path, int status, int latency, String service) {}
    public record ServiceHealth(String name, int port, String status, int latency, String color) {}
    public record RouteMap(String id, String path, String destination, String service, boolean active) {}
    public record BlockedIp(String ip, String reason, String blockedAt) {}
    public record TelemetryStats(long totalRequestsToday, int whitelistedCount, int globalRateLimit) {}

    public boolean isRateLimited(String ip) {
        long now = System.currentTimeMillis();
        ipLastResetTime.putIfAbsent(ip, now);
        if (now - ipLastResetTime.get(ip) > 60000) {
            ipLastResetTime.put(ip, now);
            ipRequestCounts.put(ip, 0);
        }
        int count = ipRequestCounts.merge(ip, 1, Integer::sum);
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
            String reason = ip.equals("192.168.1.45") ? "Excessive requests (brute force) on /api/auth/login" : "High frequency requests /api/memory/feed";
            list.add(new BlockedIp(ip, reason, timeStr));
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

    public List<ServiceHealth> getServicesHealth() {
        List<ServiceHealth> healthList = new ArrayList<>();

        healthList.add(probeServiceHealth("Auth Service", "auth-service-route", 8081));
        
        healthList.add(probeServiceHealth("Memory Service", "memory-service-route", 8082));



        return healthList;
    }

    private ServiceHealth probeServiceHealth(String displayName, String routeId, int fallbackPort) {
        String destinationUri = "http://localhost:" + fallbackPort;
        try {
            var routeOpt = routeLocator.getRoutes()
                    .filter(r -> r.getId().equals(routeId))
                    .blockFirst();
            if (routeOpt != null) {
                destinationUri = routeOpt.getUri().toString();
            }
        } catch (Exception e) {
        }

        String keepAlivePath = routeId.equals("auth-service-route") ? "/api/auth/keepalive" : "/api/memory/keepalive";

        String pingUrl = destinationUri;
        if (pingUrl.startsWith("lb://")) {
            String serviceId = pingUrl.substring(5);
            if (discoveryClient != null) {
                List<ServiceInstance> instances = discoveryClient.getInstances(serviceId);
                if (!instances.isEmpty()) {
                    ServiceInstance inst = instances.get(0);
                    long start = System.currentTimeMillis();
                    boolean ok = pingUrl(inst.getUri().toString() + keepAlivePath) || pingUrl(inst.getUri().toString());
                    int latency = (int) (System.currentTimeMillis() - start);
                    return new ServiceHealth(displayName, inst.getPort(), ok ? "ONLINE" : "OFFLINE", ok ? latency : 0, ok ? "success" : "danger");
                }
            }
            pingUrl = "http://localhost:" + fallbackPort;
        }

        long start = System.currentTimeMillis();
        boolean ok = pingUrl(pingUrl + keepAlivePath) || pingUrl(pingUrl);
        int latency = (int) (System.currentTimeMillis() - start);

        int port = fallbackPort;
        try {
            URI uri = new URI(pingUrl);
            if (uri.getPort() != -1) {
                port = uri.getPort();
            } else if (pingUrl.startsWith("https")) {
                port = 443;
            } else {
                port = 80;
            }
        } catch (Exception e) {
        }

        return new ServiceHealth(displayName, port, ok ? "ONLINE" : "OFFLINE", ok ? latency : 0, ok ? "success" : "danger");
    }

    private boolean pingUrl(String urlStr) {
        try {
            URL url = new URI(urlStr).toURL();
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(600);
            conn.setReadTimeout(600);
            int response = conn.getResponseCode();
            return response >= 200 && response < 400;
        } catch (Exception e) {
            return false;
        }
    }

    @Scheduled(fixedRate = 240000)
    public void executeKeepAlive() {
        try {
            getServicesHealth();
        } catch (Exception e) {
        }
    }
}
