import { Award, Bot, FileText, Lightbulb } from "lucide-react";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import type { GreVerbalAnswer, GreVerbalQuestion } from "./shared";

interface GreVerbalResultsViewProps {
  questions: GreVerbalQuestion[];
  answers: Record<string, GreVerbalAnswer>;
  explanations: Record<string, string>;
  loadingExplanations: Record<string, boolean>;
  isPro: boolean;
  membershipTier?: string | null;
  getQuestionTypeLabel: (type: string) => string;
  onRequestExplanation: (questionId: string, question: GreVerbalQuestion) => void;
  onGenerateReport: (correctCount: number, totalCount: number) => void;
  onBack: () => void;
  onUpgrade: () => void;
}

export default function GreVerbalResultsView({
  questions,
  answers,
  explanations,
  loadingExplanations,
  isPro,
  membershipTier,
  getQuestionTypeLabel,
  onRequestExplanation,
  onGenerateReport,
  onBack,
  onUpgrade,
}: GreVerbalResultsViewProps) {
  const correctCount = questions.filter((question) => {
    const userAnswer = answers[question.id];
    if (Array.isArray(question.correctAnswer)) {
      return (
        Array.isArray(userAnswer) &&
        userAnswer.length === question.correctAnswer.length &&
        userAnswer.every((answer) => question.correctAnswer.includes(answer))
      );
    }
    return userAnswer === question.correctAnswer;
  }).length;

  return (
    <SecurityWrapper
      watermark="iNRISE GRE VERBAL REASONING TEST"
      disableRightClick={true}
      disableKeyboardShortcuts={true}
      disableTextSelection={true}
      disableScreenshot={true}
      showSecurityNotice={true}
    >
      <FullscreenWrapper className="gv-page gre-font">
        <div className="gv-header mb-0">
          <h1 className="text-2xl font-bold tracking-wide" style={{ color: "var(--gve-text-primary)" }}>
            GRE Verbal Reasoning — 결과
          </h1>
        </div>
        <div className="max-w-4xl mx-auto p-4">
          <div className="gv-card p-6 mb-4">
            <h2 className="text-xl font-bold mb-4" style={{ color: "var(--gve-text-primary)" }}>
              시험 결과
            </h2>

            <div className="text-center mb-6">
              <div className="text-5xl font-bold mb-2" style={{ color: "var(--gve-accent-soft)" }}>
                {correctCount}/{questions.length}
              </div>
              <p style={{ color: "var(--gve-text-muted)" }}>
                정답률: {Math.round((correctCount / questions.length) * 100)}%
              </p>
            </div>

            <div className="space-y-3">
              {questions.map((question, index) => {
                const userAnswer = answers[question.id];
                const isCorrect = Array.isArray(question.correctAnswer)
                  ? Array.isArray(userAnswer) &&
                    userAnswer.length === question.correctAnswer.length &&
                    userAnswer.every((answer) => question.correctAnswer.includes(answer))
                  : userAnswer === question.correctAnswer;

                return (
                  <div key={question.id} className={`gv-result-card ${isCorrect ? "gv-result-correct" : "gv-result-wrong"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="gv-type-badge">
                        문제 {index + 1} — {getQuestionTypeLabel(question.type)}
                      </span>
                      <span
                        className="gv-q-badge"
                        style={
                          isCorrect
                            ? {}
                            : {
                                background: "rgba(239,68,68,0.15)",
                                color: "#FCA5A5",
                                borderColor: "rgba(239,68,68,0.2)",
                              }
                        }
                      >
                        {isCorrect ? "정답" : "오답"}
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: "var(--gve-text-body)" }}>
                      {question.question}
                    </p>
                    <p className="text-xs mb-2" style={{ color: "var(--gve-text-muted)" }}>
                      <strong style={{ color: "var(--gve-text-dim)" }}>정답:</strong>{" "}
                      {Array.isArray(question.correctAnswer)
                        ? question.correctAnswer.join(", ")
                        : question.correctAnswer}
                    </p>

                    {!explanations[question.id] && !loadingExplanations[question.id] && (
                      <div className="mt-3 relative group inline-block">
                        <button
                          className={`gv-btn-primary text-sm py-1.5 ${!isPro ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => isPro && onRequestExplanation(question.id, question)}
                        >
                          <Bot className="w-4 h-4" />
                          해설 보기
                          {!isPro && <span className="ml-1 text-xs">🔒</span>}
                        </button>
                        {!isPro && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              PRO 등급 이상 필요
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {loadingExplanations[question.id] && (
                      <div className="mt-3 gv-loading-bar">
                        <Bot className="w-4 h-4 animate-pulse" />
                        <span className="text-sm">AI가 상세한 해설을 생성중입니다...</span>
                      </div>
                    )}

                    {explanations[question.id] && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2" style={{ color: "var(--gve-accent-soft)" }}>
                          <Lightbulb className="w-4 h-4" />
                          <span className="text-sm font-medium">AI 상세 해설</span>
                        </div>
                        <div
                          className="rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap"
                          style={{
                            background: "rgba(124,58,237,0.06)",
                            border: "1px solid rgba(124,58,237,0.12)",
                            color: "var(--gve-text-body)",
                          }}
                        >
                          {explanations[question.id]}
                        </div>
                      </div>
                    )}

                    <div
                      className="mt-2 p-2 rounded text-xs"
                      style={{ background: "rgba(255,255,255,0.03)", color: "var(--gve-text-dim)" }}
                    >
                      <strong>기본 해설:</strong> {question.explanation}
                    </div>
                  </div>
                );
              })}
            </div>

            {!isPro && (
              <div className="mt-6 gv-upgrade-box">
                <div className="flex items-center justify-center mb-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(124,58,237,0.25)" }}
                  >
                    <Award className="h-7 w-7" style={{ color: "var(--gve-accent-pale)" }} />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--gve-text-primary)" }}>
                  PRO 회원 혜택으로 AI 해설을 받아보세요!
                </h3>
                <p className="mb-4" style={{ color: "var(--gve-text-muted)" }}>
                  • AI 상세 해설 무제한 이용
                  <br />
                  • 독해 지문 분석 및 해석
                  <br />
                  • 어휘 학습 팁 제공
                </p>
                <p className="text-sm mb-4" style={{ color: "var(--gve-text-dim)" }}>
                  현재 등급:{" "}
                  <span className="font-bold uppercase" style={{ color: "var(--gve-accent-soft)" }}>
                    {membershipTier}
                  </span>
                </p>
                <button onClick={onUpgrade} className="gv-btn-primary px-8 py-3 text-lg font-bold">
                  PRO로 업그레이드 →
                </button>
              </div>
            )}

            <div className="flex justify-center gap-4 mt-6">
              <button className="gv-btn-secondary" onClick={() => onGenerateReport(correctCount, questions.length)}>
                <FileText className="w-4 h-4" />
                성적표 생성
              </button>
              <button className="gv-btn-primary" onClick={onBack}>
                GRE 선택으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </FullscreenWrapper>
    </SecurityWrapper>
  );
}
