import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, ArrowLeft, Sparkles, BookOpen, Target, Hash, AlertCircle, Coins } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/hooks/useSubscription";

type OptionValue = string;

interface QuestionWithAnswer {
  id: string;
  questionText: string;
  questionType: string;
  options: OptionValue[] | Record<string, OptionValue[]> | null;
  correctAnswer: string | null;
  explanation: string | null;
  passage: string | null;
  orderIndex: number;
  points: number | null;
  userAnswer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  timeSpent: number | null;
}

interface SectionScores {
  reading?: number;
  listening?: number;
  speaking?: number;
  writing?: number;
}

interface AttemptDetail {
  id: string;
  testId: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  totalScore: number | null;
  sectionScores: SectionScores | null;
  timeSpent: number | null;
  status: string;
  testTitle: string;
  examType: string;
  section: string;
  questions: QuestionWithAnswer[];
}

interface CreditInfo {
  balance: number;
  lifetimeEarned: number;
  lifetimeUsed: number;
}

function normalizeOptions(raw: QuestionWithAnswer['options']): OptionValue[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw && typeof raw === 'object') {
    return Object.values(raw).flat().map(String);
  }
  return [];
}

const SECTION_COLORS: Record<string, { bg: string; accent: string; label: string }> = {
  reading: { bg: 'rgba(0,200,200,.12)', accent: '#00C8C8', label: 'Reading' },
  listening: { bg: 'rgba(0,200,100,.12)', accent: '#00C864', label: 'Listening' },
  speaking: { bg: 'rgba(45,212,191,.12)', accent: '#2DD4BF', label: 'Speaking' },
  writing: { bg: 'rgba(124,58,237,.12)', accent: '#7C3AED', label: 'Writing' },
};

const AI_EXPLANATION_COST = 1;
const AI_ANALYSIS_COST = 10;

