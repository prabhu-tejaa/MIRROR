package com.mirror.apigateway.telemetry;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gateway/admin")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class AdminGatewayController {

    @Autowired
    private TelemetryService telemetryService;

    @Autowired
    private RouteLocator routeLocator;

    public record ToggleRouteRequest(String id, boolean active) {}
    public record BlockIpRequest(String ip, String reason) {}
    public record UpdateRateLimitRequest(int limit) {}

    @GetMapping("/health")
    public ResponseEntity<List<TelemetryService.ServiceHealth>> getHealth() {
        return ResponseEntity.ok(telemetryService.getServicesHealth());
    }

    @GetMapping("/routes")
    public Mono<ResponseEntity<List<TelemetryService.RouteMap>>> getRoutes() {
        return routeLocator.getRoutes()
                .map(route -> {
                    String path;
                    if (route.getId().equals("auth-service-route")) {
                        path = "/api/auth/**";
                    } else if (route.getId().equals("memory-service-route")) {
                        path = "/api/memory/**";
                    } else {
                        path = "/api/" + route.getId().replace("-route", "") + "/**";
                    }
                    boolean active = !telemetryService.getSuspendedRoutes().contains(route.getId());
                    return new TelemetryService.RouteMap(
                        route.getId(),
                        path,
                        route.getUri().toString(),
                        route.getId().replace("-route", ""),
                        active
                    );
                })
                .collectList()
                .map(ResponseEntity::ok);
    }

    @PostMapping("/routes/toggle")
    public ResponseEntity<Map<String, String>> toggleRoute(@RequestBody ToggleRouteRequest request) {
        telemetryService.toggleRoute(request.id(), request.active());
        return ResponseEntity.ok(Map.of(
            "status", "success", 
            "message", "Route " + request.id() + " active status updated to " + request.active()
        ));
    }

    @GetMapping("/blocked-ips")
    public ResponseEntity<List<TelemetryService.BlockedIp>> getBlockedIps() {
        return ResponseEntity.ok(telemetryService.getBlockedIps());
    }

    @PostMapping("/blocked-ips")
    public ResponseEntity<Map<String, String>> blockIp(@RequestBody BlockIpRequest request) {
        telemetryService.blockIp(request.ip());
        return ResponseEntity.ok(Map.of("status", "success", "message", "IP address " + request.ip() + " blocked"));
    }

    @DeleteMapping("/blocked-ips/{ip}")
    public ResponseEntity<Map<String, String>> unblockIp(@PathVariable String ip) {
        telemetryService.unblockIp(ip);
        return ResponseEntity.ok(Map.of("status", "success", "message", "IP address " + ip + " whitelisted"));
    }

    @GetMapping("/rate-limit")
    public ResponseEntity<Map<String, Integer>> getRateLimit() {
        return ResponseEntity.ok(Map.of("limit", telemetryService.getGlobalRateLimit()));
    }

    @PostMapping("/rate-limit")
    public ResponseEntity<Map<String, String>> updateRateLimit(@RequestBody UpdateRateLimitRequest request) {
        telemetryService.setGlobalRateLimit(request.limit());
        return ResponseEntity.ok(Map.of("status", "success", "message", "Rate limit updated to " + request.limit() + " r/m"));
    }

    @GetMapping("/logs")
    public ResponseEntity<List<TelemetryService.LogEntry>> getLogs() {
        return ResponseEntity.ok(telemetryService.getLogs());
    }

    @GetMapping("/stats")
    public ResponseEntity<TelemetryService.TelemetryStats> getStats() {
        return ResponseEntity.ok(telemetryService.getStats());
    }
}
