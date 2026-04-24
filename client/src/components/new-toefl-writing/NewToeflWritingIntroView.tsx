import { Clock, FileText, Mail, MessageCircle, Play, Sparkles, Type } from "lucide-react";
import { NewToeflIntroHeader, NewToeflLayout } from "@/components/NewToeflLayout";

interface NewToeflWritingIntroViewProps {
  isLight: boolean;
  title: string;
  questionCountText: string;
  onStart: () => void;
  t: (key: string) => string;
}

export default function NewToeflWritingIntroView({
  isLight,
  title,
  questionCountText,
  onStart,
  t,
}: NewToeflWritingIntroViewProps) {
  const guideItems = [
    { icon: <Type className="h-4 w-4 text-white" />, label: "Build a Sentence", count: "5문제", desc: t("writing.buildSentenceDesc") },
    { icon: <Mail className="h-4 w-4 text-white" />, label: "Write an Email", count: "1문제", desc: t("writing.emailDesc") },
    { icon: <MessageCircle className="h-4 w-4 text-white" />, label: "Academic Discussion", count: "1문제", desc: t("writing.discussionDesc") },
  ];

  return (
    <NewToeflLayout section="writing" showReformBadge darkNav>
      <div className="w-full px-4 sm:px-8 lg:px-12 flex flex-col relative" style={{ background: isLight ? "#FAFBFC" : "#0E0A1F", minHeight: "calc(100vh - 4rem)" }}>
        <div className="bloom violet" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div className="c1" />
          <div className="c2" />
        </div>
        <div style={{ position: "relative", zIndex: 1 }} className="flex flex-col flex-1">
          <div className="grid lg:grid-cols-2 gap-6 items-stretch flex-1 py-8">
            <div className="flex flex-col gap-4 justify-center">
              <NewToeflIntroHeader section="writing" title={title} subtitle={questionCountText} />

              <div className="grid grid-cols-3 gap-2">
                <div className="wt-card text-center" style={{ padding: "12px", marginBottom: 0 }}>
                  <Clock className="h-5 w-5 mx-auto mb-1" style={{ color: "#A78BFA" }} />
                  <p className="text-white font-semibold text-xs">약 20분</p>
                  <p className="text-xs" style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,0.4)" }}>예상 소요 시간</p>
                </div>
                <div className="wt-card text-center" style={{ padding: "12px", marginBottom: 0 }}>
                  <FileText className="h-5 w-5 mx-auto mb-1" style={{ color: "#A78BFA" }} />
                  <p className={`font-semibold text-xs ${isLight ? "text-gray-900" : "text-white"}`}>7문제</p>
                  <p className="text-xs" style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,0.4)" }}>총 문제 수</p>
                </div>
                <div className="wt-card text-center" style={{ padding: "12px", marginBottom: 0 }}>
                  <Sparkles className="h-5 w-5 mx-auto mb-1" style={{ color: "#A78BFA" }} />
                  <p className={`font-semibold text-xs ${isLight ? "text-gray-900" : "text-white"}`}>3유형</p>
                  <p className="text-xs" style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,0.4)" }}>새로운 형식</p>
                </div>
              </div>

              <button
                className="btn-wt violet w-full py-4 text-base font-semibold"
                onClick={onStart}
                data-testid="button-start-writing-test"
                style={{ width: "100%", borderRadius: 14 }}
              >
                <Play className="mr-2 h-4 w-4" />
                {t("writing.startExam")}
              </button>
            </div>

            <div className="wt-card flex flex-col" style={{ borderLeft: "none" }}>
              <p className={`text-xl font-bold mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>{t("writing.typeGuide")}</p>
              <p className="text-sm mb-4" style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,0.5)" }}>{t("writing.typeGuideDesc")}</p>

              <div className="p-3 rounded-xl mb-4" style={{ background: isLight ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="font-semibold mb-0.5 text-sm" style={{ color: isLight ? "#DC2626" : "#FCA5A5" }}>{t("writing.oldFormat")}</p>
                <p className="text-xs" style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,0.55)" }}>{t("writing.oldFormatDesc")}</p>
              </div>

              <div className="space-y-2">
                {guideItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(76,29,149,0.14)", border: "1px solid rgba(196,181,253,0.14)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(167,139,250,0.16)" }}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm" style={{ color: "#F5F3FF" }}>{item.label}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.16)", color: "#C4B5FD", border: "1px solid rgba(196,181,253,0.25)" }}>{item.count}</span>
                      </div>
                      <p className="text-xs" style={{ color: "rgba(196,181,253,0.55)" }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </NewToeflLayout>
  );
}