export default function TestResult() {
  const { attemptId } = useParams();
  const [expandedQ, setExpandedQ] = useState<Set<string>>(new Set());
  const [creditModal, setCreditModal] = useState<{ type: 'explanation' | 'analysis'; questionId?: string } | null>(null);
  const [fetchedExplanations, setFetchedExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const { canGetAIFeedback } = useSubscription();

  const { data, isLoading, error } = useQuery<AttemptDetail>({
    queryKey: ['/api/attempts', attemptId],
    enabled: !!attemptId,
  });

  const { data: creditData } = useQuery<CreditInfo>({
    queryKey: ['/api/user/credits'],
  });

  const aiMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/student/generate-learning-feedback', {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/credits'] });
    },
  });

  const fetchExplanation = async (questionId: string) => {
    if (!data) return;
    const q = data.questions.find(qq => qq.id === questionId);
    if (!q) return;

    const opts = normalizeOptions(q.options);
    if (opts.length === 0 || (!q.questionText && !q.passage)) {
      setFetchedExplanations(prev => ({ ...prev, [questionId]: '이 문항은 AI 해설을 지원하지 않습니다.' }));
      return;
    }

    setLoadingExplanation(questionId);
    try {
      const res = await apiRequest('POST', '/api/ai/explain-answer', {
        question: q.questionText,
        passage: q.passage || '',
        userAnswer: q.userAnswer || '',
        correctAnswer: q.correctAnswer || '',
        options: opts,
        language: 'ko',
      });
      const result = await res.json();
      setFetchedExplanations(prev => ({ ...prev, [questionId]: result.explanation || result.message || '해설을 생성할 수 없습니다.' }));
      queryClient.invalidateQueries({ queryKey: ['/api/user/credits'] });
    } catch {
      setFetchedExplanations(prev => ({ ...prev, [questionId]: '해설 생성 중 오류가 발생했습니다.' }));
    }
    setLoadingExplanation(null);
  };

  const handleExplanationClick = (questionId: string) => {
    if (fetchedExplanations[questionId]) return;
    setCreditModal({ type: 'explanation', questionId });
  };

  const handleAnalysisClick = () => {
    setCreditModal({ type: 'analysis' });
  };

  const confirmCredit = () => {
    if (!creditModal) return;
    if (creditModal.type === 'explanation' && creditModal.questionId) {
      fetchExplanation(creditModal.questionId);
    } else if (creditModal.type === 'analysis') {
      aiMutation.mutate();
    }
    setCreditModal(null);
  };

  const toggleExpand = (qId: string) => {
    setExpandedQ(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="tr-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(96,165,250,.3)', borderTop: '3px solid #60A5FA', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--tr-text-muted)' }}>결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="tr-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <XCircle style={{ width: 48, height: 48, color: '#EF4444', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--tr-text-primary)', fontSize: 18, fontWeight: 600 }}>결과를 찾을 수 없습니다</p>
          <Link href="/history">
            <a style={{ color: 'var(--tr-accent)', marginTop: 12, display: 'inline-block' }}>← 히스토리로 돌아가기</a>
          </Link>
        </div>
      </div>
    );
  }

  const questions = data.questions || [];
  const correctCount = questions.filter(q => q.isCorrect).length;
  const totalCount = questions.length;
  const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const completedDate = data.completedAt ? new Date(data.completedAt) : null;
  const sectionInfo = SECTION_COLORS[data.section] || SECTION_COLORS.reading;
  const balance = creditData?.balance ?? 0;

  const sectionScoreEntries = data.sectionScores
    ? Object.entries(data.sectionScores).filter(([k]) => ['reading', 'listening', 'speaking', 'writing'].includes(k))
    : [];

  return (
    <div className="tr-page">
      <style>{`
        .tr-page {
          --tr-bg: #0B1120;
          --tr-surface: #111827;
          --tr-surface-2: #1A2332;
          --tr-border: rgba(148,163,184,.12);
          --tr-text-primary: #F1F5F9;
          --tr-text-secondary: #CBD5E1;
          --tr-text-muted: #64748B;
          --tr-accent: #60A5FA;
          --tr-accent-dim: rgba(96,165,250,.15);
          --tr-green: #34D399;
          --tr-red: #F87171;
          min-height: 100vh;
          background: var(--tr-bg);
          color: var(--tr-text-primary);
          font-family: Arial, 'Malgun Gothic', sans-serif;
        }
        .tr-header {
          background: var(--tr-surface);
          border-bottom: 1px solid var(--tr-border);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .tr-back {
          color: var(--tr-text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          font-size: 14px;
          transition: color .15s;
        }
        .tr-back:hover { color: var(--tr-accent); }
        .tr-container { max-width: 960px; margin: 0 auto; padding: 24px 16px 60px; }
        .tr-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .tr-card {
          background: var(--tr-surface);
          border: 1px solid var(--tr-border);
          border-radius: 12px;
          padding: 20px;
        }
        .tr-card-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--tr-text-muted);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tr-card-value {
          font-size: 32px;
          font-weight: 700;
          line-height: 1.1;
        }
        .tr-card-sub {
          font-size: 13px;
          color: var(--tr-text-muted);
          margin-top: 4px;
        }
        .tr-section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--tr-text-primary);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tr-bar-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .tr-bar-label {
          width: 80px;
          font-size: 13px;
          color: var(--tr-text-secondary);
          text-transform: capitalize;
        }
        .tr-bar-track {
          flex: 1;
          height: 10px;
          background: rgba(255,255,255,.06);
          border-radius: 5px;
          overflow: hidden;
        }
        .tr-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width .6s ease;
        }
        .tr-bar-val {
          width: 36px;
          text-align: right;
          font-size: 14px;
          font-weight: 600;
        }
        .tr-q-item {
          background: var(--tr-surface);
          border: 1px solid var(--tr-border);
          border-radius: 10px;
          margin-bottom: 8px;
          overflow: hidden;
          transition: border-color .15s;
        }
        .tr-q-item:hover { border-color: rgba(148,163,184,.2); }
        .tr-q-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          cursor: pointer;
          user-select: none;
        }
        .tr-q-num {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .tr-q-correct { background: rgba(52,211,153,.15); color: var(--tr-green); }
        .tr-q-wrong { background: rgba(248,113,113,.15); color: var(--tr-red); }
        .tr-q-text {
          flex: 1;
          font-size: 14px;
          color: var(--tr-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tr-q-answers {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          flex-shrink: 0;
        }
        .tr-q-my { color: var(--tr-text-muted); }
        .tr-q-arrow { color: var(--tr-text-muted); }
        .tr-q-detail {
          padding: 0 16px 16px;
          border-top: 1px solid var(--tr-border);
        }
        .tr-q-passage {
          background: var(--tr-surface-2);
          border-radius: 8px;
          padding: 14px;
          font-size: 13px;
          line-height: 1.7;
          color: var(--tr-text-secondary);
          margin: 12px 0;
          max-height: 200px;
          overflow-y: auto;
        }
        .tr-q-opts {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin: 12px 0;
        }
        .tr-q-opt {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
          border: 1px solid var(--tr-border);
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .tr-q-opt-correct {
          border-color: rgba(52,211,153,.3);
          background: rgba(52,211,153,.06);
        }
        .tr-q-opt-wrong {
          border-color: rgba(248,113,113,.3);
          background: rgba(248,113,113,.06);
        }
        .tr-q-explanation {
          background: var(--tr-accent-dim);
          border: 1px solid rgba(96,165,250,.2);
          border-radius: 8px;
          padding: 14px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--tr-text-secondary);
          margin-top: 12px;
        }
        .tr-cta {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 32px;
          flex-wrap: wrap;
        }
        .tr-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all .2s;
          text-decoration: none;
        }
        .tr-btn-primary {
          background: linear-gradient(135deg, #3B82F6, #2563EB);
          color: #fff;
        }
        .tr-btn-primary:hover { filter: brightness(1.1); }
        .tr-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
        .tr-btn-outline {
          background: transparent;
          border: 1px solid var(--tr-border);
          color: var(--tr-text-secondary);
        }
        .tr-btn-outline:hover { border-color: var(--tr-accent); color: var(--tr-accent); }
        .tr-btn-sm {
          padding: 7px 14px;
          font-size: 12px;
          border-radius: 8px;
        }
        .tr-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        .tr-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tr-modal {
          background: var(--tr-surface);
          border: 1px solid var(--tr-border);
          border-radius: 16px;
          padding: 28px;
          max-width: 400px;
          width: 90%;
        }
        .tr-modal-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tr-modal-body {
          font-size: 14px;
          color: var(--tr-text-secondary);
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .tr-modal-cost {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(96,165,250,.08);
          border: 1px solid rgba(96,165,250,.15);
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .tr-modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .tr-summary-grid { grid-template-columns: repeat(2, 1fr); }
          .tr-q-answers { display: none; }
        }
      `}</style>

      {creditModal && (
        <div className="tr-modal-overlay" onClick={() => setCreditModal(null)}>
          <div className="tr-modal" onClick={e => e.stopPropagation()}>
            <div className="tr-modal-title">
              <Coins size={18} style={{ color: 'var(--tr-accent)' }} />
              크레딧 차감 확인
            </div>
            <div className="tr-modal-body">
              {creditModal.type === 'explanation'
                ? 'AI 해설을 생성하면 크레딧이 차감됩니다. 계속하시겠습니까?'
                : 'AI 종합 학습 분석을 생성하면 크레딧이 차감됩니다. 계속하시겠습니까?'}
            </div>
            <div className="tr-modal-cost">
              <Coins size={16} style={{ color: '#FBBF24' }} />
              <span style={{ fontWeight: 600 }}>
                {creditModal.type === 'explanation' ? AI_EXPLANATION_COST : AI_ANALYSIS_COST} 크레딧 차감
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--tr-text-muted)', fontSize: 13 }}>
                잔액: {balance}
              </span>
            </div>
            {balance < (creditModal.type === 'explanation' ? AI_EXPLANATION_COST : AI_ANALYSIS_COST) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--tr-red)', fontSize: 13, marginBottom: 12 }}>
                <AlertCircle size={14} /> 크레딧이 부족합니다.
              </div>
            )}
            <div className="tr-modal-actions">
              <button className="tr-btn tr-btn-outline tr-btn-sm" onClick={() => setCreditModal(null)}>취소</button>
              <button
                className="tr-btn tr-btn-primary tr-btn-sm"
                onClick={confirmCredit}
                disabled={balance < (creditModal.type === 'explanation' ? AI_EXPLANATION_COST : AI_ANALYSIS_COST)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="tr-header">
        <Link href="/history">
          <a className="tr-back"><ArrowLeft size={16} /> 히스토리</a>
        </Link>
        <div style={{ flex: 1 }} />
        <span className="tr-badge" style={{ background: sectionInfo.bg, color: sectionInfo.accent }}>
          {sectionInfo.label}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{data.testTitle}</span>
      </div>

      <div className="tr-container">
        <div className="tr-summary-grid">
          <div className="tr-card">
            <div className="tr-card-label"><Trophy size={14} /> 총점</div>
            <div className="tr-card-value" style={{ color: pct >= 80 ? 'var(--tr-green)' : pct >= 50 ? 'var(--tr-accent)' : 'var(--tr-red)' }}>
              {data.totalScore ?? 0}
            </div>
            <div className="tr-card-sub">{data.examType === 'toefl' ? '/ 30' : 'points'}</div>
          </div>

          <div className="tr-card">
            <div className="tr-card-label"><Target size={14} /> 정답</div>
            <div className="tr-card-value">{correctCount}<span style={{ fontSize: 18, color: 'var(--tr-text-muted)' }}>/{totalCount}</span></div>
            <div className="tr-card-sub">{pct}% 정답률</div>
          </div>

          <div className="tr-card">
            <div className="tr-card-label"><Clock size={14} /> 소요 시간</div>
            <div className="tr-card-value">{data.timeSpent ?? 0}<span style={{ fontSize: 16, color: 'var(--tr-text-muted)' }}>분</span></div>
          </div>

          <div className="tr-card">
            <div className="tr-card-label"><Hash size={14} /> 완료 일시</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tr-text-secondary)' }}>
              {completedDate ? completedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '미완료'}
            </div>
            <div className="tr-card-sub">
              {completedDate ? completedDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </div>
        </div>

        {sectionScoreEntries.length > 0 && (
          <div className="tr-card" style={{ marginBottom: 32 }}>
            <div className="tr-section-title"><BookOpen size={16} /> 섹션별 점수</div>
            {sectionScoreEntries.map(([key, val]) => {
              const sc = SECTION_COLORS[key] || SECTION_COLORS.reading;
              const score = typeof val === 'number' ? val : 0;
              const maxScore = 30;
              return (
                <div className="tr-bar-row" key={key}>
                  <span className="tr-bar-label">{sc.label}</span>
                  <div className="tr-bar-track">
                    <div className="tr-bar-fill" style={{ width: `${Math.min((score / maxScore) * 100, 100)}%`, background: sc.accent }} />
                  </div>
                  <span className="tr-bar-val" style={{ color: sc.accent }}>{score}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="tr-section-title" style={{ marginTop: 8 }}>
          <CheckCircle size={16} /> 문항별 결과 ({correctCount}/{totalCount})
        </div>

        {questions.map((q, idx) => {
          const expanded = expandedQ.has(q.id);
          const opts = normalizeOptions(q.options);
          const explanation = fetchedExplanations[q.id] || null;
          const isLoadingThis = loadingExplanation === q.id;

          return (
            <div className="tr-q-item" key={q.id}>
              <div className="tr-q-head" onClick={() => toggleExpand(q.id)}>
                <div className={`tr-q-num ${q.isCorrect ? 'tr-q-correct' : 'tr-q-wrong'}`}>
                  {idx + 1}
                </div>
                <div className="tr-q-text">{q.questionText}</div>
                <div className="tr-q-answers">
                  <span className="tr-q-my" style={{ color: q.isCorrect ? 'var(--tr-green)' : 'var(--tr-red)' }}>
                    {q.userAnswer || '—'}
                  </span>
                  {!q.isCorrect && q.correctAnswer && (
                    <>
                      <span className="tr-q-arrow">→</span>
                      <span style={{ color: 'var(--tr-green)' }}>{q.correctAnswer}</span>
                    </>
                  )}
                </div>
                {expanded ? <ChevronUp size={16} style={{ color: 'var(--tr-text-muted)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--tr-text-muted)', flexShrink: 0 }} />}
              </div>

              {expanded && (
                <div className="tr-q-detail">
                  {q.passage && (
                    <div className="tr-q-passage">{q.passage}</div>
                  )}

                  <p style={{ fontSize: 14, color: 'var(--tr-text-primary)', margin: '12px 0 8px', fontWeight: 500 }}>
                    {q.questionText}
                  </p>

                  {opts.length > 0 && (
                    <div className="tr-q-opts">
                      {opts.map((opt: string, oi: number) => {
                        const letter = String.fromCharCode(65 + oi);
                        const isCorrectOpt = q.correctAnswer === letter || q.correctAnswer === opt;
                        const isUserOpt = q.userAnswer === letter || q.userAnswer === opt;
                        const isWrongPick = isUserOpt && !q.isCorrect;
                        let cls = 'tr-q-opt';
                        if (isCorrectOpt) cls += ' tr-q-opt-correct';
                        if (isWrongPick) cls += ' tr-q-opt-wrong';
                        return (
                          <div className={cls} key={oi}>
                            <span style={{ fontWeight: 700, minWidth: 18 }}>{letter}.</span>
                            <span>{opt}</span>
                            {isCorrectOpt && <CheckCircle size={14} style={{ marginLeft: 'auto', color: 'var(--tr-green)', flexShrink: 0 }} />}
                            {isWrongPick && <XCircle size={14} style={{ marginLeft: 'auto', color: 'var(--tr-red)', flexShrink: 0 }} />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(() => {
                    const hasExplanationData = q.correctAnswer && (opts.length > 0 || q.passage);
                    if (explanation) {
                      return (
                        <div className="tr-q-explanation">
                          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--tr-accent)' }}>AI 해설</div>
                          {explanation}
                        </div>
                      );
                    }
                    if (isLoadingThis) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--tr-text-muted)', fontSize: 13 }}>
                          <div style={{ width: 16, height: 16, border: '2px solid var(--tr-accent)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                          AI 해설 생성 중...
                        </div>
                      );
                    }
                    if (!hasExplanationData) return null;
                    if (canGetAIFeedback) {
                      return (
                        <button
                          className="tr-btn tr-btn-outline tr-btn-sm"
                          style={{ marginTop: 12 }}
                          onClick={(e) => { e.stopPropagation(); handleExplanationClick(q.id); }}
                        >
                          <Sparkles size={13} /> AI 해설 보기 ({AI_EXPLANATION_COST} 크레딧)
                        </button>
                      );
                    }
                    return (
                      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--tr-text-muted)' }}>
                        AI 해설은 유료 회원 전용 기능입니다.
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}

        <div className="tr-cta">
          {canGetAIFeedback ? (
            <button
              className="tr-btn tr-btn-primary"
              onClick={handleAnalysisClick}
              disabled={aiMutation.isPending}
            >
              <Sparkles size={16} />
              {aiMutation.isPending ? 'AI 분석 중...' : `AI 종합 분석 (${AI_ANALYSIS_COST} 크레딧)`}
            </button>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--tr-text-muted)', padding: '12px 0' }}>
              AI 종합 분석은 유료 회원 전용 기능입니다.
            </div>
          )}
          <Link href="/history">
            <a className="tr-btn tr-btn-outline">
              <ArrowLeft size={16} /> 히스토리로
            </a>
          </Link>
          <Link href="/new-toefl">
            <a className="tr-btn tr-btn-outline">다시 테스트하기</a>
          </Link>
        </div>

        {aiMutation.isSuccess && (
          <div className="tr-card" style={{ marginTop: 24, borderColor: 'rgba(96,165,250,.3)' }}>
            <div className="tr-section-title"><Sparkles size={16} style={{ color: 'var(--tr-accent)' }} /> AI 종합 분석 결과</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--tr-text-secondary)' }}>
              AI 학습 분석이 생성되었습니다. 마이페이지에서 상세 결과를 확인하세요.
            </p>
            <Link href="/my-page">
              <a className="tr-btn tr-btn-primary" style={{ marginTop: 12, display: 'inline-flex' }}>
                마이페이지에서 확인
              </a>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
