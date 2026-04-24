import {
  Calendar,
  FileText,
  MessageSquare,
  Mic,
  Pause,
  PenTool,
  Play,
  RefreshCw,
  Sparkles,
  User,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { StudentResult } from "./shared";

interface AdminStudentResultDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedResult: StudentResult | null;
  isPlaying: boolean;
  onPlayAudio: (url: string) => void;
  onOpenMessage: () => void;
  onApproveFeedback: (id: string) => void;
  isApproving: boolean;
  getSectionIcon: (section: string) => React.ReactNode;
  getSectionGradient: (section: string) => string;
  getSectionBadgeStyle: (section: string) => string;
  getSectionNameKorean: (section: string) => string;
  formatDate: (dateString?: string) => string;
  formatDuration: (seconds?: number) => string;
}

export default function AdminStudentResultDetailDialog({
  open,
  onOpenChange,
  selectedResult,
  isPlaying,
  onPlayAudio,
  onOpenMessage,
  onApproveFeedback,
  isApproving,
  getSectionIcon,
  getSectionGradient,
  getSectionBadgeStyle,
  getSectionNameKorean,
  formatDate,
  formatDuration,
}: AdminStudentResultDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#1e293b] border-white/20 text-white" data-testid="dialog-result-detail">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white" data-testid="dialog-title">
            {selectedResult && (
              <div className={`w-10 h-10 bg-gradient-to-br ${getSectionGradient(selectedResult.section)} rounded-xl flex items-center justify-center`}>
                {getSectionIcon(selectedResult.section)}
              </div>
            )}
            학생 결과 상세
          </DialogTitle>
          <DialogDescription className="text-gray-400" data-testid="dialog-description">
            이 시험 응시에 대한 상세 정보를 확인하세요
          </DialogDescription>
        </DialogHeader>

        {selectedResult && (
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-2">학생</p>
                <p className="text-white font-semibold">{selectedResult.userName}</p>
                <p className="text-xs text-gray-500">{selectedResult.userEmail}</p>
              </div>
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-2">섹션 / 시험</p>
                <div className="flex gap-2">
                  <Badge className={getSectionBadgeStyle(selectedResult.section)}>
                    <span className="flex items-center gap-1">
                      {getSectionIcon(selectedResult.section)}
                      {getSectionNameKorean(selectedResult.section)}
                    </span>
                  </Badge>
                  <Badge variant="outline" className="text-gray-300 border-gray-600">
                    {selectedResult.examType.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-2">점수</p>
                <p className="text-3xl font-bold text-white">
                  {selectedResult.score !== null && selectedResult.score !== undefined ? (
                    selectedResult.score
                  ) : (
                    <span className="text-gray-500 text-lg">채점 전</span>
                  )}
                </p>
              </div>
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-2">소요 시간</p>
                <p className="text-xl text-white font-semibold">{formatDuration(selectedResult.timeSpent)}</p>
              </div>
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-2">시작 시간</p>
                <p className="text-white">{formatDate(selectedResult.startedAt)}</p>
              </div>
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-2">완료 시간</p>
                <p className="text-white">{formatDate(selectedResult.completedAt)}</p>
              </div>
            </div>

            {selectedResult.resultType === "feedback-request" && selectedResult.questionContent && (
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-400" />
                  출제 문항 내용
                </p>
                <div className="bg-[#1e293b] p-4 rounded-lg text-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto border border-white/5 text-sm leading-relaxed">
                  {selectedResult.questionContent}
                </div>
              </div>
            )}

            {selectedResult.resultType === "feedback-request" && selectedResult.userAnswer && (
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  {selectedResult.testType === "speaking" ? (
                    <Mic className="h-4 w-4 text-teal-400" />
                  ) : (
                    <PenTool className="h-4 w-4 text-blue-400" />
                  )}
                  학생 답변
                </p>
                <div className="bg-[#1e293b] p-4 rounded-lg text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto border border-white/5 text-sm leading-relaxed">
                  {selectedResult.userAnswer}
                </div>
              </div>
            )}

            {selectedResult.resultType === "feedback-request" && selectedResult.status === "pending" && (
              <Button
                onClick={() => onApproveFeedback(selectedResult.id)}
                disabled={isApproving}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white font-semibold"
              >
                {isApproving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    AI 피드백 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI 피드백 생성 및 승인
                  </>
                )}
              </Button>
            )}

            {selectedResult.recordingUrl && (
              <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-xl p-4 border border-teal-500/20">
                <p className="text-sm font-medium text-teal-300 mb-3 flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  녹음 파일
                </p>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => onPlayAudio(selectedResult.recordingUrl!)}
                    className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:opacity-90 text-white"
                  >
                    {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    {isPlaying ? "일시정지" : "재생"}
                  </Button>
                  <audio controls src={selectedResult.recordingUrl} className="flex-1 h-10" />
                </div>
              </div>
            )}

            {selectedResult.transcription && (
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <Mic className="h-4 w-4 text-teal-400" />
                  음성 변환 (스피킹)
                </p>
                <div className="bg-[#1e293b] p-4 rounded-lg text-gray-300 whitespace-pre-wrap border border-white/5">
                  {selectedResult.transcription}
                </div>
              </div>
            )}

            {selectedResult.essayText && (
              <div className="bg-[#334155]/50 rounded-xl p-4 border border-white/10">
                <p className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-blue-400" />
                  에세이 응답
                </p>
                <div className="bg-[#1e293b] p-4 rounded-lg text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto border border-white/5">
                  {selectedResult.essayText}
                </div>
              </div>
            )}

            {selectedResult.feedback && (
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl p-4 border border-blue-500/20">
                <p className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  인라이즈 피드백
                  {selectedResult.resultType === "feedback-request" && selectedResult.status === "approved" && (
                    <Badge className="ml-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs">
                      승인됨
                    </Badge>
                  )}
                </p>
                <div className="text-gray-300 whitespace-pre-wrap text-sm max-h-60 overflow-y-auto">
                  {typeof selectedResult.feedback === "string"
                    ? selectedResult.feedback
                    : JSON.stringify(selectedResult.feedback, null, 2)}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10">
              <Button
                onClick={onOpenMessage}
                className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:opacity-90 text-white font-semibold"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                이 학생에게 메시지 보내기
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
