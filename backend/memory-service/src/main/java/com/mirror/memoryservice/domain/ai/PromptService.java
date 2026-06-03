package com.mirror.memoryservice.domain.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileCopyUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.annotation.PostConstruct;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;

@Service
public class PromptService {

    private static final Logger log = LoggerFactory.getLogger(PromptService.class);

    @Value("classpath:prompts/mirror-system-prompt.txt")
    private Resource systemPromptResource;

    private String systemPrompt = "";

    @PostConstruct
    public void init() {
        try (Reader reader = new InputStreamReader(systemPromptResource.getInputStream(), StandardCharsets.UTF_8)) {
            this.systemPrompt = FileCopyUtils.copyToString(reader);
            log.info("Successfully loaded system prompt from file.");
        } catch (Exception e) {
            log.error("Failed to load system prompt from file, using fallback.", e);
            this.systemPrompt = "You are MIRROR, an empathetic AI companion. Respond with {\"reflection\": \"...\", \"emotion\": \"...\", \"primaryColor\": \"...\", \"secondaryColor\": \"...\"}";
        }
    }

    public String getSystemPrompt() {
        return systemPrompt;
    }
}
