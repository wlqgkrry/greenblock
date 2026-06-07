package com.greenblock.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.greenblock.backend.service.MansaeOcrService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@RestController
@RequestMapping("/api/llm")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:4173", "http://localhost:8088"})
public class LlmAnalysisController {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_RESPONSE_TYPE =
            new ParameterizedTypeReference<>() {
            };
    private static final List<String> DEFAULT_CAUTIONS = List.of(
            "갑자기 결론만 던지면 압박으로 느껴질 수 있어, 먼저 배경과 기대 결과를 짧게 맞추는 편이 좋습니다.",
            "요청 범위가 자주 바뀌면 피로도가 올라갈 수 있어 우선순위와 마감 기준을 분리해 전하는 편이 좋습니다.",
            "피드백은 짧은 평가처럼 말하기보다 근거와 기대 변화를 함께 설명하는 편이 안전합니다."
    );
    private static final List<String> DEFAULT_MESSAGE_EXAMPLES = List.of(
            "먼저 배경부터 짧게 공유드리겠습니다.",
            "제가 보기에는 선택지가 두 가지라서, 편하신 방향을 확인하고 진행하고 싶습니다.",
            "제가 이해한 내용이 맞는지 먼저 확인드려도 될까요?"
    );
    private static final List<String> DEFAULT_COLLABORATION_TIPS = List.of(
            "회의 전에는 논의할 안건과 결정할 내용을 먼저 공유합니다.",
            "피드백은 평가처럼 들리지 않게 의도와 근거를 함께 설명합니다.",
            "업무 요청은 담당 범위, 마감 시점, 확인 방법을 따로 적습니다."
    );
    private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
    private static final String OLLAMA_SYSTEM_PROMPT = "너는 greenblock의 한국어 협업 가이드 작성기다. "
            + "출력의 중심은 성향 해석, 일 스타일, 대화 방식이며 안전 문구는 맨 마지막 limitation 한 문장에만 짧게 적는다. "
            + "입력에 없는 정보는 지어내지 말고, readingSignals에 담긴 서로 다른 특징 두 가지 이상을 직접 반영해 "
            + "사람 소개처럼 자연스럽게 써라. "
            + "금지: '입력 JSON', '감지', '파싱', '연주를 어떻게 찾았는지', '사주/만세력은 참고자료' 같은 설명을 본문 앞부분에 쓰지 말 것.";
    private static final String STREAM_PRIMER_TEXT = "입력된 만세력 핵심 키워드를 정리하고 있어요.\n";

    private final ObjectMapper objectMapper;
    private final RestClient openAiClient;
    private final RestClient ollamaClient;
    private final MansaeOcrService mansaeOcrService;
    private final String provider;
    private final String openAiApiKey;
    private final String openAiModel;
    private final String ollamaBaseUrl;
    private final String ollamaModel;

    public LlmAnalysisController(
            ObjectMapper objectMapper,
            RestClient.Builder restClientBuilder,
            MansaeOcrService mansaeOcrService,
            @Value("${greenblock.llm.provider}") String provider,
            @Value("${greenblock.llm.openai.base-url}") String openAiBaseUrl,
            @Value("${greenblock.llm.openai.api-key:}") String openAiApiKey,
            @Value("${greenblock.llm.openai.model}") String openAiModel,
            @Value("${greenblock.llm.ollama.base-url}") String ollamaBaseUrl,
            @Value("${greenblock.llm.ollama.model}") String ollamaModel
    ) {
        this.objectMapper = objectMapper;
        this.openAiClient = restClientBuilder.baseUrl(openAiBaseUrl).build();
        this.ollamaClient = restClientBuilder.baseUrl(ollamaBaseUrl).build();
        this.mansaeOcrService = mansaeOcrService;
        this.provider = provider;
        this.openAiApiKey = openAiApiKey;
        this.openAiModel = openAiModel;
        this.ollamaBaseUrl = ollamaBaseUrl;
        this.ollamaModel = ollamaModel;
    }

    @PostMapping("/mansae-ocr")
    public MansaeOcrResponse extractMansaeText(@Valid @RequestBody MansaeOcrRequest request) {
        try {
            MansaeOcrService.OcrResult result = mansaeOcrService.extractFromDataUrl(request.imageDataUrl());
            return new MansaeOcrResponse(
                    result.provider(),
                    result.text(),
                    result.usedFallback(),
                    result.note()
            );
        } catch (Exception exception) {
            return new MansaeOcrResponse(
                    "ocr-error",
                    "",
                    true,
                    "이미지 OCR 처리에 실패했습니다. " + exception.getMessage()
            );
        }
    }

