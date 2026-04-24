import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, Loader2 } from "lucide-react";
import { ExplanationPanel, type ReadingExplanation, type ReadingQuestion } from "@/components/new-toefl-reading/shared";

interface NewToeflReadingChoiceTabProps {
  variant: "comprehension" | "academic";
  title: string;
  passageTitle: string;
  passage: string;
  questionIndex: number;
  questions: ReadingQuestion[];
  fontSize: number;
  isLight: boolean;
  answers: Record<string, number>;
  handleSelectAnswer: (key: string, value: number) => void;
  showAnswerOnly: boolean;
  setShowAnswerOnly: (show: boolean) => void;
  showExplanation: boolean;
  setShowExplanation: (show: boolean) => void;
  explanation: ReadingExplanation | null;
  isFullTestMode: boolean;
  isLoadingExplanation: boolean;
  onGetExplanation: () => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  t: (key: string) => string;
  formatEmailPassage: (passage: string) => string;
  cleanPassageText: (passage: string) => string;
}

export default function NewToeflReadingChoiceTab({
  variant,
  title,
  passageTitle,
  passage,
  questionIndex,
  questions,
  fontSize,
  isLight,
  answers,
  handleSelectAnswer,
  showAnswerOnly,
  setShowAnswerOnly,
  showExplanation,
  setShowExplanation,
  explanation,
  isFullTestMode,
  isLoadingExplanation,
  onGetExplanation,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  t,
  formatEmailPassage,
  cleanPassageText,
}: NewToeflReadingChoiceTabProps) {
  const currentQuestion = questions[questionIndex];
  const answerKey = `${variant}-${questionIndex}`;

  return (
    <div className="grid md:grid-cols-2 gap-6" style={{ minHeight: "calc(100vh - 160px)" }}>
      <div className="rd-card flex flex-col" style={{ maxHeight: "calc(100vh - 160px)" }}>
        <div className="p-5 border-b" style={{ borderColor: "rgba(0,120,255,.08)" }}>
          <div className="rd-section-label">{title}</div>
          <div className={variant === "comprehension" ? "text-white font-semibold text-base" : "text-white/60 text-sm"} style={{ fontFamily: "Sora,sans-serif" }}>
            {passageTitle}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="rd-passage" style={{ fontSize: `${fontSize}%` }}>
            {formatEmailPassage(cleanPassageText(passage))}
          </p>
        </div>
      </div>

      <div className="rd-card flex flex-col" style={{ maxHeight: "calc(100vh - 160px)" }}>
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "rgba(0,120,255,.08)" }}>
          <div>
            <div className="rd-section-label">Question</div>
            <div className="rd-q-num">
              {questionIndex + 1}{" "}
              <span style={{ color: isLight ? "#9CA3AF" : "rgba(255,255,255,.4)", fontSize: 14, fontFamily: "Sora,sans-serif" }}>
                of {questions.length}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { onClick: onPrev, disabled: prevDisabled, icon: ArrowLeft, testId: `button-prev-${variant}` },
              { onClick: onNext, disabled: nextDisabled, icon: ArrowRight, testId: `button-next-${variant}` },
            ].map((btn, bi) => (
              <button
                key={bi}
                onClick={btn.onClick}
                disabled={btn.disabled}
                data-testid={btn.testId}
                style={{
                  background: isLight ? "#F3F4F6" : "rgba(255,255,255,.06)",
                  border: isLight ? "1px solid #D1D5DB" : "1px solid rgba(255,255,255,.1)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: btn.disabled ? (isLight ? "#D1D5DB" : "rgba(255,255,255,.2)") : (isLight ? "#374151" : "rgba(255,255,255,.8)"),
                  cursor: btn.disabled ? "not-allowed" : "pointer",
                }}
              >
                <btn.icon size={14} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`} style={{ fontFamily: "Sora,sans-serif", fontSize: `${fontSize}%` }}>
            {currentQuestion?.question}
          </p>
          <div>
            {currentQuestion?.options?.map((option, i) => {
              const isSelected = answers[answerKey] === i;
              return (
                <div
                  key={i}
                  className={`rd-ch${isSelected ? " sel" : ""}`}
                  onClick={() => handleSelectAnswer(answerKey, i)}
                  data-testid={`option-${variant}-${questionIndex}-${i}`}
                >
                  <div className="rd-cr" />
                  <span className="text-white/85" style={{ fontFamily: "Arial,sans-serif", fontSize: `${fontSize}%` }}>
                    {option}
                  </span>
                </div>
              );
            })}
          </div>

          {!isFullTestMode && (
            <div className="flex gap-3 pt-2 flex-wrap">
              <button
                onClick={() => {
                  setShowAnswerOnly(!showAnswerOnly);
                  setShowExplanation(false);
                }}
                style={{
                  border: "1px solid rgba(0,187,255,.3)",
                  color: "#00BBFF",
                  background: "transparent",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontFamily: "Sora,sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CheckCircle2 size={14} />
                {showAnswerOnly ? t("reading.hideAnswers") : t("toefl.reading.showAnswer")}
              </button>
              <button
                onClick={onGetExplanation}
                disabled={isLoadingExplanation || answers[answerKey] === undefined}
                data-testid={`button-get-explanation-${variant}`}
                style={{
                  background: "linear-gradient(135deg,#0060CC,#00BBFF)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontFamily: "Sora,sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: isLoadingExplanation || answers[answerKey] === undefined ? 0.5 : 1,
                }}
              >
                {isLoadingExplanation ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    {t("reading.explanationLoading")}
                  </>
                ) : (
                  <>
                    <Lightbulb size={13} />
                    {t("reading.explanationBtn")}
                  </>
                )}
              </button>
            </div>
          )}

          {showAnswerOnly && currentQuestion && (
            <div className="rd-answer-box">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} style={{ color: "#00BBFF" }} />
                <div>
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: "#00BBFF",
                      fontFamily: "Oswald,sans-serif",
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {t("toefl.reading.answer")}
                  </span>
                  <p className="text-white font-semibold" style={{ fontFamily: "Arial,sans-serif" }}>
                    {String.fromCharCode(65 + (currentQuestion.correctAnswer ?? 0))}){" "}
                    {currentQuestion.options?.[currentQuestion.correctAnswer ?? 0]}
                  </p>
                </div>
              </div>
            </div>
          )}

          {showExplanation && explanation && <ExplanationPanel explanation={explanation} onClose={() => setShowExplanation(false)} t={t} />}
        </div>
      </div>
    </div>
  );
}
