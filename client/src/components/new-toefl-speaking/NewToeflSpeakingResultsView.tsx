import { ArrowLeft, CheckCircle, MessageSquare, Volume2 } from "lucide-react";
import { Link } from "wouter";
import { NewToeflLayout } from "@/components/NewToeflLayout";

interface NewToeflSpeakingResultsViewProps {
  totalQuestions: number;
  activeListenRepeatCount: number;
  activeInterviewCount: number;
  completedListenRepeatSize: number;
  completedInterviewSize: number;
  donePct: number;
  t: (key: string) => string;
}

export default function NewToeflSpeakingResultsView({
  totalQuestions,
  activeListenRepeatCount,
  activeInterviewCount,
  completedListenRepeatSize,
  completedInterviewSize,
  donePct,
  t,
}: NewToeflSpeakingResultsViewProps) {
  return (
    <NewToeflLayout section="speaking" darkNav>
      <div className="w-full px-4 sm:px-8 lg:px-12 py-16">
        <div className="text-center mb-10">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-2xl"
            style={{ background: "linear-gradient(135deg,#2DD4BF,#0F766E)", boxShadow: "0 0 40px rgba(45,212,191,0.38)" }}
          >
            <CheckCircle className="h-10 w-10" style={{ color: "#08130F" }} />
          </div>
          <p className="sp-section-label mb-1">Speaking Complete</p>
          <h1 className="text-3xl font-bold dark:text-white text-gray-900 mb-2">{t("speaking.examDone")}</h1>
          <p className="dark:text-slate-400 text-gray-500">{t("speaking.examDoneDesc")}</p>
        </div>

        <div className="sp-card mb-6 p-6">
          <div className="sp-orb-1" />
          <div className="relative z-10">
            <p className="sp-section-label mb-3">{t("speaking.resultSummary")}</p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-4 rounded-xl" style={{ border: "1px solid rgba(94,234,212,0.18)", background: "rgba(45,212,191,0.06)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4" style={{ color: "#5EEAD4" }} />
                  <span className="text-slate-300 text-xs font-medium">Listen &amp; Repeat</span>
                </div>
                <p className="text-2xl font-bold mb-0.5" style={{ color: "#5EEAD4" }} data-testid="text-listen-repeat-score">
                  {completedListenRepeatSize}<span className="text-slate-500 text-base font-normal"> / {activeListenRepeatCount}</span>
                </p>
                <p className="text-slate-500 text-xs">{t("speaking.completedSentences")}</p>
              </div>

              <div className="p-4 rounded-xl" style={{ border: "1px solid rgba(94,234,212,0.18)", background: "rgba(45,212,191,0.06)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4" style={{ color: "#5EEAD4" }} />
                  <span className="text-slate-300 text-xs font-medium">Interview</span>
                </div>
                <p className="text-2xl font-bold mb-0.5" style={{ color: "#5EEAD4" }} data-testid="text-interview-score">
                  {completedInterviewSize}<span className="text-slate-500 text-base font-normal"> / {activeInterviewCount}</span>
                </p>
                <p className="text-slate-500 text-xs">{t("speaking.answeredQ")}</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-xs">{t("speaking.totalCompletion")}</span>
                <span className="font-bold text-sm" style={{ color: "#5EEAD4" }}>{donePct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${donePct}%`, background: "linear-gradient(90deg,#2DD4BF,#99F6E4)" }} />
              </div>
              <p className="text-slate-500 text-xs text-center mt-2">
                {t("speaking.completionText")
                  .replace("{done}", String(completedListenRepeatSize + completedInterviewSize))
                  .replace("{total}", String(totalQuestions))
                  .replace("{pct}", String(donePct))}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-white/8 bg-white/3 text-center">
              <p className="text-slate-400 text-xs leading-relaxed">{t("speaking.aiNote")}</p>
            </div>
          </div>
        </div>

        <Link href="/new-toefl">
          <button className="btn-act amber" data-testid="button-back-to-selection">
            <ArrowLeft className="h-5 w-5" />
            {t("speaking.backToSection")}
          </button>
        </Link>
      </div>
    </NewToeflLayout>
  );
}
