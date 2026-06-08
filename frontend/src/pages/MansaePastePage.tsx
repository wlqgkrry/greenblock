import { useState, type ClipboardEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '../components/Breadcrumb'
import { useAppState } from '../context/useAppState'
import {
  buildManualAnalysis,
  parseMansaePaste,
  requestMansaeOcr,
  requestMansaeAnalysis,
  requestMansaeAnalysisStream,
  type MansaeOcrResponse,
  type MansaeLlmStreamMeta,
  type MansaeLlmResponse,
  type MansaeParseResult,
} from '../lib/mansaePaste'

export function MansaePastePage() {
  const { teammateId } = useParams()
  const { teammates } = useAppState()
  const teammate = teammates.find((item) => item.id === teammateId)
  const [rawText, setRawText] = useState('')
  const [rawHtml, setRawHtml] = useState('')
  const [pastedImageDataUrl, setPastedImageDataUrl] = useState('')
  const [ocrText, setOcrText] = useState('')
  const [ocrResult, setOcrResult] = useState<MansaeOcrResponse | null>(null)
  const [isReadingImage, setIsReadingImage] = useState(false)
  const [pasteNotice, setPasteNotice] = useState('')
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

  const parsed = parseMansaePaste({
    rawText,
    rawHtml,
    imageDataUrl: pastedImageDataUrl,
    ocrText,
  })
  const analysisText = buildManualAnalysis(
    safeTeammate.name,
    safeTeammate.analysis.archetype,
    rawText,
  )

  async function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData('text/html')
    const text = event.clipboardData.getData('text/plain')
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'))

    setRawHtml(html || '')

    if (html) {
      setPasteNotice('HTML 복사본을 함께 감지했습니다. 표 구조를 최대한 유지해서 다시 읽습니다.')
    } else if (text.trim()) {
      setPasteNotice('일반 텍스트 복사본으로 분석합니다. 양력·시간·절입기준 표기가 있으면 자동 보정을 시도합니다.')
    }

    if (!imageItem) {
      setPastedImageDataUrl('')
      setOcrText('')
      setOcrResult(null)
      return
    }

    const file = imageItem.getAsFile()
    if (!file) {
      return
    }

    const dataUrl = await readFileAsDataUrl(file)
    setPastedImageDataUrl(dataUrl)

    if (!html && !text.trim()) {
      event.preventDefault()
      await runImageOcr(dataUrl)
    }
  }

  async function runImageOcr(imageDataUrl: string) {
    setIsReadingImage(true)
    setOcrResult(null)
    setOcrText('')
    setPasteNotice('이미지 붙여넣기를 감지했습니다. 만세력 OCR로 텍스트를 읽는 중입니다.')

    try {
      const result = await requestMansaeOcr(imageDataUrl)
      setOcrResult(result)
      setOcrText(result.text)
      if (!rawText.trim()) {
        setRawText(result.text)
      }
      setPasteNotice(result.note)
    } catch (error) {
      setPasteNotice(
        error instanceof Error
          ? error.message
          : '이미지 OCR 처리 중 오류가 발생했습니다. 텍스트 복사본이 있다면 함께 붙여넣어 주세요.',
      )
    } finally {
      setIsReadingImage(false)
    }
  }

  async function handleAnalyze() {
    if (!parsed.rawStructuredText.trim()) {
      setLlmError(
        parsed.pastedImageDetected
          ? '이미지 OCR 결과가 아직 없습니다. OCR이 끝날 때까지 기다리거나 텍스트/HTML 복사본을 함께 붙여넣어 주세요.'
          : '먼저 사용자가 직접 조회한 만세력 결과 텍스트를 붙여넣어 주세요.',
      )
      return
    }

    setIsAnalyzing(true)
    setLlmError('')
    setStreamingDraft('')
    setStreamMeta(null)

    try {
      const requestPayload = {
        teammateName: safeTeammate.name,
        role: safeTeammate.role,
        gender: safeTeammate.gender,
        birthDate: safeTeammate.birthDate,
        birthTime: safeTeammate.birthTime,
        birthPlace: safeTeammate.birthPlace,
        calendarType: safeTeammate.calendarType,
        parsedMansaeSummary: parsed.llmSummaryPayload,
        normalizedMansaeJson: parsed.normalizedPayloadJson,
        mansaeRawText: parsed.rawStructuredText || rawText,
      }

      let result: MansaeLlmResponse

      try {
        result = await requestMansaeAnalysisStream(
          requestPayload,
          {
            onMeta(meta) {
              setStreamMeta(meta)
            },
            onChunk(chunk) {
              setStreamingDraft((previous) => previous + chunk)
            },
          },
        )
      } catch (streamError) {
        setStreamMeta(null)
        setStreamingDraft('')
        result = await requestMansaeAnalysis(requestPayload)
        if (!result.usedFallback) {
          setLlmError('스트리밍이 지연되어 일반 분석 응답으로 전환했습니다.')
        } else {
          throw streamError
        }
      }

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
            만세력 표에서 복사한 내용을 그대로 붙여넣으세요. `text/html`이 있으면 표 구조를
            먼저 읽고, 없으면 일반 텍스트로 fallback합니다. 연주·월주·일주·시주가 보이지 않는
            표 형태도 양력 생년월일과 시간을 읽어 최대한 보정합니다.
          </p>
          <textarea
            className="paste-area"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            onPaste={handlePaste}
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
          <div className="chip-row mansae-source-row">
            <span className="chip">입력 감지: {getSourceLabel(parsed.sourceType)}</span>
            <span className="chip">추출 신뢰도: {getConfidenceLabel(parsed.extractionConfidence)}</span>
            {rawHtml && <span className="chip">HTML 구조 보존됨</span>}
            {pastedImageDataUrl && <span className="chip">이미지 붙여넣기 감지됨</span>}
            {isReadingImage && <span className="chip">OCR 읽는 중</span>}
            {ocrResult?.provider && <span className="chip">OCR: {ocrResult.provider}</span>}
          </div>
          {pasteNotice && <p className="muted mansae-paste-note">{pasteNotice}</p>}
          {pastedImageDataUrl && (
            <div className="mansae-image-preview">
              <img src={pastedImageDataUrl} alt="붙여넣은 만세력 이미지 미리보기" />
              <p className="muted">
                {isReadingImage
                  ? '이미지에서 텍스트를 읽는 중입니다.'
                  : ocrResult?.text
                    ? '이미지 OCR 결과를 textarea와 재구성 파서에 함께 반영했습니다.'
                    : '텍스트/HTML 복사본이 들어오면 그 구조를 우선 사용하고, 이미지 OCR은 fallback으로 이어집니다.'}
              </p>
              {!isReadingImage && (
                <button
                  type="button"
                  className="ghost-button inline-button"
                  onClick={() => runImageOcr(pastedImageDataUrl)}
                >
                  이미지 OCR 다시 읽기
                </button>
              )}
            </div>
          )}
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

          <h4>출생 정보 재구성</h4>
          <BirthInfoPreview parsed={parsed} />

          <h4>핵심 키워드 분류</h4>
          <div className="keyword-group-grid">
            <KeywordGroupCard title="십성" items={parsed.keywordGroups.tenGods} tone="olive" />
            <KeywordGroupCard title="십이운성" items={parsed.keywordGroups.lifeStages} tone="sage" />
            <KeywordGroupCard title="신살·보조 키워드" items={parsed.keywordGroups.specialStars} tone="amber" />
          </div>

          <h4>현재 선택 대운 구조</h4>
          <BigFlowPreview parsed={parsed} />

          <h4>인식 메모</h4>
          <div className="analysis-box">{parsed.detectionNote}</div>

          {ocrResult?.text && (
            <>
              <h4>이미지 OCR 원문</h4>
              <div className="analysis-box analysis-box--prewrap">{ocrResult.text}</div>
            </>
          )}

          <h4>분석 전 확인</h4>
          <div className="analysis-box">{analysisText}</div>
          <button
            type="button"
            className="primary-button inline-button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || isReadingImage}
          >
            {isReadingImage ? '이미지 읽는 중...' : isAnalyzing ? '가이드 만드는 중...' : '협업 가이드 만들기'}
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
        <p className="card-label">성향 해석</p>
        <p>{analysis.personalityReading}</p>
      </article>

      <article className="analysis-result-card">
        <p className="card-label">일 스타일</p>
        <p>{analysis.workStyleReading}</p>
      </article>

      <article className="analysis-result-card">
        <p className="card-label">대화할 때 잘 맞는 방식</p>
        <p>{analysis.communicationGuide}</p>
      </article>

      <AnalysisList title="마찰이 생기기 쉬운 지점" items={analysis.cautions} />
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

function BirthInfoPreview(props: { parsed: MansaeParseResult }) {
  const { birthInfo } = props.parsed
  return (
    <div className="info-grid info-grid--mansae">
      <InfoCell label="양력">{birthInfo.solarDate ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="음력">{birthInfo.lunarDate ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="시간">{birthInfo.birthTime ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="태어난 장소">{birthInfo.birthPlace ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="절입기준" wide>
        {birthInfo.solarTerm ?? '감지 안 됨'}
      </InfoCell>
    </div>
  )
}

function BigFlowPreview(props: { parsed: MansaeParseResult }) {
  const { bigFlow } = props.parsed

  if (!bigFlow) {
    return (
      <div className="analysis-box">
        현재 복사본에서는 활성화된 대운 칸을 특정하지 못했습니다. 구조는 남겨두었고, 나중에
        대운 분석을 붙일 수 있도록 자리만 먼저 열어두었습니다.
      </div>
    )
  }

  return (
    <div className="info-grid info-grid--mansae">
      <InfoCell label="대운 이름">{bigFlow.decadeLabel ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="선택 연도">{bigFlow.selectedYear ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="선택 나이">{bigFlow.selectedAge ? `${bigFlow.selectedAge}세` : '감지 안 됨'}</InfoCell>
      <InfoCell label="간지">{bigFlow.pillar ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="십성">{bigFlow.tenGod ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="십이운성">{bigFlow.lifeStage ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="신살·보조 키워드">{bigFlow.specialStar ?? '감지 안 됨'}</InfoCell>
      <InfoCell label="기간" wide>
        {bigFlow.range ?? '감지 안 됨'}
      </InfoCell>
    </div>
  )
}

function KeywordGroupCard(props: {
  title: string
  items: { label: string; count: number }[]
  tone: 'olive' | 'sage' | 'amber'
}) {
  return (
    <article className={`keyword-card keyword-card--${props.tone}`}>
      <p className="card-label">{props.title}</p>
      {props.items.length ? (
        <ul className="plain-list keyword-list">
          {props.items.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <strong>x{item.count}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">감지 안 됨</p>
      )}
    </article>
  )
}

function InfoCell(props: { label: string; children: string; wide?: boolean }) {
  return (
    <div className={`info-cell${props.wide ? ' info-cell--wide' : ''}`}>
      <span>{props.label}</span>
      <strong>{props.children}</strong>
    </div>
  )
}

function getSourceLabel(sourceType: MansaeParseResult['sourceType']) {
  switch (sourceType) {
    case 'html':
      return 'HTML 복사본'
    case 'text':
      return '일반 텍스트'
    case 'image':
      return '이미지'
    default:
      return '입력 없음'
  }
}

function getConfidenceLabel(confidence: MansaeParseResult['extractionConfidence']) {
  switch (confidence) {
    case 'high':
      return '높음'
    case 'medium':
      return '보통'
    default:
      return '낮음'
  }
}

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
