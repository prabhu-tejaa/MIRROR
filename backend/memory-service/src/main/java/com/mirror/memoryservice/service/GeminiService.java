package com.mirror.memoryservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
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

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta}")
    private String apiUrl;

    private final RestTemplate restTemplate;

    public GeminiService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Converts a text string into a 768-dimensional float embedding vector.
     * Throws an exception if the API Key is missing or the request fails.
     */
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

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                Map<String, Object> embeddingNode = (Map<String, Object>) body.get("embedding");
                if (embeddingNode != null) {
                    List<Number> valuesList = (List<Number>) embeddingNode.get("values");
                    if (valuesList != null && valuesList.size() == 768) {
                        float[] vector = new float[768];
                        for (int i = 0; i < 768; i++) {
                            vector[i] = valuesList.get(i).floatValue();
                        }
                        return vector;
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
            String url = apiUrl + "/models/gemini-flash-latest:generateContent?key=" + apiKey;

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

            // System Instruction
            Map<String, Object> systemPart = new HashMap<>();
            systemPart.put("text", "You are MIRROR, a highly empathetic, premium digital reflection companion and smart emotional journal. " +
                                  "Your personality is open-minded, intellectually present, conversational, and genuinely supportive—like a wise peer or mentor who truly vibes with the user. " +
                                  "You help the user reflect on a rich, diverse range of topics: coding highlights, daily wins, failures, life events, philosophical thoughts, intellectual curiosity, stress, relationships, and raw ideas. " +
                                  "Analyze the user prompt and the past relevant memories context. Weave in past events organically (e.g. say 'Reminds me of when you mentioned...' or 'I remember last week you succeeded in...'). " +
                                  "CRITICAL CONSTRAINTS:\n" +
                                  "1. NEW CHATS: If the 'PAST RELEVANT MEMORIES CONTEXT' indicates there are no past memories (e.g., 'No past memories recorded yet'), act as an inviting, friendly peer and start building a connection without mentioning past history.\n" +
                                  "2. NO BOMBARDMENT: Do NOT force past memories into the conversation if they are not highly relevant to what the user is saying now. Only reference the past when it adds genuine, supportive value to the present moment. Otherwise, focus entirely on being present in the current vibe.\n" +
                                  "Ensure your reflection feels completely genuine, warm, and natural. " +
                                  "Classify the user's prompt into a highly expressive, multi-word emotion or cognitive state tag that fits the vibe (e.g. 'Thoughtful Curiosity', 'Aesthetic Coding Spark', 'Heavy Melancholy', 'Peaceful Gratitude', etc. Keep it up to 40 characters).\n" +
                                  "Choose two dynamic CSS hex colors that perfectly represent the psychological vibe and emotional tone of this conversation:\n" +
                                  "- 'primaryColor': A vibrant color representing the core mood (e.g., #00ffd5 for calm/curiosity, #ffb700 for joy, #ff0055 for anger, #a855f7 for anxiety, #10b981 for growth/focus, #ff7300 for excitement).\n" +
                                  "- 'secondaryColor': An accent color that harmonizes or contrasts beautifully with the primary color.\n" +
                                  "Your response MUST be a JSON object: {\"reflection\": \"your reflection text here\", \"emotion\": \"Thoughtful Curiosity\", \"primaryColor\": \"#00ffd5\", \"secondaryColor\": \"#a855f7\"}");

            Map<String, Object> systemInstruction = new HashMap<>();
            systemInstruction.put("parts", Collections.singletonList(systemPart));

            Map<String, Object> payload = new HashMap<>();
            payload.put("contents", Collections.singletonList(contentsNode));
            payload.put("generationConfig", generationConfig);
            payload.put("systemInstruction", systemInstruction);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
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
                                Map<String, String> parsed = parseJsonFields(jsonResponseText);
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
            throw new RuntimeException("Failed to generate reflection from Gemini AI service: " + e.getMessage(), e);
        }
    }

    /**
     * Quick manual parser for simple json objects
     */
    private Map<String, String> parseJsonFields(String json) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(json, new TypeReference<Map<String, String>>(){});
        } catch (Exception parseEx) {
            log.warn("Jackson JSON parsing failed. Falling back to manual parser. Input: {}", json, parseEx);
            Map<String, String> result = new HashMap<>();
            try {
                // Remove spaces, braces, and line breaks for simple parsing
                String clean = json.replace("\n", "").replace("\r", "").trim();
                int reflectionIdx = clean.indexOf("\"reflection\"");
                int emotionIdx = clean.indexOf("\"emotion\"");

                String reflection = "Shared reflections are synced.";
                String emotion = "NEUTRAL";

                if (reflectionIdx != -1) {
                    int start = clean.indexOf(":", reflectionIdx) + 1;
                    while (start < clean.length() && (clean.charAt(start) == ' ' || clean.charAt(start) == '"')) {
                        start++;
                    }
                    int end = clean.indexOf("\"", start);
                    if (end != -1) {
                        reflection = clean.substring(start, end);
                    }
                }

                if (emotionIdx != -1) {
                    int start = clean.indexOf(":", emotionIdx) + 1;
                    while (start < clean.length() && (clean.charAt(start) == ' ' || clean.charAt(start) == '"')) {
                        start++;
                    }
                    int end = clean.indexOf("\"", start);
                    if (end != -1) {
                        emotion = clean.substring(start, end).toUpperCase();
                    }
                }

                result.put("reflection", reflection);
                result.put("emotion", emotion);
                return result;
            } catch (Exception innerEx) {
                log.error("Manual fallback parser also failed. Returning default values.", innerEx);
                result.put("reflection", "Reflecting on your mood companion stream...");
                result.put("emotion", "NEUTRAL");
                return result;
            }
        }
    }
}
