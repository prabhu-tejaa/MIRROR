package com.mirror.memoryservice.domain.ai;

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

/**
 * GroqService handles AI text generation (reflections + emotion tagging)
 * using Groq's OpenAI-compatible API.
 * Embeddings continue to use GeminiService (unchanged).
 */
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
        log.info("[GroqService] Initialized. Model: {}, URL: {}", textModel, apiUrl);
    }

    public Map<String, String> generateReflectionAndEmotion(String prompt, String pastContext) {
        if (prompt == null || prompt.isBlank()) {
            return Map.of(
                "reflection", "Please enter some text so I can reflect with you.",
                "emotion", "FEELINGS|NEUTRAL|#a855f7|#06b6d4"
            );
        }

        String userContent = buildUserContent(prompt, pastContext);
        String systemPrompt = buildSystemPrompt(pastContext);

        int maxRetries = 3;
        int attempt = 0;
        Exception lastException = null;

        while (attempt < maxRetries) {
            try {
                Map<String, String> result = callGroqApi(systemPrompt, userContent);
                log.info("[GroqService] Reflection generated successfully on attempt {}.", attempt + 1);
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
        String rawEmotion    = nonBlankOrDefault(parsed.get("emotion"),         "NEUTRAL");
        String primaryColor  = nonBlankOrDefault(parsed.get("primaryColor"),    "#a855f7");
        String secondaryColor= nonBlankOrDefault(parsed.get("secondaryColor"),  "#06b6d4");

        parsed.put("emotion", pillar + "|" + rawEmotion + "|" + primaryColor + "|" + secondaryColor);
        return parsed;
    }

    private String buildUserContent(String prompt, String pastContext) {
        return "USER PROMPT: " + prompt + "\n\n" +
               "PAST RELEVANT MEMORIES CONTEXT:\n" +
               (pastContext != null && !pastContext.isBlank() ? pastContext : "None") + "\n\n" +
               "Respond ONLY with a valid JSON object containing exactly these keys: " +
               "reflection, emotion, pillar, primaryColor, secondaryColor.";
    }

    private String buildSystemPrompt(String pastContext) {
        Map<String, Object> context = new HashMap<>();
        boolean hasPastMemories = pastContext != null && !pastContext.isBlank() && !pastContext.equalsIgnoreCase("None");
        context.put("hasPastMemories", hasPastMemories);

        return promptService.renderSystemPrompt(context) +
            "\n\nCRITICAL INSTRUCTION: You MUST respond ONLY with a valid JSON object. " +
            "No markdown, no code blocks, no prose — just raw JSON. " +
            "Required keys and formats:\n" +
            "  \"reflection\"   : empathetic response string (non-null, non-empty)\n" +
            "  \"emotion\"      : single emotion word e.g. CALM, JOY, ANXIOUS (non-null)\n" +
            "  \"pillar\"       : one of FEELINGS, GROWTH, RELATIONSHIPS, CREATIVITY, PRODUCTIVITY, HEALTH, LEARNING\n" +
            "  \"primaryColor\" : valid hex color string (invent any color!)\n" +
            "  \"secondaryColor\": valid hex color string (invent any color!)\n" +
            "All five keys are REQUIRED. Null values are NOT acceptable.";
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
