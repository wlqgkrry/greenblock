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

export type MansaeLlmRequest = {
  teammateName: string
  role: string
  gender: string
  birthDate: string
  birthTime: string
  birthPlace: string
  calendarType: string
  parsedMansaeSummary: string
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
    communicationHypothesis: string
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

type MansaeStreamHandlers = {
  onMeta?: (meta: MansaeLlmStreamMeta) => void
  onChunk?: (chunk: string) => void
  signal?: AbortSignal
}

export function parseMansaePaste(rawText: string) {
  const normalized = rawText.replace(/\s+/g, ' ').trim()
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const allGanji = extractGanji(normalized)
  const calculated = calculatePillarsFromBirthText(normalized)

  const labeled = {
    year: findLabeledGanji(lines, ['연주', '년주', '세주']),
    month: findLabeledGanji(lines, ['월주']),
    day: findLabeledGanji(lines, ['일주']),
    hour: findLabeledGanji(lines, ['시주']),
  }

  const sajuTable = [
    { label: '연주', value: labeled.year ?? calculated?.year ?? allGanji[0] ?? '감지 안 됨' },
    { label: '월주', value: labeled.month ?? calculated?.month ?? allGanji[1] ?? '감지 안 됨' },
    { label: '일주', value: labeled.day ?? calculated?.day ?? allGanji[2] ?? '감지 안 됨' },
    { label: '시주', value: labeled.hour ?? calculated?.hour ?? allGanji[3] ?? '감지 안 됨' },
  ]

  const detectionNote = calculated
    ? `${calculated.birthSummary} 기준으로 사주 네 기둥을 보정했습니다. 대운은 이번 단계에서 제외했습니다.`
    : '명시적으로 적힌 연주·월주·일주·시주를 우선 인식합니다. 출생일/시간 정보가 충분하면 자동 계산으로 보정합니다.'

  return {
    lines,
    allGanji,
    sajuTable,
    bigFlow: [],
    detectionNote,
    llmSummaryPayload: buildLlmPayload('', sajuTable, detectionNote),
    llmPayload: buildLlmPayload(rawText, sajuTable, detectionNote),
  }
}

export function buildManualAnalysis(
  teammateName: string,
  archetype: string,
  rawText: string,
) {
  if (!rawText.trim()) {
    return '만세력 원문을 붙여넣으면 greenblock이 먼저 연주·월주·일주·시주를 정리하고, 그 내용을 바탕으로 협업 가이드를 만들 준비를 합니다.'
  }

  return `${teammateName} 님의 만세력 원문을 네 기둥으로 재구성했습니다. 이 정보는 ${archetype} 맥락과 함께 참고하되, 성격을 단정하지 않고 메시지 시작 문장, 업무 요청 방식, 피드백 톤을 정리하는 데만 사용합니다.`
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

function buildLlmPayload(
  rawText: string,
  sajuTable: { label: string; value: string }[],
  detectionNote: string,
) {
  return [
    '목표: 사용자가 직접 붙여넣은 만세력 텍스트를 참고해 팀 협업용 대화 가이드를 만든다.',
    '출처 안내: 이 자료는 사용자가 직접 입력한 내용이며, 외부 사이트와 공식 제휴하거나 자동 연동한 결과가 아니다.',
    '사용 범위: 채용, 인사평가, 차별적 판단에는 쓰지 않고 메시지 톤, 회의 방식, 피드백 방식 추천에만 사용한다.',
    '분석 범위: 대운 정보는 이번 단계에서 제외한다.',
    '',
    '[사주 인식 결과]',
    ...sajuTable.map((item) => `${item.label}: ${item.value}`),
    '',
    '[인식 메모]',
    detectionNote,
    '',
    '[사용자 붙여넣기 원문]',
    rawText || '원문 없음',
  ].join('\n')
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

function parseBirthTime(normalized: string) {
  const match = normalized.match(/시간\s*(\d{1,2})시\s*(\d{1,2})분/)
  if (!match) {
    return null
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
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
