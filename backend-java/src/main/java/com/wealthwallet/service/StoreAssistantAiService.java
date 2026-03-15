package com.wealthwallet.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StoreAssistantAiService {

    public enum Persona {
        STYLES,
        ADMIN_SUPPORT
    }

    private static final Logger log = LoggerFactory.getLogger(StoreAssistantAiService.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.ai.style-assistant.enabled:false}")
    private boolean enabled;

    @Value("${app.ai.style-assistant.api-key:}")
    private String apiKey;

    @Value("${app.ai.style-assistant.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Value("${app.ai.style-assistant.model:gpt-4o-mini}")
    private String model;

    @Value("${app.ai.style-assistant.temperature:0.4}")
    private double temperature;

    @Value("${app.ai.style-assistant.max-tokens:500}")
    private int maxTokens;

    @Value("${app.ai.style-assistant.prompts.styles:}")
    private String stylesPrompt;

    @Value("${app.ai.style-assistant.prompts.admin:}")
    private String adminPrompt;

    public Optional<String> generateReply(
            Persona persona,
            String userMessage,
            String recentConversation,
            String cartContext,
            String productHint,
            String orderContext
    ) {
        if (!enabled) {
            return Optional.empty();
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Style AI enabled but API key is missing");
            return Optional.empty();
        }
        if (userMessage == null || userMessage.isBlank()) {
            return Optional.empty();
        }

        String systemPrompt = systemPromptFor(persona);
        if (systemPrompt == null || systemPrompt.isBlank()) {
            log.warn("Style AI enabled but prompt is missing for persona={}", persona);
            return Optional.empty();
        }

        try {
            String userPrompt = buildUserPrompt(persona, userMessage, recentConversation, cartContext, productHint, orderContext);
            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", model,
                    "temperature", temperature,
                    "max_tokens", maxTokens,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userPrompt)
                    )
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(normalizeBaseUrl(baseUrl) + "/chat/completions"))
                    .timeout(Duration.ofSeconds(25))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey.trim())
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("Style AI call failed with status={} body={}", response.statusCode(), truncate(response.body(), 280));
                return Optional.empty();
            }

            JsonNode json = objectMapper.readTree(response.body());
            String content = json.path("choices").path(0).path("message").path("content").asText("");
            if (content == null || content.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(content.trim());
        } catch (Exception exception) {
            log.warn("Style AI call exception: {}", exception.getMessage());
            return Optional.empty();
        }
    }

    private String systemPromptFor(Persona persona) {
        if (persona == null) {
            return "";
        }
        return switch (persona) {
            case STYLES -> stylesPrompt;
            case ADMIN_SUPPORT -> adminPrompt;
        };
    }

    private String buildUserPrompt(
            Persona persona,
            String userMessage,
            String recentConversation,
            String cartContext,
            String productHint,
            String orderContext
    ) {
        StringBuilder builder = new StringBuilder();

        String trimmedMessage = userMessage == null ? "" : userMessage.trim();
        String trimmedConversation = (recentConversation == null || recentConversation.isBlank())
                ? "Chưa có lịch sử."
                : recentConversation.trim();

        if (persona == Persona.ADMIN_SUPPORT) {
            builder.append("Tin nhắn mới từ khách:\n")
                    .append(trimmedMessage)
                    .append("\n\n");

            builder.append("Lịch sử chat gần đây:\n")
                    .append(trimmedConversation)
                    .append("\n\n");

            builder.append("Giỏ hàng hiện tại (tóm tắt):\n")
                    .append((cartContext == null || cartContext.isBlank()) ? "Giỏ hàng đang trống." : cartContext.trim())
                    .append("\n\n");

            builder.append("Ngữ cảnh đơn hàng gần nhất:\n")
                    .append((orderContext == null || orderContext.isBlank()) ? "Chưa có dữ liệu đơn hàng." : orderContext.trim())
                    .append("\n\n");

            builder.append("""
                    Hãy trả lời đúng format sau (mỗi dòng 1 ý):
                    Tóm tắt: ...
                    Hướng dẫn: ...
                    Lưu ý: ...
                    Câu hỏi chốt: ...
                    Nếu đã đủ dữ kiện, thay "Câu hỏi chốt" bằng "Kết luận: ...".
                    """);
            return builder.toString();
        }

        builder.append("Tin nhắn mới từ khách:\n")
                .append(trimmedMessage)
                .append("\n\n");

        builder.append("Lịch sử chat gần đây:\n")
                .append(trimmedConversation)
                .append("\n\n");

        builder.append("Giỏ hàng hiện tại:\n")
                .append((cartContext == null || cartContext.isBlank()) ? "Chưa có dữ liệu giỏ hàng." : cartContext.trim())
                .append("\n\n");

        builder.append("Gợi ý sản phẩm tham khảo nội bộ:\n")
                .append((productHint == null || productHint.isBlank()) ? "Không có gợi ý nội bộ." : productHint.trim())
                .append("\n\n");

        builder.append("""
                Hãy trả lời đúng format sau (mỗi dòng 1 ý):
                Chẩn đoán: ...
                Gợi ý 1: ...
                Gợi ý 2: ...
                Tránh: ...
                Câu hỏi chốt: ...
                Nếu đã đủ dữ kiện, thay "Câu hỏi chốt" bằng "Kết luận: ...".
                """);
        return builder.toString();
    }

    private String normalizeBaseUrl(String rawBaseUrl) {
        if (rawBaseUrl == null || rawBaseUrl.isBlank()) {
            return "https://api.openai.com/v1";
        }
        String trimmed = rawBaseUrl.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private String truncate(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "...";
    }
}
