import { Button } from "@/components/ui/button";
import { NewToeflLayout } from "@/components/NewToeflLayout";
import { CheckCircle2 } from "lucide-react";

interface NewToeflListeningCompletionViewProps {
  isLight: boolean;
  completedCount: number;
  totalItems: number;
  elapsedMinutes: number;
  onGoHome: () => void;
  onGoDashboard: () => void;
}

export default function NewToeflListeningCompletionView({
  isLight,
  completedCount,
  totalItems,
  elapsedMinutes,
  onGoHome,
  onGoDashboard,
}: NewToeflListeningCompletionViewProps) {
  const completionPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <NewToeflLayout section="listening">
      <div className="w-full px-4 sm:px-8 lg:px-12 py-16 flex items-center justify-center min-h-[60vh]">
        <div className="ls-card shadow-2xl max-w-lg w-full pt-10 pb-8 px-8 text-center">
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#00B85F,#00E87B)", boxShadow: "0 0 40px rgba(0,232,123,.35)" }}
          >
            <CheckCircle2 className="h-10 w-10" style={{ color: "#000" }} />
          </div>
          <div className="ls-section-label mx-auto mb-3" style={{ width: "fit-content" }}>
            완료
          </div>
          <h2 className={`text-2xl font-bold mb-2 ls-body ${isLight ? "text-gray-900" : "text-white"}`}>
            제출완료되었습니다!
          </h2>
          <p className="mb-6 ls-body" style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,.5)" }}>
            리스닝 시험이 성공적으로 제출되었습니다.
          </p>
          <div
            className="rounded-xl p-4 mb-6 space-y-2"
            style={{
              background: isLight ? "rgba(16,185,129,.06)" : "rgba(0,232,123,.06)",
              border: isLight ? "1px solid rgba(16,185,129,.15)" : "1px solid rgba(0,232,123,.12)",
            }}
          >
            <div className="flex justify-between text-sm ls-body">
              <span style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,.45)" }}>완료된 문항</span>
              <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                {completedCount} / {totalItems}
              </span>
            </div>
            <div className="flex justify-between text-sm ls-body">
              <span style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,.45)" }}>완료율</span>
              <span className="font-semibold" style={{ color: "#00E87B" }}>
                {completionPercent}%
              </span>
            </div>
            <div className="flex justify-between text-sm ls-body">
              <span style={{ color: isLight ? "#6B7280" : "rgba(255,255,255,.45)" }}>소요 시간</span>
              <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>{elapsedMinutes}분</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1 ls-body font-bold"
              style={{ background: "linear-gradient(135deg,#00B85F,#00E87B)", color: "#000" }}
              onClick={onGoHome}
            >
              홈으로 돌아가기
            </Button>
            <Button
              variant="outline"
              className={`flex-1 ls-body ${isLight ? "border-gray-300 text-gray-600 hover:bg-gray-100" : "border-white/20 text-gray-300 hover:bg-white/10"}`}
              onClick={onGoDashboard}
            >
              대시보드
            </Button>
          </div>
        </div>
      </div>
    </NewToeflLayout>
  );
}
