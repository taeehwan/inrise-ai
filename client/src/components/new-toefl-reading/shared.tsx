import { BookOpen, CheckCircle, CheckCircle2, Lightbulb, X, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export type QuestionType = "complete-words" | "comprehension" | "academic";

export interface ReadingQuestion {
  id: number;
  type?: QuestionType;
  passage?: string;
  question: string;
  options?: string[];
  blanks?: { position: number; answer: string; hint: string }[];
  correctAnswer?: number;
}

export interface BlankSegment {
  text: string;
  hint: string;
  hasBlank: boolean;
  blankLength: number;
}

export interface ReadingExplanation {
  isCorrect: boolean;
  correctAnswer: string;
  correctAnswerText?: string;
  correctReason: string;
  wrongAnswers?: Array<{ option: string; text: string; reason: string }>;
  keyVocabulary?: Array<{ word: string; meaning: string; example: string; exampleKorean: string }>;
  studyTip?: string;
}

export function ExplanationPanel({
  explanation,
  onClose,
  t,
}: {
  explanation: ReadingExplanation;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const { resolvedTheme } = useTheme();
  const isLt = resolvedTheme === "light";

  return (
    <div
      className="mt-4 p-5 rounded-2xl border space-y-4"
      style={{
        background: isLt ? "#FFFFFF" : "#0C1220",
        borderColor: isLt ? "#E5E7EB" : "rgba(0,187,255,.2)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="font-bold text-lg flex items-center gap-2"
          style={{ color: "#00BBFF", fontFamily: "Sora,sans-serif" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#0060CC,#00BBFF)" }}
          >
            <Lightbulb size={14} className="text-white" />
          </div>
          {t("reading.iNRISEExplanation")}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: isLt ? "#9CA3AF" : "rgba(255,255,255,.4)",
            cursor: "pointer",
            padding: 4,
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div
        className="p-4 rounded-xl"
        style={{
          background: explanation.isCorrect ? "rgba(0,232,123,.08)" : "rgba(255,80,80,.08)",
          border: `1px solid ${explanation.isCorrect ? "rgba(0,232,123,.25)" : "rgba(255,80,80,.25)"}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: explanation.isCorrect ? "#00E87B" : "#FF5050" }}
          >
            {explanation.isCorrect ? (
              <CheckCircle2 size={18} className="text-white" />
            ) : (
              <XCircle size={18} className="text-white" />
            )}
          </div>
          <div>
            <span
              className="font-bold text-base"
              style={{
                color: explanation.isCorrect ? "#00E87B" : "#FF6B6B",
                fontFamily: "Sora,sans-serif",
              }}
            >
              {explanation.isCorrect ? t("reading.correct") : t("reading.incorrect")}
            </span>
            <p
              className={`text-sm ${isLt ? "text-gray-600" : "text-white/70"}`}
              style={{ fontFamily: "Sora,sans-serif" }}
            >
              <span className={`font-semibold ${isLt ? "text-gray-900" : "text-white"}`}>
                {t("reading.correctAnswer")}: {explanation.correctAnswer}
              </span>
              {explanation.correctAnswerText ? ` - ${explanation.correctAnswerText}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4
          className="font-semibold flex items-center gap-2"
          style={{ color: "#00E87B", fontFamily: "Sora,sans-serif" }}
        >
          <CheckCircle size={14} style={{ color: "#00E87B" }} />
          {t("reading.whyCorrect")}
        </h4>
        <p
          className={`text-sm leading-relaxed p-4 rounded-xl ${isLt ? "text-gray-600" : "text-white/70"}`}
          style={{
            background: isLt ? "#F9FAFB" : "rgba(255,255,255,.04)",
            border: isLt ? "1px solid #E5E7EB" : "1px solid rgba(255,255,255,.06)",
            fontFamily: "Sora,sans-serif",
          }}
        >
          {explanation.correctReason}
        </p>
      </div>

      {explanation.wrongAnswers && explanation.wrongAnswers.length > 0 && (
        <div className="space-y-2">
          <h4
            className="font-semibold flex items-center gap-2"
            style={{ color: "#FF6B6B", fontFamily: "Sora,sans-serif" }}
          >
            <AlertCircle size={14} />
            {t("reading.wrongAnalysis")}
          </h4>
          <div className="space-y-2">
            {explanation.wrongAnswers.map((wrong, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl"
                style={{
                  background: isLt ? "#F9FAFB" : "rgba(255,255,255,.04)",
                  border: isLt ? "1px solid #E5E7EB" : "1px solid rgba(255,255,255,.06)",
                }}
              >
                <p
                  className={`font-medium text-sm ${isLt ? "text-gray-500" : "text-white/60"}`}
                  style={{ fontFamily: "Arial,sans-serif" }}
                >
                  {wrong.option}. {wrong.text}
                </p>
                <p
                  className={`text-sm mt-1 ${isLt ? "text-gray-400" : "text-white/50"}`}
                  style={{ fontFamily: "Sora,sans-serif" }}
                >
                  {wrong.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {explanation.keyVocabulary && explanation.keyVocabulary.length > 0 && (
        <div className="space-y-2">
          <h4
            className="font-semibold flex items-center gap-2"
            style={{ color: "#00BBFF", fontFamily: "Sora,sans-serif" }}
          >
            <BookOpen size={14} />
            {t("reading.vocabExpr")}
          </h4>
          <div className="space-y-2">
            {explanation.keyVocabulary.map((vocab, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl"
                style={{ background: "rgba(0,187,255,.04)", border: "1px solid rgba(0,187,255,.1)" }}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-bold" style={{ fontFamily: "Arial,sans-serif" }}>
                    {vocab.word}
                  </span>
                  <span
                    style={{ color: "rgba(0,187,255,.8)", fontFamily: "Sora,sans-serif", fontSize: 13 }}
                  >
                    - {vocab.meaning}
                  </span>
                </div>
                <p className="text-white/40 text-sm mt-1 italic" style={{ fontFamily: "Arial,sans-serif" }}>
                  "{vocab.example}"
                </p>
                <p className="text-white/30 text-sm" style={{ fontFamily: "Sora,sans-serif" }}>
                  {vocab.exampleKorean}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {explanation.studyTip && (
        <div
          className="p-3 rounded-lg"
          style={{ background: "rgba(0,187,255,.06)", border: "1px solid rgba(0,187,255,.15)" }}
        >
          <p className="text-sm" style={{ color: "rgba(0,187,255,.8)", fontFamily: "Sora,sans-serif" }}>
            <span className="font-bold">{t("reading.studyTip")}:</span> {explanation.studyTip}
          </p>
        </div>
      )}
    </div>
  );
}

export function NewToeflReadingLoadingFallback() {
  return (
    <div className="min-h-[320px] flex items-center justify-center rounded-2xl border border-white/10 bg-[#0C1220]">
      <div className="text-center text-white/50" style={{ fontFamily: "Sora,sans-serif" }}>
        로딩 중...
      </div>
    </div>
  );
}
