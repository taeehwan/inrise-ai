import { ArrowLeft, CheckCircle, Mail, MessageCircle, Type } from "lucide-react";
import { Link } from "wouter";
import { NewToeflLayout } from "@/components/NewToeflLayout";

interface NewToeflWritingResultsViewProps {
  isLight: boolean;
  completedSentencesSize: number;
  emailCompleted: boolean;
  discussionWordCount: number;
  t: (key: string) => string;
}

export default function NewToeflWritingResultsView({
  isLight,
  completedSentencesSize,
  emailCompleted,
  discussionWordCount,
  t,
}: NewToeflWritingResultsViewProps) {
  return (
    <NewToeflLayout section="writing" darkNav>
      <div className="w-full px-4 sm:px-8 lg:px-12 py-16 relative" style={{ background: isLight ? "#FAFBFC" : "#0E0A1F", minHeight: "100vh" }}>
        <div className="bloom violet" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div className="c1" />
          <div className="c2" />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="text-center mb-12">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "radial-gradient(circle at 30% 30%, #A78BFA, #5B21B6)", boxShadow: "0 0 0 8px rgba(167,139,250,0.08), 0 0 0 16px rgba(167,139,250,0.04)" }}>
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h1 className={`text-4xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>{t("writing.examDone")}</h1>
            <p className="text-xl" style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,0.6)" }}>{t("writing.examDoneDesc")}</p>
          </div>

          <div className="wt-card mb-8">
            <p className={`text-2xl font-bold mb-5 ${isLight ? "text-gray-900" : "text-white"}`}>{t("writing.resultSummary")}</p>
            <div className="grid md:grid-cols-3 gap-4 mb-5">
              <div className="p-4 rounded-xl" style={{ background: isLight ? "rgba(124,58,237,0.06)" : "rgba(76,29,149,0.20)", border: isLight ? "1px solid rgba(124,58,237,0.15)" : "1px solid rgba(196,181,253,0.18)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <Type className="h-5 w-5" style={{ color: "#A78BFA" }} />
                  <span style={{ color: isLight ? "#1F2937" : "#F5F3FF" }} className="font-semibold">Build a Sentence</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: "#A78BFA", fontWeight: 300, letterSpacing: "-1px" }} data-testid="text-sentence-score">{completedSentencesSize} / 5</p>
                <p className="text-sm" style={{ color: isLight ? "#6B7280" : "rgba(196,181,253,0.55)" }}>{t("writing.correct")}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: isLight ? "rgba(124,58,237,0.06)" : "rgba(76,29,149,0.20)", border: isLight ? "1px solid rgba(124,58,237,0.15)" : "1px solid rgba(196,181,253,0.18)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="h-5 w-5" style={{ color: "#A78BFA" }} />
                  <span style={{ color: isLight ? "#1F2937" : "#F5F3FF" }} className="font-semibold">Write an Email</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: "#A78BFA", fontWeight: 300, letterSpacing: "-1px" }} data-testid="text-email-status">{emailCompleted ? t("writing.complete") : t("writing.incomplete")}</p>
                <p className="text-sm" style={{ color: isLight ? "#6B7280" : "rgba(196,181,253,0.55)" }}>{t("writing.emailStatus")}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: isLight ? "rgba(124,58,237,0.06)" : "rgba(76,29,149,0.20)", border: isLight ? "1px solid rgba(124,58,237,0.15)" : "1px solid rgba(196,181,253,0.18)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <MessageCircle className="h-5 w-5" style={{ color: "#A78BFA" }} />
                  <span style={{ color: isLight ? "#1F2937" : "#F5F3FF" }} className="font-semibold">Academic Discussion</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: "#A78BFA", fontWeight: 300, letterSpacing: "-1px" }} data-testid="text-discussion-words">{discussionWordCount}</p>
                <p className="text-sm" style={{ color: isLight ? "#6B7280" : "rgba(196,181,253,0.55)" }}>{t("writing.wordCount")}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)", border: isLight ? "1px solid #E5E7EB" : "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,0.55)" }}>{t("writing.aiNote")}</p>
            </div>
          </div>

          <Link href="/new-toefl">
            <button className="btn-wt slate w-full py-5 text-lg font-semibold" style={{ width: "100%", borderRadius: 14 }} data-testid="button-back-to-selection">
              <ArrowLeft className="mr-2 h-5 w-5" />
              {t("writing.backToSelection")}
            </button>
          </Link>
        </div>
      </div>
    </NewToeflLayout>
  );
}