    @PostMapping("/mansae-analysis")
    public LlmAnalysisResponse analyzeMansae(@Valid @RequestBody MansaeAnalysisRequest request) {
        String prompt = buildPrompt(request);
        String selectedProvider = provider.trim().toLowerCase();

        if ("ollama".equals(selectedProvider)) {
            try {
                return analyzeWithOllama(prompt, request);
            } catch (RestClientException exception) {
                String message = "Ollama 로컬 LLM 호출에 실패했습니다. Ollama가 실행 중인지 확인하고, PowerShell에서 `ollama pull " + ollamaModel + "`로 모델을 받은 뒤 다시 시도해 주세요. 상세: " + exception.getMessage();
                return new LlmAnalysisResponse(
                        "ollama",
                        ollamaModel,
                        message,
                        true,
                        prompt,
                        buildStructuredAnalysis(request, message)
                );
            }
        }

        if (!"openai".equals(selectedProvider) || !StringUtils.hasText(openAiApiKey)) {
            return new LlmAnalysisResponse(
                    "local-fallback",
                    selectedProvider,
                    buildFallbackAnalysis(request),
                    true,
                    prompt,
                    buildStructuredAnalysis(request, buildFallbackAnalysis(request))
            );
        }

        Map<String, Object> response = openAiClient.post()
                .uri("/responses")
                .header("Authorization", "Bearer " + openAiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "model", openAiModel,
                        "input", List.of(
                                Map.of(
                                        "role", "system",
                                        "content", "당신은 greenblock의 협업 커뮤니케이션 분석 어시스턴트입니다. 만세력/사주 정보는 사용자가 직접 입력한 참고자료로만 다루고, 단정적 성격 판단이나 채용/평가/차별 판단에 사용하지 마세요. 결과는 한국어로 작성하고, 메시지 톤과 협업 방식 추천에만 집중하세요. 반드시 입력 JSON에서 서로 다른 특징 두 가지 이상을 직접 반영해 문장을 구분해 주세요."
                                ),
                                Map.of(
                                        "role", "user",
                                        "content", prompt
                                )
                        ),
                        "max_output_tokens", 1200
                ))
                .retrieve()
                .body(MAP_RESPONSE_TYPE);

