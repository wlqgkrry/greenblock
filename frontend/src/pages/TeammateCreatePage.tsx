import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LabeledInput, LabeledSelect } from '../components/FormFields'
import { useAppState } from '../context/useAppState'
import type { CalendarType, Gender } from '../types'

export function TeammateCreatePage() {
  const { addTeammate } = useAppState()
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const teammate = addTeammate({
      name: String(formData.get('name')),
      email: String(formData.get('email')),
      role: String(formData.get('role')),
      gender: formData.get('gender') as Gender,
      birthDate: String(formData.get('birthDate')),
      birthTime: String(formData.get('birthTime')),
      birthPlace: String(formData.get('birthPlace')) || '서울',
      calendarType: formData.get('calendarType') as CalendarType,
    })
    navigate(`/teammates/${teammate.id}`)
  }

  return (
    <div className="content-stack">
      <section className="panel-card">
        <p className="eyebrow">1단계</p>
        <h2>팀원 등록</h2>
        <p className="muted">
          이름과 역할, 생년월일, 태어난 시간과 장소를 입력합니다. 등록 후 만세력 자료를 붙여넣어 분석을 이어갑니다.
        </p>
      </section>

      <section className="panel-card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <LabeledInput label="이름" name="name" />
          <LabeledInput label="이메일" name="email" type="email" />
          <LabeledInput label="역할" name="role" />
          <LabeledSelect label="성별" name="gender" options={['female', 'male']} />
          <LabeledInput label="생년월일" name="birthDate" type="date" />
          <LabeledInput label="태어난 시간" name="birthTime" type="time" defaultValue="09:00" />
          <LabeledInput label="태어난 장소" name="birthPlace" defaultValue="서울" />
          <LabeledSelect
            label="양력/음력"
            name="calendarType"
            options={['solar', 'lunar']}
          />
          <button type="submit" className="primary-button form-action">
            저장하고 팀원 화면으로 이동
          </button>
        </form>
      </section>
    </div>
  )
}
