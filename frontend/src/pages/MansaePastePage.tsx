import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '../components/Breadcrumb'
import { useAppState } from '../context/useAppState'
import {
  buildManualAnalysis,
  parseMansaePaste,
  requestMansaeAnalysisStream,
  type MansaeLlmStreamMeta,
  type MansaeLlmResponse,
} from '../lib/mansaePaste'

export function MansaePastePage() {
  const { teammateId } = useParams()
  const { teammates } = useAppState()
  const teammate = teammates.find((item) => item.id === teammateId)
  const [rawText, setRawText] = useState('')
  const [llmResult, setLlmResult] = useState<MansaeLlmResponse | null>(null)
  const [llmError, setLlmError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalysisTime, setLastAnalysisTime] = useState('')
  const [streamingDraft, setStreamingDraft] = useState('')
  const [streamMeta, setStreamMeta] = useState<MansaeLlmStreamMeta | null>(null)

  if (!teammate) {
    return <Navigate to="/home" replace />
  }
  const safeTeammate = teammate

  const parsed = parseMansaePaste(rawText)
  const analysisText = buildManualAnalysis(
    safeTeammate.name,
    safeTeammate.analysis.archetype,
    rawText,
  )

  async function handleAnalyze() {
    if (!rawText.trim()) {
      setLlmError('먼저 사용자가 직접 조회한 만세력 결과 텍스트를 붙여넣어 주세요.')
      return
    }

    setIsAnalyzing(true)
    setLlmError('')
    setStreamingDraft('')
    setStreamMeta(null)

    try {
      const result = await requestMansaeAnalysisStream(
        {
          teammateName: safeTeammate.name,
          role: safeTeammate.role,
          gender: safeTeammate.gender,
          birthDate: safeTeammate.birthDate,
          birthTime: safeTeammate.birthTime,
          birthPlace: safeTeammate.birthPlace,
          calendarType: safeTeammate.calendarType,
          parsedMansaeSummary: parsed.llmSummaryPayload,
          mansaeRawText: rawText,
        },
        {
          onMeta(meta) {
            setStreamMeta(meta)
          },
          onChunk(chunk) {
            setStreamingDraft((previous) => previous + chunk)
          },
        },
      )
      setLlmResult(result)
      setLastAnalysisTime(formatAnalysisTime(new Date()))
      setStreamingDraft('')
    } catch (error) {
      setLlmError(error instanceof Error ? error.message : 'LLM 분석 요청에 실패했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="content-stack">
      <Breadcrumb
        step="만세력 붙여넣기"
        items={[
          { label: '홈', to: '/home' },
          { label: '팀원', to: `/teammates/${safeTeammate.id}` },
          { label: '만세력 붙여넣기' },
        ]}
      />

      <section className="hero-card hero-card--compact">
        <div>
          <p className="eyebrow">수동 입력 방식</p>
          <h2>{safeTeammate.name} 님 만세력 결과 붙여넣기</h2>
          <p className="muted">
            이 결과는 사용자가 직접 입력한 자료를 바탕으로 분석됩니다. 현재 greenblock은
            외부 만세력 사이트와 공식 제휴 또는 자동 연동을 하지 않습니다.
          </p>
        </div>
        <div className="action-row">
          <a
            className="ghost-button"
            href="https://manseryeok.com/"
            target="_blank"
            rel="noreferrer"
          >
            만세력 사이트 새 창으로 열기
          </a>
          <Link className="ghost-button" to={`/teammates/${safeTeammate.id}`}>
            팀원 분석으로 돌아가기
          </Link>
        </div>
      </section>

      <section className="notice-card">
        <strong>안내</strong>
        <p>
          붙여넣은 원문을 DB에 저장할지, 분석 후 삭제할지는 추후 정책으로 확정합니다.
          지금 화면에서는 원문을 사용자가 입력한 텍스트로 보고, 타 사이트의 화면 디자인을
          복제하지 않고 greenblock UI로 재구성합니다.
        </p>
      </section>

      <section className="two-column two-column--wide-left">
        <article className="panel-card">
          <h3>1. 만세력 결과 원문 붙여넣기</h3>
          <p className="muted">
            만세력 표에서 복사한 텍스트를 그대로 붙여넣으세요. 연주·월주·일주·시주가
            보이지 않는 표 형태도 양력 생년월일과 시간을 읽어 최대한 보정합니다.
          </p>
          <textarea
            className="paste-area"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            rows={18}
            placeholder={`예시:
연주 임신
월주 을사
일주 계사
시주 을묘
또는
양력 2025년 3월 4일
시간 02시 03분(서울)
절입기준 2025년 02월 03일 23시 10분 (입춘)`}
          />
        </article>

        <article className="panel-card">
          <h3>2. greenblock 재구성 결과</h3>
          <div className="mansae-table">
            {parsed.sajuTable.map((item) => (
              <div key={item.label} className="mansae-cell">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <h4>인식 메모</h4>
          <div className="analysis-box">{parsed.detectionNote}</div>

          <h4>분석 전 확인</h4>
          <div className="analysis-box">{analysisText}</div>
          <button
            type="button"
            className="primary-button inline-button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '가이드 만드는 중...' : '협업 가이드 만들기'}
          </button>
          {llmError && <p className="muted">{llmError}</p>}
        </article>
      </section>

      {(llmResult || isAnalyzing || streamingDraft) && (
        <section
          className={`panel-card analysis-result-section${isAnalyzing ? ' analysis-result-section--loading' : ''}`}
          aria-busy={isAnalyzing}
        >
          <div className="section-row">
            <h3>3. {safeTeammate.name} 님과 일할 때의 대화 가이드</h3>
            <span className="chip">
              {isAnalyzing
                ? streamMeta
                  ? `${streamMeta.provider} 스트리밍 중`
                  : llmResult
                    ? '새 가이드 생성 중'
                    : '가이드 생성 중'
                : lastAnalysisTime
                  ? `${lastAnalysisTime} 업데이트`
                  : llmResult?.usedFallback
                    ? '미리보기'
                    : '로컬 LLM 분석 완료'}
            </span>
          </div>
          {llmResult?.usedFallback && (
            <p className="muted">현재 LLM 응답을 받지 못해 greenblock 미리보기 결과를 표시합니다.</p>
          )}
          <div className="analysis-result-body">
            {llmResult ? (
              llmResult.structuredAnalysis ? (
                <StructuredAnalysisCard result={llmResult} />
              ) : (
                <div className="analysis-box analysis-box--prewrap">{llmResult.analysisText}</div>
              )
            ) : streamingDraft ? (
              <StreamingDraftPreview draft={streamingDraft} />
            ) : (
              <GuideSkeleton />
            )}
          </div>
          {isAnalyzing && llmResult && (
            <div className="analysis-loading-overlay" aria-live="polite">
              <strong>새 대화 가이드를 만들고 있어요.</strong>
              <span>완료되면 아래 카드가 새 결과로 바뀝니다.</span>
              {streamingDraft ? (
                <pre className="analysis-stream-overlay">{streamingDraft}</pre>
              ) : (
                <div className="mini-skeleton-stack" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="panel-card">
        <details className="analysis-raw">
          <summary>{llmResult ? '4' : '3'}. 개발자용 입력 내용 보기</summary>
          <pre>{parsed.llmPayload}</pre>
        </details>
      </section>
    </div>
  )
}

function StreamingDraftPreview(props: { draft: string }) {
  return (
    <div className="analysis-box analysis-box--prewrap analysis-stream-preview">
      <p className="card-label">생성 중 초안</p>
      <pre>{props.draft}</pre>
    </div>
  )
}

function GuideSkeleton() {
  return (
    <div className="analysis-result-grid analysis-result-grid--skeleton" aria-label="대화 가이드 생성 중">
      <article className="analysis-result-card analysis-result-card--hero">
        <div className="skeleton-line skeleton-line--wide" />
        <div className="skeleton-line" />
      </article>
      <article className="analysis-result-card">
        <div className="skeleton-line skeleton-line--short" />
        <div className="skeleton-line" />
        <div className="skeleton-line skeleton-line--wide" />
      </article>
      <article className="analysis-result-card">
        <div className="skeleton-line skeleton-line--short" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </article>
      <article className="analysis-result-card">
        <div className="skeleton-line skeleton-line--short" />
        <div className="skeleton-line" />
        <div className="skeleton-line skeleton-line--wide" />
      </article>
    </div>
  )
}

function StructuredAnalysisCard(props: { result: MansaeLlmResponse }) {
  const analysis = props.result.structuredAnalysis

  if (!analysis) {
    return null
  }

  return (
    <div className="analysis-result-grid">
      <article className="analysis-result-card analysis-result-card--hero">
        <p className="card-label">요약</p>
        <h4>{analysis.summary}</h4>
      </article>

      <article className="analysis-result-card">
        <p className="card-label">대화할 때 참고할 점</p>
        <p>{analysis.communicationHypothesis}</p>
      </article>

      <AnalysisList title="주의할 점" items={analysis.cautions} />
      <AnalysisList title="이렇게 시작해 보세요" items={analysis.messageExamples} />
      <AnalysisList title="회의와 업무 요청 방식" items={analysis.collaborationTips} />

      <article className="analysis-result-card analysis-result-card--wide">
        <p className="card-label">참고 안내</p>
        <p>{analysis.limitation}</p>
      </article>

      <details className="analysis-raw">
        <summary>품질 확인용 원문 보기</summary>
        <pre>{analysis.llmDraft || props.result.analysisText}</pre>
      </details>
    </div>
  )
}

function formatAnalysisTime(date: Date) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function AnalysisList(props: { title: string; items: string[] }) {
  return (
    <article className="analysis-result-card">
      <p className="card-label">{props.title}</p>
      <ul className="plain-list">
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  )
}
