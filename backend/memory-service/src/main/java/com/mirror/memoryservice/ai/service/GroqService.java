package com.mirror.memoryservice.ai.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.http.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.annotation.PostConstruct;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.core.type.TypeReference;

@Service
public class GroqService {

    private static final Logger log = LoggerFactory.getLogger(GroqService.class);

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.url}")
    private String apiUrl;

    @Value("${groq.model.text}")
    private String textModel;

    @Value("${app.ai.temperature:0.7}")
    private double temperature;

    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final PromptService promptService;

    public GroqService(PromptService promptService, ObjectMapper objectMapper) {
        this.promptService = promptService;
        this.objectMapper = objectMapper
                .copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
            new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15_000);
        factory.setReadTimeout(30_000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    @PostConstruct
    public void validateConfig() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                "[GroqService] GROQ_API_KEY is not set. Please configure it as an environment variable.");
        }
        if (apiUrl == null || apiUrl.isBlank()) {
            throw new IllegalStateException(
                "[GroqService] GROQ_API_URL is not set. Please configure it as an environment variable.");
        }
        if (textModel == null || textModel.isBlank()) {
            throw new IllegalStateException(
                "[GroqService] GROQ_MODEL is not set. Please configure it as an environment variable.");
        }
        
    }

    public Map<String, String> generateReflectionAndEmotion(String prompt, String recentContext, String semanticContext) {
        if (prompt == null || prompt.isBlank()) {
            return Map.of(
                "reflection", "Please enter some text so I can reflect with you.",
                "emotion", "FEELINGS|NEUTRAL|#a855f7|#06b6d4"
            );
        }

        String userContent = buildUserContent(prompt, recentContext, semanticContext);
        String systemPrompt = buildSystemPrompt(recentContext, semanticContext);

        int maxRetries = 3;
        int attempt = 0;
        Exception lastException = null;

        while (attempt < maxRetries) {
            try {
                Map<String, String> result = callGroqApi(systemPrompt, userContent);
                
                return result;

            } catch (HttpClientErrorException e) {
                lastException = e;
                attempt++;
                int statusCode = e.getStatusCode().value();

                if (statusCode == 429) {
                    log.error("[GroqService] Rate limit hit (429). No further retries.");
                    throw new RuntimeException(
                        "RATE_LIMIT_EXCEEDED: Groq API rate limit reached. Please try again shortly.", e);
                }
                log.error("[GroqService] HTTP client error {} on attempt {}.", statusCode, attempt, e);
                break; 

            } catch (HttpServerErrorException e) {
                lastException = e;
                attempt++;
                int statusCode = e.getStatusCode().value();

                if ((statusCode == 502 || statusCode == 503) && attempt < maxRetries) {
                    log.warn("[GroqService] Groq overloaded ({}). Retrying attempt {}/{}...",
                        statusCode, attempt, maxRetries);
                    sleepWithBackoff(attempt);
                    continue;
                }
                log.error("[GroqService] HTTP server error {} on attempt {}.", statusCode, attempt, e);
                break;

            } catch (MissingKeysException e) {
                lastException = e;
                attempt++;
                log.warn("[GroqService] JSON missing required keys. Retrying attempt {}/{}...",
                    attempt, maxRetries);
                if (attempt < maxRetries) {
                    userContent += "\n\nERROR: Your previous response was missing required JSON fields. " +
                                   "You MUST include ALL of: reflection, emotion, pillar, primaryColor, secondaryColor — " +
                                   "none can be null or missing.";
                    continue;
                }
                break;

            } catch (Exception e) {
                lastException = e;
                attempt++;
                log.error("[GroqService] Unexpected error on attempt {}.", attempt, e);
                break;
            }
        }

        String failureMsg = lastException != null && lastException.getMessage() != null
                            ? lastException.getMessage()
                            : (lastException != null ? lastException.getClass().getSimpleName() : "Unknown Error");
        throw new RuntimeException("AI_SERVICE_ERROR: " + failureMsg, lastException);
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> callGroqApi(String systemPrompt, String userContent)
            throws Exception {

        String url = apiUrl + "/chat/completions";

        Map<String, Object> systemMessage = Map.of("role", "system", "content", systemPrompt);
        Map<String, Object> userMessage   = Map.of("role", "user",   "content", userContent);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", textModel);
        payload.put("messages", List.of(systemMessage, userMessage));
        payload.put("response_format", Map.of("type", "json_object"));
        payload.put("temperature", temperature);
        payload.put("max_tokens", 1024);

        ResponseEntity<Map> response = restClient.post()
                .uri(url)
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toEntity(Map.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Groq returned non-2xx or empty body: " + response.getStatusCode());
        }

        Map<String, Object> body = response.getBody();
        List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");

        if (choices == null || choices.isEmpty()) {
            throw new RuntimeException("Groq response missing 'choices' field.");
        }

        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        if (message == null) {
            throw new RuntimeException("Groq response missing 'message' in first choice.");
        }

        String jsonContent = (String) message.get("content");
        if (jsonContent == null || jsonContent.isBlank()) {
            throw new RuntimeException("Groq response has blank 'content' field.");
        }

        return parseAndValidate(jsonContent);
    }

    private Map<String, String> parseAndValidate(String jsonContent) throws Exception {
        Map<String, String> parsed = objectMapper.readValue(
            jsonContent, new TypeReference<Map<String, String>>() {});

        String reflection = parsed.get("reflection");
        String emotion    = parsed.get("emotion");

        if (reflection == null || reflection.isBlank() || emotion == null || emotion.isBlank()) {
            throw new MissingKeysException(
                "JSON has null/blank required fields. reflection=" + reflection + ", emotion=" + emotion);
        }

        String pillar        = nonBlankOrDefault(parsed.get("pillar"),         "FEELINGS");
        String rawEmotion    = nonBlankOrDefault(parsed.get("emotion"),         "NEUTRAL").replace("|", "-");
        String primaryColor  = nonBlankOrDefault(parsed.get("primaryColor"),    "#a855f7");
        String secondaryColor= nonBlankOrDefault(parsed.get("secondaryColor"),  "#06b6d4");

        parsed.put("emotion", pillar + "|" + rawEmotion + "|" + primaryColor + "|" + secondaryColor);
        return parsed;
    }

    private String buildUserContent(String prompt, String recentContext, String semanticContext) {
        return "--- RECENT CHAT HISTORY (Immediate Context) ---\n" +
               (recentContext != null && !recentContext.isBlank() ? recentContext : "No recent chat history.") + "\n\n" +
               "--- PAST RELEVANT MEMORIES (Long-term Context) ---\n" +
               (semanticContext != null && !semanticContext.isBlank() ? semanticContext : "No relevant past memories found.") + "\n\n" +
               "--- CURRENT USER PROMPT ---\n" +
               prompt + "\n\n" +
               "Respond ONLY with a valid JSON object containing exactly these keys: " +
               "reflection, emotion, pillar, primaryColor, secondaryColor.";
    }

    private String buildSystemPrompt(String recentContext, String semanticContext) {
        Map<String, Object> context = new HashMap<>();
        boolean hasPastMemories = semanticContext != null && !semanticContext.isBlank() && !semanticContext.equalsIgnoreCase("None");
        context.put("hasPastMemories", hasPastMemories);

        return promptService.renderSystemPrompt(context);
    }

    public String extractAndMergeFacts(String newMessage, String existingFacts) {
        if (newMessage == null || newMessage.isBlank()) return existingFacts;
        
        String systemPrompt = "You are a data extraction system. Your job is to extract absolute, hard facts about the user from their message (e.g., their name, job, relationships, core struggles, age). " +
                "Merge any new facts found with the existing facts. If no new facts are found, return the existing facts exactly as they were. " +
                "Output ONLY a raw, concise string of facts (e.g., 'User is a software engineer. User has a dog named Max.'). Do not use JSON or conversational text.";
                
        String userContent = "EXISTING FACTS:\n" + (existingFacts != null ? existingFacts : "None") + "\n\nNEW MESSAGE:\n" + newMessage;

        try {
            Map<String, Object> systemMessage = Map.of("role", "system", "content", systemPrompt);
            Map<String, Object> userMessage   = Map.of("role", "user",   "content", userContent);

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", textModel);
            payload.put("messages", List.of(systemMessage, userMessage));
            payload.put("temperature", 0.1); // Low temp for factual extraction
            payload.put("max_tokens", 512);

            String url = apiUrl + "/chat/completions";
            ResponseEntity<Map> response = restClient.post()
                    .uri(url)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toEntity(Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    if (message != null) {
                        return (String) message.get("content");
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to extract facts: {}", e.getMessage());
        }
        return existingFacts;
    }

    private String nonBlankOrDefault(String value, String defaultValue) {
        return (value != null && !value.isBlank()) ? value : defaultValue;
    }

    private void sleepWithBackoff(int attempt) {
        try {
            Thread.sleep(1500L * attempt);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private static class MissingKeysException extends Exception {
        MissingKeysException(String message) { super("MISSING_KEYS: " + message); }
    }
}
