import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, MessageSquare, CheckCircle, Clock, Star, ThumbsUp, BookOpen, Mic, PenTool, AlertCircle, RefreshCw, TrendingUp, Award, Lightbulb, Sparkles, Zap, Volume2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, incrementAiFeedbackCount } from "@/lib/queryClient";
import type { SpeakingFeedbackData, WritingCompleteSentenceFeedback, WritingEssayFeedbackData, NewToeflSpeakingInterviewFeedback, NewToeflWritingFeedback, NewToeflListenRepeatFeedback, NewToeflBuildSentenceFeedback } from "@shared/schema";

const getScoreLevel = (score: number): { label: string; color: string; bgColor: string; borderColor: string } => {
  if (score >= 26) return { label: "Advanced", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" };
  if (score >= 22) return { label: "High-Intermediate", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" };
  if (score >= 18) return { label: "Low-Intermediate", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" };
  if (score >= 13) return { label: "Basic", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-200" };
  return { label: "Below Basic", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" };
};

const getSubScoreColor = (score: number): string => {
  if (score >= 9) return "from-emerald-500 to-green-500";
  if (score >= 7) return "from-blue-500 to-cyan-500";
  if (score >= 5) return "from-amber-500 to-yellow-500";
  if (score >= 3) return "from-orange-500 to-amber-500";
  return "from-red-500 to-orange-500";
};

const getSubScoreBarColor = (score: number): string => {
  if (score >= 5) return "bg-gradient-to-r from-emerald-400 to-green-400";
  if (score >= 4) return "bg-gradient-to-r from-blue-400 to-cyan-400";
  if (score >= 3) return "bg-gradient-to-r from-amber-400 to-yellow-400";
  return "bg-gradient-to-r from-red-400 to-orange-400";
};

const getSubScoreGradient = (score: number): string => {
  if (score >= 5) return "from-emerald-500/30 to-green-500/30";
  if (score >= 4) return "from-blue-500/30 to-cyan-500/30";
  if (score >= 3) return "from-amber-500/30 to-yellow-500/30";
  return "from-red-500/30 to-orange-500/30";
};

interface FeedbackPanelProps {
  testType: "speaking" | "writing";
  questionType: string;
  questionId: number;
  testId: string;
  questionContent: string;
  userAnswer: string;
  onFeedbackReceived?: (feedback: any) => void;
}

export function NewToeflFeedbackPanel({
  testType,
  questionType,
  questionId,
  testId,
  questionContent,
  userAnswer,
  onFeedbackReceived
}: FeedbackPanelProps) {
  const { user, isAdmin, membershipTier } = useAuth();
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [requestStatus, setRequestStatus] = useState<"idle" | "pending" | "approved" | "rejected">("idle");
  const [error, setError] = useState<string | null>(null);

  const isMasterOrAdmin = isAdmin || membershipTier === "master";

  useEffect(() => {
    if (!userAnswer.trim() || requestStatus !== "idle") return;
    
    const checkExistingRequest = async () => {
      try {
        const response = await apiRequest("GET", `/api/new-toefl/feedback/check?testType=${testType}&testId=${testId}&questionId=${questionId}`);
        const data = await response.json();
        
        if (data.exists) {
          if (data.status === "approved" && data.feedback) {
            setFeedback(data.feedback);
            setRequestStatus("approved");
          } else if (data.status === "pending") {
            setRequestStatus("pending");
          } else if (data.status === "rejected") {
            setRequestStatus("rejected");
          }
        }
      } catch (err) {
        console.log("No existing feedback request found");
      }
    };
    
    checkExistingRequest();
  }, [testType, testId, questionId, userAnswer, requestStatus]);

  const handleCheckApproval = async () => {
    try {
      const response = await apiRequest("GET", `/api/new-toefl/feedback/check?testType=${testType}&testId=${testId}&questionId=${questionId}`);
      const data = await response.json();
      
      if (data.exists && data.status === "approved" && data.feedback) {
        setFeedback(data.feedback);
        setRequestStatus("approved");
        onFeedbackReceived?.(data.feedback);
      } else if (data.exists && data.status === "rejected") {
        setRequestStatus("rejected");
      }
    } catch (err) {
      console.log("Error checking approval status");
    }
  };

  const handleRequestFeedback = async () => {
    if (!userAnswer.trim()) {
      setError("답변을 먼저 작성해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/new-toefl/feedback/request", {
        testType,
        testId,
        questionType,
        questionId,
        userAnswer,
        questionContent,
        language
      });

      const data = await response.json();
      incrementAiFeedbackCount();

      if (data.immediate) {
        setFeedback(data.feedback);
        setRequestStatus("approved");
        onFeedbackReceived?.(data.feedback);
      } else {
        setRequestStatus("pending");
      }
    } catch (err: any) {
      setError(err.message || "피드백 요청에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSpeakingFeedback = (fb: SpeakingFeedbackData) => {
    const level = getScoreLevel(fb.totalScore);
    
    return (
      <div className="space-y-5">
        <div className={`rounded-xl p-5 ${level.bgColor} border ${level.borderColor}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">{fb.totalScore}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Award className={`h-5 w-5 ${level.color}`} />
                  <span className={`font-bold text-lg ${level.color}`}>{level.label}</span>
                </div>
                <span className="text-sm text-gray-500">TOEFL Speaking Score /30</span>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0 px-3 py-1">
              <Mic className="h-3 w-3 mr-1" />
              Speaking
            </Badge>
          </div>
          <Progress value={(fb.totalScore / 30) * 100} className="h-2" />
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-gray-700 to-slate-700">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-bold text-gray-800">총평</h4>
          </div>
          <p className="text-gray-700 leading-relaxed">{fb.overallComment}</p>
        </div>

        <div className="grid gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${getSubScoreColor(fb.languageUse.score)}`}>
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-800">언어 사용</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(fb.languageUse.score / 10) * 100} className="w-20 h-2" />
                <span className={`font-bold text-lg ${fb.languageUse.score >= 7 ? 'text-emerald-600' : fb.languageUse.score >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                  {fb.languageUse.score}/10
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{fb.languageUse.comment}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${getSubScoreColor(fb.logic.score)}`}>
                  <ThumbsUp className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-800">논리</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(fb.logic.score / 10) * 100} className="w-20 h-2" />
                <span className={`font-bold text-lg ${fb.logic.score >= 7 ? 'text-emerald-600' : fb.logic.score >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                  {fb.logic.score}/10
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{fb.logic.comment}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${getSubScoreColor(fb.delivery.score)}`}>
                  <Mic className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-800">발음 및 유창성</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(fb.delivery.score / 10) * 100} className="w-20 h-2" />
                <span className={`font-bold text-lg ${fb.delivery.score >= 7 ? 'text-emerald-600' : fb.delivery.score >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                  {fb.delivery.score}/10
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{fb.delivery.comment}</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-5 border border-teal-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-bold text-teal-800">모범답안</h4>
          </div>
          <p className="text-teal-700 leading-relaxed italic bg-white/50 rounded-lg p-4 border border-teal-100">
            "{fb.modelAnswer}"
          </p>
        </div>
      </div>
    );
  };

  const renderCompleteSentenceFeedback = (fb: WritingCompleteSentenceFeedback) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          문장 완성 피드백
        </Badge>
      </div>

      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="font-semibold text-green-800 mb-2">✅ 정답</h4>
        <p className="text-green-700">{fb.correctAnswer}</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">📖 해설</h4>
        <p className="text-gray-700">{fb.explanation}</p>
      </div>

      {fb.userMistakes && (
        <div className="bg-red-50 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">❌ 오류 분석</h4>
          <p className="text-red-700">{fb.userMistakes}</p>
        </div>
      )}
    </div>
  );

  const renderWritingEssayFeedback = (fb: WritingEssayFeedbackData) => {
    const level = getScoreLevel(fb.totalScore);
    
    return (
      <div className="space-y-5">
        <div className={`rounded-xl p-5 ${level.bgColor} border ${level.borderColor}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">{fb.totalScore}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Award className={`h-5 w-5 ${level.color}`} />
                  <span className={`font-bold text-lg ${level.color}`}>{level.label}</span>
                </div>
                <span className="text-sm text-gray-500">TOEFL Writing Score /30</span>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 px-3 py-1">
              <PenTool className="h-3 w-3 mr-1" />
              Writing
            </Badge>
          </div>
          <Progress value={(fb.totalScore / 30) * 100} className="h-2" />
        </div>

        <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-gray-700 to-slate-700">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-bold text-gray-800">총평</h4>
          </div>
          <p className="text-gray-700 leading-relaxed">{fb.overallComment}</p>
        </div>

        <div className="grid gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${getSubScoreColor(fb.languageUse.score)}`}>
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-800">언어 사용</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(fb.languageUse.score / 10) * 100} className="w-20 h-2" />
                <span className={`font-bold text-lg ${fb.languageUse.score >= 7 ? 'text-emerald-600' : fb.languageUse.score >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                  {fb.languageUse.score}/10
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{fb.languageUse.comment}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${getSubScoreColor(fb.logic.score)}`}>
                  <ThumbsUp className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-800">논리</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(fb.logic.score / 10) * 100} className="w-20 h-2" />
                <span className={`font-bold text-lg ${fb.logic.score >= 7 ? 'text-emerald-600' : fb.logic.score >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                  {fb.logic.score}/10
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{fb.logic.comment}</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${getSubScoreColor(fb.contextFlow.score)}`}>
                  <PenTool className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-800">문맥의 흐름</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={(fb.contextFlow.score / 10) * 100} className="w-20 h-2" />
                <span className={`font-bold text-lg ${fb.contextFlow.score >= 7 ? 'text-emerald-600' : fb.contextFlow.score >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                  {fb.contextFlow.score}/10
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{fb.contextFlow.comment}</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-bold text-indigo-800">모범답안</h4>
          </div>
          <p className="text-indigo-700 leading-relaxed italic bg-white/50 rounded-lg p-4 border border-indigo-100 whitespace-pre-wrap">
            {fb.modelAnswer}
          </p>
        </div>
      </div>
    );
  };

  const renderFeedback = () => {
    if (!feedback) return null;

    if (testType === "speaking") {
      return renderSpeakingFeedback(feedback as SpeakingFeedbackData);
    }

    if (questionType === "complete_sentence" || questionType === "build_sentence") {
      return renderCompleteSentenceFeedback(feedback as WritingCompleteSentenceFeedback);
    }

    return renderWritingEssayFeedback(feedback as WritingEssayFeedbackData);
  };

  return (
    <Card className="border-2 border-dashed border-gray-200 bg-white/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-teal-600" />
          인라이즈 피드백
          {isMasterOrAdmin && (
            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
              즉시 피드백 가능
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {requestStatus === "idle" && (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">
              {isMasterOrAdmin
                ? "답변에 대한 인라이즈 피드백을 즉시 받을 수 있습니다."
                : "피드백을 요청하면 관리자 승인 후 확인할 수 있습니다."}
            </p>
            <Button
              onClick={handleRequestFeedback}
              disabled={isLoading || !userAnswer.trim()}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
              data-testid="button-request-feedback"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  피드백 생성 중...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  피드백 요청
                </>
              )}
            </Button>
            {error && (
              <p className="text-red-500 text-sm mt-2 flex items-center justify-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>
        )}

        {requestStatus === "pending" && (
          <div className="text-center py-6 bg-yellow-50 rounded-lg">
            <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <h3 className="font-semibold text-yellow-800 mb-2">피드백 요청 접수됨</h3>
            <p className="text-yellow-700 mb-4">
              관리자 승인 후 피드백을 확인할 수 있습니다.
            </p>
            <Button
              onClick={handleCheckApproval}
              variant="outline"
              className="border-yellow-500 text-yellow-700 hover:bg-yellow-100"
              data-testid="button-check-approval"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              승인 여부 확인
            </Button>
          </div>
        )}

        {requestStatus === "approved" && feedback && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">피드백이 준비되었습니다!</span>
            </div>
            {renderFeedback()}
          </div>
        )}

        {requestStatus === "rejected" && (
          <div className="text-center py-6 bg-red-50 rounded-lg">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-semibold text-red-800 mb-2">피드백 요청이 거절되었습니다</h3>
            <p className="text-red-700">
              다시 시도하거나 관리자에게 문의하세요.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ReadingListeningFeedbackProps {
  section: "reading" | "listening";
  question: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  passage: string;
  onFeedbackReceived?: (feedback: any) => void;
}

export function InstantFeedbackPanel({
  section,
  question,
  options,
  userAnswer,
  correctAnswer,
  passage,
  onFeedbackReceived
}: ReadingListeningFeedbackProps) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetFeedback = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = section === "reading" 
        ? "/api/new-toefl/feedback/reading"
        : "/api/new-toefl/feedback/listening";

      const response = await apiRequest("POST", endpoint, {
        question,
        options,
        userAnswer,
        correctAnswer,
        [section === "reading" ? "passage" : "dialogue"]: passage,
        language
      });

      const data = await response.json();
      incrementAiFeedbackCount();
      setFeedback(data);
      onFeedbackReceived?.(data);
    } catch (err: any) {
      setError(err.message || "피드백을 가져오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (feedback) {
    return (
      <div className={`rounded-lg p-4 ${feedback.isCorrect ? "bg-green-50" : "bg-red-50"}`}>
        <div className="flex items-center gap-2 mb-2">
          {feedback.isCorrect ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-700">정답입니다!</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-red-700">오답입니다</span>
            </>
          )}
        </div>
        <p className={feedback.isCorrect ? "text-green-700" : "text-red-700"}>
          {feedback.explanation}
        </p>
      </div>
    );
  }

  return (
    <Button
      onClick={handleGetFeedback}
      disabled={isLoading}
      variant="outline"
      className="w-full"
      data-testid="button-get-instant-feedback"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          해설 불러오는 중...
        </>
      ) : (
        <>
          <MessageSquare className="mr-2 h-4 w-4" />
          해설 보기
        </>
      )}
      {error && <span className="text-red-500 ml-2">{error}</span>}
    </Button>
  );
}

const getETSScoreLevel = (score: number): { label: string; labelKo: string; color: string } => {
  if (score >= 5) return { label: "Fully Successful", labelKo: "우수", color: "text-emerald-300" };
  if (score >= 4) return { label: "Generally Successful", labelKo: "양호", color: "text-blue-300" };
  if (score >= 3) return { label: "Partially Successful", labelKo: "보통", color: "text-amber-300" };
  if (score >= 2) return { label: "Limited Success", labelKo: "미흡", color: "text-orange-300" };
  return { label: "Unsuccessful", labelKo: "부족", color: "text-red-300" };
};

const getMintBarGradient = (score: number): string => {
  if (score <= 2) return 'linear-gradient(90deg, #FB7185, #F87171)';
  if (score >= 4.5) return 'linear-gradient(90deg, #2DD4BF, #99F6E4)';
  return 'linear-gradient(90deg, #2DD4BF, #5EEAD4)';
};

const getMintScoreColor = (score: number): string => {
  if (score <= 2) return '#FB7185';
  return '#5EEAD4';
};

// ===== 2026 TOEFL Speaking Interview Feedback Panel (Mint Dark Theme) =====
interface SpeakingInterviewFeedbackProps {
  question: string;
  userAnswer: string;
  recordingBlob?: Blob | null;
  questionNumber?: number;
  onFeedbackReceived?: (feedback: NewToeflSpeakingInterviewFeedback) => void;
}

export function NewToefl2026SpeakingFeedbackPanel({
  question,
  userAnswer,
  recordingBlob,
  questionNumber,
  onFeedbackReceived
}: SpeakingInterviewFeedbackProps) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [feedback, setFeedback] = useState<NewToeflSpeakingInterviewFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzedMetrics, setAnalyzedMetrics] = useState<{
    wordsPerMinute?: number;
    fluencyScore?: number;
    pronunciationConfidence?: number;
    duration?: number;
  } | null>(null);
  const [activeTier, setActiveTier] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  const handleGetFeedback = async () => {
    if (!userAnswer.trim()) {
      setError("답변을 먼저 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setIsAnalyzingAudio(!!recordingBlob);
    setError(null);
    setAnalyzedMetrics(null); // Reset metrics for new request

    try {
      let speechMetrics = null;

      // If recording blob is provided, analyze the audio for pronunciation/speed/fluency
      if (recordingBlob) {
        try {
          const formData = new FormData();
          formData.append('audio', recordingBlob, 'recording.webm');
          
          const audioResponse = await fetch('/api/speech-to-text-enhanced', {
            method: 'POST',
            body: formData,
          });
          
          if (audioResponse.ok) {
            const audioData = await audioResponse.json();
            if (audioData.speechMetrics) {
              speechMetrics = audioData.speechMetrics;
              setAnalyzedMetrics(speechMetrics);
              console.log("🎤 Audio analysis complete:", speechMetrics);
            }
          }
        } catch (audioErr) {
          console.error("Audio analysis failed, continuing with text-only feedback:", audioErr);
          setAnalyzedMetrics(null); // Clear metrics on error
        }
      }

      setIsAnalyzingAudio(false);

      const response = await apiRequest("POST", "/api/new-toefl/feedback/speaking-interview", {
        question,
        userAnswer,
        language,
        speechMetrics
      });

      const data = await response.json();
      incrementAiFeedbackCount();
      setFeedback(data);
      onFeedbackReceived?.(data);
    } catch (err: any) {
      setError(err.message || "피드백 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
      setIsAnalyzingAudio(false);
    }
  };

  const renderFeedback = (fb: NewToeflSpeakingInterviewFeedback) => {
    const level = getETSScoreLevel(fb.totalScore);
    const isHighScore = fb.totalScore >= 4.5;

    const categoryItems = [
      { label: '언어 사용', score: fb.languageUse.score, comment: fb.languageUse.comment, icon: <BookOpen style={{ width: 13, height: 13 }} /> },
      { label: '논리', score: fb.logic.score, comment: fb.logic.comment, icon: <ThumbsUp style={{ width: 13, height: 13 }} /> },
      { label: '발음 및 유창성', score: fb.delivery.score, comment: fb.delivery.comment, icon: <Mic style={{ width: 13, height: 13 }} /> },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Header: INTERVIEW · 질문 N + 완료 배지 ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '1.4px', color: '#5EEAD4', textTransform: 'uppercase' as const }}>
              INTERVIEW{questionNumber ? ` · 질문 ${questionNumber}` : ''}
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'rgba(45,212,191,0.14)',
            border: '1px solid rgba(94,234,212,0.20)',
            borderRadius: 999,
            padding: '5px 12px',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#5EEAD4', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#5EEAD4', letterSpacing: '0.5px' }}>완료</span>
          </div>
        </div>

        {/* ── Question Box ── */}
        <div style={{
          background: 'rgba(19,78,74,0.22)',
          borderTop: '1px solid rgba(94,234,212,0.12)',
          borderRight: '1px solid rgba(94,234,212,0.12)',
          borderBottom: '1px solid rgba(94,234,212,0.12)',
          borderLeft: '3px solid #2DD4BF',
          borderRadius: '0 12px 12px 0',
          padding: '18px 20px',
        }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: '#F0FDFA', margin: 0 }}>{question}</p>
        </div>

        {/* ── Hero Score Card ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(45,212,191,0.10), rgba(15,118,110,0.18))',
          border: '1px solid rgba(94,234,212,0.18)',
          borderRadius: 14,
          padding: '20px 22px',
          boxShadow: isHighScore ? '0 0 32px rgba(45,212,191,0.08)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 38, fontWeight: 300, letterSpacing: '-1px', color: '#F0FDFA', lineHeight: 1 }}>
                  {fb.totalScore}
                </span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#5EEAD4' }}>{level.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(153,246,228,0.55)', marginTop: 2 }}>
                    2026 TOEFL Speaking · /6
                  </div>
                </div>
              </div>
            </div>
            <span style={{
              background: 'linear-gradient(135deg, #2DD4BF, #0F766E)',
              borderRadius: 999,
              padding: '4px 14px',
              fontSize: 11,
              fontWeight: 500,
              color: '#F0FDFA',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              flexShrink: 0,
            }}>
              <Mic style={{ width: 11, height: 11 }} />
              Interview
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: 'rgba(94,234,212,0.12)', overflow: 'hidden' }}>
            <div style={{
              width: `${(fb.totalScore / 6) * 100}%`,
              height: '100%',
              background: getMintBarGradient(fb.totalScore),
              borderRadius: 999,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* ── 총평 ── */}
        <div style={{
          background: 'rgba(19,78,74,0.22)',
          border: '1px solid rgba(94,234,212,0.12)',
          borderRadius: 12,
          padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
            <span style={{ color: '#5EEAD4', fontSize: 11 }}>✦</span>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '1px', color: '#5EEAD4', textTransform: 'uppercase' as const }}>총평</span>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'rgba(204,251,241,0.78)', margin: 0 }}>
            {fb.overallComment}
          </p>
        </div>

        {/* ── Category Cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categoryItems.map(({ label, score, comment, icon }) => {
            const isHigh = score >= 4.5;
            return (
              <div
                key={label}
                style={{
                  background: 'rgba(19,78,74,0.22)',
                  borderTop: '1px solid rgba(94,234,212,0.12)',
                  borderRight: '1px solid rgba(94,234,212,0.12)',
                  borderBottom: '1px solid rgba(94,234,212,0.12)',
                  borderLeft: '2px solid #5EEAD4',
                  borderRadius: '0 10px 10px 0',
                  padding: '13px 15px',
                  transition: 'background 200ms ease, border-top-color 200ms ease, border-right-color 200ms ease, border-bottom-color 200ms ease',
                  boxShadow: isHigh ? '0 0 24px rgba(45,212,191,0.08)' : 'none',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = 'rgba(19,78,74,0.26)';
                  el.style.borderTopColor = 'rgba(94,234,212,0.20)';
                  el.style.borderRightColor = 'rgba(94,234,212,0.20)';
                  el.style.borderBottomColor = 'rgba(94,234,212,0.20)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = 'rgba(19,78,74,0.22)';
                  el.style.borderTopColor = 'rgba(94,234,212,0.12)';
                  el.style.borderRightColor = 'rgba(94,234,212,0.12)';
                  el.style.borderBottomColor = 'rgba(94,234,212,0.12)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: comment ? 8 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 22,
                      height: 22,
                      background: 'rgba(45,212,191,0.16)',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#5EEAD4',
                      flexShrink: 0,
                    }}>
                      {icon}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#F0FDFA' }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 64, height: 3, background: 'rgba(94,234,212,0.12)', borderRadius: 999, overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{
                        width: `${(score / 6) * 100}%`,
                        height: '100%',
                        background: getMintBarGradient(score),
                        borderRadius: 999,
                      }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: getMintScoreColor(score), minWidth: 28, textAlign: 'right' as const }}>
                      {score}/6
                    </span>
                  </div>
                </div>
                {comment && (
                  <p style={{ fontSize: 11.5, lineHeight: 1.6, color: 'rgba(153,246,228,0.55)', margin: 0 }}>{comment}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── 음성 분석 메트릭 (발음 카드 하단) ── */}
        {analyzedMetrics && (
          <div style={{
            background: 'rgba(19,78,74,0.16)',
            border: '1px solid rgba(94,234,212,0.10)',
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Volume2 style={{ width: 12, height: 12, color: '#5EEAD4' }} />
              <span style={{ fontSize: 11, color: 'rgba(153,246,228,0.55)', letterSpacing: '0.5px' }}>실제 음성 분석 결과</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { value: `${analyzedMetrics.wordsPerMinute || 0}`, label: 'WPM' },
                { value: `${analyzedMetrics.fluencyScore?.toFixed(1) || 0}`, label: '유창성' },
                { value: `${((analyzedMetrics.pronunciationConfidence || 0) * 100).toFixed(0)}%`, label: '발음 정확도' },
              ].map(({ value, label }) => (
                <div key={label} style={{
                  background: 'rgba(45,212,191,0.08)',
                  border: '1px solid rgba(94,234,212,0.12)',
                  borderRadius: 8,
                  padding: '8px 6px',
                  textAlign: 'center' as const,
                }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#2DD4BF', margin: '0 0 2px' }}>{value}</p>
                  <p style={{ fontSize: 10.5, color: 'rgba(153,246,228,0.55)', margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 모범답안 ── */}
        <div style={{
          background: 'rgba(19,78,74,0.22)',
          border: '1px solid rgba(94,234,212,0.14)',
          borderRadius: 12,
          padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <div style={{ width: 20, height: 20, background: 'rgba(45,212,191,0.16)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lightbulb style={{ width: 11, height: 11, color: '#5EEAD4' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '1px', color: '#5EEAD4', textTransform: 'uppercase' as const }}>모범답안</span>
          </div>

          {fb.tieredModelAnswers ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(["beginner", "intermediate", "advanced"] as const).map((tier) => {
                  const labels = { beginner: "초급", intermediate: "중급", advanced: "고급" };
                  const cefrLabels = { beginner: "B1", intermediate: "B2", advanced: "C1+" };
                  const isActive = activeTier === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => setActiveTier(tier)}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: 8,
                        border: `1px solid ${isActive ? '#2DD4BF' : 'rgba(94,234,212,0.20)'}`,
                        background: isActive ? 'linear-gradient(135deg, #2DD4BF, #0F766E)' : 'rgba(19,78,74,0.22)',
                        color: isActive ? '#F0FDFA' : 'rgba(153,246,228,0.65)',
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                      }}
                    >
                      {labels[tier]}
                      <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.75 }}>({cefrLabels[tier]})</span>
                    </button>
                  );
                })}
              </div>
              {(() => {
                const answer = fb.tieredModelAnswers[activeTier];
                const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
                return (
                  <div style={{
                    background: 'rgba(19,78,74,0.32)',
                    border: '1px solid rgba(94,234,212,0.16)',
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: '#CCFBF1', fontStyle: 'italic', margin: '0 0 10px' }}>"{answer}"</p>
                    <span style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(45,212,191,0.14)',
                      color: '#5EEAD4',
                      border: '1px solid rgba(94,234,212,0.18)',
                    }}>
                      {wordCount} words
                    </span>
                  </div>
                );
              })()}
            </>
          ) : (
            <p style={{
              fontSize: 13,
              lineHeight: 1.7,
              color: '#CCFBF1',
              fontStyle: 'italic',
              background: 'rgba(19,78,74,0.32)',
              border: '1px solid rgba(94,234,212,0.14)',
              borderRadius: 10,
              padding: '14px 16px',
              margin: 0,
            }}>
              "{fb.modelAnswer}"
            </p>
          )}
        </div>

        {/* ── 필수 표현 5선 ── */}
        {fb.essentialExpressions && fb.essentialExpressions.length > 0 && (
          <div style={{
            background: 'rgba(19,78,74,0.22)',
            border: '1px solid rgba(94,234,212,0.14)',
            borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <div style={{ width: 20, height: 20, background: 'rgba(45,212,191,0.16)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap style={{ width: 11, height: 11, color: '#5EEAD4' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '1px', color: '#5EEAD4', textTransform: 'uppercase' as const }}>필수 표현 5선</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fb.essentialExpressions.map((expr, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: 'rgba(19,78,74,0.32)',
                  border: '1px solid rgba(94,234,212,0.12)',
                  borderRadius: 8,
                  padding: '10px 12px',
                }}>
                  <span style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #2DD4BF, #0F766E)',
                    color: '#F0FDFA',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {idx + 1}
                  </span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#F0FDFA', margin: '0 0 3px' }}>{expr.expression}</p>
                    <p style={{ fontSize: 12, color: 'rgba(153,246,228,0.65)', margin: 0 }}>{expr.meaning}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      background: '#08130F',
      border: '1px solid rgba(94,234,212,0.18)',
      borderRadius: 16,
      marginTop: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid rgba(94,234,212,0.10)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Sparkles style={{ width: 15, height: 15, color: '#2DD4BF' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#F0FDFA' }}>인라이즈 피드백</span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px' }}>
        {!feedback && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ fontSize: 13, color: 'rgba(153,246,228,0.65)', marginBottom: 16 }}>
              {isAnalyzingAudio ? '음성을 분석하고 있습니다...' : '답변을 분석하여 상세한 피드백을 제공합니다.'}
            </p>
            <button
              type="button"
              onClick={handleGetFeedback}
              disabled={isLoading || !userAnswer.trim()}
              data-testid="button-get-speaking-feedback"
              style={{
                background: isLoading || !userAnswer.trim()
                  ? 'rgba(45,212,191,0.20)'
                  : 'linear-gradient(135deg, #2DD4BF, #0F766E)',
                border: 'none',
                borderRadius: 10,
                padding: '11px 28px',
                color: '#F0FDFA',
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading || !userAnswer.trim() ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 200ms ease',
                opacity: isLoading || !userAnswer.trim() ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                  {isAnalyzingAudio ? '음성 분석 중...' : '피드백 생성 중...'}
                </>
              ) : (
                <>
                  <Sparkles style={{ width: 15, height: 15 }} />
                  피드백 받기
                </>
              )}
            </button>
            {error && (
              <div style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(251,113,133,0.12)',
                border: '1px solid rgba(251,113,133,0.30)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                color: '#FB7185',
              }}>
                <AlertCircle style={{ width: 13, height: 13 }} />
                {error}
              </div>
            )}
          </div>
        )}

        {feedback && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <CheckCircle style={{ width: 14, height: 14, color: '#2DD4BF' }} />
              <span style={{ fontSize: 12.5, fontWeight: 500, color: '#5EEAD4' }}>피드백이 준비되었습니다!</span>
            </div>
            {renderFeedback(feedback)}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 2026 TOEFL Writing Feedback Panel (Purple Theme) with 3-Tab Structure =====
interface WritingFeedbackProps {
  feedbackType: "email" | "discussion";
  scenario?: string;
  recipient?: string;
  keyPoints?: string[];
  userSubject?: string;
  userBody?: string;
  topic?: string;
  professorPrompt?: string;
  otherPosts?: { author: string; content: string }[];
  userResponse?: string;
  onFeedbackReceived?: (feedback: NewToeflWritingFeedback) => void;
}

type FeedbackTab = "overview" | "feedback" | "model";

export function NewToefl2026WritingFeedbackPanel({
  feedbackType,
  scenario,
  recipient,
  keyPoints,
  userSubject,
  userBody,
  topic,
  professorPrompt,
  otherPosts,
  userResponse,
  onFeedbackReceived
}: WritingFeedbackProps) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<NewToeflWritingFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedbackTab>("overview");
  const [activeTier, setActiveTier] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isLoading) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isLoading]);

  const handleGetFeedback = async () => {
    const answer = feedbackType === "email" ? userBody : userResponse;
    if (!answer?.trim()) {
      setError("답변을 먼저 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;
      if (feedbackType === "email") {
        response = await apiRequest("POST", "/api/new-toefl/feedback/writing-email", {
          scenario,
          recipient,
          keyPoints,
          userSubject,
          userBody,
          language
        });
      } else {
        response = await apiRequest("POST", "/api/new-toefl/feedback/writing-discussion", {
          topic,
          professorPrompt,
          otherPosts,
          userResponse,
          language
        });
      }

      const data = await response.json();
      incrementAiFeedbackCount();
      setFeedback(data);
      onFeedbackReceived?.(data);
    } catch (err: any) {
      setError(err.message || "피드백 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const TabButtons = () => (
    <div className="flex gap-1 p-1 bg-white/10 backdrop-blur-sm rounded-xl mb-5">
      {[
        { key: "overview" as FeedbackTab, icon: Award, label: "총평" },
        { key: "feedback" as FeedbackTab, icon: MessageSquare, label: "피드백" },
        { key: "model" as FeedbackTab, icon: Lightbulb, label: "모범답안" },
      ].map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setActiveTab(key)}
          data-testid={`tab-${key}`}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === key
              ? "bg-white text-indigo-700 shadow-md"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  const ScoreCircle = ({ score, max, size = "lg" }: { score: number; max: number; size?: "lg" | "sm" }) => {
    const gradId = `scoreGrad_${size}_${score}_${max}`;
    const percentage = (score / max) * 100;
    const radius = size === "lg" ? 42 : 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const svgSize = size === "lg" ? 100 : 68;

    return (
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          <circle cx={svgSize/2} cy={svgSize/2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={size === "lg" ? 6 : 4} />
          <circle cx={svgSize/2} cy={svgSize/2} r={radius} fill="none" stroke={`url(#${gradId})`} strokeWidth={size === "lg" ? 6 : 4} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-white ${size === "lg" ? "text-2xl" : "text-base"}`}>{score}</span>
          <span className={`text-white/50 ${size === "lg" ? "text-xs" : "text-[10px]"}`}>/{max}</span>
        </div>
      </div>
    );
  };

  const renderOverviewTab = (fb: NewToeflWritingFeedback) => {
    const level = getETSScoreLevel(fb.totalScore);
    const scaledScore = fb.scaledScore || Math.round(fb.totalScore * 5);
    const scoreBand = fb.scoreBand || level.label;

    const subScores = [
      { label: "언어 사용", labelEn: "Language Use", icon: BookOpen, data: fb.languageUse },
      { label: "논리", labelEn: "Logic", icon: ThumbsUp, data: fb.logic },
      { label: "문맥의 흐름", labelEn: "Context Flow", icon: PenTool, data: fb.contextFlow },
    ];

    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-5 bg-gradient-to-br from-[#1e1b4b]/80 to-[#312e81]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <ScoreCircle score={fb.totalScore} max={6} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/30 to-purple-500/30 border border-indigo-400/30 text-white text-sm font-bold tracking-wide">
                    Score {fb.totalScore}
                  </span>
                </div>
                <p className={`font-bold text-base ${level.color}`}>{scoreBand}</p>
                <p className="text-white/40 text-xs mt-0.5">2026 TOEFL Writing · {scaledScore}/30</p>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs font-medium flex items-center gap-1.5">
              <PenTool className="h-3 w-3" />
              {feedbackType === "email" ? "Email" : "Discussion"}
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-700" style={{ width: `${(fb.totalScore / 6) * 100}%` }} />
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#1e1b4b]/60 to-[#312e81]/60 backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/20">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-300" />
            </div>
            <h4 className="font-bold text-white/90 text-sm">총평</h4>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">{fb.overallComment}</p>
        </div>

        <div className="space-y-2.5">
          {subScores.map(({ label, labelEn, icon: Icon, data }) => {
            const barColor = getSubScoreBarColor(data.score);
            return (
              <div key={label} className="rounded-xl p-4 bg-white/5 backdrop-blur-sm border border-white/8 hover:bg-white/8 transition-colors duration-200">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-r ${getSubScoreGradient(data.score)}`}>
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-white/90 text-sm">{label}</span>
                      <span className="text-white/30 text-xs ml-1.5">{labelEn}</span>
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${data.score >= 4 ? 'text-emerald-400' : data.score >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                    {data.score}/6
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-2.5">
                  <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${(data.score / 6) * 100}%` }} />
                </div>
                <p className="text-white/60 text-xs leading-relaxed">{data.comment}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFeedbackTab = (fb: NewToeflWritingFeedback) => {
    const sentenceFeedback = fb.sentenceFeedback || [];
    const issueColors: Record<string, { bg: string; text: string; dot: string }> = {
      grammar: { bg: "bg-red-500/10", text: "text-red-300", dot: "bg-red-400" },
      vocabulary: { bg: "bg-orange-500/10", text: "text-orange-300", dot: "bg-orange-400" },
      style: { bg: "bg-blue-500/10", text: "text-blue-300", dot: "bg-blue-400" },
      tone: { bg: "bg-purple-500/10", text: "text-purple-300", dot: "bg-purple-400" },
      structure: { bg: "bg-amber-500/10", text: "text-amber-300", dot: "bg-amber-400" },
      logic: { bg: "bg-indigo-500/10", text: "text-indigo-300", dot: "bg-indigo-400" },
      correct: { bg: "bg-emerald-500/10", text: "text-emerald-300", dot: "bg-emerald-400" },
    };
    const issueLabels: Record<string, string> = {
      grammar: "문법", vocabulary: "어휘", style: "스타일", tone: "어조",
      structure: "구조", logic: "논리", correct: "정확",
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-300" />
            </div>
            <h4 className="font-bold text-white/90 text-sm">문장별 피드백</h4>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-xs font-medium">
            {sentenceFeedback.length}개 문장
          </span>
        </div>

        {sentenceFeedback.length > 0 ? (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
            {sentenceFeedback.map((item, idx) => {
              const isCorrect = item.issueType === "correct";
              const colors = issueColors[item.issueType] || issueColors.grammar;
              return (
                <div key={idx} className="rounded-xl p-3.5 bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full ${isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-300'} text-[10px] font-bold flex items-center justify-center mt-0.5`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                        <span className={`text-xs font-medium ${colors.text}`}>{issueLabels[item.issueType] || item.issueType}</span>
                      </div>
                      <div className="text-sm">
                        <p className={`${isCorrect ? 'text-white/70' : 'text-red-300/80 line-through'} leading-relaxed`}>{item.sentence}</p>
                        {!isCorrect && item.correctedSentence && item.correctedSentence !== item.sentence && (
                          <p className="text-emerald-400 mt-1 font-medium text-sm leading-relaxed">→ {item.correctedSentence}</p>
                        )}
                      </div>
                      <p className="text-white/50 text-xs leading-relaxed bg-white/5 rounded-lg p-2">{item.feedback}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-white/30">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">문장별 피드백이 제공되지 않았습니다.</p>
          </div>
        )}
      </div>
    );
  };

  const renderModelTab = (fb: NewToeflWritingFeedback) => {
    const expressions = fb.essentialExpressions || [];

    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-[#1e1b4b]/60 to-[#312e81]/60 backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/20">
              <Lightbulb className="h-3.5 w-3.5 text-indigo-300" />
            </div>
            <h4 className="font-bold text-white/90 text-sm">모범답안</h4>
          </div>

          {fb.tieredModelAnswers ? (
            <>
              <div className="flex gap-1.5 mb-3">
                {(["beginner", "intermediate", "advanced"] as const).map((tier) => {
                  const labels = { beginner: "초급", intermediate: "중급", advanced: "고급" };
                  const cefrLabels = { beginner: "B1", intermediate: "B2", advanced: "C1+" };
                  const activeColors = {
                    beginner: "bg-emerald-500/30 text-emerald-300 border-emerald-400/50",
                    intermediate: "bg-blue-500/30 text-blue-300 border-blue-400/50",
                    advanced: "bg-purple-500/30 text-purple-300 border-purple-400/50",
                  };
                  const inactiveColor = "bg-white/5 text-white/50 border-white/10 hover:bg-white/10";
                  return (
                    <button
                      key={tier}
                      onClick={() => setActiveTier(tier)}
                      className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${activeTier === tier ? activeColors[tier] : inactiveColor}`}
                    >
                      {labels[tier]}
                      <span className="ml-1 opacity-70">({cefrLabels[tier]})</span>
                    </button>
                  );
                })}
              </div>
              {(() => {
                const answer = fb.tieredModelAnswers[activeTier];
                const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
                const badgeColors = {
                  beginner: "bg-emerald-500/20 text-emerald-300",
                  intermediate: "bg-blue-500/20 text-blue-300",
                  advanced: "bg-purple-500/20 text-purple-300"
                };
                return (
                  <>
                    <div className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-xl p-4 border border-white/8 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {answer}
                    </div>
                    <div className="mt-2 flex justify-end">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColors[activeTier]}`}>
                        {wordCount} words
                      </span>
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <div className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-xl p-4 border border-white/8 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {fb.modelAnswer}
            </div>
          )}
        </div>

        {expressions.length > 0 && (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-[#1e1b4b]/60 to-[#312e81]/60 backdrop-blur-xl border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-violet-500/20">
                <Zap className="h-3.5 w-3.5 text-violet-300" />
              </div>
              <h4 className="font-bold text-white/90 text-sm">필수 표현</h4>
              <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 text-xs font-medium border border-violet-400/20">구문/숙어</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {expressions.map((expr, idx) => (
                <div key={idx} className="rounded-xl p-3 bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white/80 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-semibold text-white/90 text-sm">{expr.expression}</p>
                        {expr.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-400/20">
                            {expr.category}
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-xs">{expr.meaning}</p>
                      {expr.usage && (
                        <p className="text-white/40 text-xs mt-1 italic bg-white/5 rounded-lg p-1.5">예: {expr.usage}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFeedback = (fb: NewToeflWritingFeedback) => (
    <div className="space-y-0">
      <TabButtons />
      {activeTab === "overview" && renderOverviewTab(fb)}
      {activeTab === "feedback" && renderFeedbackTab(fb)}
      {activeTab === "model" && renderModelTab(fb)}
    </div>
  );

  return (
    <Card className="border-0 shadow-2xl mt-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0f3d, #2D1B69, #1a0f3d)', border: '1px solid rgba(196,181,253,0.14)' }}>
      <CardHeader className="pb-2 border-b border-white/10">
        <CardTitle className="text-base flex items-center gap-2 text-white/90 tracking-wide">
          <div className="p-1.5 rounded-lg" style={{ background: 'rgba(167,139,250,0.18)' }}>
            <Sparkles className="h-4 w-4" style={{ color: '#C4B5FD' }} />
          </div>
          인라이즈 피드백
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {!feedback && (
          <div className="text-center py-6">
            <p className="text-white/60 mb-5 text-sm">
              {feedbackType === "email" ? "이메일" : "토론 답변"}을 분석하여 상세한 피드백을 제공합니다.
            </p>
            <Button
              onClick={handleGetFeedback}
              disabled={isLoading || !(feedbackType === "email" ? userBody?.trim() : userResponse?.trim())}
              className="text-white px-8 py-3 text-sm font-semibold rounded-xl border-0 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #A78BFA, #5B21B6)', boxShadow: '0 4px 16px rgba(167,139,250,0.30)' }}
              data-testid="button-get-writing-feedback"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI 분석 중... ({elapsedSeconds}초)
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  피드백 받기
                </>
              )}
            </Button>
            {isLoading && (
              <p className="mt-3 text-white/50 text-xs animate-pulse">
                AI가 답변을 분석하고 있습니다. 약 20~40초 소요됩니다.
              </p>
            )}
            {error && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
              </div>
            )}
          </div>
        )}

        {feedback && (
          <div>
            <div className="flex items-center gap-2 text-emerald-400/80 mb-4">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">피드백이 준비되었습니다</span>
            </div>
            {renderFeedback(feedback)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== 2026 TOEFL Listen & Repeat Feedback Panel (Orange Theme) =====
interface ListenRepeatFeedbackProps {
  originalSentence: string;
  userSpeech: string;
  onFeedbackReceived?: (feedback: NewToeflListenRepeatFeedback) => void;
}

export function NewToefl2026ListenRepeatFeedbackPanel({
  originalSentence,
  userSpeech,
  onFeedbackReceived
}: ListenRepeatFeedbackProps) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<NewToeflListenRepeatFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetFeedback = async () => {
    if (!userSpeech.trim()) {
      setError("녹음된 내용이 없습니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/new-toefl/feedback/listen-repeat", {
        originalSentence,
        userSpeech,
        language
      });

      const data = await response.json();
      incrementAiFeedbackCount();
      setFeedback(data);
      onFeedbackReceived?.(data);
    } catch (err: any) {
      setError(err.message || "피드백 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderFeedback = (fb: NewToeflListenRepeatFeedback) => (
    <div className="space-y-4 bg-white rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-700 font-medium">정확도</span>
        <span className="text-2xl font-bold text-orange-600">{fb.accuracyScore}%</span>
      </div>
      <Progress value={fb.accuracyScore} className="h-3" />
      
      <p className="text-gray-700">{fb.overallComment}</p>
      
      <div className="grid gap-3">
        {[
          { label: "발음", data: fb.pronunciation },
          { label: "억양", data: fb.intonation },
          { label: "유창성", data: fb.fluency }
        ].map(({ label, data }) => (
          <div key={label} className="bg-orange-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-orange-800">{label}</span>
              <span className="font-bold text-orange-600">{data.score}/6</span>
            </div>
            <p className="text-sm text-gray-600">{data.comment}</p>
          </div>
        ))}
      </div>
      
      {fb.corrections && fb.corrections.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-3">
          <h4 className="font-medium text-yellow-800 mb-2">수정 사항</h4>
          {fb.corrections.map((c, i) => (
            <div key={i} className="text-sm mb-2 last:mb-0">
              <span className="text-red-600 line-through">{c.userSaid}</span>
              {" → "}
              <span className="text-green-600 font-medium">{c.original}</span>
              <p className="text-gray-600 text-xs mt-1">{c.tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card className="border-0 bg-orange-500 shadow-lg mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <Sparkles className="h-5 w-5" />
          인라이즈 피드백
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!feedback && (
          <div className="text-center py-4">
            <p className="text-white/90 mb-4">
              발음과 억양을 분석하여 상세한 피드백을 제공합니다.
            </p>
            <Button
              onClick={handleGetFeedback}
              disabled={isLoading || !userSpeech.trim()}
              className="bg-white text-orange-600 hover:bg-orange-50 px-6 py-3 text-base font-semibold"
              data-testid="button-get-listen-repeat-feedback"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  피드백 생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  피드백 받기
                </>
              )}
            </Button>
            {error && (
              <p className="text-white bg-red-600 rounded px-3 py-1 text-sm mt-2 inline-flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>
        )}

        {feedback && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white mb-4">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">피드백이 준비되었습니다!</span>
            </div>
            {renderFeedback(feedback)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===== 2026 TOEFL Build a Sentence Feedback Panel (Modern Glassmorphism Design) =====
interface BuildSentenceFeedbackProps {
  correctSentence: string;
  userSentence: string;
  context: string;
  correctBlanks?: string;
  userBlanks?: string;
  onFeedbackReceived?: (feedback: NewToeflBuildSentenceFeedback) => void;
}

export function NewToefl2026BuildSentenceFeedbackPanel({
  correctSentence,
  userSentence,
  context,
  correctBlanks,
  userBlanks,
  onFeedbackReceived
}: BuildSentenceFeedbackProps) {
  const { language } = useLanguage();
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<NewToeflBuildSentenceFeedback | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isLoadingFeedback) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isLoadingFeedback]);

  const isCorrect = userSentence.trim().toLowerCase() === correctSentence.trim().toLowerCase();

  const handleGetFeedback = async () => {
    if (!userSentence.trim()) {
      setFeedbackError("문장을 먼저 완성해주세요.");
      return;
    }

    setIsLoadingFeedback(true);
    setFeedbackError(null);
    // Auto-show answer when feedback is requested
    setShowAnswer(true);

    try {
      const response = await apiRequest("POST", "/api/new-toefl/feedback/build-sentence", {
        correctSentence,
        userSentence,
        context,
        language,
        correctBlanks: correctBlanks || '',
        userBlanks: userBlanks || ''
      });

      const data = await response.json();
      incrementAiFeedbackCount();
      setFeedback(data);
      onFeedbackReceived?.(data);
    } catch (err: any) {
      setFeedbackError(err.message || "피드백 생성에 실패했습니다.");
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Answer Section - Glassmorphism Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/90 via-purple-500/90 to-violet-600/90 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-300/20 rounded-full blur-3xl" />
        
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide">정답 확인</h3>
            </div>
            {!showAnswer && (
              <Button
                onClick={() => setShowAnswer(true)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                data-testid="button-show-answer"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                정답보기
              </Button>
            )}
          </div>

          {showAnswer && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* User Answer */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-white/70 uppercase tracking-wider">내 답안</span>
                  {isCorrect ? (
                    <Badge className="bg-emerald-500/80 text-white text-xs px-2 py-0.5 rounded-full">정답</Badge>
                  ) : (
                    <Badge className="bg-rose-500/80 text-white text-xs px-2 py-0.5 rounded-full">오답</Badge>
                  )}
                </div>
                <p className={`text-base font-medium ${isCorrect ? 'text-emerald-200' : 'text-rose-200'}`}>
                  {userSentence || "(답안 없음)"}
                </p>
              </div>

              {/* Correct Answer */}
              <div className="bg-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border border-emerald-300/30">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-emerald-300" />
                  <span className="text-xs font-medium text-emerald-200 uppercase tracking-wider">정답</span>
                </div>
                <p className="text-base font-semibold text-white">
                  {correctSentence}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Section - Separate Glassmorphism Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">인라이즈 피드백</h3>
                <p className="text-xs text-gray-400">문법 분석 및 학습 포인트</p>
              </div>
            </div>
          </div>

          {!feedback && (
            <div className="text-center py-6">
              <p className="text-gray-400 mb-5 text-sm">
                AI가 문장 구조와 문법을 분석하여 상세한 피드백을 제공합니다.
              </p>
              <Button
                onClick={handleGetFeedback}
                disabled={isLoadingFeedback || !userSentence.trim()}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                data-testid="button-get-build-sentence-feedback"
              >
                {isLoadingFeedback ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI 분석 중... ({elapsedSeconds}초)
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    피드백 받기
                  </>
                )}
              </Button>
              {isLoadingFeedback && (
                <p className="text-white/50 text-xs mt-2 animate-pulse text-center">
                  AI가 문법을 분석하고 있습니다. 약 10~20초 소요됩니다.
                </p>
              )}
              {feedbackError && (
                <p className="text-rose-400 text-sm mt-3 flex items-center justify-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {feedbackError}
                </p>
              )}
            </div>
          )}

          {feedback && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Feedback Header */}
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="font-medium text-emerald-400">피드백이 준비되었습니다</span>
              </div>

              {/* Grammar Explanation */}
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-5 border border-indigo-400/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/30 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-indigo-300" />
                  </div>
                  <h4 className="font-semibold text-indigo-200">문법 설명</h4>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{feedback.explanation}</p>
              </div>

              {/* Grammar Points */}
              {feedback.grammarPoints && feedback.grammarPoints.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    <h4 className="font-semibold text-amber-200 text-sm">핵심 문법 포인트</h4>
                  </div>
                  <div className="grid gap-3">
                    {feedback.grammarPoints.map((gp, i) => (
                      <div 
                        key={i} 
                        className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm rounded-xl p-4 border border-amber-400/20"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-amber-200">{i + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-amber-100 text-sm">{gp.point}</p>
                            <p className="text-gray-400 text-xs mt-1 leading-relaxed">{gp.explanation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