        String analysisText = extractOutputText(response);
        return new LlmAnalysisResponse(
                "openai",
                openAiModel,
                analysisText,
                false,
                prompt,
                buildStructuredAnalysis(request, analysisText)
        );
    }

    @PostMapping(value = "/mansae-analysis/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody analyzeMansaeStream(@Valid @RequestBody MansaeAnalysisRequest request) {
        String selectedProvider = provider.trim().toLowerCase();

        if (!"ollama".equals(selectedProvider)) {
            LlmAnalysisResponse response = analyzeMansae(request);
            return outputStream -> {
                BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(outputStream, StandardCharsets.UTF_8));
                sendSseEvent(writer, "done", response);
            };
        }

        String prompt = buildStreamingPrompt(request);
        return outputStream -> {
            BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(outputStream, StandardCharsets.UTF_8));
            try {
                sendSseEvent(writer, "meta", Map.of(
                        "provider", "ollama",
                        "model", ollamaModel
                ));
                sendSseEvent(writer, "chunk", Map.of(
                        "text", STREAM_PRIMER_TEXT,
                        "length", STREAM_PRIMER_TEXT.length()
                ));
                LlmAnalysisResponse response = analyzeWithOllamaStream(prompt, request, writer);
                sendSseEvent(writer, "done", response);
            } catch (Exception exception) {
                sendSseEvent(writer, "error", Map.of(
                        "message", "스트리밍 분석 중 오류가 발생했습니다. " + exception.getMessage()
                ));
            }
        };
    }

    private LlmAnalysisResponse analyzeWithOllama(String prompt, MansaeAnalysisRequest request) {
        Map<String, Object> response = ollamaClient.post()
                .uri("/api/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                        "model", ollamaModel,
                        "system", OLLAMA_SYSTEM_PROMPT,
                        "prompt", prompt,
                        "format", "json",
                        "keep_alive", "10m",
                        "options", Map.of(
                                "temperature", 0.15,
                                "top_p", 0.8,
                                "num_ctx", 1024,
                                "num_predict", 150
                        ),
                        "stream", false
                ))
                .retrieve()
                .body(MAP_RESPONSE_TYPE);

        Object text = response == null ? null : response.get("response");
        String analysisText = text instanceof String value ? value : "Ollama 응답을 받았지만 텍스트를 추출하지 못했습니다.";
        return new LlmAnalysisResponse(
                "ollama",
                ollamaModel,
                analysisText,
                false,
                prompt,
                buildStructuredAnalysis(request, analysisText)
        );
    }

    private LlmAnalysisResponse analyzeWithOllamaStream(
            String prompt,
            MansaeAnalysisRequest request,
            BufferedWriter writer
    ) throws IOException, InterruptedException {
        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(ollamaBaseUrl + "/api/generate"))
                .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .timeout(Duration.ofSeconds(55))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(Map.of(
                        "model", ollamaModel,
                        "system", OLLAMA_SYSTEM_PROMPT,
                        "prompt", prompt,
                        "keep_alive", "10m",
                        "options", Map.of(
                                "temperature", 0.15,
                                "top_p", 0.8,
                                "num_ctx", 1024,
                                "num_predict", 120
                        ),
                        "stream", true
                )), StandardCharsets.UTF_8))
                .build();

        HttpResponse<java.io.InputStream> response = HTTP_CLIENT.send(
                httpRequest,
                HttpResponse.BodyHandlers.ofInputStream()
        );

        if (response.statusCode() >= 400) {
            throw new IOException("Ollama HTTP " + response.statusCode());
        }

        StringBuilder draft = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!StringUtils.hasText(line)) {
                    continue;
                }

                JsonNode node = objectMapper.readTree(line);
                String chunk = node.path("response").asText("");
                if (StringUtils.hasText(chunk)) {
                    draft.append(chunk);
                    sendSseEvent(writer, "chunk", Map.of(
                            "text", chunk,
                            "length", draft.length()
                    ));
                }

                if (node.path("done").asBoolean(false)) {
                    break;
                }
            }
        }

        String analysisText = draft.toString();
        return new LlmAnalysisResponse(
                "ollama",
                ollamaModel,
                analysisText,
                false,
                prompt,
                buildStructuredAnalysis(request, analysisText)
        );
    }

    private String buildPrompt(MansaeAnalysisRequest request) {
        return String.join("\n",
                "다음 compact JSON을 바탕으로 한 사람의 협업 성향을 풀이해 주세요.",
                "",
                "[입력 JSON]",
                buildCompactPromptPayload(request),
                "",
                "[규칙]",
                "- readingSignals에서 서로 다른 특징 두 가지 이상을 직접 사용합니다.",
                "- personalityReading은 성격 인상, workStyleReading은 일 처리 리듬, communicationGuide는 말투와 요청 방식을 씁니다.",
                "- 일반론보다 이 사람만의 결이 보이게 씁니다.",
                "- 내부 처리 설명과 안전 문구는 본문에 쓰지 않고 limitation 한 문장에만 적습니다.",
                "- 근거가 약하면 단정하지 않습니다.",
                "- JSON 객체만 반환합니다.",
                "",
                "[출력 JSON 스키마]",
                "{",
                "  \"summary\": \"한 문장 요약\",",
                "  \"personalityReading\": \"이 사람의 성향 인상 2~3문장\",",
                "  \"workStyleReading\": \"일 처리 방식과 협업 리듬 2~3문장\",",
                "  \"communicationGuide\": \"대화 톤과 요청 방식 2~3문장\",",
                "  \"cautions\": [\"마찰이 생기기 쉬운 지점 1\", \"마찰이 생기기 쉬운 지점 2\", \"마찰이 생기기 쉬운 지점 3\"],",
                "  \"messageExamples\": [\"메시지 첫 문장 1\", \"메시지 첫 문장 2\", \"메시지 첫 문장 3\"],",
                "  \"collaborationTips\": [\"회의 방식\", \"피드백 방식\", \"업무 요청 방식\"],",
                "  \"limitation\": \"이 분석의 한계와 주의 문구\"",
                "}"
        );
    }

    private String buildStreamingPrompt(MansaeAnalysisRequest request) {
        return String.join("\n",
                "다음 compact JSON을 바탕으로 짧은 협업 성향 풀이를 작성해 주세요.",
                "",
                "[입력 JSON]",
                buildCompactPromptPayload(request),
                "",
                "[규칙]",
                "- readingSignals에서 서로 다른 특징 두 가지 이상을 직접 사용합니다.",
                "- 성향, 일 스타일, 대화 방식이 먼저 나오고 limitation만 마지막 한 문장으로 적습니다.",
                "- 내부 처리 설명과 안전 문구는 본문에 쓰지 않습니다.",
                "- 일반론보다 이 사람만의 결이 보이게 씁니다.",
                "- 각 항목은 최대 2문장 또는 3개 항목 이내로 씁니다.",
                "",
                "[출력 형식]",
                "1. 한 줄 요약",
                "2. 성향 해석",
                "3. 일 스타일",
                "4. 대화할 때 잘 맞는 방식",
                "5. 마찰이 생기기 쉬운 지점 3개",
                "6. 메시지 첫 문장 예시 3개",
                "7. 회의/피드백/업무 요청 추천 방식",
                "8. 이 분석의 한계와 주의 문구"
        );
    }

    private String buildCompactPromptPayload(MansaeAnalysisRequest request) {
        LinkedHashMap<String, Object> payload = new LinkedHashMap<>();
        payload.put("teammate", Map.of(
                "name", request.teammateName(),
                "role", request.role()
        ));

        try {
            JsonNode root = objectMapper.readTree(request.normalizedMansaeJson());
            payload.put("readingSignals", extractReadingSignals(request.normalizedMansaeJson()));
            payload.put("evidenceKeywords", extractFeatureHints(request.normalizedMansaeJson()));
            payload.put("pillars", readCompactObject(root.path("pillars"),
                    List.of("일주", "월주", "시주")));
            payload.put("importantTenGods", summarizeKeywordGroup(root.path("keywordGroups").path("tenGods")));
            payload.put("supportingKeywords", Map.of(
                    "lifeStages", summarizeKeywordGroup(root.path("keywordGroups").path("lifeStages")),
                    "specialStars", summarizeKeywordGroup(root.path("keywordGroups").path("specialStars"))
            ));
        } catch (Exception ignored) {
            payload.put("summary", request.parsedMansaeSummary());
        }

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ignored) {
            return "{\"summary\":\"" + request.parsedMansaeSummary().replace("\"", "'") + "\"}";
        }
    }

    private Map<String, String> readCompactObject(JsonNode node, List<String> keys) {
        LinkedHashMap<String, String> values = new LinkedHashMap<>();
        if (!node.isObject()) {
            return values;
        }

        for (String key : keys) {
            String value = cleanText(node.path(key).asText(""));
            if (StringUtils.hasText(value)) {
                values.put(key, value);
            }
        }
        return values;
    }

    private List<String> summarizeKeywordGroup(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (!node.isArray()) {
            return values;
        }

        node.forEach(item -> {
            String label = cleanText(item.path("label").asText(""));
            int count = item.path("count").asInt(0);
            if (StringUtils.hasText(label)) {
                values.add(count > 1 ? label + " x" + count : label);
            }
        });

        return values.stream().limit(3).toList();
    }

    private StructuredAnalysis buildStructuredAnalysis(MansaeAnalysisRequest request, String llmDraft) {
        StructuredAnalysis llmStructured = parseStructuredJson(request, llmDraft);
        if (llmStructured != null) {
            return llmStructured;
        }

        StructuredAnalysis markdownStructured = parseNumberedText(request, llmDraft);
        if (markdownStructured != null) {
            return markdownStructured;
        }

        return new StructuredAnalysis(
                buildFeatureAwareSummary(request),
                buildFeatureAwarePersonality(request),
                buildFeatureAwareWorkStyle(request),
                buildFeatureAwareCommunicationGuide(request),
                DEFAULT_CAUTIONS,
                List.of(
                        request.teammateName() + " 님, 먼저 왜 이 작업이 필요한지부터 짧게 공유드릴게요.",
                        "제가 보기에는 선택지가 두 가지라서, 편하신 방향을 확인하고 맞춰 가고 싶습니다.",
                        "제가 이해한 내용이 맞는지 먼저 확인한 뒤 바로 다음 단계로 넘어가겠습니다."
                ),
                List.of(
                        "회의 전에는 이야기할 안건과 오늘 정해야 할 것을 미리 적어 보냅니다.",
                        "피드백은 평가처럼 들리지 않도록 의도와 근거를 먼저 말합니다.",
                        "업무 요청은 담당 범위, 마감 시점, 확인 방법을 줄을 나눠 적습니다."
                ),
                "이 가이드는 사용자가 직접 입력한 자료를 바탕으로 만든 협업 참고용입니다. 실제 성향은 상황과 관계에 따라 달라질 수 있으니, 중요한 판단의 근거로 쓰면 안 됩니다.",
                trimDraft(llmDraft)
        );
    }

    private StructuredAnalysis parseStructuredJson(MansaeAnalysisRequest request, String llmDraft) {
        String json = extractJsonObject(llmDraft);
        if (!StringUtils.hasText(json)) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            String summary = cleanText(root.path("summary").asText(""));
            String personalityReading = cleanText(root.path("personalityReading").asText(""));
            String workStyleReading = cleanText(root.path("workStyleReading").asText(""));
            String communicationGuide = cleanText(root.path("communicationGuide").asText(""));
            String limitation = cleanText(root.path("limitation").asText(""));
            List<String> cautions = readTextList(root.path("cautions"));
            List<String> messageExamples = readTextList(root.path("messageExamples"));
            List<String> collaborationTips = readTextList(root.path("collaborationTips"));

            if (!StringUtils.hasText(personalityReading)) {
                personalityReading = cleanText(root.path("communicationHypothesis").asText(""));
            }
            if (!StringUtils.hasText(communicationGuide)) {
                communicationGuide = cleanText(root.path("communicationHypothesis").asText(""));
            }

            if (!StringUtils.hasText(summary) || !StringUtils.hasText(personalityReading)) {
                return null;
            }

            return new StructuredAnalysis(
                    summary,
                    personalityReading,
                    StringUtils.hasText(workStyleReading) ? workStyleReading : buildFeatureAwareWorkStyleFromSummary(personalityReading),
                    StringUtils.hasText(communicationGuide) ? communicationGuide : buildFeatureAwareCommunicationGuide(request),
                    withFallback(cautions, DEFAULT_CAUTIONS),
                    withFallback(messageExamples, DEFAULT_MESSAGE_EXAMPLES),
                    withFallback(collaborationTips, DEFAULT_COLLABORATION_TIPS),
                    StringUtils.hasText(limitation)
                            ? limitation
                            : "이 가이드는 사용자가 직접 입력한 자료를 바탕으로 만든 협업 참고용입니다. 중요한 판단의 근거로 쓰면 안 됩니다.",
                    trimDraft(llmDraft)
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private StructuredAnalysis parseNumberedText(MansaeAnalysisRequest request, String llmDraft) {
        if (!StringUtils.hasText(llmDraft)) {
            return null;
        }

        String summary = findSection(llmDraft, "한 줄 요약", "성향 해석");
        String personalityReading = findSection(llmDraft, "성향 해석", "일 스타일");
        String workStyleReading = findSection(llmDraft, "일 스타일", "대화할 때 잘 맞는 방식");
        String communicationGuide = findSection(llmDraft, "대화할 때 잘 맞는 방식", "마찰이 생기기 쉬운 지점");
        String cautions = findSection(llmDraft, "마찰이 생기기 쉬운 지점", "메시지 첫 문장");
        String messageExamples = findSection(llmDraft, "메시지 첫 문장", "회의");
        String collaborationTips = findSection(llmDraft, "회의", "이 분석의 한계");
        String limitation = findSection(llmDraft, "이 분석의 한계", null);

        if (!StringUtils.hasText(summary) || !StringUtils.hasText(personalityReading)) {
            return null;
        }

        return new StructuredAnalysis(
                cleanText(summary),
                cleanText(personalityReading),
                StringUtils.hasText(workStyleReading) ? cleanText(workStyleReading) : buildFeatureAwareWorkStyle(request),
                StringUtils.hasText(communicationGuide) ? cleanText(communicationGuide) : buildFeatureAwareCommunicationGuide(request),
                withFallback(splitLines(cautions), DEFAULT_CAUTIONS),
                withFallback(splitLines(messageExamples), DEFAULT_MESSAGE_EXAMPLES),
                withFallback(splitLines(collaborationTips), DEFAULT_COLLABORATION_TIPS),
                StringUtils.hasText(limitation)
                        ? cleanText(limitation)
                        : "이 가이드는 사용자가 직접 입력한 자료를 바탕으로 만든 협업 참고용입니다. 중요한 판단의 근거로 쓰면 안 됩니다.",
                trimDraft(llmDraft)
        );
    }

    private String extractJsonObject(String rawText) {
        if (!StringUtils.hasText(rawText)) {
            return null;
        }

        int start = rawText.indexOf('{');
        int end = rawText.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        return rawText.substring(start, end + 1);
    }

    private List<String> readTextList(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(item -> addIfPresent(values, item.asText("")));
            return values;
        }
        if (node.isTextual()) {
            return splitLines(node.asText());
        }
        return values;
    }

    private List<String> splitLines(String text) {
        if (!StringUtils.hasText(text)) {
            return List.of();
        }

        List<String> values = new ArrayList<>();
        for (String line : text.split("\\r?\\n|\\s*[-*]\\s+|\\s*\\d+[.)]\\s+")) {
            addIfPresent(values, line);
        }
        return values;
    }

    private void addIfPresent(List<String> values, String value) {
        String cleaned = cleanText(value);
        if (StringUtils.hasText(cleaned)) {
            values.add(cleaned);
        }
    }

    private List<String> withFallback(List<String> values, List<String> fallback) {
        if (values == null || values.isEmpty()) {
            return fallback;
        }
        return values.size() > 3 ? values.subList(0, 3) : values;
    }

    private String findSection(String text, String startMarker, String endMarker) {
        int start = text.indexOf(startMarker);
        if (start < 0) {
            return "";
        }

        start += startMarker.length();
        int end = endMarker == null ? text.length() : text.indexOf(endMarker, start);
        if (end < 0) {
            end = text.length();
        }
        return text.substring(start, end);
    }

    private String cleanText(String text) {
        if (!StringUtils.hasText(text)) {
            return "";
        }
        return text
                .replace("**", "")
                .replace("`", "")
                .replaceAll("(?m)^\\s*#{1,6}\\s*", "")
                .replaceAll("(?m)^\\s*[-*]\\s*", "")
                .replaceAll("(?m)^\\s*\\d+[.)]\\s*", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String trimDraft(String llmDraft) {
        if (!StringUtils.hasText(llmDraft)) {
            return "";
        }
        return llmDraft.length() > 1600 ? llmDraft.substring(0, 1600) + "..." : llmDraft;
    }

    private String buildFallbackAnalysis(MansaeAnalysisRequest request) {
        return String.join("\n",
                "API 키가 아직 설정되지 않아 실제 LLM 호출 대신 로컬 미리보기를 표시합니다.",
                "",
                "한 줄 요약: " + buildFeatureAwareSummary(request),
                "",
                "메시지 예시:",
                "1. \"먼저 배경을 짧게 공유드리면, 이번 요청은 일정 조율을 더 명확히 하기 위한 건입니다.\"",
                "2. \"가능하신 방향을 두 가지로 정리해봤는데, 편하신 쪽을 골라주시면 바로 맞추겠습니다.\"",
                "3. \"제가 이해한 내용이 맞는지 먼저 확인드리고 다음 단계로 넘어가겠습니다.\"",
                "",
                "주의: 이 미리보기는 사용자가 직접 입력한 만세력 자료를 LLM에 전달하기 전의 임시 결과이며, 채용/평가/차별 판단에 사용하면 안 됩니다."
        );
    }

    private String buildFeatureAwareSummary(MansaeAnalysisRequest request) {
        List<String> signals = extractReadingSignals(request.normalizedMansaeJson());
        if (signals.size() >= 2) {
            return request.teammateName() + " 님은 "
                    + joinSignals(signals, 2)
                    + " 쪽이 함께 보여, 요청 배경과 원하는 결과를 먼저 맞추고 들어가면 협업 리듬이 더 안정적일 수 있습니다.";
        }

        return request.teammateName() + " 님과 협업할 때는 바로 결론만 던지기보다, 부탁의 이유와 원하는 결과를 먼저 맞추고 들어가는 편이 좋습니다.";
    }

    private String buildFeatureAwarePersonality(MansaeAnalysisRequest request) {
        List<String> signals = extractReadingSignals(request.normalizedMansaeJson());
        if (signals.size() >= 2) {
            return request.teammateName() + " 님은 "
                    + joinSignals(signals, 2)
                    + " 쪽이 함께 보여, 자기 기준을 세우고 흐름을 스스로 정리하면서 움직이려는 인상으로 읽힙니다. "
                    + "다만 이 해석은 협업 방식을 조율하기 위한 참고 메모로만 보는 편이 적절합니다.";
        }

        return request.teammateName() + " 님은 기준과 우선순위를 먼저 세우고 움직이는 편으로 읽히며, 급하게 밀어붙이기보다 방향을 맞춘 뒤 속도를 내는 쪽이 더 안정적일 수 있습니다.";
    }

    private String buildFeatureAwareWorkStyle(MansaeAnalysisRequest request) {
        List<String> signals = extractReadingSignals(request.normalizedMansaeJson());
        if (signals.size() >= 3) {
            return request.role() + " 역할에서는 "
                    + joinSignals(signals, 3)
                    + " 쪽이 겹쳐 보여, 혼자 판단할 여지와 명확한 기대 결과가 함께 있을 때 리듬이 맞기 쉽습니다.";
        }
        return request.role() + " 역할에서는 결과물의 기준, 확인 포인트, 마감 시점을 먼저 맞춘 뒤 진행하면 협업 리듬이 안정되기 쉽습니다.";
    }

    private String buildFeatureAwareCommunicationGuide(MansaeAnalysisRequest request) {
        List<String> signals = extractReadingSignals(request.normalizedMansaeJson());
        if (containsSignal(signals, "직설적인 표현")) {
            return "대화할 때는 결론만 짧게 던지기보다 배경과 기대 결과를 먼저 맞추고, 표현을 한 번 완충해서 전하는 편이 좋습니다. "
                    + "선택지를 둘이나 셋 정도로 정리해 건네면 답하기가 더 편할 수 있습니다.";
        }
        if (containsSignal(signals, "혼자 먼저 생각을 정리") || containsSignal(signals, "혼자 깊게 정리")) {
            return "대화할 때는 바로 답을 재촉하기보다 먼저 맥락과 요청 범위를 주고, 상대가 한 번 정리할 시간을 가질 수 있게 여유를 두는 편이 좋습니다. "
                    + "질문을 한 번에 여러 개 던지기보다 우선순위를 나눠 건네면 소통이 편해질 수 있습니다.";
        }
        if (containsSignal(signals, "예의와 역할 기준")) {
            return "대화할 때는 요청의 목적과 역할 범위를 먼저 분명히 하고, 표현도 너무 가볍게 흐르지 않게 정돈해 전하는 편이 좋습니다. "
                    + "확인해야 할 기준과 마감 시점을 함께 적어 주면 훨씬 편하게 받아들일 수 있습니다.";
        }
        return "대화할 때는 바로 결론만 던지기보다 왜 이 요청이 필요한지와 어디까지 부탁하는지를 먼저 맞추고 들어가는 편이 좋습니다. "
                + "선택지를 둘이나 셋 정도로 정리해 건네면 답하기가 더 편할 수 있습니다.";
    }

    private String buildFeatureAwareWorkStyleFromSummary(String personalityReading) {
        if (StringUtils.hasText(personalityReading)) {
            return "이 성향 해석을 기준으로 보면, 일을 받을 때 기대 결과와 판단 기준을 먼저 공유받을수록 리듬이 안정되기 쉽습니다.";
        }
        return "결과물의 기준과 우선순위를 먼저 맞춰 두는 쪽이 협업 리듬을 만들기 좋습니다.";
    }

    private List<String> extractFeatureHints(String normalizedMansaeJson) {
        if (!StringUtils.hasText(normalizedMansaeJson)) {
            return List.of();
        }

        try {
            JsonNode root = objectMapper.readTree(normalizedMansaeJson);
            List<String> features = new ArrayList<>();

            String dayPillar = cleanText(root.path("pillars").path("일주").asText(""));
            if (StringUtils.hasText(dayPillar)) {
                features.add("일주 " + dayPillar);
            }

            addKeywordHint(features, root.path("keywordGroups").path("tenGods"), "십성");
            addKeywordHint(features, root.path("keywordGroups").path("lifeStages"), "십이운성");
            addKeywordHint(features, root.path("keywordGroups").path("specialStars"), "신살");

            return features.stream().filter(StringUtils::hasText).distinct().limit(3).toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<String> extractReadingSignals(String normalizedMansaeJson) {
        if (!StringUtils.hasText(normalizedMansaeJson)) {
            return List.of();
        }

        try {
            JsonNode root = objectMapper.readTree(normalizedMansaeJson);
            List<String> signals = new ArrayList<>();
            addReadingSignals(signals, root.path("keywordGroups").path("tenGods"), "tenGods");
            addReadingSignals(signals, root.path("keywordGroups").path("lifeStages"), "lifeStages");
            addReadingSignals(signals, root.path("keywordGroups").path("specialStars"), "specialStars");
            return signals.stream().filter(StringUtils::hasText).distinct().limit(4).toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private void addKeywordHint(List<String> features, JsonNode arrayNode, String groupName) {
        if (!arrayNode.isArray() || arrayNode.isEmpty()) {
            return;
        }

        JsonNode first = arrayNode.get(0);
        String label = cleanText(first.path("label").asText(""));
        int count = first.path("count").asInt(0);
        if (StringUtils.hasText(label)) {
            features.add(groupName + " " + label + (count > 1 ? " x" + count : ""));
        }
    }

    private void addReadingSignals(List<String> signals, JsonNode arrayNode, String groupName) {
        if (!arrayNode.isArray() || arrayNode.isEmpty()) {
            return;
        }

        arrayNode.forEach(item -> {
            String label = cleanText(item.path("label").asText(""));
            int count = item.path("count").asInt(0);
            String signal = switch (groupName) {
                case "tenGods" -> mapTenGodSignal(label, count);
                case "lifeStages" -> mapLifeStageSignal(label);
                case "specialStars" -> mapSpecialStarSignal(label);
                default -> "";
            };
            if (StringUtils.hasText(signal)) {
                signals.add(signal);
            }
        });
    }

    private String mapTenGodSignal(String label, int count) {
        return switch (label) {
            case "비견" -> count > 1 ? "자기 기준과 독립성이 강한 편" : "자기 기준과 독립성이 있는 편";
            case "겁재" -> count > 1 ? "속도감과 주도권 의식이 강한 편" : "속도감과 주도권 의식이 있는 편";
            case "식신" -> count > 1 ? "차분하게 결과물을 쌓아 가는 성향이 강한 편" : "차분하게 결과물을 쌓아 가는 편";
            case "상관" -> count > 1 ? "직설적인 표현과 분명한 기준이 강하게 드러나는 편" : "직설적인 표현과 분명한 기준이 드러나는 편";
            case "편재" -> count > 1 ? "현실 판단과 선택지 비교가 빠른 편" : "현실 판단과 선택지 비교가 빠른 편";
            case "정재" -> count > 1 ? "범위와 마감이 분명할수록 안정감을 크게 느끼는 편" : "범위와 마감이 분명할수록 안정감을 느끼는 편";
            case "편관" -> count > 1 ? "긴장감이 있어도 책임감 있게 버티는 편" : "긴장감이 있어도 책임감 있게 반응하는 편";
            case "정관" -> count > 1 ? "예의와 역할 기준, 질서를 또렷하게 보는 편" : "예의와 역할 기준, 질서를 중요하게 보는 편";
            case "편인" -> count > 1 ? "혼자 먼저 생각을 정리한 뒤 말하는 편" : "혼자 먼저 생각을 정리한 뒤 말하는 편";
            case "정인" -> count > 1 ? "맥락 설명과 이해 과정을 중시하는 편" : "맥락 설명과 이해 과정을 중시하는 편";
            default -> "";
        };
    }

    private String mapLifeStageSignal(String label) {
        return switch (label) {
            case "장생", "건록", "제왕", "관대" -> "시동이 걸리면 추진력이 살아나는 편";
            case "목욕", "태", "양" -> "초반에 탐색과 워밍업을 거치며 리듬을 잡는 편";
            case "쇠", "병", "사", "묘", "절" -> "에너지 소모에 예민해 요청 범위가 또렷할수록 편한 편";
            default -> "";
        };
    }

    private String mapSpecialStarSignal(String label) {
        return switch (label) {
            case "화개" -> "혼자 깊게 정리하는 시간이 있어야 편한 편";
            case "문창" -> "문장과 표현을 다듬는 감각이 살아 있는 편";
            case "장성" -> "존재감과 주도권을 또렷하게 드러내는 편";
            case "도화", "홍염" -> "관계의 온도와 말투에 비교적 민감한 편";
            case "천을", "천덕", "월덕", "천의" -> "완충 표현과 배려가 있을수록 협업이 부드러운 편";
            default -> "";
        };
    }

    private boolean containsSignal(List<String> signals, String keyword) {
        return signals.stream().anyMatch(signal -> signal.contains(keyword));
    }

    private String joinSignals(List<String> signals, int limit) {
        List<String> picked = signals.stream()
                .filter(StringUtils::hasText)
                .limit(limit)
                .toList();

        if (picked.isEmpty()) {
            return "";
        }
        if (picked.size() == 1) {
            return picked.get(0);
        }
        if (picked.size() == 2) {
            return picked.get(0) + "과 " + picked.get(1);
        }
        return String.join(", ", picked.subList(0, picked.size() - 1)) + ", 그리고 " + picked.get(picked.size() - 1);
    }

    private String extractOutputText(Object response) {
        List<String> texts = new ArrayList<>();
        collectText(response, texts);
        if (texts.isEmpty()) {
            return "LLM 응답을 받았지만 텍스트를 추출하지 못했습니다. 응답 구조를 확인해 주세요.";
        }
        return String.join("\n", texts);
    }

    private void collectText(Object node, List<String> texts) {
        if (node instanceof Map<?, ?> map) {
            Object type = map.get("type");
            Object text = map.get("text");
            if ("output_text".equals(type) && text instanceof String value) {
                texts.add(value);
            }
            Object outputText = map.get("output_text");
            if (outputText instanceof String value) {
                texts.add(value);
            }
            map.values().forEach(value -> collectText(value, texts));
            return;
        }

        if (node instanceof List<?> list) {
            list.forEach(value -> collectText(value, texts));
        }
    }

    private void sendSseEvent(BufferedWriter writer, String eventName, Object payload) throws IOException {
        String data;
        try {
            data = objectMapper.writeValueAsString(payload);
        } catch (Exception exception) {
            throw new UncheckedIOException(new IOException("SSE payload serialization failed", exception));
        }

        writer.write("event: " + eventName + "\n");
        for (String line : data.split("\n", -1)) {
            writer.write("data: " + line + "\n");
        }
        writer.write("\n");
        writer.flush();
    }

    public record MansaeAnalysisRequest(
            @NotBlank String teammateName,
            @NotBlank String role,
            @NotBlank String gender,
            @NotBlank String birthDate,
            @NotBlank String birthTime,
            @NotBlank String birthPlace,
            @NotBlank String calendarType,
            @NotBlank String parsedMansaeSummary,
            @NotBlank String normalizedMansaeJson,
            @NotBlank String mansaeRawText
    ) {
    }

    public record LlmAnalysisResponse(
            String provider,
            String model,
            String analysisText,
            boolean usedFallback,
            String promptPreview,
            StructuredAnalysis structuredAnalysis
    ) {
    }

    public record StructuredAnalysis(
            String summary,
            String personalityReading,
            String workStyleReading,
            String communicationGuide,
            List<String> cautions,
            List<String> messageExamples,
            List<String> collaborationTips,
            String limitation,
            String llmDraft
    ) {
    }

    public record MansaeOcrRequest(
            @NotBlank String imageDataUrl
    ) {
    }

    public record MansaeOcrResponse(
            String provider,
            String text,
            boolean usedFallback,
            String note
    ) {
    }
}
