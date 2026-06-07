const stems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const branches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
const hanjaStemMap: Record<string, string> = {
  甲: '갑',
  乙: '을',
  丙: '병',
  丁: '정',
  戊: '무',
  己: '기',
  庚: '경',
  辛: '신',
  壬: '임',
  癸: '계',
}
const hanjaBranchMap: Record<string, string> = {
  子: '자',
  丑: '축',
  寅: '인',
  卯: '묘',
  辰: '진',
  巳: '사',
  午: '오',
  未: '미',
  申: '신',
  酉: '유',
  戌: '술',
  亥: '해',
}
const ganjiPattern = /[갑을병정무기경신임계]\s?[자축인묘진사오미신유술해]/g
const hanjaGanjiPattern = /[甲乙丙丁戊己庚辛壬癸]\s?[子丑寅卯辰巳午未申酉戌亥]/g
const singleStemPattern = /^[갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸]$/
const singleBranchPattern = /^[자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥]$/
const tenGodKeywords = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const
const lifeStageKeywords = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'] as const
const specialStarKeywords = [
  '화개',
  '장성',
  '도화',
  '역마',
  '천을',
  '천덕',
  '월덕',
  '문창',
  '천의',
  '망신',
  '육해',
  '괴강',
  '재살',
  '겁살',
  '반안',
  '공망',
  '귀문',
  '백호',
  '현침',
  '홍염',
  '금여',
] as const
const hanjaKeywordMap: Record<string, string> = {
  比肩: '비견',
  劫財: '겁재',
  食神: '식신',
  傷官: '상관',
  偏財: '편재',
  正財: '정재',
  偏官: '편관',
  正官: '정관',
  偏印: '편인',
  正印: '정인',
  長生: '장생',
  沐浴: '목욕',
  冠帶: '관대',
  建祿: '건록',
  帝旺: '제왕',
  衰: '쇠',
  病: '병',
  死: '사',
  墓: '묘',
  絶: '절',
  胎: '태',
  養: '양',
  華蓋: '화개',
  將星: '장성',
  桃花: '도화',
  驛馬: '역마',
  天乙: '천을',
  天德: '천덕',
  月德: '월덕',
  文昌: '문창',
  天醫: '천의',
  亡神: '망신',
  六害: '육해',
  空亡: '공망',
  災煞: '재살',
  劫煞: '겁살',
  攀鞍: '반안',
  白虎: '백호',
  魁罡: '괴강',
  金輿: '금여',
  紅艶: '홍염',
}

type KeywordGroupKey = 'tenGods' | 'lifeStages' | 'specialStars'
type ParseSourceType = 'html' | 'text' | 'image' | 'empty'
type ExtractionConfidence = 'high' | 'medium' | 'low'

type KeywordCount = {
  label: string
  count: number
}

type MansaeBirthDetails = {
  solarDate: string | null
  lunarDate: string | null
  birthTime: string | null
  birthPlace: string | null
  solarTerm: string | null
}

type MansaeCurrentBigFlow = {
  decadeLabel: string | null
  range: string | null
  selectedAge: string | null
  selectedYear: string | null
  pillar: string | null
  tenGod: string | null
  lifeStage: string | null
  specialStar: string | null
  source: 'html' | 'text' | 'unknown'
}

type MansaeKeywordGroups = Record<KeywordGroupKey, KeywordCount[]>

type MansaeNormalizedPayload = {
  sourceType: ParseSourceType
  extractionConfidence: ExtractionConfidence
  pillars: Record<string, string>
  birthInfo: MansaeBirthDetails
  currentBigFlow: MansaeCurrentBigFlow | null
  keywordGroups: MansaeKeywordGroups
  notes: string[]
}

type HtmlCell = {
  text: string
  isHighlighted: boolean
}

type HtmlExtraction = {
  structuredText: string
  tablePillars: string[]
  currentBigFlow: MansaeCurrentBigFlow | null
}

export type MansaePasteInput = {
  rawText: string
  rawHtml?: string | null
  imageDataUrl?: string | null
  ocrText?: string | null
}

