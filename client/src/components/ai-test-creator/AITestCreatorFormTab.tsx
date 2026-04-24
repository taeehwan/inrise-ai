import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Question } from "@/components/ai-test-creator/shared";

type Section =
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "verbal"
  | "quant"
  | "reading-writing"
  | "math";

type SpeakingType = "independent" | "integrated";
type SpeakingTask = "1" | "2" | "3" | "4";
type WritingType = "integrated" | "discussion";

type SpeakingPreview = {
  title: string;
  reading: string;
  listening: string;
  question: string;
} | null;

type WritingPreview = {
  reading: string;
  listening: string;
  question: string;
} | null;

type DiscussionPreview = {
  professorQuestion: string;
  studentResponses: { name: string; response: string }[];
} | null;

type QuestionDraft = Partial<Question> & {
  categoryA?: string;
  categoryB?: string;
};

interface AITestCreatorFormTabProps {
  currentSection: Section;
  isProcessing: boolean;
  speakingType: SpeakingType;
  setSpeakingType: Dispatch<SetStateAction<SpeakingType>>;
  speakingTask: SpeakingTask;
  setSpeakingTask: Dispatch<SetStateAction<SpeakingTask>>;
  speakingQuestion: string;
  setSpeakingQuestion: Dispatch<SetStateAction<string>>;
  preparationTime: number;
  setPreparationTime: Dispatch<SetStateAction<number>>;
  responseTime: number;
  setResponseTime: Dispatch<SetStateAction<number>>;
  speakingQuickPaste: string;
  setSpeakingQuickPaste: Dispatch<SetStateAction<string>>;
  handleParseSpeakingPaste: () => void;
  speakingParseErrors: string[];
  speakingParsedPreview: SpeakingPreview;
  handleApplyParsedSpeaking: () => void;
  writingType: WritingType;
  setWritingType: Dispatch<SetStateAction<WritingType>>;
  writingQuickPaste: string;
  setWritingQuickPaste: Dispatch<SetStateAction<string>>;
  handleParseWritingPaste: () => void;
  writingParseErrors: string[];
  writingParsedPreview: WritingPreview;
  handleApplyParsedWriting: () => void;
  discussionQuickPaste: string;
  setDiscussionQuickPaste: Dispatch<SetStateAction<string>>;
  handleParseDiscussionPaste: () => void;
  discussionParseErrors: string[];
  discussionParsedPreview: DiscussionPreview;
  handleApplyParsedDiscussion: () => void;
  formPassageTitle: string;
  setFormPassageTitle: Dispatch<SetStateAction<string>>;
  formPassageContent: string;
  setFormPassageContent: Dispatch<SetStateAction<string>>;
  formNarration: string;
  setFormNarration: Dispatch<SetStateAction<string>>;
  quickPasteText: string;
  setQuickPasteText: Dispatch<SetStateAction<string>>;
  handleQuickPaste: () => void;
  currentQuestion: QuestionDraft;
  setCurrentQuestion: Dispatch<SetStateAction<QuestionDraft>>;
  handleAddQuestion: () => void;
  formQuestions: Question[];
  handleRemoveQuestion: (id: string) => void;
  handleCreateFromForm: () => void;
}

