import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState'
import { sortEvents } from '../lib/appModel'
import { Breadcrumb } from '../components/Breadcrumb'

export function HomePage() {
  const { currentUser, teammates, events, messagesByTeammate } = useAppState()
  const navigate = useNavigate()
  const sortedEvents = sortEvents(events)
  const recentMessages = Object.values(messagesByTeammate)
    .flat()
    .sort((left, right) => right.sentAt.localeCompare(left.sentAt))
    .slice(0, 4)
  const pendingTeammates = teammates.slice(0, 4)

  return (
    <div className="content-stack">
      <Breadcrumb items={[{ label: '홈' }]} step="워크스페이스 홈" />

      <section className="hero-card hero-card--compact">
        <div>
          <p className="eyebrow">워크스페이스 홈</p>
          <h2>{currentUser?.name} 님, 오늘은 무엇부터 볼까요?</h2>
          <p className="muted">
            왼쪽에서는 팀원을 바로 열고, 아래 보드에서는 등록·분석·일정을 빠르게 이어갈 수 있습니다.
          </p>
        </div>
        <div className="action-row">
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate('/teammates/new')}
          >
            팀원 등록 시작
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => navigate('/calendar')}
          >
            캘린더에 일정 추가
          </button>
        </div>
      </section>

      <section className="board-grid">
        <article className="panel-card board-card">
          <div className="section-row">
            <h3>해야 할 일</h3>
            <span>3</span>
          </div>
          <div className="stack-list">
            <button
              type="button"
              className="task-card"
              onClick={() => navigate('/teammates/new')}
            >
              <strong>새 팀원 등록</strong>
              <span>이름, 역할, 생년월일, 태어난 시간과 장소를 입력합니다.</span>
            </button>
            <button
              type="button"
              className="task-card"
              onClick={() => navigate(pendingTeammates[0] ? `/mansae/${pendingTeammates[0].id}` : '/teammates/new')}
            >
              <strong>만세력 결과 붙여넣기</strong>
              <span>직접 조회한 만세력 텍스트를 붙여넣고 사주 네 기둥을 확인합니다.</span>
            </button>
            <button
              type="button"
              className="task-card"
              onClick={() => navigate('/calendar')}
            >
              <strong>오늘 일정 등록</strong>
              <span>회의, 마감, 확인 일정을 팀원과 연결합니다.</span>
            </button>
          </div>
        </article>

        <article className="panel-card board-card">
          <div className="section-row">
            <h3>분석 대기 팀원</h3>
            <span>{pendingTeammates.length}</span>
          </div>
          <div className="stack-list">
            {pendingTeammates.map((teammate) => (
              <button
                key={teammate.id}
                type="button"
                className="list-button list-button--light"
                onClick={() => navigate(`/mansae/${teammate.id}`)}
              >
                <strong>{teammate.name}</strong>
                <span>만세력 자료를 붙여넣고 분석을 준비합니다</span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel-card board-card">
          <div className="section-row">
            <h3>오늘 일정</h3>
            <span>{sortedEvents.length}</span>
          </div>
          <div className="stack-list">
            {sortedEvents.slice(0, 4).map((event) => (
              <button
                key={event.id}
                type="button"
                className="info-card info-card--button"
                onClick={() => navigate('/calendar')}
              >
                <strong>{event.title}</strong>
                <span>
                  {event.date} {event.time}
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="panel-card board-card">
          <div className="section-row">
            <h3>최근 메시지</h3>
            <span>{recentMessages.length}</span>
          </div>
          <div className="stack-list">
            {recentMessages.map((message) => (
              <button
                key={message.id}
                type="button"
                className="info-card info-card--button"
                onClick={() => navigate(`/messages/${message.teammateId}`)}
              >
                <strong>{message.sender}</strong>
                <span>{message.body}</span>
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
