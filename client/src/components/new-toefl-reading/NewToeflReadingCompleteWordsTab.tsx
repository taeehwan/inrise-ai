import { Lightbulb, Loader2, X, CheckCircle2, XCircle } from "lucide-react";
import type { BlankSegment } from "@/components/new-toefl-reading/shared";
import { Button } from "@/components/ui/button";

interface NewToeflReadingCompleteWordsTabProps {
  t: (key: string) => string;
  fontSize: number;
  completeWordsParts: BlankSegment[];
  getBlankIndex: (segmentIndex: number) => number;
  activeCompleteWordsAnswers: string[];
  activeCompleteWordsBlanksLengths: number[];
  completeWordsInputs: string[];
  handleCompleteWordsInput: (index: number, value: string) => void;
  isFullTestMode: boolean;
  handleAutoSolveCompleteWords: () => void;
  showCompleteWordsAnswers: boolean;
  isLoadingCompleteWordsAnswers: boolean;
  aiSolvedCompleteWords: { answers: string[]; explanation: string } | null;
  setShowCompleteWordsAnswers: (show: boolean) => void;
}

export default function NewToeflReadingCompleteWordsTab({
  t,
  fontSize,
  completeWordsParts,
  getBlankIndex,
  activeCompleteWordsAnswers,
  activeCompleteWordsBlanksLengths,
  completeWordsInputs,
  handleCompleteWordsInput,
  isFullTestMode,
  handleAutoSolveCompleteWords,
  showCompleteWordsAnswers,
  isLoadingCompleteWordsAnswers,
  aiSolvedCompleteWords,
  setShowCompleteWordsAnswers,
}: NewToeflReadingCompleteWordsTabProps) {
  return (
    <div className="w-full flex flex-col" style={{ minHeight: "calc(100vh - 160px)" }}>
      <div className="rd-card flex-1 overflow-y-auto p-6">
        <div className="rd-instr">
          <p className="text-white/80 text-sm" style={{ fontFamily: "Sora,sans-serif" }}>
            {t("toefl.reading.fillBlank")}
          </p>
        </div>
        <p className="rd-passage" style={{ fontSize: `${fontSize}%` }}>
          {completeWordsParts.map((segment, i) => (
            <span key={i}>
              {segment.text}
              {segment.hint && <span className="rd-hint">{segment.hint}</span>}
              {segment.hasBlank &&
                (() => {
                  const blankIdx = getBlankIndex(i);
                  const answerFromData = activeCompleteWordsAnswers[blankIdx] || "";
                  const metadataLength = activeCompleteWordsBlanksLengths[blankIdx] || 0;
                  const hintLength = segment.hint?.length || 0;

                  let answerLength: number;
                  if (answerFromData.length > 0) {
                    if (hintLength > 0 && answerFromData.toLowerCase().startsWith(segment.hint.toLowerCase())) {
                      answerLength = answerFromData.length - hintLength;
                    } else {
                      answerLength = answerFromData.length;
                    }
                  } else if (metadataLength > 0) {
                    answerLength = metadataLength;
                  } else {
                    answerLength = segment.blankLength || 3;
                  }

                  answerLength = Math.max(1, answerLength);
                  const currentValue = completeWordsInputs[blankIdx] || "";
                  return (
                    <span
                      className="inline-flex items-center mx-1 align-baseline cursor-text relative"
                      onClick={() => document.getElementById(`blank-input-${blankIdx}`)?.focus()}
                    >
                      <span className="inline-flex gap-1.5 items-end">
                        {Array.from({ length: answerLength }).map((_, charIdx) => (
                          <span key={charIdx} className={`rd-blank-slot${currentValue[charIdx] ? " filled" : ""}`}>
                            {currentValue[charIdx]?.toUpperCase() || ""}
                          </span>
                        ))}
                      </span>
                      <input
                        type="text"
                        className="sr-only"
                        maxLength={answerLength}
                        value={currentValue}
                        onChange={(e) => handleCompleteWordsInput(blankIdx, e.target.value)}
                        data-testid={`input-blank-${blankIdx}`}
                        id={`blank-input-${blankIdx}`}
                      />
                    </span>
                  );
                })()}
            </span>
          ))}
        </p>

        {!isFullTestMode && (
          <div className="flex justify-center pt-4 border-t border-white/8 mt-4">
            <button
              style={{
                background: "linear-gradient(135deg,#0060CC,#00BBFF)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 32px",
                fontSize: 15,
                fontFamily: "Sora,sans-serif",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onClick={handleAutoSolveCompleteWords}
              data-testid="button-complete-words-answers"
            >
              <Lightbulb size={18} />
              {showCompleteWordsAnswers ? t("reading.hideAnswers") : t("toefl.reading.showAnswer")}
              {isLoadingCompleteWordsAnswers && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            </button>
          </div>
        )}

        {showCompleteWordsAnswers && (
          <div className="mt-4 p-5 rounded-xl border border-white/8 space-y-4" style={{ background: "rgba(0,120,255,.06)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2" style={{ color: "#00BBFF" }}>
                <Lightbulb className="h-5 w-5" />
                {aiSolvedCompleteWords ? t("reading.aiResult") : t("toefl.reading.showAnswer")}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompleteWordsAnswers(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {completeWordsParts
                .filter((p) => p.hasBlank)
                .map((segment, i) => {
                  const userAnswer = completeWordsInputs[i]?.toLowerCase().trim() || "";
                  const fullAnswer = aiSolvedCompleteWords?.answers[i] || activeCompleteWordsAnswers[i] || "";
                  const hint = segment.hint || "";
                  const blankLength = segment.blankLength || 3;

                  let missingLetters: string;
                  if (hint && fullAnswer.toLowerCase().startsWith(hint.toLowerCase())) {
                    missingLetters = fullAnswer.substring(hint.length);
                  } else {
                    missingLetters = fullAnswer;
                  }

                  const hasAnswer = missingLetters.length > 0;
                  const isCorrect = hasAnswer && userAnswer.toLowerCase() === missingLetters.toLowerCase();

                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        isCorrect
                          ? "bg-green-500/10 border-green-500/30"
                          : userAnswer
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-blue-500/10 border-blue-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : userAnswer ? (
                          <XCircle className="h-5 w-5 text-red-400" />
                        ) : (
                          <Lightbulb className="h-5 w-5 text-blue-400" />
                        )}
                        <span className="text-gray-300 flex items-center gap-1">
                          {t("reading.blank").replace("{n}", String(i + 1))}:
                          <span className="inline-flex items-center ml-1">
                            <span className="rd-hint">{hint}</span>
                            <span className="inline-flex gap-0.5">
                              {Array.from({ length: blankLength }).map((_, charIdx) => (
                                <span
                                  key={charIdx}
                                  className="w-5 h-6 flex items-center justify-center border-b-2 font-mono text-sm font-bold"
                                  style={{
                                    borderColor: "#00BBFF",
                                    background: "rgba(0,187,255,.15)",
                                    color: "#00BBFF",
                                  }}
                                >
                                  {missingLetters[charIdx]?.toUpperCase() || "_"}
                                </span>
                              ))}
                            </span>
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 pl-7 text-sm">
                        <p className="text-gray-400">
                          {t("reading.correctWord")}: <span className="text-green-400 font-bold">{fullAnswer || "(AI)"}</span>
                          <span className="text-gray-500 ml-2">({blankLength})</span>
                        </p>
                        {userAnswer && (
                          <p className="text-gray-400">
                            {t("reading.myAnswer")}:{" "}
                            <span className={isCorrect ? "text-green-400" : "text-red-400"}>{userAnswer.toUpperCase()}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {aiSolvedCompleteWords?.explanation && (
              <div
                className="mt-4 p-4 rounded-lg border"
                style={{ background: "rgba(0,120,255,.06)", borderColor: "rgba(0,187,255,.2)" }}
              >
                <h4 className="font-semibold mb-2" style={{ color: "#00BBFF" }}>
                  {t("toefl.reading.explanation")}
                </h4>
                <p className="text-white/70 text-sm whitespace-pre-wrap" style={{ fontFamily: "Sora,sans-serif" }}>
                  {aiSolvedCompleteWords.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
