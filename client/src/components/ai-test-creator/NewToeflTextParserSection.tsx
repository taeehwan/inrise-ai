import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AITestCreatorSection,
  NewToeflListeningQuestion,
  NewToeflReadingQuestion,
  NewToeflSpeakingQuestion,
  NewToeflWritingQuestion,
} from "@/components/ai-test-creator/shared";
import { CheckCircle2, FileText, Headphones, Mic, Sparkles } from "lucide-react";

interface NewToeflTextParserSectionProps {
  currentSection: AITestCreatorSection;
  content: string;
  setContent: (value: string) => void;
  isProcessing: boolean;
  onReadingConfirmAll: () => void;
  onListeningConfirmAll: () => void;
  handleParseNewToeflReading: () => void;
  handleCreateNewToeflReadingTest: () => void;
  newToeflReadingErrors: string[];
  newToeflReadingPreview: NewToeflReadingQuestion[];
  setNewToeflReadingPreview: (questions: NewToeflReadingQuestion[]) => void;
  handleParseNewToeflListening: () => void;
  handleCreateNewToeflListeningTest: () => void;
  newToeflListeningErrors: string[];
  newToeflListeningPreview: NewToeflListeningQuestion[];
  setNewToeflListeningPreview: (questions: NewToeflListeningQuestion[]) => void;
  handleParseNewToeflSpeaking: () => void;
  handleCreateNewToeflSpeakingTest: () => void;
  newToeflSpeakingErrors: string[];
  newToeflSpeakingPreview: NewToeflSpeakingQuestion[];
  handleParseNewToeflWriting: () => void;
  handleCreateNewToeflWritingTest: () => void;
  newToeflWritingErrors: string[];
  newToeflWritingPreview: NewToeflWritingQuestion[];
}

const sectionTitleMap: Record<AITestCreatorSection, string> = {
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
  verbal: "Verbal",
  quant: "Quant",
  "reading-writing": "Reading/Writing",
  math: "Math",
};

