import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState'

export function ProtectedLayout() {
  const { currentUser, teammates, logout } = useAppState()
  const navigate = useNavigate()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-panel">
          <p className="eyebrow">greenblock</p>
          <h1>그린블록 워크스페이스</h1>
          <p className="muted">
            팀원별 협업 가이드, 메시지 작성, 일정 관리를 한 흐름으로 이어갑니다.
          </p>
        </div>

        <nav className="sidebar-card">
          <p className="card-label">워크스페이스</p>
          <SidebarLink
            to="/home"
            title="워크스페이스 홈"
            description="오늘 할 일과 최근 흐름을 봅니다"
            active={location.pathname === '/home'}
          />
        </nav>

        <nav className="sidebar-card">
          <p className="card-label">채널</p>
          <SidebarLink
            to="/home"
            title="# 오늘의 작업"
            description="해야 할 일과 최근 대화"
            active={location.pathname === '/home'}
          />
          <SidebarLink
            to="/teammates/new"
            title="# 팀원 온보딩"
            description="새 팀원을 등록합니다"
            active={location.pathname === '/teammates/new'}
          />
          <SidebarLink
            to="/calendar"
            title="# 캘린더"
            description="회의와 마감 일정을 관리합니다"
            active={location.pathname === '/calendar'}
          />
        </nav>

        <section className="sidebar-card">
          <div className="section-row">
            <p className="card-label">팀원 바로가기</p>
            <span>{teammates.length}</span>
          </div>
          <div className="stack-list">
            {teammates.map((teammate) => (
              <div key={teammate.id} className="dm-card">
                <button
                  type="button"
                  className="dm-profile"
                  onClick={() => navigate(`/teammates/${teammate.id}`)}
                >
                  <strong>{teammate.name}</strong>
                  <span>{teammate.analysis.archetype}</span>
                </button>
                <div className="dm-actions">
                  <Link to={`/teammates/${teammate.id}`} className="mini-link">
                    분석 결과 보기
                  </Link>
                  <Link to={`/messages/${teammate.id}`} className="mini-link">
                    메시지 작성
                  </Link>
                  <Link to={`/mansae/${teammate.id}`} className="mini-link">
                    만세력 붙여넣기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="sidebar-card">
          <p className="card-label">로그인 정보</p>
          <strong>{currentUser.name}</strong>
          <span className="muted">
            {currentUser.role} · {currentUser.provider}
          </span>
          <button type="button" className="ghost-button" onClick={logout}>
            로그아웃
          </button>
        </section>
      </aside>

      <main className="page-panel">
        <Outlet />
      </main>
    </div>
  )
}

function SidebarLink(props: {
  to: string
  title: string
  description: string
  active: boolean
}) {
  return (
    <Link to={props.to} className={props.active ? 'nav-link nav-link--active' : 'nav-link'}>
      <strong>{props.title}</strong>
      <span>{props.description}</span>
    </Link>
  )
}
