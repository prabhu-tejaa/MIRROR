package com.mirror.memoryservice.domain.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileCopyUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;

import jakarta.annotation.PostConstruct;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
public class PromptService {

    private static final Logger log = LoggerFactory.getLogger(PromptService.class);

    @Value("classpath:prompts/mirror-system-prompt.txt")
    private Resource systemPromptResource;

    private Template systemPromptTemplate;
    private String fallbackPrompt = "You are MIRROR, an empathetic AI companion. Respond with {\"reflection\": \"...\", \"emotion\": \"...\", \"primaryColor\": \"...\", \"secondaryColor\": \"...\"}";

    @PostConstruct
    public void init() {
        try (Reader reader = new InputStreamReader(systemPromptResource.getInputStream(), StandardCharsets.UTF_8)) {
            String templateString = FileCopyUtils.copyToString(reader);
            Handlebars handlebars = new Handlebars();
            this.systemPromptTemplate = handlebars.compileInline(templateString);
            log.info("Successfully loaded and compiled system prompt template.");
        } catch (Exception e) {
            log.error("Failed to load and compile system prompt template.", e);
        }
    }

    public String renderSystemPrompt(Map<String, Object> context) {
        if (this.systemPromptTemplate != null) {
            try {
                return this.systemPromptTemplate.apply(context);
            } catch (Exception e) {
                log.error("Failed to render system prompt, using fallback.", e);
            }
        }
        return fallbackPrompt;
    }
}