export default function AITestCreatorFormTab({
  currentSection,
  isProcessing,
  speakingType,
  setSpeakingType,
  speakingTask,
  setSpeakingTask,
  speakingQuestion,
  setSpeakingQuestion,
  preparationTime,
  setPreparationTime,
  responseTime,
  setResponseTime,
  speakingQuickPaste,
  setSpeakingQuickPaste,
  handleParseSpeakingPaste,
  speakingParseErrors,
  speakingParsedPreview,
  handleApplyParsedSpeaking,
  writingType,
  setWritingType,
  writingQuickPaste,
  setWritingQuickPaste,
  handleParseWritingPaste,
  writingParseErrors,
  writingParsedPreview,
  handleApplyParsedWriting,
  discussionQuickPaste,
  setDiscussionQuickPaste,
  handleParseDiscussionPaste,
  discussionParseErrors,
  discussionParsedPreview,
  handleApplyParsedDiscussion,
  formPassageTitle,
  setFormPassageTitle,
  formPassageContent,
  setFormPassageContent,
  formNarration,
  setFormNarration,
  quickPasteText,
  setQuickPasteText,
  handleQuickPaste,
  currentQuestion,
  setCurrentQuestion,
  handleAddQuestion,
  formQuestions,
  handleRemoveQuestion,
  handleCreateFromForm,
}: AITestCreatorFormTabProps) {
  return (
    <TabsContent value="form" className="space-y-6 mt-6">
      <div className="p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-purple-400" />
        <p className="text-sm text-purple-200">
          입력 내용이 자동으로 저장됩니다. 페이지를 새로고침해도 안전합니다.
        </p>
      </div>

      {currentSection === "speaking" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Speaking Type</Label>
              <Select value={speakingType} onValueChange={(value) => setSpeakingType(value as SpeakingType)}>
                <SelectTrigger data-testid="select-speaking-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="independent">Independent (독립형)</SelectItem>
                  <SelectItem value="integrated">Integrated (통합형)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Task 번호</Label>
              <Select value={speakingTask} onValueChange={(value) => setSpeakingTask(value as SpeakingTask)}>
                <SelectTrigger data-testid="select-speaking-task">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Task 1</SelectItem>
                  <SelectItem value="2">Task 2</SelectItem>
                  <SelectItem value="3">Task 3</SelectItem>
                  <SelectItem value="4">Task 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {speakingType === "integrated" ? (
            <div className="space-y-6 mt-6">
              <div className="p-4 bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-teal-500/30 rounded-xl">
                <h3 className="font-bold text-teal-300 mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  ⚡ Quick Paste 사용법
                </h3>
                <div className="text-sm text-teal-800 space-y-1">
                  <p>• 아래 형식으로 전체 내용을 한 번에 붙여넣으세요</p>
                  <p>
                    • 각 섹션은 <code className="bg-white px-1 rounded">[TITLE]</code>,{" "}
                    <code className="bg-white px-1 rounded">[READING]</code>,{" "}
                    <code className="bg-white px-1 rounded">[LISTENING]</code>,{" "}
                    <code className="bg-white px-1 rounded">[QUESTION]</code> 헤더로 구분됩니다
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">전체 스크립트 붙여넣기</Label>
                <Textarea
                  placeholder="[TITLE], [READING], [LISTENING], [QUESTION] 형식으로 전체 내용을 붙여넣으세요..."
                  value={speakingQuickPaste}
                  onChange={(e) => setSpeakingQuickPaste(e.target.value)}
                  className="min-h-64 bg-white font-mono text-sm"
                  data-testid="textarea-quick-paste"
                />
                <Button
                  onClick={handleParseSpeakingPaste}
                  disabled={!speakingQuickPaste.trim()}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                  data-testid="button-parse-paste"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  파싱하고 미리보기
                </Button>
              </div>

              {speakingParseErrors.length > 0 && (
                <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                  <h4 className="font-bold text-red-300 mb-2">❌ 파싱 오류</h4>
                  <ul className="text-sm text-red-200 space-y-1">
                    {speakingParseErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {speakingParsedPreview && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-xl">
                    <h4 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      ✅ 파싱 성공! 미리보기
                    </h4>

                    <div className="mb-3 p-3 bg-black/30 rounded-lg border border-yellow-500/30">
                      <Label className="text-xs font-bold text-yellow-300">📌 TITLE</Label>
                      <p className="text-sm mt-1 text-white">{speakingParsedPreview.title}</p>
                    </div>
                    <div className="mb-3 p-3 bg-black/30 rounded-lg border border-green-500/30">
                      <Label className="text-xs font-bold text-green-300">📗 READING</Label>
                      <p className="text-sm mt-1 text-white line-clamp-3">{speakingParsedPreview.reading}</p>
                    </div>
                    <div className="mb-3 p-3 bg-black/30 rounded-lg border border-blue-500/30">
                      <Label className="text-xs font-bold text-blue-300">🔊 LISTENING</Label>
                      <p className="text-sm mt-1 text-white line-clamp-3">{speakingParsedPreview.listening}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg border border-purple-500/30">
                      <Label className="text-xs font-bold text-purple-300">❓ QUESTION</Label>
                      <p className="text-sm mt-1 text-white">{speakingParsedPreview.question}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleApplyParsedSpeaking}
                    className="w-full h-14 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-lg font-bold text-white"
                    data-testid="button-apply-parsed"
                  >
                    <CheckCircle2 className="h-6 w-6 mr-2" />
                    바로 생성하기
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Question (질문)</Label>
                <Textarea
                  placeholder="독립형 질문을 입력하세요 (예: Do you agree or disagree with the following statement?)"
                  value={speakingQuestion}
                  onChange={(e) => setSpeakingQuestion(e.target.value)}
                  className="min-h-32 bg-white"
                  data-testid="textarea-speaking-question-independent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-purple-900/30 rounded-xl border border-purple-500/30">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-purple-300">Preparation Time (초)</Label>
                  <Input
                    type="number"
                    value={preparationTime}
                    onChange={(e) => setPreparationTime(Number(e.target.value))}
                    className="bg-white"
                    data-testid="input-preparation-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-purple-900">Response Time (초)</Label>
                  <Input
                    type="number"
                    value={responseTime}
                    onChange={(e) => setResponseTime(Number(e.target.value))}
                    className="bg-white"
                    data-testid="input-response-time"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : currentSection === "writing" ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Writing Task Type</Label>
            <Select value={writingType} onValueChange={(value) => setWritingType(value as WritingType)}>
              <SelectTrigger data-testid="select-writing-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="integrated">Integrated Writing Task (통합형)</SelectItem>
                <SelectItem value="discussion">Discussion-Based Task (토론형)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {writingType === "integrated" && (
            <div className="space-y-6 mt-6">
              <div className="p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl">
                <h3 className="font-bold text-blue-300 mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  ⚡ Quick Paste 사용법
                </h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• 아래 형식으로 전체 내용을 한 번에 붙여넣으세요</p>
                  <p>
                    • <code className="bg-white px-1 rounded">Reading passage:</code>,{" "}
                    <code className="bg-white px-1 rounded">Listening script:</code>,{" "}
                    <code className="bg-white px-1 rounded">Question:</code>으로 구분됩니다
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">전체 스크립트 붙여넣기</Label>
                <Textarea
                  placeholder="Reading passage:, Listening script:, Question: 형식으로 전체 내용을 붙여넣으세요..."
                  value={writingQuickPaste}
                  onChange={(e) => setWritingQuickPaste(e.target.value)}
                  className="min-h-96 bg-white font-mono text-sm"
                  data-testid="textarea-writing-quick-paste"
                />
                <Button
                  onClick={handleParseWritingPaste}
                  disabled={!writingQuickPaste.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  data-testid="button-parse-writing-paste"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  파싱하고 미리보기
                </Button>
              </div>

              {writingParseErrors.length > 0 && (
                <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                  <h4 className="font-bold text-red-300 mb-2">❌ 파싱 오류</h4>
                  <ul className="text-sm text-red-200 space-y-1">
                    {writingParseErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {writingParsedPreview && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-xl">
                    <h4 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      ✅ 파싱 성공! 미리보기
                    </h4>
                    <div className="mb-3 p-3 bg-black/30 rounded-lg border border-green-500/30">
                      <Label className="text-xs font-bold text-green-300">📗 READING PASSAGE</Label>
                      <p className="text-sm mt-1 text-white line-clamp-4">{writingParsedPreview.reading}</p>
                    </div>
                    <div className="mb-3 p-3 bg-black/30 rounded-lg border border-blue-500/30">
                      <Label className="text-xs font-bold text-blue-300">🔊 LISTENING SCRIPT</Label>
                      <p className="text-sm mt-1 text-white line-clamp-4">{writingParsedPreview.listening}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg border border-purple-500/30">
                      <Label className="text-xs font-bold text-purple-300">❓ QUESTION</Label>
                      <p className="text-sm mt-1 text-white">{writingParsedPreview.question}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleApplyParsedWriting}
                    className="w-full h-14 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-lg font-bold text-white"
                    data-testid="button-apply-parsed-writing"
                  >
                    <CheckCircle2 className="h-6 w-6 mr-2" />
                    바로 생성하기
                  </Button>
                </div>
              )}
            </div>
          )}

          {writingType === "discussion" && (
            <div className="space-y-6 mt-6">
              <div className="p-4 bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border border-orange-500/30 rounded-xl">
                <h3 className="font-bold text-orange-300 mb-2 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  ⚡ Quick Paste 사용법
                </h3>
                <div className="text-sm text-orange-800 space-y-1">
                  <p>• 아래 형식으로 전체 내용을 한 번에 붙여넣으세요</p>
                  <p>• <code className="bg-white px-1 rounded">Professor:</code> 다음 학생 이름과 응답을 구분합니다</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">전체 스크립트 붙여넣기</Label>
                <Textarea
                  placeholder="Professor: ... 형식으로 전체 내용을 붙여넣으세요..."
                  value={discussionQuickPaste}
                  onChange={(e) => setDiscussionQuickPaste(e.target.value)}
                  className="min-h-96 bg-white font-mono text-sm"
                  data-testid="textarea-discussion-quick-paste"
                />
                <Button
                  onClick={handleParseDiscussionPaste}
                  disabled={!discussionQuickPaste.trim()}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                  data-testid="button-parse-discussion-paste"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  파싱하고 미리보기
                </Button>
              </div>

              {discussionParseErrors.length > 0 && (
                <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                  <h4 className="font-bold text-red-300 mb-2">❌ 파싱 오류</h4>
                  <ul className="text-sm text-red-200 space-y-1">
                    {discussionParseErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {discussionParsedPreview && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-xl">
                    <h4 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      ✅ 파싱 성공! 미리보기
                    </h4>
                    <div className="mb-3 p-3 bg-black/30 rounded-lg border border-orange-500/30">
                      <Label className="text-xs font-bold text-orange-300">👨‍🏫 PROFESSOR QUESTION</Label>
                      <p className="text-sm mt-1 text-white line-clamp-4">{discussionParsedPreview.professorQuestion}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-blue-300">💬 STUDENT RESPONSES</Label>
                      {discussionParsedPreview.studentResponses.map((student, idx) => (
                        <div key={idx} className="p-3 bg-black/30 rounded-lg border border-blue-500/30">
                          <div className="font-semibold text-blue-300 mb-1">{student.name}</div>
                          <p className="text-sm text-white line-clamp-3">{student.response}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleApplyParsedDiscussion}
                    className="w-full h-14 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-lg font-bold text-white"
                    data-testid="button-apply-parsed-discussion"
                  >
                    <CheckCircle2 className="h-6 w-6 mr-2" />
                    바로 생성하기
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {currentSection !== "speaking" && currentSection !== "writing" && (
        <>
          <div className="space-y-3 p-4 bg-blue-900/30 rounded-xl border border-blue-500/30">
            <h3 className="font-bold text-blue-300">
              {currentSection === "listening" ? "🎧 리스닝 정보" : "📖 지문 정보"}
            </h3>
            {currentSection === "listening" ? (
              <>
                <Textarea
                  placeholder="안내문 (예: Listen to a conversation between a student and a librarian...)"
                  value={formNarration}
                  onChange={(e) => setFormNarration(e.target.value)}
                  className="min-h-20 bg-white"
                  data-testid="textarea-form-narration"
                />
                <Textarea
                  placeholder="대화문/강의 스크립트 (실제 대화 내용을 입력하세요)"
                  value={formPassageContent}
                  onChange={(e) => setFormPassageContent(e.target.value)}
                  className="min-h-40 bg-white"
                  data-testid="textarea-form-script"
                />
              </>
            ) : (
              <>
                <Input
                  placeholder="지문 제목"
                  value={formPassageTitle}
                  onChange={(e) => setFormPassageTitle(e.target.value)}
                  className="bg-white"
                  data-testid="input-form-passage-title"
                />
                <Textarea
                  placeholder="지문 내용 (모든 문제가 이 지문을 공유합니다)"
                  value={formPassageContent}
                  onChange={(e) => setFormPassageContent(e.target.value)}
                  className="min-h-32 bg-white"
                  data-testid="textarea-form-passage-content"
                />
              </>
            )}
          </div>

          <div className="space-y-3 p-4 bg-purple-900/30 rounded-xl border border-purple-500/30">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-purple-300">⚡ 빠른 붙여넣기</h3>
              <span className="text-xs text-purple-200">여러 문제를 한 번에 복사해서 붙여넣기</span>
            </div>
            <Textarea
              placeholder={"여러 문제를 한 번에 붙여넣기 하세요.\n\n예시:\n1. The word \"precise\" is closest in meaning to\n○ colorful\n○ exact\n○ delicate\n○ complex\n\n2. What can be inferred from paragraph 1?\n○ Option A\n○ Option B\n○ Option C\n○ Option D"}
              value={quickPasteText}
              onChange={(e) => setQuickPasteText(e.target.value)}
              className="min-h-32 bg-white font-mono text-sm"
              data-testid="textarea-quick-paste"
            />
            <Button
              onClick={handleQuickPaste}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="button-parse-quick-paste"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              자동 파싱하여 문제 목록에 추가
            </Button>
          </div>

          <div className="space-y-4 p-4 border-2 border-slate-200 rounded-xl">
            <div>
              <h3 className="font-bold text-slate-900">문제 추가 (수동 입력 또는 파싱된 내용 수정)</h3>
              <p className="text-sm text-slate-600 mt-1">
                위에서 자동 파싱하거나, 직접 입력 후 "문제 목록에 추가" 버튼을 누르세요.
              </p>
            </div>

            <Select
              value={currentQuestion.questionType || "multiple-choice"}
              onValueChange={(value) =>
                setCurrentQuestion({
                  ...currentQuestion,
                  questionType: value,
                  options:
                    value === "multiple-choice"
                      ? ["", "", "", ""]
                      : value === "insertion"
                        ? []
                        : value === "summary"
                          ? ["", "", "", "", "", ""]
                          : value === "category"
                            ? []
                            : ["", "", "", ""],
                })
              }
            >
              <SelectTrigger data-testid="select-question-type">
                <SelectValue placeholder="문제 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple-choice">Multiple Choice (객관식)</SelectItem>
                <SelectItem value="insertion">Insertion (문장 삽입)</SelectItem>
                <SelectItem value="summary">Summary (요약)</SelectItem>
                <SelectItem value="category">Category (분류)</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="문제 내용"
              value={currentQuestion.questionText || ""}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, questionText: e.target.value })}
              data-testid="input-question-text"
            />

            {currentQuestion.questionType === "multiple-choice" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {["A", "B", "C", "D"].map((letter, idx) => (
                    <Input
                      key={letter}
                      placeholder={`옵션 ${letter}`}
                      value={currentQuestion.options?.[idx] || ""}
                      onChange={(e) => {
                        const newOptions = [...(currentQuestion.options || ["", "", "", ""])];
                        newOptions[idx] = e.target.value;
                        setCurrentQuestion({ ...currentQuestion, options: newOptions });
                      }}
                      data-testid={`input-option-${letter.toLowerCase()}`}
                    />
                  ))}
                </div>
                <Select
                  value={currentQuestion.correctAnswer || "A"}
                  onValueChange={(value) => setCurrentQuestion({ ...currentQuestion, correctAnswer: value })}
                >
                  <SelectTrigger data-testid="select-correct-answer">
                    <SelectValue placeholder="정답 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {currentQuestion.questionType === "insertion" && (
              <>
                <Textarea
                  placeholder="삽입할 문장"
                  value={currentQuestion.correctAnswer || ""}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                  className="min-h-20"
                  data-testid="textarea-insertion-sentence"
                />
                <p className="text-xs text-slate-500">* 지문에 [■] 마커를 넣어 삽입 위치를 표시하세요</p>
              </>
            )}

            {currentQuestion.questionType === "summary" && (
              <>
                <p className="text-sm text-slate-600">선택지 입력 (6개)</p>
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <Input
                    key={idx}
                    placeholder={`선택지 ${idx + 1}`}
                    value={currentQuestion.options?.[idx] || ""}
                    onChange={(e) => {
                      const newOptions = [...(currentQuestion.options || Array(6).fill(""))];
                      newOptions[idx] = e.target.value;
                      setCurrentQuestion({ ...currentQuestion, options: newOptions });
                    }}
                    data-testid={`input-summary-option-${idx}`}
                  />
                ))}
                <Input
                  placeholder="정답 (쉼표로 구분, 예: 1,3,5)"
                  value={currentQuestion.correctAnswer || ""}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                  data-testid="input-summary-answers"
                />
              </>
            )}

            {currentQuestion.questionType === "category" && (
              <>
                <Input
                  placeholder="카테고리 A 이름"
                  value={currentQuestion.categoryA || ""}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, categoryA: e.target.value })}
                  data-testid="input-category-a"
                />
                <Input
                  placeholder="카테고리 B 이름"
                  value={currentQuestion.categoryB || ""}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, categoryB: e.target.value })}
                  data-testid="input-category-b"
                />
                <Textarea
                  placeholder="항목들 (한 줄에 하나씩, 카테고리:항목 형식, 예: A:Reptiles)"
                  value={currentQuestion.correctAnswer || ""}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                  className="min-h-32"
                  data-testid="textarea-category-items"
                />
              </>
            )}

            <Button
              onClick={handleAddQuestion}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold"
              data-testid="button-add-question"
            >
              <Plus className="h-5 w-5 mr-2" />
              문제 목록에 추가
            </Button>
          </div>

          <div className="space-y-3 p-4 bg-purple-900/30 rounded-xl border border-purple-500/30">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-purple-300 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                문제 목록
              </h3>
              <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {formQuestions.length}개
              </span>
            </div>

            {formQuestions.length === 0 ? (
              <div className="p-6 bg-black/30 rounded-lg border-2 border-dashed border-purple-500/30 text-center">
                <p className="text-slate-300 text-sm">
                  아직 추가된 문제가 없습니다.
                  <br />
                  위에서 문제를 입력하고 "문제 목록에 추가" 버튼을 눌러주세요.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {formQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    className="p-3 bg-black/30 rounded-lg border border-purple-500/20 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded text-xs font-semibold">
                            문제 {index + 1}
                          </span>
                          <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs">
                            {q.questionType === "multiple-choice"
                              ? "객관식"
                              : q.questionType === "insertion"
                                ? "문장삽입"
                                : q.questionType === "summary"
                                  ? "요약"
                                  : q.questionType === "category"
                                    ? "분류"
                                    : q.questionType}
                          </span>
                        </div>
                        <p className="text-sm text-white font-medium">{q.questionText}</p>
                        {q.questionType === "multiple-choice" && q.options && (
                          <div className="text-xs text-slate-300 mt-1">옵션: {q.options.length}개</div>
                        )}
                        {q.questionType === "summary" && (
                          <div className="text-xs text-slate-300 mt-1">Summary 문제 (6개 옵션)</div>
                        )}
                        {q.questionType === "insertion" && (
                          <div className="text-xs text-slate-300 mt-1">Insertion 문제</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                        data-testid={`button-remove-${q.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleCreateFromForm}
            disabled={isProcessing || formQuestions.length === 0}
            className="w-full h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            data-testid="button-create-from-form"
          >
            <Sparkles className="h-6 w-6 mr-2" />
            폼으로 테스트 생성
          </Button>
        </>
      )}
    </TabsContent>
  );
}
