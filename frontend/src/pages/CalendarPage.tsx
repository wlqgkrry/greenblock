import type { FormEvent } from 'react'
import { LabeledInput, LabeledSelect } from '../components/FormFields'
import { useAppState } from '../context/useAppState'
import { sortEvents, today } from '../lib/appModel'

export function CalendarPage() {
  const { teammates, events, addEvent, deleteEvent } = useAppState()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    addEvent({
      title: String(formData.get('title')),
      date: String(formData.get('date')),
      time: String(formData.get('time')),
      teammateId: String(formData.get('teammateId')),
      description: String(formData.get('description')),
    })
    event.currentTarget.reset()
  }

  return (
    <div className="content-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">캘린더</p>
          <h2>팀 일정 관리</h2>
          <p className="muted">
            회의, 마감, 확인 일정을 팀원과 연결해 기록합니다. 현재는 브라우저 로컬 상태로 동작합니다.
          </p>
        </div>
      </section>

      <section className="two-column">
        <article className="panel-card">
          <h3>일정 만들기</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <LabeledInput label="일정명" name="title" />
            <LabeledInput label="날짜" name="date" type="date" defaultValue={today()} />
            <LabeledInput label="시간" name="time" type="time" defaultValue="10:00" />
            <LabeledSelect
              label="팀원"
              name="teammateId"
              options={teammates.map((teammate) => ({
                label: teammate.name,
                value: teammate.id,
              }))}
            />
            <label className="field field--wide">
              설명
              <textarea name="description" rows={4} />
            </label>
            <button type="submit" className="primary-button form-action">
              일정 추가
            </button>
          </form>
        </article>

        <article className="panel-card">
          <div className="section-row">
            <h3>일정 목록</h3>
            <span>{events.length}</span>
          </div>
          <div className="stack-list">
            {sortEvents(events).map((calendarEvent) => {
              const teammate = teammates.find((item) => item.id === calendarEvent.teammateId)
              return (
                <div key={calendarEvent.id} className="event-card">
                  <div>
                    <strong>{calendarEvent.title}</strong>
                    <p>
                      {calendarEvent.date} {calendarEvent.time}
                    </p>
                    <span>{teammate?.name ?? '알 수 없는 팀원'}</span>
                  </div>
                  <button
                    type="button"
                    className="ghost-button danger-button"
                    onClick={() => deleteEvent(calendarEvent.id)}
                  >
                    삭제
                  </button>
                </div>
              )
            })}
          </div>
        </article>
      </section>
    </div>
  )
}
