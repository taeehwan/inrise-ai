import { BookOpen, CheckCircle2, ChevronDown, ChevronRight, Clock, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardFeedbackSectionProps } from "./shared";

export default function DashboardFeedbackSection({
  feedbackRequests,
  pendingRequests,
  approvedRequests,
  savedExplanations,
  explanationTab,
  expandedExplanation,
  setExplanationTab,
  setExpandedExplanation,
}: DashboardFeedbackSectionProps) {
  const sectionColors: Record<string, string> = {
    reading: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    listening: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    speaking: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    writing: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    "gre-writing": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    sat: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  };
  const sectionLabels: Record<string, string> = {
    reading: "Reading",
    listening: "Listening",
    speaking: "Speaking",
    writing: "Writing",
    "gre-writing": "GRE Writing",
    sat: "SAT",
  };
  const tabs = [
    { key: "all", label: "전체" },
    { key: "reading", label: "Reading" },
    { key: "listening", label: "Listening" },
    { key: "speaking", label: "Speaking" },
    { key: "writing", label: "Writing" },
  ];
  const filtered =
    explanationTab === "all"
      ? savedExplanations
      : savedExplanations.filter((e) => e.section === explanationTab);

  return (
    <>
      {feedbackRequests.length > 0 && (
        <div className="mt-6">
          <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                  <Inbox className="h-4 w-4 text-sky-400" />
                  피드백 요청 현황
                </CardTitle>
                <div className="flex items-center gap-2">
                  {pendingRequests.length > 0 && (
                    <Badge className="border border-amber-500/30 bg-amber-500/20 text-xs text-amber-300">
                      대기 {pendingRequests.length}건
                    </Badge>
                  )}
                  {approvedRequests.length > 0 && (
                    <Badge className="border border-emerald-500/30 bg-emerald-500/20 text-xs text-emerald-300">
                      완료 {approvedRequests.length}건
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-2">
                {feedbackRequests.slice(0, 5).map((req) => {
                  const typeLabel: Record<string, string> = {
                    speaking: "스피킹",
                    writing: "라이팅",
                    email: "이메일",
                    discussion: "토론",
                    build_sentence: "문장완성",
                  };
                  const statusConfig = {
                    pending: {
                      label: "검토 중",
                      cls: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                    },
                    approved: {
                      label: "완료",
                      cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                    },
                    rejected: {
                      label: "거절",
                      cls: "bg-red-500/20 text-red-300 border-red-500/30",
                    },
                  };
                  const sc = statusConfig[req.status] || statusConfig.pending;
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-600/30 bg-slate-700/40 p-3"
                    >
                      {req.status === "approved" ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                      ) : (
                        <Clock className="h-4 w-4 flex-shrink-0 text-amber-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-200">
                          {typeLabel[req.testType] || req.testType} ·{" "}
                          {typeLabel[req.questionType] || req.questionType}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {new Date(req.createdAt).toLocaleDateString("ko-KR")}
                          {req.totalScore !== undefined && req.totalScore !== null && (
                            <span className="ml-2 font-medium text-emerald-400">점수: {req.totalScore}</span>
                          )}
                        </p>
                      </div>
                      <Badge className={`border text-xs ${sc.cls}`}>{sc.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card className="border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                <BookOpen className="h-4 w-4 text-violet-400" />
                내 해설 / 피드백 기록
              </CardTitle>
              <Badge variant="outline" className="border-gray-600 text-xs text-gray-400">
                {savedExplanations.length}개
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setExplanationTab(tab.key);
                    setExpandedExplanation(null);
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                    explanationTab === tab.key
                      ? "border-violet-500 bg-violet-600 text-white"
                      : "border-slate-600/40 bg-slate-700/50 text-gray-400 hover:border-violet-500/50 hover:text-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Inbox className="mb-2 h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">
                  {explanationTab === "all"
                    ? "아직 저장된 해설/피드백이 없습니다."
                    : `${sectionLabels[explanationTab] || explanationTab} 섹션의 기록이 없습니다.`}
                </p>
                <p className="mt-1 text-xs text-gray-600">문제 해설을 확인하면 자동으로 저장됩니다.</p>
              </div>
            ) : (
              <div className="grid gap-1.5">
                {filtered.map((item) => {
                  const isOpen = expandedExplanation === item.id;
                  const contentText =
                    typeof item.content === "string"
                      ? item.content
                      : item.content?.explanation || item.content?.feedback || item.content?.overallFeedback || "";
                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-lg border border-slate-600/30"
                    >
                      <button
                        onClick={() => setExpandedExplanation(isOpen ? null : item.id)}
                        className="flex w-full items-center gap-3 bg-slate-700/40 p-3 text-left transition-all hover:bg-slate-700/70"
                      >
                        <div
                          className={`flex-shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${
                            sectionColors[item.section] ||
                            "border-slate-500/30 bg-slate-600/20 text-gray-300"
                          }`}
                        >
                          {sectionLabels[item.section] || item.section}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-gray-200">{item.questionText}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {item.type === "explanation" ? "해설" : "피드백"} ·{" "}
                            {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0 text-violet-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="space-y-2 border-t border-slate-600/30 bg-slate-900/40 p-3">
                          <div className="rounded-lg border border-slate-600/30 bg-slate-700/40 p-2.5">
                            <p className="mb-1 text-xs text-gray-400">문제</p>
                            <p className="text-xs leading-relaxed text-gray-200">{item.questionText}</p>
                          </div>
                          <div className="rounded-lg border border-slate-600/20 bg-slate-700/30 p-2.5">
                            <p className="mb-1.5 text-xs text-gray-400">
                              {item.type === "explanation" ? "해설 내용" : "피드백 내용"}
                            </p>
                            {contentText ? (
                              <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-200">
                                {contentText}
                              </p>
                            ) : (
                              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-gray-300">
                                {JSON.stringify(item.content, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
