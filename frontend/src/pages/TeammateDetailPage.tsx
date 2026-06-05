import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Breadcrumb } from '../components/Breadcrumb'
import { useAppState } from '../context/useAppState'
import { sortEvents } from '../lib/appModel'

export function TeammateDetailPage() {
  const { teammateId } = useParams()
  const { teammates, deleteTeammate, events, messagesByTeammate } = useAppState()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const teammate = teammates.find((item) => item.id === teammateId)

  if (!teammate) {
    return <Navigate to="/home" replace />
  }
  const safeTeammate = teammate
  const activeTab = searchParams.get('tab') ?? 'analysis'
  const teammateEvents = sortEvents(events).filter((event) => event.teammateId === safeTeammate.id)
  const teammateMessages = messagesByTeammate[safeTeammate.id] ?? []

  function handleDelete() {
    deleteTeammate(safeTeammate.id)
    navigate('/home')
  }

  return (
    <div className="content-stack">
      <Breadcrumb
        step="팀원 상세"
        items={[
          { label: '홈', to: '/home' },
          { label: '팀원' },
          { label: safeTeammate.name },
        ]}
      />

      <section className="hero-card hero-card--compact">
        <div>
          <p className="eyebrow">팀원 상세</p>
          <h2>{safeTeammate.name} 님 분석 결과</h2>
          <p className="muted">
            만세력 요약, 메시지 추천, 관련 일정과 대화 기록을 한곳에서 확인합니다.
          </p>
        </div>
        <div className="action-row">
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate(`/messages/${safeTeammate.id}`)}
          >
            추천 메시지 작성
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate(`/mansae/${safeTeammate.id}`)}
          >
            만세력 결과 붙여넣기
          </button>
          <button type="button" className="ghost-button danger-button" onClick={handleDelete}>
            팀원 삭제
          </button>
        </div>
      </section>

      <div className="tab-bar">
        {[
          ['analysis', '분석'],
          ['message', '추천 메시지'],
          ['schedule', '일정'],
          ['history', '기록'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={activeTab === key ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => setSearchParams({ tab: key })}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'analysis' && (
        <section className="three-column">
          <article className="panel-card">
            <p className="card-label">만세력 요약</p>
            <div className="stat-list">
              <StatRow label="출처" value={safeTeammate.analysis.mansaeSource} />
              <StatRow label="연주" value={safeTeammate.analysis.yearPillar} />
              <StatRow label="월주" value={safeTeammate.analysis.monthPillar} />
              <StatRow label="일주" value={safeTeammate.analysis.dayPillar} />
              <StatRow label="시주" value={safeTeammate.analysis.hourPillar} />
            </div>
            <Link className="inline-action" to={`/mansae/${safeTeammate.id}`}>
              사용자 만세력 결과 붙여넣기
            </Link>
          </article>

          <article className="panel-card">
            <p className="card-label">협업 성향</p>
            <h3>{safeTeammate.analysis.archetype}</h3>
            <p className="muted">{safeTeammate.analysis.personalitySummary}</p>
            <ul className="plain-list">
              {safeTeammate.analysis.personalityTraits.map((trait) => (
                <li key={trait}>{trait}</li>
              ))}
            </ul>
          </article>

          <article className="panel-card">
            <p className="card-label">일하는 방식</p>
            <p className="muted">{safeTeammate.analysis.workStyleSummary}</p>
            <ul className="plain-list">
              {safeTeammate.analysis.workTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </article>
        </section>
      )}

      {activeTab === 'message' && (
        <section className="panel-card">
          <p className="card-label">추천 메시지</p>
          <h3>{safeTeammate.name} 님에게 맞는 첫 문장</h3>
          <div className="tip-banner">
            <p>{safeTeammate.analysis.messageOpening}</p>
          </div>
          <div className="chip-row">
            {safeTeammate.analysis.recommendedTools.map((tool) => (
              <span key={tool} className="chip">
                {tool}
              </span>
            ))}
          </div>
          <Link className="primary-button inline-button" to={`/messages/${safeTeammate.id}`}>
            추천 메시지 작성 화면으로 이동
          </Link>
        </section>
      )}

      {activeTab === 'schedule' && (
        <section className="panel-card">
          <div className="section-row">
            <h3>{safeTeammate.name} 님 관련 일정</h3>
            <Link className="inline-action" to="/calendar">
              캘린더에 일정 추가
            </Link>
          </div>
          <div className="stack-list">
            {teammateEvents.length ? (
              teammateEvents.map((event) => (
                <div key={event.id} className="info-card">
                  <strong>{event.title}</strong>
                  <span>
                    {event.date} {event.time}
                  </span>
                </div>
              ))
            ) : (
              <p className="muted">아직 연결된 일정이 없습니다.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === 'history' && (
        <section className="panel-card">
          <h3>메시지 기록</h3>
          <div className="message-feed">
            {teammateMessages.map((message) => (
              <article key={message.id} className="message-item">
                <div className="section-row">
                  <strong>{message.sender}</strong>
                  <span>{new Date(message.sentAt).toLocaleString('ko-KR')}</span>
                </div>
                <p>{message.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatRow(props: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  )
}
