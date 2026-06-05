package com.greenblock.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
            "만세력 결과를 성격표처럼 말하지 않습니다.",
            "채용, 평가, 차별적 판단의 근거로 쓰지 않습니다.",
            "요청할 때는 배경, 원하는 결과, 마감 시점을 나눠서 전달합니다."
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

    private final ObjectMapper objectMapper;
    private final RestClient openAiClient;
    private final RestClient ollamaClient;
    private final String provider;
    private final String openAiApiKey;
    private final String openAiModel;
    private final String ollamaBaseUrl;
    private final String ollamaModel;

    public LlmAnalysisController(
            ObjectMapper objectMapper,
            RestClient.Builder restClientBuilder,
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
        this.provider = provider;
        this.openAiApiKey = openAiApiKey;
        this.openAiModel = openAiModel;
        this.ollamaBaseUrl = ollamaBaseUrl;
        this.ollamaModel = ollamaModel;
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
                                        "content", "당신은 greenblock의 협업 커뮤니케이션 분석 어시스턴트입니다. 만세력/사주 정보는 사용자가 직접 입력한 참고자료로만 다루고, 단정적 성격 판단이나 채용/평가/차별 판단에 사용하지 마세요. 결과는 한국어로 작성하고, 메시지 톤과 협업 방식 추천에만 집중하세요."
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
                        "system", "당신은 greenblock의 한국어 협업 커뮤니케이션 어시스턴트입니다. 반드시 한국어로만 답하세요. 성별, 성적 지향, 가족관계, 채용, 평가, 차별, 의료, 법률, 금융 판단을 만들지 마세요. 입력에 없는 이름이나 관계를 절대 지어내지 마세요. 사주/만세력은 참고자료이며 메시지 톤과 협업 방식 추천에만 사용하세요.",
                        "prompt", prompt,
                        "format", "json",
                        "keep_alive", "10m",
                        "options", Map.of(
                                "temperature", 0.35,
                                "top_p", 0.85,
                                "num_ctx", 2048,
                                "num_predict", 420
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
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(Map.of(
                        "model", ollamaModel,
                        "system", "당신은 greenblock의 한국어 협업 커뮤니케이션 어시스턴트입니다. 반드시 한국어로만 답하세요. 성별, 성적 지향, 가족관계, 채용, 평가, 차별, 의료, 법률, 금융 판단을 만들지 마세요. 입력에 없는 이름이나 관계를 절대 지어내지 마세요. 사주/만세력은 참고자료이며 메시지 톤과 협업 방식 추천에만 사용하세요.",
                        "prompt", prompt,
                        "keep_alive", "10m",
                        "options", Map.of(
                                "temperature", 0.35,
                                "top_p", 0.85,
                                "num_ctx", 2048,
                                "num_predict", 520
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
                "아래 자료를 바탕으로 팀 협업용 커뮤니케이션 가이드를 작성해 주세요.",
                "",
                "[안전 원칙]",
                "- 이 결과는 사용자가 직접 입력한 자료를 바탕으로 분석됩니다.",
                "- 사주/만세력은 확정적 판단이 아니라 대화 방식 추천을 위한 참고자료로만 사용합니다.",
                "- 채용, 인사평가, 차별적 판단, 의료/법률/금융 판단에는 사용하지 않습니다.",
                "- 표현은 '그럴 수 있음', '선호할 가능성', '확인해보면 좋음'처럼 조심스럽게 작성합니다.",
                "- 입력된 만세력 요약이 달라지면 문장과 추천 방식도 달라져야 합니다.",
                "",
                "[팀원 정보]",
                "이름: " + request.teammateName(),
                "역할: " + request.role(),
                "성별: " + request.gender(),
                "생년월일: " + request.birthDate(),
                "태어난 시간: " + request.birthTime(),
                "태어난 장소: " + request.birthPlace(),
                "양력/음력: " + request.calendarType(),
                "",
                "[greenblock에서 감지한 만세력 요약]",
                request.parsedMansaeSummary(),
                "",
                "[사용자가 붙여넣은 만세력 원문 일부]",
                compactMansaeRawText(request.mansaeRawText()),
                "",
                "[출력 규칙]",
                "- 한국어로만 작성합니다.",
                "- 입력에 없는 사람, 관계, 성적 지향, 가족관계, 질병, 재정 상태를 지어내지 않습니다.",
                "- 만세력 정보를 절대 확정적 성격 판단처럼 쓰지 않습니다.",
                "- 마크다운, 번호 목록, 설명 문장 없이 JSON 객체만 반환합니다.",
                "- 모든 배열은 3개 항목을 채웁니다.",
                "",
                "[출력 JSON 스키마]",
                "{",
                "  \"summary\": \"한 문장 요약\",",
                "  \"communicationHypothesis\": \"대화할 때 참고할 점 2~3문장\",",
                "  \"cautions\": [\"주의할 점 1\", \"주의할 점 2\", \"주의할 점 3\"],",
                "  \"messageExamples\": [\"메시지 첫 문장 1\", \"메시지 첫 문장 2\", \"메시지 첫 문장 3\"],",
                "  \"collaborationTips\": [\"회의 방식\", \"피드백 방식\", \"업무 요청 방식\"],",
                "  \"limitation\": \"이 분석의 한계와 주의 문구\"",
                "}"
        );
    }

    private String buildStreamingPrompt(MansaeAnalysisRequest request) {
        return String.join("\n",
                "아래 자료를 바탕으로 팀 협업용 커뮤니케이션 가이드를 작성해 주세요.",
                "",
                "[안전 원칙]",
                "- 이 결과는 사용자가 직접 입력한 자료를 바탕으로 분석됩니다.",
                "- 사주/만세력은 확정적 판단이 아니라 대화 방식 추천을 위한 참고자료로만 사용합니다.",
                "- 채용, 인사평가, 차별적 판단, 의료/법률/금융 판단에는 사용하지 않습니다.",
                "- 입력된 만세력 요약이 달라지면 문장과 추천 방식도 달라져야 합니다.",
                "",
                "[팀원 정보]",
                "이름: " + request.teammateName(),
                "역할: " + request.role(),
                "성별: " + request.gender(),
                "생년월일: " + request.birthDate(),
                "태어난 시간: " + request.birthTime(),
                "태어난 장소: " + request.birthPlace(),
                "양력/음력: " + request.calendarType(),
                "",
                "[greenblock에서 감지한 만세력 요약]",
                request.parsedMansaeSummary(),
                "",
                "[사용자가 붙여넣은 만세력 원문 일부]",
                compactMansaeRawText(request.mansaeRawText()),
                "",
                "[출력 규칙]",
                "- 한국어로만 작성합니다.",
                "- 입력에 없는 사람, 관계, 성적 지향, 가족관계, 질병, 재정 상태를 지어내지 않습니다.",
                "- 만세력 정보를 절대 확정적 성격 판단처럼 쓰지 않습니다.",
                "- 아래 제목을 그대로 사용합니다.",
                "- 각 항목은 길어도 2~3문장 또는 3개 항목 이내로 씁니다.",
                "- 마크다운 코드블록이나 JSON은 쓰지 않습니다.",
                "",
                "[출력 형식]",
                "1. 한 줄 요약",
                "2. 커뮤니케이션 성향 가설",
                "3. 협업할 때 조심하면 좋은 점",
                "4. 메시지 첫 문장 예시 3개",
                "5. 회의/피드백/업무 요청 추천 방식",
                "6. 이 분석의 한계와 주의 문구"
        );
    }

    private String compactMansaeRawText(String rawText) {
        if (!StringUtils.hasText(rawText)) {
            return "원문 없음";
        }

        String compacted = rawText
                .replaceAll("\\s+", " ")
                .trim();
        int maxLength = 1200;
        if (compacted.length() <= maxLength) {
            return compacted;
        }
        return compacted.substring(0, maxLength) + "...";
    }

    private StructuredAnalysis buildStructuredAnalysis(MansaeAnalysisRequest request, String llmDraft) {
        StructuredAnalysis llmStructured = parseStructuredJson(llmDraft);
        if (llmStructured != null) {
            return llmStructured;
        }

        StructuredAnalysis markdownStructured = parseNumberedText(llmDraft);
        if (markdownStructured != null) {
            return markdownStructured;
        }

        return new StructuredAnalysis(
                request.teammateName() + " 님과 협업할 때는 바로 결론부터 던지기보다, 부탁의 이유와 원하는 결과를 먼저 맞추고 들어가는 편이 좋습니다.",
                "붙여넣은 만세력은 성향을 단정하는 자료가 아니라 대화 방식을 조율하기 위한 메모로만 봅니다. " + request.role() + " 역할을 고려하면 결과물의 기준, 확인할 지점, 마감 시점을 먼저 맞춰 두는 쪽이 협업 리듬을 만들기 좋습니다.",
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

    private StructuredAnalysis parseStructuredJson(String llmDraft) {
        String json = extractJsonObject(llmDraft);
        if (!StringUtils.hasText(json)) {
            return null;
        }

        try {
            JsonNode root = objectMapper.readTree(json);
            String summary = cleanText(root.path("summary").asText(""));
            String communicationHypothesis = cleanText(root.path("communicationHypothesis").asText(""));
            String limitation = cleanText(root.path("limitation").asText(""));
            List<String> cautions = readTextList(root.path("cautions"));
            List<String> messageExamples = readTextList(root.path("messageExamples"));
            List<String> collaborationTips = readTextList(root.path("collaborationTips"));

            if (!StringUtils.hasText(summary) || !StringUtils.hasText(communicationHypothesis)) {
                return null;
            }

            return new StructuredAnalysis(
                    summary,
                    communicationHypothesis,
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

    private StructuredAnalysis parseNumberedText(String llmDraft) {
        if (!StringUtils.hasText(llmDraft)) {
            return null;
        }

        String summary = findSection(llmDraft, "한 줄 요약", "커뮤니케이션 성향 가설");
        String communicationHypothesis = findSection(llmDraft, "커뮤니케이션 성향 가설", "협업할 때 조심하면 좋은 점");
        String cautions = findSection(llmDraft, "협업할 때 조심하면 좋은 점", "메시지 첫 문장");
        String messageExamples = findSection(llmDraft, "메시지 첫 문장", "회의");
        String collaborationTips = findSection(llmDraft, "회의", "이 분석의 한계");
        String limitation = findSection(llmDraft, "이 분석의 한계", null);

        if (!StringUtils.hasText(summary) || !StringUtils.hasText(communicationHypothesis)) {
            return null;
        }

        return new StructuredAnalysis(
                cleanText(summary),
                cleanText(communicationHypothesis),
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
                "한 줄 요약: " + request.teammateName() + " 님에게는 단정적인 판단보다 맥락을 먼저 공유하고 선택지를 좁혀 제안하는 메시지가 적합할 수 있습니다.",
                "",
                "메시지 예시:",
                "1. \"먼저 배경을 짧게 공유드리면, 이번 요청은 일정 조율을 더 명확히 하기 위한 건입니다.\"",
                "2. \"가능하신 방향을 두 가지로 정리해봤는데, 편하신 쪽을 골라주시면 바로 맞추겠습니다.\"",
                "3. \"제가 이해한 내용이 맞는지 먼저 확인드리고 다음 단계로 넘어가겠습니다.\"",
                "",
                "주의: 이 미리보기는 사용자가 직접 입력한 만세력 자료를 LLM에 전달하기 전의 임시 결과이며, 채용/평가/차별 판단에 사용하면 안 됩니다."
        );
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
            String communicationHypothesis,
            List<String> cautions,
            List<String> messageExamples,
            List<String> collaborationTips,
            String limitation,
            String llmDraft
    ) {
    }
}
