import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  Mic,
  PenTool,
  RefreshCw,
  Wrench,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NewToeflFeedbackRequest } from "@shared/schema";

export const getTypeIcon = (testType: string) => {
  if (testType === "speaking") return <Mic className="h-4 w-4" />;
  return <PenTool className="h-4 w-4" />;
};

export const getTypeColor = (testType: string) => {
  if (testType === "speaking") return "bg-teal-100 text-teal-700 border-teal-200";
  return "bg-indigo-100 text-indigo-700 border-indigo-200";
};

export const getQuestionTypeLabel = (questionType: string) => {
  const labels: Record<string, string> = {
    interview: "인터뷰",
    listen_repeat: "듣고 따라하기",
    email: "이메일 작성",
    discussion: "토론",
    complete_sentence: "문장 완성",
    build_sentence: "문장 만들기",
  };
  return labels[questionType] || questionType;
};

export const formatAdminFeedbackDate = (dateString: string) =>
  new Date(dateString).toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface PendingFeedbackTabProps {
  pendingRequests: NewToeflFeedbackRequest[] | undefined;
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export function PendingFeedbackTab({
  pendingRequests,
  isLoading,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: PendingFeedbackTabProps) {
  if (isLoading) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle className="h-16 w-16 text-green-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">모든 요청이 처리되었습니다</h3>
          <p className="text-gray-400">현재 대기 중인 피드백 요청이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {pendingRequests.map((request) => (
        <Card key={request.id} className="bg-white/10 border-white/20 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getTypeColor(request.testType)}>
                    {getTypeIcon(request.testType)}
                    <span className="ml-1 capitalize">{request.testType}</span>
                  </Badge>
                  <Badge variant="secondary">{getQuestionTypeLabel(request.questionType)}</Badge>
                </div>
                <CardTitle className="text-lg text-white">피드백 요청 #{request.id.slice(0, 8)}</CardTitle>
                <CardDescription className="text-gray-300 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    사용자 ID: {request.userId.slice(0, 8)}...
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatAdminFeedbackDate(request.createdAt as unknown as string)}
                  </span>
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                <Clock className="mr-1 h-3 w-3" />
                대기 중
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">질문 내용</span>
                </div>
                <p className="text-white text-sm whitespace-pre-wrap line-clamp-4">{request.questionContent}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">학생 답변</span>
                </div>
                <p className="text-white text-sm whitespace-pre-wrap line-clamp-4">{request.userAnswer}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => onApprove(request.id)}
                disabled={isApproving}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                data-testid={`button-approve-${request.id}`}
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    인라이즈 피드백 생성 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    승인 및 피드백 생성
                  </>
                )}
              </Button>
              <Button
                onClick={() => onReject(request.id)}
                disabled={isRejecting}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                data-testid={`button-reject-${request.id}`}
              >
                {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                거절
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function ProcessedFeedbackTab() {
  return (
    <Card className="bg-white/10 border-white/20">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">처리 완료된 요청</h3>
        <p className="text-gray-400">이 기능은 추후 업데이트됩니다.</p>
      </CardContent>
    </Card>
  );
}

interface MaintenanceFeedbackTabProps {
  recalcResult: { totalTests: number; totalUpdated: number; totalFailed: number } | null;
  cacheClearResult: { deletedCacheRows: number; clearedTests: number } | null;
  onRecalculate: () => void;
  onClearCache: () => void;
  isRecalculating: boolean;
  isClearingCache: boolean;
}

export function MaintenanceFeedbackTab({
  recalcResult,
  cacheClearResult,
  onRecalculate,
  onClearCache,
  isRecalculating,
  isClearingCache,
}: MaintenanceFeedbackTabProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-white flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-indigo-400" />
            Build a Sentence 정답 전체 재계산
          </CardTitle>
          <CardDescription className="text-gray-300">
            DB에 저장된 모든 New TOEFL Writing Build a Sentence 문제의 정답을 GPT-5.4로 강제 재계산합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <p className="text-sm text-indigo-300">⚠️ 이 작업은 시간이 걸릴 수 있으며 AI API 호출 비용이 발생합니다.</p>
          </div>

          {recalcResult && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-white">최근 재계산 결과</p>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-300">처리된 테스트: <span className="text-white font-medium">{recalcResult.totalTests}개</span></span>
                <span className="text-emerald-300">수정된 문제: <span className="font-medium">{recalcResult.totalUpdated}개</span></span>
                {recalcResult.totalFailed > 0 && (
                  <span className="text-red-300">실패: <span className="font-medium">{recalcResult.totalFailed}개</span></span>
                )}
              </div>
            </div>
          )}

          <Button onClick={onRecalculate} disabled={isRecalculating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isRecalculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                재계산 중... (시간이 걸릴 수 있습니다)
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                전체 정답 재계산 실행
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="text-white flex items-center gap-2">
            <Wrench className="h-5 w-5 text-violet-400" />
            Choose-Response 오디오 캐시 초기화
          </CardTitle>
          <CardDescription className="text-gray-300">
            Choose-Response 유형의 캐시된 오디오를 모두 삭제합니다. 삭제 후 다음 재생 시 새로 생성됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <p className="text-sm text-violet-300">⚠️ 오디오 버그 수정 후에만 실행하세요. 다음 재생 시 AI 비용이 발생합니다.</p>
          </div>

          {cacheClearResult && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
              <p className="text-sm font-semibold text-white">초기화 결과</p>
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-300">삭제된 캐시: <span className="font-medium">{cacheClearResult.deletedCacheRows}개</span></span>
                <span className="text-gray-300">정리된 테스트: <span className="text-white font-medium">{cacheClearResult.clearedTests}개</span></span>
              </div>
            </div>
          )}

          <Button
            onClick={onClearCache}
            disabled={isClearingCache}
            variant="outline"
            className="border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
          >
            {isClearingCache ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                초기화 중...
              </>
            ) : (
              <>
                <Wrench className="mr-2 h-4 w-4" />
                오디오 캐시 초기화
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
