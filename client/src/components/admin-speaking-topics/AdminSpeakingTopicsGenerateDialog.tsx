import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Sparkles, Zap } from "lucide-react";
import type { AdminSpeakingTopicsTab } from "@/components/admin-speaking-topics/shared";

interface AdminSpeakingTopicsGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTestType: AdminSpeakingTopicsTab;
  topicsText: string;
  setTopicsText: (value: string) => void;
  greTaskType: "issue" | "argument";
  setGreTaskType: (value: "issue" | "argument") => void;
  isPending: boolean;
  onGenerate: () => void;
}

export default function AdminSpeakingTopicsGenerateDialog({
  open,
  onOpenChange,
  currentTestType,
  topicsText,
  setTopicsText,
  greTaskType,
  setGreTaskType,
  isPending,
  onGenerate,
}: AdminSpeakingTopicsGenerateDialogProps) {
  const isGre = currentTestType === "gre-writing";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white/95 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-800" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
              {isGre ? "AI로 GRE Writing 문제 자동 생성" : "AI로 TOEFL Speaking 문제 자동 생성"}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-6">
          {isGre && (
            <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200">
              <label className="text-lg font-semibold text-slate-700 mb-4 block flex items-center space-x-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <span>Task Type 선택</span>
              </label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={greTaskType === "issue" ? "default" : "outline"}
                  onClick={() => setGreTaskType("issue")}
                  className={`flex-1 h-14 text-lg font-semibold ${
                    greTaskType === "issue"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                      : "border-2 border-purple-200 hover:border-purple-400"
                  }`}
                >
                  Issue Task
                </Button>
                <Button
                  type="button"
                  variant={greTaskType === "argument" ? "default" : "outline"}
                  onClick={() => setGreTaskType("argument")}
                  className={`flex-1 h-14 text-lg font-semibold ${
                    greTaskType === "argument"
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                      : "border-2 border-purple-200 hover:border-purple-400"
                  }`}
                >
                  Argument Task
                </Button>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {greTaskType === "issue"
                  ? "Issue Task: 특정 주장이나 의견에 대해 찬성/반대 입장을 논증합니다."
                  : "Argument Task: 주어진 논증의 가정과 논리적 문제점을 분석합니다."}
              </p>
            </div>
          )}

          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
            <label className="text-lg font-semibold text-slate-700 mb-4 block flex items-center space-x-2">
              <Brain className="h-5 w-5 text-green-600" />
              <span>문제 토픽 입력 (한 줄에 하나씩)</span>
            </label>
            <Textarea
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              placeholder={
                isGre
                  ? greTaskType === "issue"
                    ? "Issue Task 토픽을 한 줄에 하나씩 입력하세요:\n\nEducational institutions should actively encourage their students to choose fields of study that will prepare them for lucrative careers.\nTechnology and human creativity are incompatible.\nThe best way to teach is to praise positive actions and ignore negative ones."
                    : "Argument Task 토픽을 한 줄에 하나씩 입력하세요:\n\nThe following appeared in a memo from the mayor: 'In order to reduce crime in our city, we should hire more police officers. Studies show that cities with more police have lower crime rates.'\nA recent survey shows that 80% of students prefer online classes. Therefore, we should convert all courses to online format."
                  : "TOEFL Speaking 토픽을 한 줄에 하나씩 입력하세요:\n\nPersonal preferences\nCampus life experiences\nAcademic topics"
              }
              className="min-h-[250px] text-lg border-2 border-green-200 rounded-xl bg-white/80 backdrop-blur-sm focus:border-green-500 transition-all duration-300 placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 text-lg border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-all duration-300"
            >
              취소
            </Button>
            <Button
              onClick={onGenerate}
              disabled={isPending}
              className="group relative h-12 px-8 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              <div className="relative z-10">
                {isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>생성 중...</span>
                  </div>
                ) : (
                  "AI 문제 생성"
                )}
              </div>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