export default function NewToeflTextParserSection({
  currentSection,
  content,
  setContent,
  isProcessing,
  onReadingConfirmAll,
  onListeningConfirmAll,
  handleParseNewToeflReading,
  handleCreateNewToeflReadingTest,
  newToeflReadingErrors,
  newToeflReadingPreview,
  setNewToeflReadingPreview,
  handleParseNewToeflListening,
  handleCreateNewToeflListeningTest,
  newToeflListeningErrors,
  newToeflListeningPreview,
  setNewToeflListeningPreview,
  handleParseNewToeflSpeaking,
  handleCreateNewToeflSpeakingTest,
  newToeflSpeakingErrors,
  newToeflSpeakingPreview,
  handleParseNewToeflWriting,
  handleCreateNewToeflWritingTest,
  newToeflWritingErrors,
  newToeflWritingPreview,
}: NewToeflTextParserSectionProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-xl backdrop-blur-sm">
        <h3 className="font-bold text-purple-300 mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          NEW TOEFL 2026 - {sectionTitleMap[currentSection]} 텍스트 파싱
        </h3>
        <div className="text-sm text-purple-200 space-y-2">
          {currentSection === "reading" && (
            <>
              <p><strong>✅ Reading 섹션 문제 유형:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Complete Words:</strong> 빈칸이 있는 지문과 정답</li>
                <li><strong>Comprehension:</strong> 캠퍼스 관련 지문 + 객관식</li>
                <li><strong>Academic:</strong> 학술 지문 + 심화 문제</li>
              </ul>
            </>
          )}
          {currentSection === "listening" && (
            <>
              <p><strong>✅ Listening 섹션 문제 유형:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Choose Response:</strong> 적절한 응답 선택</li>
                <li><strong>Conversation:</strong> 대화 듣고 이해</li>
                <li><strong>Announcement:</strong> 공지사항 듣기</li>
              </ul>
            </>
          )}
          {currentSection === "speaking" && (
            <>
              <p><strong>✅ Speaking 섹션 문제 유형:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Listen & Repeat:</strong> 문장 듣고 따라 말하기</li>
                <li><strong>Interview:</strong> 질문에 답하기</li>
              </ul>
            </>
          )}
          {currentSection === "writing" && (
            <>
              <p><strong>✅ Writing 섹션 문제 유형:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Build Sentence:</strong> 단어 배열하여 문장 만들기</li>
                <li><strong>Email:</strong> 이메일 작성</li>
                <li><strong>Discussion:</strong> 학술 토론 작성</li>
              </ul>
            </>
          )}
        </div>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`NEW TOEFL ${currentSection.toUpperCase()} 섹션 문제를 위 형식에 맞게 입력하세요...`}
        className="min-h-64 text-lg border-2 border-purple-500/30 rounded-xl focus:border-purple-500 bg-white/10 text-white placeholder:text-gray-400"
        data-testid="textarea-new-toefl-content"
      />

      {currentSection === "reading" && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleParseNewToeflReading}
              disabled={isProcessing || !content.trim()}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              data-testid="button-parse-new-toefl-reading"
            >
              <FileText className="h-5 w-5 mr-2" />
              텍스트 파싱
            </Button>
            <Button
              onClick={handleCreateNewToeflReadingTest}
              disabled={isProcessing || newToeflReadingPreview.length === 0}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              data-testid="button-create-new-toefl-reading"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {isProcessing ? "생성 중..." : "테스트 생성"}
            </Button>
          </div>

          {newToeflReadingErrors.length > 0 && (
            <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
              <h4 className="font-bold text-red-300 mb-2">⚠️ 파싱 오류</h4>
              <ul className="list-disc list-inside text-sm text-red-200">
                {newToeflReadingErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {newToeflReadingPreview.length > 0 && (
            <div className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-purple-300 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  파싱된 문제 미리보기 ({newToeflReadingPreview.length}개)
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReadingConfirmAll}
                  className="bg-green-900/50 border-green-500/50 text-green-200 text-xs hover:bg-green-800/50"
                >
                  ✓ 모두 확인
                </Button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {newToeflReadingPreview.map((q, idx) => (
                  <div key={idx} className="p-3 bg-black/30 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded text-xs font-bold">{idx + 1}</span>
                      <span className="bg-purple-900/40 text-purple-200 px-2 py-0.5 rounded text-xs">
                        {q.type === "complete-words" ? "Complete Words" : q.type === "comprehension" ? "Comprehension" : "Academic"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 mb-2 line-clamp-3">
                      <strong>지문:</strong> {q.passage.substring(0, 150)}...
                    </p>
                    {q.type === "complete-words" && q.answers && (
                      <p className="text-xs text-slate-300">
                        <strong>정답:</strong> {q.answers.join(", ")}
                      </p>
                    )}
                    {(q.type === "comprehension" || q.type === "academic") && (
                      <>
                        <p className="text-sm text-slate-200 mb-1">
                          <strong>질문:</strong> {q.question}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-300 font-semibold">정답:</span>
                          <Select
                            value={q.correctAnswer || "A"}
                            onValueChange={(val) => {
                              const updated = [...newToeflReadingPreview];
                              updated[idx] = { ...updated[idx], correctAnswer: val, answerConfirmed: true };
                              setNewToeflReadingPreview(updated);
                            }}
                          >
                            <SelectTrigger className={`w-20 h-7 ${q.answerConfirmed ? "bg-green-900/50 border-green-500/50" : "bg-yellow-900/50 border-yellow-500/50"} text-xs`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-purple-500/30">
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                              <SelectItem value="D">D</SelectItem>
                            </SelectContent>
                          </Select>
                          {q.answerConfirmed ? <span className="text-xs text-green-400">✓ 확인됨</span> : <span className="text-xs text-yellow-400">⚠️ 확인 필요</span>}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {currentSection === "listening" && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleParseNewToeflListening}
              disabled={isProcessing || !content.trim()}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white"
              data-testid="button-parse-new-toefl-listening"
            >
              <Headphones className="h-5 w-5 mr-2" />
              텍스트 파싱
            </Button>
            <Button
              onClick={handleCreateNewToeflListeningTest}
              disabled={isProcessing || newToeflListeningPreview.length === 0}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              data-testid="button-create-new-toefl-listening"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {isProcessing ? "생성 중..." : "테스트 생성"}
            </Button>
          </div>
          {newToeflListeningErrors.length > 0 && (
            <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
              <h4 className="font-bold text-red-300 mb-2">⚠️ 파싱 오류</h4>
              <ul className="list-disc list-inside text-sm text-red-200">{newToeflListeningErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          {newToeflListeningPreview.length > 0 && (
            <div className="p-4 bg-pink-900/30 border border-pink-500/30 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-pink-300 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />파싱된 문제 ({newToeflListeningPreview.length}개)</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onListeningConfirmAll}
                  className="bg-green-900/50 border-green-500/50 text-green-200 text-xs hover:bg-green-800/50"
                >
                  ✓ 모두 확인
                </Button>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {newToeflListeningPreview.map((q, i) => (
                  <div key={i} className="p-3 bg-black/30 rounded-lg border border-pink-500/20">
                    <span className="bg-pink-900/50 text-pink-300 px-2 py-0.5 rounded text-xs">{q.type}</span>
                    <p className="text-sm mt-1 text-white">{q.prompt || q.question}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-300 font-semibold">정답:</span>
                      <Select
                        value={q.correctAnswer || "A"}
                        onValueChange={(val) => {
                          const updated = [...newToeflListeningPreview];
                          updated[i] = { ...updated[i], correctAnswer: val, answerConfirmed: true };
                          setNewToeflListeningPreview(updated);
                        }}
                      >
                        <SelectTrigger className={`w-20 h-7 ${q.answerConfirmed ? "bg-green-900/50 border-green-500/50" : "bg-yellow-900/50 border-yellow-500/50"} text-xs`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e293b] border-pink-500/30">
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                      {q.answerConfirmed ? <span className="text-xs text-green-400">✓ 확인됨</span> : <span className="text-xs text-yellow-400">⚠️ 확인 필요</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {currentSection === "speaking" && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleParseNewToeflSpeaking}
              disabled={isProcessing || !content.trim()}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
              data-testid="button-parse-new-toefl-speaking"
            >
              <Mic className="h-5 w-5 mr-2" />
              텍스트 파싱
            </Button>
            <Button
              onClick={handleCreateNewToeflSpeakingTest}
              disabled={isProcessing || newToeflSpeakingPreview.length === 0}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              data-testid="button-create-new-toefl-speaking"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {isProcessing ? "생성 중..." : "테스트 생성"}
            </Button>
          </div>
          {newToeflSpeakingErrors.length > 0 && (
            <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
              <h4 className="font-bold text-red-300 mb-2">⚠️ 파싱 오류</h4>
              <ul className="list-disc list-inside text-sm text-red-200">{newToeflSpeakingErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          {newToeflSpeakingPreview.length > 0 && (
            <div className="p-4 bg-teal-900/30 border border-teal-500/30 rounded-xl">
              <h4 className="font-bold text-teal-300 mb-3 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />파싱된 문제 ({newToeflSpeakingPreview.length}개)</h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {newToeflSpeakingPreview.map((q, i) => (
                  <div key={i} className="p-3 bg-black/30 rounded-lg border border-teal-500/20">
                    <span className="bg-teal-900/50 text-teal-300 px-2 py-0.5 rounded text-xs">{q.type}</span>
                    <p className="text-sm mt-1 text-white">{q.sentence || q.question}</p>
                    <p className="text-xs text-slate-300 truncate">샘플: {q.sampleAnswer.substring(0, 50)}...</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {currentSection === "writing" && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleParseNewToeflWriting}
              disabled={isProcessing || !content.trim()}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
              data-testid="button-parse-new-toefl-writing"
            >
              <FileText className="h-5 w-5 mr-2" />
              텍스트 파싱
            </Button>
            <Button
              onClick={handleCreateNewToeflWritingTest}
              disabled={isProcessing || newToeflWritingPreview.length === 0}
              className="flex-1 h-14 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              data-testid="button-create-new-toefl-writing"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {isProcessing ? "생성 중..." : "테스트 생성"}
            </Button>
          </div>
          {newToeflWritingErrors.length > 0 && (
            <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
              <h4 className="font-bold text-red-300 mb-2">⚠️ 파싱 오류</h4>
              <ul className="list-disc list-inside text-sm text-red-200">{newToeflWritingErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          {newToeflWritingPreview.length > 0 && (
            <div className="p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-xl">
              <h4 className="font-bold text-indigo-300 mb-3 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />파싱된 문제 ({newToeflWritingPreview.length}개)</h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {newToeflWritingPreview.map((q, i) => (
                  <div key={i} className="p-3 bg-black/30 rounded-lg border border-indigo-500/20">
                    <span className="bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded text-xs">{q.type}</span>
                    <p className="text-sm mt-1 text-white">{q.type === "build-sentence" ? q.words?.join(", ") : (q.scenario || q.topic)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
