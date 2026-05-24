package com.mirror.apigateway.telemetry;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gateway/public")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.OPTIONS})
public class PublicGatewayController {

    @Autowired
    private TelemetryService telemetryService;

    @GetMapping("/health")
    public ResponseEntity<List<TelemetryService.ServiceHealth>> getPublicHealth() {
        return ResponseEntity.ok(telemetryService.getServicesHealth());
    }
}
