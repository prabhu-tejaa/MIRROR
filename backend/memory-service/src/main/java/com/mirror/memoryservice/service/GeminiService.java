package com.mirror.memoryservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    @Value("${gemini.generation.temperature:0.7}")
    private double temperature;

    private final RestClient restClient;
    private final PromptService promptService;

    public GeminiService(PromptService promptService) {
        this.promptService = promptService;
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

    /**
     * Generates context-aware reflections and emotional tags by feeding the prompt and past similar memories into Gemini.
     * Automatically requests structured JSON response mapping.
     */
    public Map<String, String> generateReflectionAndEmotion(String prompt, String pastContext) {
        if (prompt == null || prompt.trim().isEmpty()) {
            Map<String, String> result = new HashMap<>();
            result.put("reflection", "Please enter some text so I can reflect with you.");
            result.put("emotion", "NEUTRAL");
            return result;
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable.");
        }

        try {
            String url = apiUrl + "/models/gemini-2.5-flash:generateContent?key=" + apiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Construct content prompt
            String fullPromptText = "USER PROMPT: " + prompt + "\n\n" +
                                   "PAST RELEVANT MEMORIES CONTEXT:\n" + (pastContext != null ? pastContext : "None") + "\n\n" +
                                   "Please analyze the prompt and past context, generate an empathetic reflection, and tag the user's emotion.";

            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", fullPromptText);

            Map<String, Object> contentsNode = new HashMap<>();
            contentsNode.put("parts", Collections.singletonList(textPart));

            // Set JSON response config
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            generationConfig.put("temperature", temperature);

            // System Instruction
            Map<String, Object> systemPart = new HashMap<>();
            String finalSystemPrompt = promptService.getSystemPrompt();
            systemPart.put("text", finalSystemPrompt);

            Map<String, Object> systemInstruction = new HashMap<>();
            systemInstruction.put("parts", Collections.singletonList(systemPart));

            Map<String, Object> payload = new HashMap<>();
            payload.put("contents", Collections.singletonList(contentsNode));
            payload.put("generationConfig", generationConfig);
            payload.put("systemInstruction", systemInstruction);

            ResponseEntity<Map> response = restClient.post()
                    .uri(url)
                    .headers(h -> h.addAll(headers))
                    .body(payload)
                    .retrieve()
                    .toEntity(Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> firstCandidate = candidates.get(0);
                    Map<String, Object> contentNode = (Map<String, Object>) firstCandidate.get("content");
                    if (contentNode != null) {
                        List<Map<String, Object>> parts = (List<Map<String, Object>>) contentNode.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            String jsonResponseText = (String) parts.get(0).get("text");
                            if (jsonResponseText != null) {
                                String cleanedJson = sanitizeJsonText(jsonResponseText);
                                Map<String, String> parsed = parseJsonFields(cleanedJson);
                                String rawEmotionText = parsed.getOrDefault("emotion", "NEUTRAL");
                                String primaryColor = parsed.getOrDefault("primaryColor", "#a855f7");
                                String secondaryColor = parsed.getOrDefault("secondaryColor", "#06b6d4");
                                // Encode colors into the emotion field dynamically
                                parsed.put("emotion", rawEmotionText + "|" + primaryColor + "|" + secondaryColor);
                                return parsed;
                            }
                        }
                    }
                }
            }
            throw new RuntimeException("Gemini Reflection response was invalid or missing expected payload fields.");
        } catch (Exception e) {
            log.error("Failed to query Gemini Reflection API.", e);
            // Graceful fallback response instead of standard 500 crash
            Map<String, String> fallback = new HashMap<>();
            fallback.put("reflection", "I am having a brief moment of quiet thought. Let's reset and share your next reflection when you are ready.");
            fallback.put("emotion", "Calm Vibe|#a855f7|#06b6d4");
            return fallback;
        }
    }

    /**
     * Sanitizes Markdown code block wrappers from AI responses
     */
    private String sanitizeJsonText(String text) {
        if (text == null) {
            return "{}";
        }
        String cleaned = text.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```(?:json)?", "");
            cleaned = cleaned.replaceAll("```$", "");
        }
        return cleaned.trim();
    }

    /**
     * Robust Jackson JSON parser
     */
    private Map<String, String> parseJsonFields(String json) {
        ObjectMapper mapper = new ObjectMapper()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        try {
            return mapper.readValue(json, new TypeReference<Map<String, String>>(){});
        } catch (Exception parseEx) {
            log.warn("Jackson JSON parsing failed. Returning default values. Input length: {}", json != null ? json.length() : 0);
            Map<String, String> result = new HashMap<>();
            result.put("reflection", "I am taking a moment to process your reflection.");
            result.put("emotion", "NEUTRAL");
            return result;
        }
    }
}
