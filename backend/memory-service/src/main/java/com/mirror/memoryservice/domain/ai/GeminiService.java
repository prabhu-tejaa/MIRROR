package com.mirror.memoryservice.domain.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final RestClient restClient;

    public GeminiService() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000); // 10 seconds
        factory.setReadTimeout(15000); // 15 seconds
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    /**
     * Converts a text string into a 768-dimensional float embedding vector.
     * Throws an exception if the API Key is missing or the request fails.
     */
    @org.springframework.cache.annotation.Cacheable(value = "embeddings", key = "#text")
    public float[] getEmbedding(String text) {
        if (text == null) {
            text = "";
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable.");
        }

        try {
            String url = apiUrl + "/models/gemini-embedding-001:embedContent?key=" + apiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Construct payload
            Map<String, Object> parts = new HashMap<>();
            parts.put("text", text);

            Map<String, Object> content = new HashMap<>();
            content.put("parts", Collections.singletonList(parts));

            Map<String, Object> payload = new HashMap<>();
            payload.put("model", "models/gemini-embedding-001");
            payload.put("content", content);
            payload.put("outputDimensionality", 768);

            ResponseEntity<Map> response = restClient.post()
                    .uri(url)
                    .headers(h -> h.addAll(headers))
                    .body(payload)
                    .retrieve()
                    .toEntity(Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                log.info("Gemini Embedding response body keys: {}", body != null ? body.keySet() : "null");
                Map<String, Object> embeddingNode = (Map<String, Object>) body.get("embedding");
                if (embeddingNode != null) {
                    List<Number> valuesList = (List<Number>) embeddingNode.get("values");
                    if (valuesList != null) {
                        log.info("Gemini Embedding values size received: {}", valuesList.size());
                        if (valuesList.size() >= 768) {
                            float[] vector = new float[768];
                            for (int i = 0; i < 768; i++) {
                                vector[i] = valuesList.get(i).floatValue();
                            }
                            if (valuesList.size() > 768) {
                                log.info("Successfully applied Matryoshka dimension truncation from {} to 768.", valuesList.size());
                            }
                            return vector;
                        } else {
                            log.warn("Warning: Received embedding size is {}, but expected at least 768.", valuesList.size());
                        }
                    }
                }
            }
            throw new RuntimeException("Gemini Embeddings response was invalid or missing expected payload fields.");
        } catch (Exception e) {
            log.error("Failed to query Gemini Embeddings API.", e);
            throw new RuntimeException("Failed to query Gemini Embeddings API: " + e.getMessage(), e);
        }
    }
}