export type MansaeLlmRequest = {
  teammateName: string
  role: string
  gender: string
  birthDate: string
  birthTime: string
  birthPlace: string
  calendarType: string
  parsedMansaeSummary: string
  normalizedMansaeJson: string
  mansaeRawText: string
}

export type MansaeLlmResponse = {
  provider: string
  model: string
  analysisText: string
  usedFallback: boolean
  promptPreview: string
  structuredAnalysis?: {
    summary: string
    personalityReading: string
    workStyleReading: string
    communicationGuide: string
    cautions: string[]
    messageExamples: string[]
    collaborationTips: string[]
    limitation: string
    llmDraft: string
  }
}

export type MansaeLlmStreamMeta = {
  provider: string
  model: string
}

export type MansaeOcrResponse = {
  provider: string
  text: string
  usedFallback: boolean
  note: string
}

export type MansaeParseResult = {
  sourceType: ParseSourceType
  extractionConfidence: ExtractionConfidence
  lines: string[]
  rawStructuredText: string
  allGanji: string[]
  sajuTable: { label: string; value: string }[]
  bigFlow: MansaeCurrentBigFlow | null
  detectionNote: string
  birthInfo: MansaeBirthDetails
  keywordGroups: MansaeKeywordGroups
  llmSummaryPayload: string
  llmPayload: string
  normalizedPayloadJson: string
  pastedImageDetected: boolean
}

type MansaeStreamHandlers = {
  onMeta?: (meta: MansaeLlmStreamMeta) => void
  onChunk?: (chunk: string) => void
  signal?: AbortSignal
}

export function parseMansaePaste(input: string | MansaePasteInput): MansaeParseResult {
  const source = normalizePasteInput(input)
  const htmlExtraction = source.rawHtml ? parseMansaeHtml(source.rawHtml) : null
  const structuredText = htmlExtraction?.structuredText || source.rawText.trim() || source.ocrText?.trim() || source.rawText
  const keywordNormalizedText = normalizeKeywordHanja(structuredText)
  const lines = toLines(structuredText)
  const fallbackNormalized = normalizeWhitespace([structuredText, source.rawText].filter(Boolean).join('\n'))
  const allGanji = extractGanji(fallbackNormalized)
  const calculated = calculatePillarsFromBirthText(fallbackNormalized)

  const labeled = {
    year: findLabeledGanji(lines, ['연주', '년주', '세주']),
    month: findLabeledGanji(lines, ['월주']),
    day: findLabeledGanji(lines, ['일주']),
    hour: findLabeledGanji(lines, ['시주']),
  }

  const fallbackPillars = htmlExtraction?.tablePillars ?? allGanji
  const sajuTable = [
    { label: '연주', value: labeled.year ?? calculated?.year ?? fallbackPillars[0] ?? '감지 안 됨' },
    { label: '월주', value: labeled.month ?? calculated?.month ?? fallbackPillars[1] ?? '감지 안 됨' },
    { label: '일주', value: labeled.day ?? calculated?.day ?? fallbackPillars[2] ?? '감지 안 됨' },
    { label: '시주', value: labeled.hour ?? calculated?.hour ?? fallbackPillars[3] ?? '감지 안 됨' },
  ]

  const birthInfo = buildBirthDetails(fallbackNormalized)
  const keywordGroups = extractKeywordGroups(keywordNormalizedText)
  const bigFlow = htmlExtraction?.currentBigFlow ?? null
  const detectionNote = buildDetectionNote({
    htmlUsed: Boolean(htmlExtraction),
    calculated,
    labeledCount: Object.values(labeled).filter(Boolean).length,
    pillarCount: sajuTable.filter((item) => item.value !== '감지 안 됨').length,
    imageDetected: Boolean(source.imageDataUrl),
  })
  const extractionConfidence = getExtractionConfidence(Boolean(htmlExtraction), Boolean(calculated), sajuTable)
  const normalizedPayload = buildNormalizedPayload(
    sajuTable,
    birthInfo,
    keywordGroups,
    bigFlow,
    detectionNote,
    source,
    extractionConfidence,
  )
  const normalizedPayloadJson = JSON.stringify(normalizedPayload, null, 2)
  const llmSummaryPayload = buildPromptSummary(normalizedPayload)

  return {
    sourceType: normalizedPayload.sourceType,
    extractionConfidence,
    lines,
    rawStructuredText: structuredText,
    allGanji,
    sajuTable,
    bigFlow,
    detectionNote,
    birthInfo,
    keywordGroups,
    llmSummaryPayload,
    llmPayload: buildLlmPayload(source.rawText, llmSummaryPayload, normalizedPayloadJson),
    normalizedPayloadJson,
    pastedImageDetected: Boolean(source.imageDataUrl),
  }
}

