package com.mirror.apigateway.telemetry;

import com.mirror.apigateway.dto.TelemetryModels.ServiceHealth;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gateway/public")
public class PublicGatewayController {

    @Autowired
    private TelemetryService telemetryService;

    @GetMapping("/health")
    public reactor.core.publisher.Mono<ResponseEntity<List<ServiceHealth>>> getPublicHealth() {
        return telemetryService.getServicesHealth().map(ResponseEntity::ok);
    }
}
