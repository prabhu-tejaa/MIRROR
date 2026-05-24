package com.mirror.apigateway.telemetry;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class TelemetryFilter implements GlobalFilter, Ordered {

    @Autowired
    private TelemetryService telemetryService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        if (path.startsWith("/api/gateway/admin")) {
            return chain.filter(exchange);
        }

        String ipAddress = request.getRemoteAddress() != null 
                ? request.getRemoteAddress().getAddress().getHostAddress() 
                : "127.0.0.1";

        if (telemetryService.getBlockedIpsSet().contains(ipAddress)) {
            ServerHttpResponse response = exchange.getResponse();
            response.setStatusCode(HttpStatus.FORBIDDEN);
            telemetryService.addLog(request.getMethod().name(), path, 403, 1, "api-gateway (blocked ip)");
            return response.setComplete();
        }

        Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
        if (route != null && telemetryService.getSuspendedRoutes().contains(route.getId())) {
            ServerHttpResponse response = exchange.getResponse();
            response.setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
            telemetryService.addLog(request.getMethod().name(), path, 503, 2, "api-gateway (suspended route)");
            return response.setComplete();
        }

        if (telemetryService.isRateLimited(ipAddress)) {
            ServerHttpResponse response = exchange.getResponse();
            response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            telemetryService.addLog(request.getMethod().name(), path, 429, 1, "api-gateway (rate limited)");
            return response.setComplete();
        }

        long startTime = System.currentTimeMillis();
        telemetryService.incrementRequestCount();

        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            long latency = System.currentTimeMillis() - startTime;
            ServerHttpResponse response = exchange.getResponse();
            int statusCode = response.getStatusCode() != null ? response.getStatusCode().value() : 200;

            Route activeRoute = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
            String serviceName = activeRoute != null 
                    ? activeRoute.getId().replace("-route", "") 
                    : "api-gateway";

            telemetryService.addLog(
                request.getMethod().name(),
                path,
                statusCode,
                (int) latency,
                serviceName
            );
        }));
    }

    @Override
    public int getOrder() {
        return -10;
    }
}
