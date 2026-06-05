import type {
  AnalysisResult,
  AppEvent,
  AppMessage,
  LoginForm,
  Teammate,
  TeammateForm,
  UserProfile,
} from '../types'

export const storageKeys = {
  user: 'greenblock-flow-v2-user',
  teammates: 'greenblock-flow-v2-teammates',
  messages: 'greenblock-flow-v2-messages',
  events: 'greenblock-flow-v2-events',
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function formatTime(input: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(input))
}

export function sortEvents(events: AppEvent[]) {
  return [...events].sort((left, right) =>
    `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`),
  )
}

export function createUserProfile(form: LoginForm): UserProfile {
  return {
    id: createId('user'),
    ...form,
  }
}

export function createTeammate(form: TeammateForm): Teammate {
  return {
    id: createId('teammate'),
    ...form,
    analysis: createAnalysis(form),
  }
}

export function createSeedTeammates() {
  return [
    createTeammate({
      name: '김예나',
      email: 'yena@greenblock.dev',
      role: '프로덕트 매니저',
      gender: 'female',
      birthDate: '1992-05-17',
      birthTime: '07:15',
      birthPlace: '서울',
      calendarType: 'solar',
    }),
    createTeammate({
      name: '박도윤',
      email: 'doyun@greenblock.dev',
      role: '브랜드 디자이너',
      gender: 'male',
      birthDate: '1989-11-02',
      birthTime: '14:40',
      birthPlace: '서울',
      calendarType: 'solar',
    }),
  ]
}

export function createSeedMessages(teammates: Teammate[]) {
  return Object.fromEntries(
    teammates.map((teammate) => [
      teammate.id,
      [
        {
          id: createId('message'),
          teammateId: teammate.id,
          sender: teammate.name,
          body: teammate.analysis.messageOpening,
          sentAt: nowIso(),
        },
      ],
    ]),
  ) as Record<string, AppMessage[]>
}

export function createSeedEvents(teammates: Teammate[]): AppEvent[] {
  return [
    {
      id: createId('event'),
      title: '스프린트 킥오프',
      date: today(),
      time: '10:00',
      teammateId: teammates[0].id,
      description: '스프린트 목표와 팀원별 커뮤니케이션 선호를 확인합니다.',
    },
  ]
}

function createAnalysis(form: TeammateForm): AnalysisResult {
  const archetypes = [
    {
      archetype: '예의 기준형 플래너',
      personalitySummary:
        '정중한 톤, 요청 전 맥락 설명, 범위가 분명한 부탁에 가장 안정적으로 반응합니다.',
      workStyleSummary:
        '정돈된 진행, 예측 가능한 일정, 팀 내 안정적인 조율을 선호합니다.',
      traits: ['말투와 예의를 중요하게 봄', '약속과 마감 추적이 꼼꼼함', '갑작스러운 방향 전환에 피로감을 느낌'],
      tips: ['먼저 배경을 설명하기', '차분한 첫 문장으로 시작하기', '담당 범위와 시간을 함께 확인하기'],
      tools: ['정중한 시작문 템플릿', '회의 전 아젠다 카드', '요청/확인 분리 버튼'],
    },
    {
      archetype: '빠른 결정 추진형',
      personalitySummary:
        '결론이 간결하고 다음 행동이 바로 보일 때 편안하게 움직입니다.',
      workStyleSummary:
        '우선순위와 마감이 보이면 빠르게 실행합니다. 모호한 논의가 길어지는 상황에는 피로를 느낍니다.',
      traits: ['직접적인 요약을 선호함', '담당자가 보이는 구조를 좋아함', '실행 속도를 중시함'],
      tips: ['마감을 먼저 보여주기', '선택지를 2개 정도로 줄이기', '메시지 하나에 결정 하나만 담기'],
      tools: ['결정 선택 칩', '마감 배지', '액션 아이템 패널'],
    },
    {
      archetype: '맥락 우선 협업형',
      personalitySummary:
        '왜 하는지, 어떤 제약이 있는지, 기대 결과가 무엇인지 보일 때 가장 잘 이해합니다.',
      workStyleSummary:
        '참고 자료, 문서, 전후 예시가 있을 때 더 높은 품질로 협업합니다.',
      traits: ['근거와 의도를 알고 싶어함', '모호한 정의를 싫어함', '명확함으로 품질을 지키려 함'],
      tips: ['배경을 먼저 공유하기', '예시나 링크를 붙이기', '실행 전에 성공 기준 정하기'],
      tools: ['맥락 요약 카드', '문서 미리보기', '정의 체크리스트'],
    },
  ]

  const seed = numericSeed(`${form.birthDate}${form.birthTime}${form.gender}${form.calendarType}`)
  const choice = archetypes[seed % archetypes.length]

  return {
    archetype: choice.archetype,
    personalitySummary: choice.personalitySummary,
    workStyleSummary: choice.workStyleSummary,
    personalityTraits: choice.traits,
    workTips: choice.tips,
    messageGuide: `${form.name} 님에게는 맥락, 존중, 명확한 요청이 함께 있는 메시지가 가장 잘 맞습니다.`,
    messageOpening: `${form.name} 님, 먼저 배경을 짧게 공유드리면 이번 건은 오늘 안에 확인이 필요한 요청입니다.`,
    recommendedTools: choice.tools,
    mansaeSource: '사용자가 직접 조회해 붙여넣은 만세력 자료를 기준으로 분석하는 수동 입력 방식입니다.',
    yearPillar: derivePillar(seed + 3),
    monthPillar: derivePillar(seed + 7),
    dayPillar: derivePillar(seed + 11),
    hourPillar: derivePillar(seed + 19),
  }
}

function derivePillar(seed: number) {
  const stems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
  const branches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
  return `${stems[seed % stems.length]} ${branches[seed % branches.length]}`
}

function numericSeed(input: string) {
  return input.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}
