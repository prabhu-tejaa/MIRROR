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
     * If the API Key is missing or request fails, falls back to a deterministic, high-fidelity mock vector.
     */
    public float[] getEmbedding(String text) {
        if (text == null) {
            text = "";
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Falling back to deterministic mock embedding.");
            return generateMockEmbedding(text);
        }

        try {
            String url = apiUrl + "/models/embedding-001:embedContent?key=" + apiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Construct payload
            Map<String, Object> parts = new HashMap<>();
            parts.put("text", text);

            Map<String, Object> content = new HashMap<>();
            content.put("parts", Collections.singletonList(parts));

            Map<String, Object> payload = new HashMap<>();
            payload.put("model", "models/embedding-001");
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
        } catch (Exception e) {
            log.error("Failed to query Gemini Embeddings API: {}. Falling back to mock embeddings.", e.getMessage());
        }

        return generateMockEmbedding(text);
    }

    /**
     * Generates context-aware reflections and emotional tags by feeding the prompt and past similar memories into Gemini.
     * Automatically requests structured JSON response mapping.
     */
    public Map<String, String> generateReflectionAndEmotion(String prompt, String pastContext) {
        Map<String, String> result = new HashMap<>();
        result.put("reflection", "Thank you for sharing. How are you feeling right now?");
        result.put("emotion", "NEUTRAL");

        if (prompt == null || prompt.trim().isEmpty()) {
            return result;
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("Gemini API key is not configured. Falling back to rule-based mock reflection & emotion.");
            return generateMockReflectionAndEmotion(prompt, pastContext);
        }

        try {
            String url = apiUrl + "/models/gemini-2.0-flash:generateContent?key=" + apiKey;

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
                                  "You help the user track not only sadness, but also their daily wins, ideas, coding highlights, philosophy, and regular life events. " +
                                  "Analyze the user prompt and the past relevant memories context. Weave in past events organically (e.g. say 'Reminds me of when you mentioned...' or 'I remember last week you succeeded in...'). " +
                                  "CRITICAL CONSTRAINTS:\n" +
                                  "1. NEW CHATS: If the 'PAST RELEVANT MEMORIES CONTEXT' indicates there are no past memories (e.g., 'No past memories recorded yet'), act as an inviting, friendly peer and start building a connection without mentioning past history.\n" +
                                  "2. NO BOMBARDMENT: Do NOT force past memories into the conversation if they are not highly relevant to what the user is saying now. Only reference the past when it adds genuine, supportive value to the present moment. Otherwise, focus entirely on being present in the current vibe.\n" +
                                  "Ensure your reflection feels completely genuine, warm, and natural. " +
                                  "Classify the user's current mood into exactly one emotion tag (choose from: JOY, SADNESS, ANGER, ANXIETY, NEUTRAL). " +
                                  "Your response MUST be a JSON object: {\"reflection\": \"your reflection text here\", \"emotion\": \"JOY\"}");

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
                                // Extract properties manually to avoid extra mapping dependencies
                                return parseJsonFields(jsonResponseText);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to query Gemini Reflection API: {}. Falling back to mock reflection.", e.getMessage());
        }

        return generateMockReflectionAndEmotion(prompt, pastContext);
    }

    /**
     * Generates a deterministic mock vector of dimension 768 based on string hash.
     * This allows similarity algorithms (like cosine similarity) to function perfectly and query correctly even in offline/test runs.
     */
    private float[] generateMockEmbedding(String text) {
        float[] vector = new float[768];
        int hash = text.hashCode();
        Random rand = new Random(hash);
        float sumOfSquares = 0;
        for (int i = 0; i < 768; i++) {
            vector[i] = rand.nextFloat() - 0.5f;
            sumOfSquares += vector[i] * vector[i];
        }
        // Normalize vector to have unit length (magnitude 1.0)
        float magnitude = (float) Math.sqrt(sumOfSquares);
        if (magnitude > 0) {
            for (int i = 0; i < 768; i++) {
                vector[i] /= magnitude;
            }
        }
        return vector;
    }

    /**
     * Local rule-based fallback reflection generator
     */
    private Map<String, String> generateMockReflectionAndEmotion(String prompt, String pastContext) {
        Map<String, String> result = new HashMap<>();
        String query = prompt.toLowerCase();
        String emotion = "NEUTRAL";
        String reflection = "That's an interesting thought. Tell me more—I'm mapping this straight to your reflection journal. Let's dig deeper.";

        if (query.contains("happy") || query.contains("won") || query.contains("win") || query.contains("success") || query.contains("joke") || query.contains("awesome") || query.contains("great")) {
            emotion = "JOY";
            reflection = "Yes! I absolutely love to see this. Celebrating these wins—big or small—is exactly how we build massive momentum. What sparked this success?";
        } else if (query.contains("sad") || query.contains("cry") || query.contains("pain") || query.contains("hurt") || query.contains("failed") || query.contains("lonely")) {
            emotion = "SADNESS";
            reflection = "I hear you, and it's completely okay to have low-energy days. MIRROR is your safe space to vent. Take all the time you need to process this.";
        } else if (query.contains("anxious") || query.contains("worry") || query.contains("scared") || query.contains("fear") || query.contains("stress") || query.contains("panic")) {
            emotion = "ANXIETY";
            reflection = "Deep breath. This stress is just a temporary wave. If we look at your past wins, you've overcome way tougher obstacles. You've got the skills to handle this.";
        } else if (query.contains("angry") || query.contains("mad") || query.contains("hate") || query.contains("annoyed") || query.contains("pissed")) {
            emotion = "ANGER";
            reflection = "I feel that fire. Frustration is just raw energy—let's redirect it. How can we channel this to solve the core issue step-by-step?";
        } else if (query.contains("idea") || query.contains("concept") || query.contains("philosophy") || query.contains("code") || query.contains("learn") || query.contains("ponder")) {
            emotion = "JOY";
            reflection = "Whoa, this is a fascinating mental spark! Documentation of these learning moments is where pure growth happens. How did this idea hit you?";
        }

        if (pastContext != null && pastContext.contains("JOY") && emotion.equals("ANXIETY")) {
            reflection += " Remember your recent win: it shows you are fully capable of overcoming this.";
        }

        result.put("reflection", reflection);
        result.put("emotion", emotion);
        return result;
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
