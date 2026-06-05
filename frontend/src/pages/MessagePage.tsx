import type { FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAppState } from '../context/useAppState'
import { formatTime } from '../lib/appModel'

export function MessagePage() {
  const { teammateId } = useParams()
  const { teammates, messagesByTeammate, sendMessage } = useAppState()
  const navigate = useNavigate()
  const teammate = teammates.find((item) => item.id === teammateId)

  if (!teammate) {
    return <Navigate to="/home" replace />
  }
  const safeTeammate = teammate

  const messages = messagesByTeammate[safeTeammate.id] ?? []

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('body') as HTMLTextAreaElement
    const value = input.value.trim()
    if (!value) {
      return
    }
    sendMessage(safeTeammate.id, value)
    input.value = ''
  }

  return (
    <div className="content-stack">
      <section className="hero-card">
        <div>
          <p className="eyebrow">3단계</p>
          <h2>{safeTeammate.name} 님에게 보낼 메시지 추천</h2>
          <p className="muted">{safeTeammate.analysis.messageGuide}</p>
        </div>
        <div className="action-row">
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate(`/teammates/${safeTeammate.id}`)}
          >
            분석 결과로 돌아가기
          </button>
        </div>
      </section>

      <section className="panel-card">
        <p className="card-label">추천 도구</p>
        <div className="chip-row">
          {safeTeammate.analysis.recommendedTools.map((item) => (
            <span key={item} className="chip">
              {item}
            </span>
          ))}
        </div>
        <div className="tip-banner">
          <strong>추천 첫 문장</strong>
          <p>{safeTeammate.analysis.messageOpening}</p>
        </div>
      </section>

      <section className="panel-card">
        <div className="message-feed">
          {messages.map((message) => (
            <article key={message.id} className="message-item">
              <div className="section-row">
                <strong>{message.sender}</strong>
                <span>{formatTime(message.sentAt)}</span>
              </div>
              <p>{message.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            메시지
            <textarea
              name="body"
              rows={5}
              defaultValue={safeTeammate.analysis.messageOpening}
            />
          </label>
          <button type="submit" className="primary-button">
            메시지 보내기
          </button>
        </form>
      </section>
    </div>
  )
}
