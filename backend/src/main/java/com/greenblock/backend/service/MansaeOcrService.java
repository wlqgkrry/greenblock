package com.greenblock.backend.service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class MansaeOcrService {

    private static final Pattern DATA_URL_PATTERN =
            Pattern.compile("^data:(?<mime>[^;]+);base64,(?<data>.+)$", Pattern.DOTALL);
    private static final Pattern GANJI_PATTERN =
            Pattern.compile("[갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸]\\s?[자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥]");
    private static final List<String> OCR_HINTS = List.of(
            "양력", "음력", "시간", "절입기준", "대운", "연주", "월주", "일주", "시주",
            "상관", "비견", "겁재", "정인", "편인", "식신", "정관", "편관", "편재", "정재",
            "장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양",
            "화개", "장성", "도화", "역마", "천을", "천덕", "월덕", "문창", "천의", "망신"
    );

    public OcrResult extractFromDataUrl(String imageDataUrl) {
        ImagePayload payload = decodeDataUrl(imageDataUrl);
        Path tempDir = null;

        try {
            tempDir = Files.createTempDirectory("greenblock-mansae-ocr-");
            Path workingDir = tempDir;
            Path originalPath = workingDir.resolve("original" + payload.extension());
            Files.write(originalPath, payload.bytes());

            BufferedImage original = ImageIO.read(new ByteArrayInputStream(payload.bytes()));
            if (original == null) {
                throw new IllegalArgumentException("이미지 데이터를 읽지 못했습니다. PNG 또는 JPEG 형식인지 확인해 주세요.");
            }

            Path enhancedPath = workingDir.resolve("enhanced.png");
            ImageIO.write(preprocessImage(original), "png", enhancedPath.toFile());

            List<OcrCandidate> candidates = new ArrayList<>();
            collectCandidate(candidates, () -> runTesseract(originalPath, workingDir.resolve("ocr-original")));
            collectCandidate(candidates, () -> runTesseract(enhancedPath, workingDir.resolve("ocr-enhanced")));

            OcrCandidate bestTesseract = candidates.stream()
                    .filter(candidate -> StringUtils.hasText(candidate.text()))
                    .max(Comparator
                            .comparingInt(OcrCandidate::score)
                            .thenComparingInt(candidate -> candidate.text().length()))
                    .orElse(null);

            if (bestTesseract == null || bestTesseract.score() < 24) {
                collectCandidate(candidates, () -> runWindowsOcr(originalPath));
                collectCandidate(candidates, () -> runWindowsOcr(enhancedPath));
            }

            OcrCandidate best = candidates.stream()
                    .filter(candidate -> StringUtils.hasText(candidate.text()))
                    .max(Comparator
                            .comparingInt(OcrCandidate::score)
                            .thenComparingInt(candidate -> candidate.text().length()))
                    .orElseThrow(() -> new IllegalStateException(
                            "이미지에서 텍스트를 충분히 읽지 못했습니다. 해상도가 더 큰 화면 캡처를 붙여넣거나, 텍스트 복사본을 함께 사용해 주세요."));

            return new OcrResult(
                    best.provider(),
                    best.text().trim(),
                    !"tesseract".equals(best.provider()),
                    "이미지 OCR을 완료했습니다. 원본과 전처리 이미지를 비교해 만세력 키워드가 더 잘 잡히는 결과를 선택했습니다."
                            + ("windows-ocr".equals(best.provider()) ? " tesseract 결과가 약해 Windows OCR fallback을 사용했습니다." : "")
            );
        } catch (IOException exception) {
            throw new IllegalStateException("이미지 OCR 실행에 실패했습니다. " + exception.getMessage(), exception);
        } finally {
            if (tempDir != null) {
                deleteRecursively(tempDir);
            }
        }
    }

    private ImagePayload decodeDataUrl(String imageDataUrl) {
        if (!StringUtils.hasText(imageDataUrl)) {
            throw new IllegalArgumentException("OCR용 이미지 데이터가 비어 있습니다.");
        }

        Matcher matcher = DATA_URL_PATTERN.matcher(imageDataUrl.trim());
        if (!matcher.matches()) {
            throw new IllegalArgumentException("지원하지 않는 이미지 데이터 형식입니다.");
        }

        String mimeType = matcher.group("mime").toLowerCase(Locale.ROOT);
        String base64 = matcher.group("data");
        byte[] bytes = Base64.getDecoder().decode(base64);

        return new ImagePayload(bytes, switch (mimeType) {
            case "image/jpeg", "image/jpg" -> ".jpg";
            case "image/webp" -> ".webp";
            default -> ".png";
        });
    }

    private BufferedImage preprocessImage(BufferedImage original) {
        int targetWidth = Math.min(original.getWidth() * 2, 2800);
        int targetHeight = Math.max(1, (int) Math.round(original.getHeight() * (targetWidth / (double) original.getWidth())));

        BufferedImage scaled = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = scaled.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setColor(Color.WHITE);
        graphics.fillRect(0, 0, targetWidth, targetHeight);
        graphics.drawImage(original, 0, 0, targetWidth, targetHeight, null);
        graphics.dispose();

        BufferedImage normalized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_BYTE_GRAY);
        for (int y = 0; y < targetHeight; y++) {
            for (int x = 0; x < targetWidth; x++) {
                Color color = new Color(scaled.getRGB(x, y));
                int luminance = (int) Math.round((color.getRed() * 0.299) + (color.getGreen() * 0.587) + (color.getBlue() * 0.114));
                int boosted = Math.min(255, (int) (luminance * 1.08));
                int threshold = boosted > 188 ? 255 : 0;
                int rgb = new Color(threshold, threshold, threshold).getRGB();
                normalized.setRGB(x, y, rgb);
            }
        }

        return normalized;
    }

    private void collectCandidate(List<OcrCandidate> candidates, OcrCandidateSupplier supplier) {
        try {
            OcrCandidate candidate = supplier.get();
            if (candidate != null && StringUtils.hasText(candidate.text())) {
                candidates.add(candidate);
            }
        } catch (Exception ignored) {
            // Ignore individual OCR engine failures and continue with the remaining fallbacks.
        }
    }

    private OcrCandidate runTesseract(Path inputPath, Path outputBase)
            throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder(
                "tesseract",
                inputPath.toString(),
                outputBase.toString(),
                "-l",
                "kor+eng",
                "--oem",
                "1",
                "--psm",
                "11",
                "-c",
                "preserve_interword_spaces=1"
        );
        processBuilder.redirectErrorStream(true);

        Process process = processBuilder.start();
        String processOutput = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int exitCode = process.waitFor();
        Path outputTextFile = Path.of(outputBase + ".txt");
        String text = Files.exists(outputTextFile)
                ? Files.readString(outputTextFile, StandardCharsets.UTF_8)
                : "";

        if (exitCode != 0 && !StringUtils.hasText(text)) {
            throw new IllegalStateException("tesseract OCR 실행에 실패했습니다. " + processOutput.trim());
        }

        return new OcrCandidate("tesseract", text, scoreText(text), processOutput);
    }

    private OcrCandidate runWindowsOcr(Path inputPath)
            throws IOException, InterruptedException {
        Path scriptPath = Path.of("scripts", "run-windows-ocr.ps1").toAbsolutePath().normalize();
        ProcessBuilder processBuilder = new ProcessBuilder(
                "powershell.exe",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                scriptPath.toString(),
                "-ImagePath",
                inputPath.toString()
        );
        processBuilder.redirectErrorStream(true);

        Process process = processBuilder.start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        int exitCode = process.waitFor();
        if (exitCode != 0 || !StringUtils.hasText(output)) {
            throw new IllegalStateException("Windows OCR 실행에 실패했습니다. " + output.trim());
        }

        return new OcrCandidate("windows-ocr", output, scoreText(output), output);
    }

    private int scoreText(String text) {
        if (!StringUtils.hasText(text)) {
            return 0;
        }

        int score = 0;
        Matcher ganjiMatcher = GANJI_PATTERN.matcher(text);
        while (ganjiMatcher.find()) {
            score += 4;
        }

        for (String hint : OCR_HINTS) {
            int count = countOccurrences(text, hint);
            if ("양력".equals(hint) || "음력".equals(hint) || "시간".equals(hint) || "절입기준".equals(hint)) {
                score += count * 6;
            } else if ("대운".equals(hint)) {
                score += count * 2;
            } else {
                score += count * 3;
            }
        }

        score += Math.min(text.length() / 80, 12);
        return score;
    }

    private int countOccurrences(String input, String token) {
        int index = 0;
        int count = 0;
        while ((index = input.indexOf(token, index)) >= 0) {
            count += 1;
            index += token.length();
        }
        return count;
    }

    private void deleteRecursively(Path root) {
        try (var walk = Files.walk(root)) {
            walk.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // Temporary OCR artifacts can be left behind if deletion fails.
                }
            });
        } catch (IOException ignored) {
            // Ignore cleanup failures for temp OCR files.
        }
    }

    private record ImagePayload(byte[] bytes, String extension) {
    }

    @FunctionalInterface
    private interface OcrCandidateSupplier {
        OcrCandidate get() throws Exception;
    }

    private record OcrCandidate(String provider, String text, int score, String processOutput) {
    }

    public record OcrResult(
            String provider,
            String text,
            boolean usedFallback,
            String note
    ) {
    }
}
