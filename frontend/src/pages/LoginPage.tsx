import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LabeledInput, LabeledSelect } from '../components/FormFields'
import { useAppState } from '../context/useAppState'
import type { CalendarType, Gender, LoginForm } from '../types'

export function LoginPage() {
  const { currentUser, login } = useAppState()
  const navigate = useNavigate()

  if (currentUser) {
    return <Navigate to="/home" replace />
  }

  const defaults: LoginForm = {
    name: '그린블록 관리자',
    email: 'admin@greenblock.dev',
    role: '창업자',
    provider: 'Google',
    gender: 'female',
    birthDate: '1994-10-21',
    birthTime: '09:30',
    birthPlace: '서울',
    calendarType: 'solar',
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    login({
      name: String(formData.get('name')),
      email: String(formData.get('email')),
      role: String(formData.get('role')),
      provider: String(formData.get('provider')),
      gender: formData.get('gender') as Gender,
      birthDate: String(formData.get('birthDate')),
      birthTime: String(formData.get('birthTime')),
      birthPlace: String(formData.get('birthPlace')) || '서울',
      calendarType: formData.get('calendarType') as CalendarType,
    })
    navigate('/home')
  }

  return (
    <div className="login-shell">
      <section className="login-hero">
        <div>
          <p className="eyebrow">greenblock</p>
          <h1>greenblock 시작하기</h1>
          <p className="muted">
            지금은 데모 단계라 입력한 정보가 브라우저에 저장됩니다. 먼저 내 프로필을 넣고
            팀원 등록, 만세력 붙여넣기, 메시지 추천 흐름을 확인해 보세요.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <strong>팀원 분석</strong>
            <p>팀원을 등록하고 만세력 자료를 붙여넣어 대화 가이드를 만듭니다.</p>
          </article>
          <article className="feature-card">
            <strong>일정 관리</strong>
            <p>회의와 마감 일정을 팀원과 연결해 관리합니다.</p>
          </article>
        </div>
      </section>

      <section className="login-card">
        <h2>데모 로그인</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <LabeledInput label="이름" name="name" defaultValue={defaults.name} />
          <LabeledInput label="이메일" name="email" defaultValue={defaults.email} type="email" />
          <LabeledInput label="역할" name="role" defaultValue={defaults.role} />
          <LabeledSelect
            label="소셜 로그인"
            name="provider"
            defaultValue={defaults.provider}
            options={['Google', 'Kakao', 'Naver']}
          />
          <LabeledSelect
            label="성별"
            name="gender"
            defaultValue={defaults.gender}
            options={['female', 'male']}
          />
          <LabeledInput
            label="생년월일"
            name="birthDate"
            defaultValue={defaults.birthDate}
            type="date"
          />
          <LabeledSelect
            label="양력/음력"
            name="calendarType"
            defaultValue={defaults.calendarType}
            options={['solar', 'lunar']}
          />
          <LabeledInput
            label="태어난 시간"
            name="birthTime"
            defaultValue={defaults.birthTime}
            type="time"
          />
          <LabeledInput label="태어난 장소" name="birthPlace" defaultValue={defaults.birthPlace} />
          <button type="submit" className="primary-button form-action">
            시작하기
          </button>
        </form>
      </section>
    </div>
  )
}
