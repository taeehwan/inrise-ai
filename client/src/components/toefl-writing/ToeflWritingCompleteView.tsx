import { CheckCircle, Home, Lightbulb, Award, PenTool, MessageSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ToeflFeedbackPanel from "@/components/ToeflFeedbackPanel";
import type { WritingTest } from "./shared";

export default function ToeflWritingCompleteView({
  currentTest,
  wordCount,
  aiScore,
  essayText,
  aiModelAnswer,
  aiModelAnswerBeginner,
  aiModelAnswerIntermediate,
  aiModelAnswerAdvanced,
  aiFeedback,
  isModelAnswerPending,
  onRetry,
  onGoHome,
}: {
  currentTest: WritingTest;
  wordCount: number;
  aiScore: number | null;
  essayText: string;
  aiModelAnswer: string;
  aiModelAnswerBeginner: string;
  aiModelAnswerIntermediate: string;
  aiModelAnswerAdvanced: string;
  aiFeedback: string;
  isModelAnswerPending: boolean;
  onRetry: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-lg shadow-lg">
        <CheckCircle className="h-20 w-20 mx-auto mb-4" />
        <h2 className="text-4xl font-bold mb-2" style={{ fontFamily: "Arial, sans-serif" }}>작문 과제 완료!</h2>
        <p className="text-blue-100 text-xl" style={{ fontFamily: "Arial, sans-serif" }}>평가가 완료되었습니다</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="text-center bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-700 mb-2" style={{ fontFamily: "Arial, sans-serif" }}>{wordCount}</div>
            <div className="text-blue-600" style={{ fontFamily: "Arial, sans-serif" }}>작성 단어수</div>
          </CardContent>
        </Card>

        {aiScore && (
          <Card className="text-center bg-blue-100 border-blue-300">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-800 mb-2" style={{ fontFamily: "Arial, sans-serif" }}>{aiScore}/5</div>
              <div className="text-blue-700" style={{ fontFamily: "Arial, sans-serif" }}>예상 점수</div>
            </CardContent>
          </Card>
        )}

        <Card className="text-center bg-blue-200 border-blue-400">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-900 mb-2 capitalize" style={{ fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}>
              {currentTest.type}
            </div>
            <div className="text-blue-800" style={{ fontFamily: "Arial, sans-serif" }}>작문 유형</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="essay" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="essay" className="text-blue-800" style={{ fontFamily: "Arial, sans-serif" }}>내 답안</TabsTrigger>
              <TabsTrigger value="model" className="text-blue-800" style={{ fontFamily: "Arial, sans-serif" }}>모범답안</TabsTrigger>
              <TabsTrigger value="feedback" className="text-blue-800" style={{ fontFamily: "Arial, sans-serif" }}>피드백 & 점수</TabsTrigger>
            </TabsList>

            <TabsContent value="essay" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-900" style={{ fontFamily: "Arial, sans-serif" }}>내 답안</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-blue-900 leading-relaxed" style={{ fontFamily: "Arial, sans-serif" }}>
                      {essayText}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="model" className="mt-6">
              {currentTest.type === "discussion" && (aiModelAnswerBeginner || aiModelAnswerIntermediate || aiModelAnswerAdvanced) ? (
                <div className="space-y-4">
              {[
                    {
                      title: "초급 레벨 (100-120 단어)",
                      value: aiModelAnswerBeginner,
                      border: "border-green-200",
                      header: "bg-green-50",
                      text: "text-green-900",
                      dot: "bg-green-500",
                      badge: "bg-green-100 text-green-800",
                    },
                    {
                      title: "중급 레벨 (120-140 단어)",
                      value: aiModelAnswerIntermediate,
                      border: "border-blue-200",
                      header: "bg-blue-50",
                      text: "text-blue-900",
                      dot: "bg-blue-500",
                      badge: "bg-blue-100 text-blue-800",
                    },
                    {
                      title: "고급 레벨 (140-150 단어)",
                      value: aiModelAnswerAdvanced,
                      border: "border-purple-200",
                      header: "bg-purple-50",
                      text: "text-purple-900",
                      dot: "bg-purple-500",
                      badge: "bg-purple-100 text-purple-800",
                    },
                  ].map((item, idx) => (
                    <Card key={idx} className={item.border}>
                      <CardHeader className={item.header}>
                        <CardTitle className={`${item.text} flex items-center`} style={{ fontFamily: "Arial, sans-serif" }}>
                          <div className={`w-3 h-3 ${item.dot} rounded-full mr-3`}></div>
                          {item.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="prose max-w-none">
                          <div className="text-gray-900 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "Arial, sans-serif" }}>
                            {item.value || "생성 중..."}
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-gray-600">
                          <span className={`${item.badge} px-2 py-1 rounded`}>
                            단어수: {item.value ? item.value.split(/\s+/).length : 0}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-900" style={{ fontFamily: "Arial, sans-serif" }}>모범답안</CardTitle>
                    <CardDescription>TOEFL 작문 규격</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isModelAnswerPending ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full mr-3" />
                        <span style={{ fontFamily: "Arial, sans-serif" }}>모범답안 생성 중...</span>
                      </div>
                    ) : (
                      <div className="prose max-w-none">
                        <div className="text-blue-900 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "Arial, sans-serif" }}>
                          {aiModelAnswer || "제출 후 모범답안이 생성됩니다."}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="feedback" className="mt-6">
              <ToeflFeedbackPanel
                section="writing"
                isLoading={isModelAnswerPending}
                explanation={aiFeedback || "답안 분석 후 상세한 피드백과 점수가 제공됩니다."}
                showCloseButton={false}
                compact={true}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-center space-x-6 mt-8">
            <Button
              onClick={onRetry}
              variant="outline"
              className="px-8 py-3 text-lg border-2 border-blue-700 text-blue-800 hover:bg-blue-50"
              style={{ fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Try Another Question
            </Button>
            <Button
              onClick={onGoHome}
              className="px-8 py-3 text-lg bg-blue-700 hover:bg-blue-800"
              style={{ fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}
            >
              <Home className="h-5 w-5 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
