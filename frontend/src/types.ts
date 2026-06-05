export type Gender = 'female' | 'male'
export type CalendarType = 'solar' | 'lunar'

export interface LoginForm {
  name: string
  email: string
  role: string
  provider: string
  gender: Gender
  birthDate: string
  birthTime: string
  birthPlace: string
  calendarType: CalendarType
}

export interface UserProfile extends LoginForm {
  id: string
}

export interface TeammateForm {
  name: string
  email: string
  role: string
  gender: Gender
  birthDate: string
  birthTime: string
  birthPlace: string
  calendarType: CalendarType
}

export interface AnalysisResult {
  archetype: string
  personalitySummary: string
  workStyleSummary: string
  personalityTraits: string[]
  workTips: string[]
  messageGuide: string
  messageOpening: string
  recommendedTools: string[]
  mansaeSource: string
  yearPillar: string
  monthPillar: string
  dayPillar: string
  hourPillar: string
}

export interface Teammate extends TeammateForm {
  id: string
  analysis: AnalysisResult
}

export interface AppMessage {
  id: string
  teammateId: string
  sender: string
  body: string
  sentAt: string
}

export interface AppEvent {
  id: string
  title: string
  date: string
  time: string
  teammateId: string
  description: string
}