export function buildManualAnalysis(
  teammateName: string,
  archetype: string,
  rawText: string,
) {
  if (!rawText.trim()) {
    return '만세력 원문을 붙여넣으면 greenblock이 먼저 구조를 재정리하고, 그 결과를 바탕으로 협업 가이드를 만들 준비를 합니다.'
  }

  return `${teammateName} 님의 만세력 원문을 네 기둥과 핵심 키워드 기준으로 재구성했습니다. 이 정보는 ${archetype} 맥락과 함께 참고하되, 성격을 단정하지 않고 메시지 시작 문장, 업무 요청 방식, 피드백 톤을 정리하는 데만 사용합니다.`
}

export async function requestMansaeAnalysis(
  request: MansaeLlmRequest,
): Promise<MansaeLlmResponse> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  const response = await fetch(`${apiBaseUrl}/api/llm/mansae-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'LLM 분석 요청에 실패했습니다.')
  }

  return response.json() as Promise<MansaeLlmResponse>
}

export async function requestMansaeOcr(imageDataUrl: string): Promise<MansaeOcrResponse> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  const response = await fetch(`${apiBaseUrl}/api/llm/mansae-ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageDataUrl,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || '만세력 이미지 OCR 요청에 실패했습니다.')
  }

  return response.json() as Promise<MansaeOcrResponse>
}

