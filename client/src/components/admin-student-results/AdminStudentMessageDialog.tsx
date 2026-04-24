import { MessageSquare, Send, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StudentResult } from "./shared";

interface AdminStudentMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedResult: StudentResult | null;
  messageSubject: string;
  messageBody: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onGenerateDraft: () => void;
  onSend: () => void;
  isGeneratingDraft: boolean;
  isSending: boolean;
}

export default function AdminStudentMessageDialog({
  open,
  onOpenChange,
  selectedResult,
  messageSubject,
  messageBody,
  onSubjectChange,
  onBodyChange,
  onGenerateDraft,
  onSend,
  isGeneratingDraft,
  isSending,
}: AdminStudentMessageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#1e293b] border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            학생에게 메시지 보내기
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {selectedResult?.userName} ({selectedResult?.userEmail})에게 알림을 보냅니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Button
            onClick={onGenerateDraft}
            disabled={isGeneratingDraft}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-semibold"
          >
            {isGeneratingDraft ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                AI 초안 생성 중...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                AI로 맞춤 메시지 초안 작성
              </>
            )}
          </Button>

          <div className="space-y-2">
            <Label className="text-gray-300 text-sm font-medium">제목</Label>
            <Input
              value={messageSubject}
              onChange={(event) => onSubjectChange(event.target.value)}
              placeholder="메시지 제목을 입력하세요"
              className="bg-[#334155] border-white/20 text-white placeholder:text-gray-500 focus:border-purple-400"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-sm font-medium">내용</Label>
            <Textarea
              value={messageBody}
              onChange={(event) => onBodyChange(event.target.value)}
              placeholder="학생에게 전달할 메시지를 입력하세요"
              rows={5}
              className="bg-[#334155] border-white/20 text-white placeholder:text-gray-500 focus:border-purple-400 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
            >
              취소
            </Button>
            <Button
              onClick={onSend}
              disabled={isSending || !messageSubject.trim() || !messageBody.trim()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 hover:opacity-90 text-white font-semibold"
            >
              {isSending ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  메시지 발송
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