export async function requestMansaeAnalysisStream(
  request: MansaeLlmRequest,
  handlers: MansaeStreamHandlers = {},
): Promise<MansaeLlmResponse> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
  const response = await fetch(`${apiBaseUrl}/api/llm/mansae-analysis/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
    signal: handlers.signal,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'LLM 스트리밍 요청에 실패했습니다.')
  }

  if (!response.body) {
    return requestMansaeAnalysis(request)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: MansaeLlmResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done }).replace(/\r/g, '')

    let boundaryIndex = buffer.indexOf('\n\n')
    while (boundaryIndex >= 0) {
      const rawEvent = buffer.slice(0, boundaryIndex)
      buffer = buffer.slice(boundaryIndex + 2)
      const parsed = parseSseEvent(rawEvent)

      if (parsed?.event === 'meta') {
        handlers.onMeta?.(JSON.parse(parsed.data) as MansaeLlmStreamMeta)
      }

      if (parsed?.event === 'chunk') {
        const chunkPayload = JSON.parse(parsed.data) as { text?: string }
        if (chunkPayload.text) {
          handlers.onChunk?.(chunkPayload.text)
        }
      }

      if (parsed?.event === 'done') {
        finalResult = JSON.parse(parsed.data) as MansaeLlmResponse
      }

      if (parsed?.event === 'error') {
        const errorPayload = JSON.parse(parsed.data) as { message?: string }
        throw new Error(errorPayload.message || 'LLM 스트리밍 중 오류가 발생했습니다.')
      }

      boundaryIndex = buffer.indexOf('\n\n')
    }

    if (done) {
      break
    }
  }

  if (!finalResult) {
    throw new Error('스트리밍 응답은 도착했지만 최종 분석 결과를 받지 못했습니다.')
  }

  return finalResult
}

function parseSseEvent(rawEvent: string) {
  if (!rawEvent.trim()) {
    return null
  }

  let event = 'message'
  const dataLines: string[] = []

  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  return {
    event,
    data: dataLines.join('\n'),
  }
}

function normalizePasteInput(input: string | MansaePasteInput): MansaePasteInput {
  if (typeof input === 'string') {
    return {
      rawText: input,
      rawHtml: '',
      imageDataUrl: '',
      ocrText: '',
    }
  }

  return {
    rawText: input.rawText ?? '',
    rawHtml: input.rawHtml ?? '',
    imageDataUrl: input.imageDataUrl ?? '',
    ocrText: input.ocrText ?? '',
  }
}

function parseMansaeHtml(rawHtml: string): HtmlExtraction | null {
  if (!rawHtml.trim() || typeof DOMParser === 'undefined') {
    return null
  }

  const document = new DOMParser().parseFromString(rawHtml, 'text/html')
  const tables = Array.from(document.querySelectorAll('table'))
    .map((table) => parseHtmlTable(table))
    .filter((table) => table.length > 0)

  if (!tables.length) {
    return null
  }

  const structuredLines = tables.flatMap((table) => table.map((row) => row.map((cell) => cell.text).filter(Boolean).join('\t')))
  const bodyText = normalizeWhitespace(document.body.textContent ?? '')
  if (bodyText) {
    structuredLines.push(bodyText)
  }

  return {
    structuredText: structuredLines.filter(Boolean).join('\n'),
    tablePillars: extractPillarsFromHtmlTables(tables),
    currentBigFlow: extractCurrentBigFlowFromHtmlTables(tables, structuredLines),
  }
}

function parseHtmlTable(table: Element) {
  return Array.from(table.querySelectorAll('tr'))
    .map((row) =>
      Array.from(row.querySelectorAll('th, td'))
        .map((cell) => ({
          text: normalizeWhitespace(cell.textContent ?? ''),
          isHighlighted: isHighlightedCell(cell),
        }))
        .filter((cell) => cell.text),
    )
    .filter((row) => row.length > 0)
}

function isHighlightedCell(cell: Element) {
  const style = cell.getAttribute('style') ?? ''
  const className = cell.getAttribute('class') ?? ''
  const hint = `${style} ${className}`.toLowerCase()
  return ['background', 'active', 'current', 'selected', 'highlight', 'focus'].some((keyword) =>
    hint.includes(keyword),
  )
}

function extractPillarsFromHtmlTables(tables: HtmlCell[][][]) {
  for (const table of tables) {
    for (let rowIndex = 0; rowIndex < table.length - 1; rowIndex += 1) {
      const upperRow = table[rowIndex]
      const lowerRow = table[rowIndex + 1]
      const columnCount = Math.min(upperRow.length, lowerRow.length)
      const pillars: string[] = []

      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const pillar =
          combineGanjiCells(upperRow[columnIndex]?.text ?? '', lowerRow[columnIndex]?.text ?? '') ??
          normalizeGanjiToken(upperRow[columnIndex]?.text ?? '')
        if (pillar) {
          pillars.push(pillar)
        }
      }

      if (pillars.length >= 4) {
        return pillars.slice(0, 4)
      }
    }
  }

  return []
}

function extractCurrentBigFlowFromHtmlTables(
  tables: HtmlCell[][][],
  structuredLines: string[],
): MansaeCurrentBigFlow | null {
  const rangeCandidates = extractBigFlowRanges(structuredLines.join('\n'))
  let selected: MansaeCurrentBigFlow | null = null
  let selectedHighlightCount = 0

  for (const table of tables) {
    const columnCount = table.reduce((max, row) => Math.max(max, row.length), 0)
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const column = table
        .map((row) => row[columnIndex])
        .filter((cell): cell is HtmlCell => Boolean(cell))

      const highlightCount = column.filter((cell) => cell.isHighlighted).length
      if (highlightCount === 0) {
        continue
      }

      const columnText = column.map((cell) => cell.text)
      const candidate = buildBigFlowCandidate(columnText, 'html')
      if (!candidate) {
        continue
      }

      if (highlightCount > selectedHighlightCount) {
        const rangeMatch = matchBigFlowRange(rangeCandidates, candidate.selectedYear)
        selectedHighlightCount = highlightCount
        selected = {
          ...candidate,
          decadeLabel: rangeMatch?.label ?? candidate.decadeLabel,
          range: rangeMatch?.range ?? candidate.range,
        }
      }
    }
  }

  return selected
}

function extractBigFlowRanges(input: string) {
  const matches = input.matchAll(
    /([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸]\s?[자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])\s*대운\s*(\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*~\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/g,
  )

  return Array.from(matches, (match) => ({
    label: normalizeGanjiToken(match[1]) ?? match[1],
    range: match[2].replace(/\s+/g, ' ').trim(),
  }))
}

function matchBigFlowRange(
  ranges: { label: string; range: string }[],
  selectedYear: string | null,
) {
  if (!selectedYear) {
    return ranges[0] ?? null
  }

  const year = Number(selectedYear)
  if (Number.isNaN(year)) {
    return ranges[0] ?? null
  }

  return (
    ranges.find((range) => {
      const years = range.range.match(/\d{4}/g)
      if (!years || years.length < 2) {
        return false
      }
      return year >= Number(years[0]) && year <= Number(years[1])
    }) ?? ranges[0] ?? null
  )
}

function buildBigFlowCandidate(
  columnText: string[],
  source: MansaeCurrentBigFlow['source'],
): MansaeCurrentBigFlow | null {
  const tokens = tokenizeWords(columnText.join(' '))
  const pillar = extractGanji(columnText.join(' '))[0] ?? null
  const selectedAge = columnText.find((text) => /^\d{1,2}$/.test(text)) ?? null
  const selectedYear = columnText.find((text) => /^\d{4}$/.test(text)) ?? null
  const tenGod = findKeyword(tokens, tenGodKeywords)
  const lifeStage = findKeyword(tokens, lifeStageKeywords)
  const specialStar = findKeyword(tokens, specialStarKeywords)

  if (!pillar && !tenGod && !selectedYear) {
    return null
  }

  return {
    decadeLabel: null,
    range: null,
    selectedAge,
    selectedYear,
    pillar,
    tenGod,
    lifeStage,
    specialStar,
    source,
  }
}

function buildBirthDetails(normalized: string): MansaeBirthDetails {
  const solarBirth = parseSolarBirth(normalized)
  const lunarBirth = parseLunarBirth(normalized)
  const birthTime = parseBirthTime(normalized)
  const solarTerm = parseSolarTerm(normalized)

  return {
    solarDate: solarBirth
      ? `${solarBirth.year}년 ${solarBirth.month}월 ${solarBirth.day}일`
      : null,
    lunarDate: lunarBirth
      ? `${lunarBirth.year}년 ${lunarBirth.month}월 ${lunarBirth.day}일`
      : null,
    birthTime: birthTime
      ? `${pad(birthTime.hour)}시 ${pad(birthTime.minute)}분`
      : null,
    birthPlace: birthTime?.place ?? null,
    solarTerm: solarTerm
      ? `${solarTerm.year}년 ${solarTerm.month}월 ${solarTerm.day}일 ${pad(solarTerm.hour)}시 ${pad(solarTerm.minute)}분 (${solarTerm.name})`
      : null,
  }
}

function extractKeywordGroups(input: string): MansaeKeywordGroups {
  const tokens = tokenizeWords(input)

  return {
    tenGods: countKeywords(tokens, tenGodKeywords),
    lifeStages: countKeywords(tokens, lifeStageKeywords),
    specialStars: countKeywords(tokens, specialStarKeywords),
  }
}

function buildDetectionNote(options: {
  htmlUsed: boolean
  calculated: { birthSummary: string } | null
  labeledCount: number
  pillarCount: number
  imageDetected: boolean
}) {
  const notes: string[] = []

  if (options.htmlUsed) {
    notes.push('복사된 HTML 표 구조를 우선 읽어 줄 순서를 최대한 보존했습니다.')
  } else {
    notes.push('일반 텍스트 복사본을 기준으로 연주·월주·일주·시주를 감지했습니다.')
  }

  if (options.calculated) {
    notes.push(`${options.calculated.birthSummary} 기준으로 사주 네 기둥을 자동 보정했습니다.`)
  } else if (options.labeledCount > 0) {
    notes.push('명시적으로 적힌 연주·월주·일주·시주 표기를 우선 사용했습니다.')
  } else if (options.pillarCount === 4) {
    notes.push('표 안에서 감지한 간지 조합을 이용해 네 기둥을 재구성했습니다.')
  }

  if (options.imageDetected) {
    notes.push('이미지 붙여넣기도 감지했지만, 현재는 텍스트/HTML 복사본을 우선 분석합니다.')
  }

  notes.push('현재 선택된 대운 블록은 구조만 보관하고 이번 해석 문장에는 사용하지 않습니다.')
  return notes.join(' ')
}

function getExtractionConfidence(
  htmlUsed: boolean,
  calculated: boolean,
  sajuTable: { value: string }[],
): ExtractionConfidence {
  const detectedCount = sajuTable.filter((item) => item.value !== '감지 안 됨').length
  if (detectedCount === 4 && (htmlUsed || calculated)) {
    return 'high'
  }

  if (detectedCount === 4) {
    return 'medium'
  }

  return 'low'
}

function buildNormalizedPayload(
  sajuTable: { label: string; value: string }[],
  birthInfo: MansaeBirthDetails,
  keywordGroups: MansaeKeywordGroups,
  bigFlow: MansaeCurrentBigFlow | null,
  detectionNote: string,
  source: MansaePasteInput,
  extractionConfidence: ExtractionConfidence,
): MansaeNormalizedPayload {
  return {
    sourceType: source.rawHtml
      ? 'html'
      : source.imageDataUrl && source.ocrText?.trim()
        ? 'image'
      : source.rawText.trim()
        ? 'text'
        : source.imageDataUrl
          ? 'image'
          : 'empty',
    extractionConfidence,
    pillars: Object.fromEntries(sajuTable.map((item) => [item.label, item.value])),
    birthInfo,
    currentBigFlow: bigFlow,
    keywordGroups,
    notes: [detectionNote],
  }
}

function buildPromptSummary(payload: MansaeNormalizedPayload) {
  const pillarSummary = ['연주', '월주', '일주', '시주']
    .map((label) => `${label} ${payload.pillars[label] ?? '감지 안 됨'}`)
    .join(', ')

  return [
    `[네 기둥] ${pillarSummary}`,
    `[출생 정보] 양력 ${payload.birthInfo.solarDate ?? '없음'}, 음력 ${payload.birthInfo.lunarDate ?? '없음'}, 시간 ${payload.birthInfo.birthTime ?? '없음'}, 장소 ${payload.birthInfo.birthPlace ?? '없음'}`,
    `[절입기준] ${payload.birthInfo.solarTerm ?? '없음'}`,
    `[십성 키워드] ${formatKeywordSummary(payload.keywordGroups.tenGods)}`,
    `[십이운성] ${formatKeywordSummary(payload.keywordGroups.lifeStages)}`,
    `[신살·보조 키워드] ${formatKeywordSummary(payload.keywordGroups.specialStars)}`,
    `[현재 대운 구조] ${formatBigFlowSummary(payload.currentBigFlow)}`,
  ].join('\n')
}

function buildLlmPayload(
  rawText: string,
  summaryPayload: string,
  normalizedPayloadJson: string,
) {
  return [
    '목표: 사용자가 직접 붙여넣은 만세력 자료를 구조화한 뒤 팀 협업용 대화 가이드를 만든다.',
    '출처 안내: 이 자료는 사용자가 직접 입력한 내용이며, 외부 사이트와 공식 제휴하거나 자동 연동한 결과가 아니다.',
    '사용 범위: 채용, 인사평가, 차별적 판단에는 쓰지 않고 메시지 톤, 회의 방식, 피드백 방식 추천에만 사용한다.',
    '분석 범위: 현재 선택된 대운 구조는 보관하되 이번 해석 문장에는 사용하지 않는다.',
    '',
    '[greenblock 요약]',
    summaryPayload,
    '',
    '[greenblock 정규화 JSON]',
    normalizedPayloadJson,
    '',
    '[사용자 붙여넣기 원문]',
    rawText || '원문 없음',
  ].join('\n')
}

function formatKeywordSummary(items: KeywordCount[]) {
  if (!items.length) {
    return '감지 안 됨'
  }

  return items.map((item) => `${item.label} x${item.count}`).join(', ')
}

function formatBigFlowSummary(bigFlow: MansaeCurrentBigFlow | null) {
  if (!bigFlow) {
    return '복사본에서 활성 대운 칸을 찾지 못했습니다.'
  }

  return [
    bigFlow.decadeLabel,
    bigFlow.range,
    bigFlow.selectedYear ? `${bigFlow.selectedYear}년` : null,
    bigFlow.selectedAge ? `${bigFlow.selectedAge}세 구간` : null,
    bigFlow.pillar,
    bigFlow.tenGod,
    bigFlow.lifeStage,
    bigFlow.specialStar,
  ]
    .filter(Boolean)
    .join(' / ')
}

function toLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function tokenizeWords(input: string) {
  return normalizeWhitespace(normalizeKeywordHanja(input)).match(/[가-힣]{1,4}/g) ?? []
}

function normalizeKeywordHanja(input: string) {
  return Object.entries(hanjaKeywordMap).reduce(
    (result, [hanja, korean]) => result.replaceAll(hanja, ` ${korean} `),
    input,
  )
}

function countKeywords(tokens: string[], keywords: readonly string[]) {
  return keywords
    .map((label) => ({
      label,
      count: tokens.filter((token) => token === label).length,
    }))
    .filter((item) => item.count > 0)
}

function findKeyword(tokens: string[], keywords: readonly string[]) {
  return keywords.find((keyword) => tokens.includes(keyword)) ?? null
}

function findLabeledGanji(lines: string[], labels: string[]) {
  for (const line of lines) {
    if (!labels.some((label) => line.includes(label))) {
      continue
    }

    const matches = extractGanji(line)
    if (matches[0]) {
      return matches[0]
    }
  }

  return null
}

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, ' ').trim()
}

function extractGanji(input: string) {
  const korean = input.match(ganjiPattern) ?? []
  const hanja = input.match(hanjaGanjiPattern) ?? []

  return Array.from(
    new Set([
      ...korean.map((value) => value.replace(/\s/g, '')),
      ...hanja.map((value) => convertHanjaGanji(value.replace(/\s/g, ''))),
    ]),
  )
}

function normalizeGanjiToken(value: string) {
  const compact = value.replace(/\s/g, '')
  if (ganjiPattern.test(compact)) {
    ganjiPattern.lastIndex = 0
    return compact
  }
  ganjiPattern.lastIndex = 0

  if (hanjaGanjiPattern.test(compact)) {
    hanjaGanjiPattern.lastIndex = 0
    return convertHanjaGanji(compact)
  }
  hanjaGanjiPattern.lastIndex = 0

  return null
}

function combineGanjiCells(upper: string, lower: string) {
  const compactUpper = upper.replace(/\s/g, '')
  const compactLower = lower.replace(/\s/g, '')

  if (normalizeGanjiToken(compactUpper)) {
    return normalizeGanjiToken(compactUpper)
  }

  if (!singleStemPattern.test(compactUpper) || !singleBranchPattern.test(compactLower)) {
    return null
  }

  return normalizeGanjiToken(`${compactUpper}${compactLower}`)
}

function convertHanjaGanji(value: string) {
  const [stem, branch] = value.split('')
  return `${hanjaStemMap[stem] ?? stem}${hanjaBranchMap[branch] ?? branch}`
}

function calculatePillarsFromBirthText(normalized: string) {
  const birth = parseSolarBirth(normalized)
  const time = parseBirthTime(normalized)

  if (!birth || !time) {
    return null
  }

  const solarTerm = parseSolarTerm(normalized)
  const yearForPillar = getYearForPillar(birth, time, solarTerm)
  const yearIndex = positiveMod(yearForPillar - 4, 60)
  const monthBranch = solarTerm
    ? getBranchFromSolarTerm(solarTerm.name)
    : getApproximateMonthBranch(birth.month, birth.day)
  const month = monthBranch == null ? null : getMonthPillar(yearIndex, monthBranch)
  const dayIndex = positiveMod(getJulianDayNumber(birth.year, birth.month, birth.day) + 49, 60)
  const hour = getHourPillar(dayIndex, time.hour)

  if (!month || !hour) {
    return null
  }

  return {
    year: getGanji(yearIndex),
    month,
    day: getGanji(dayIndex),
    hour,
    birthSummary: `양력 ${birth.year}년 ${birth.month}월 ${birth.day}일 ${pad(time.hour)}시 ${pad(time.minute)}분`,
  }
}

function parseSolarBirth(normalized: string) {
  const match = normalized.match(/양력\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (!match) {
    return null
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function parseLunarBirth(normalized: string) {
  const match = normalized.match(/음력\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
  if (!match) {
    return null
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

function parseBirthTime(normalized: string) {
  const match = normalized.match(/시간\s*(\d{1,2})시\s*(\d{1,2})분(?:\s*\(([^)]+)\))?/)
  if (!match) {
    return null
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    place: match[3]?.trim() || null,
  }
}

function parseSolarTerm(normalized: string) {
  const match = normalized.match(
    /절입기준\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})시\s*(\d{1,2})분\s*\(([^)]+)\)/,
  )
  if (!match) {
    return null
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    name: match[6],
  }
}

function getYearForPillar(
  birth: { year: number; month: number; day: number },
  time: { hour: number; minute: number },
  solarTerm: { year: number; month: number; day: number; hour: number; minute: number; name: string } | null,
) {
  if (solarTerm?.name.includes('입춘')) {
    const birthValue = toComparableDateTime(birth.year, birth.month, birth.day, time.hour, time.minute)
    const termValue = toComparableDateTime(
      solarTerm.year,
      solarTerm.month,
      solarTerm.day,
      solarTerm.hour,
      solarTerm.minute,
    )
    return birthValue >= termValue ? birth.year : birth.year - 1
  }

  if (birth.month < 2 || (birth.month === 2 && birth.day < 4)) {
    return birth.year - 1
  }

  return birth.year
}

function getBranchFromSolarTerm(termName: string) {
  const terms: Record<string, number> = {
    입춘: 2,
    경칩: 3,
    청명: 4,
    입하: 5,
    망종: 6,
    소서: 7,
    입추: 8,
    백로: 9,
    한로: 10,
    입동: 11,
    대설: 0,
    소한: 1,
  }

  const term = Object.keys(terms).find((name) => termName.includes(name))
  return term ? terms[term] : null
}

function getApproximateMonthBranch(month: number, day: number) {
  const starts = [
    { month: 1, day: 6, branch: 1 },
    { month: 2, day: 4, branch: 2 },
    { month: 3, day: 5, branch: 3 },
    { month: 4, day: 5, branch: 4 },
    { month: 5, day: 5, branch: 5 },
    { month: 6, day: 6, branch: 6 },
    { month: 7, day: 7, branch: 7 },
    { month: 8, day: 7, branch: 8 },
    { month: 9, day: 7, branch: 9 },
    { month: 10, day: 8, branch: 10 },
    { month: 11, day: 7, branch: 11 },
    { month: 12, day: 7, branch: 0 },
  ]
  const current = starts
    .filter((start) => month > start.month || (month === start.month && day >= start.day))
    .at(-1)

  return current?.branch ?? 0
}

function getMonthPillar(yearIndex: number, monthBranch: number) {
  const yearStem = yearIndex % 10
  const tigerStemMap: Record<number, number> = {
    0: 2,
    5: 2,
    1: 4,
    6: 4,
    2: 6,
    7: 6,
    3: 8,
    8: 8,
    4: 0,
    9: 0,
  }
  const tigerStem = tigerStemMap[yearStem]
  const offsetFromTiger = positiveMod(monthBranch - 2, 12)
  return `${stems[(tigerStem + offsetFromTiger) % 10]}${branches[monthBranch]}`
}

function getHourPillar(dayIndex: number, hour: number) {
  const branch = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12
  const dayStem = dayIndex % 10
  const ratStemMap: Record<number, number> = {
    0: 0,
    5: 0,
    1: 2,
    6: 2,
    2: 4,
    7: 4,
    3: 6,
    8: 6,
    4: 8,
    9: 8,
  }
  return `${stems[(ratStemMap[dayStem] + branch) % 10]}${branches[branch]}`
}

function getGanji(index: number) {
  return `${stems[positiveMod(index, 10)]}${branches[positiveMod(index, 12)]}`
}

function getJulianDayNumber(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

function toComparableDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  return year * 100000000 + month * 1000000 + day * 10000 + hour * 100 + minute
}

function positiveMod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}
