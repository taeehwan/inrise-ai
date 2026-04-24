import { ArrowLeft, CheckCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { ListeningQuestionItem, Passage, ScriptLine } from "@/components/toefl-listening-new/shared";

interface ToeflListeningQuestionsViewProps {
  currentQuestionIndex: number;
  actualQuestions: ListeningQuestionItem[];
  selectedAnswers: Record<string, number>;
  handleAnswerSelect: (questionId: string, answerIndex: number) => void;
  toggleExplanation: (questionId: string) => void;
  isGeneratingExplanation: Record<string, boolean>;
  showExplanation: Record<string, boolean>;
  explanations: Record<string, string>;
  setCurrentQuestionIndex: (index: number) => void;
  prevQuestion: () => void;
  nextQuestion: () => void;
  currentPassageIndex: number;
  passagesLength: number;
  showScript: boolean;
  testDataScript?: Passage["script"] | null;
  displayScript: Passage["script"];
}

export default function ToeflListeningQuestionsView({
  currentQuestionIndex,
  actualQuestions,
  selectedAnswers,
  handleAnswerSelect,
  toggleExplanation,
  isGeneratingExplanation,
  showExplanation,
  explanations,
  setCurrentQuestionIndex,
  prevQuestion,
  nextQuestion,
  showScript,
  testDataScript,
  displayScript,
}: ToeflListeningQuestionsViewProps) {
  const currentQuestion = actualQuestions[currentQuestionIndex];

  if (showScript) {
    return (
      <div className="grid grid-cols-10 gap-6 h-[calc(100vh-280px)]">
        <div className="col-span-6 space-y-6">
          <Card className="border-gray-300 bg-white">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-pink-600" style={{ fontFamily: "Arial, sans-serif" }}>
                      {currentQuestionIndex + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-navy-900 mb-6" style={{ fontFamily: "Arial, sans-serif" }}>
                      {currentQuestion?.questionText}
                    </h3>

                    <RadioGroup
                      value={selectedAnswers[currentQuestion?.id]?.toString()}
                      onValueChange={(value) => handleAnswerSelect(currentQuestion.id, parseInt(value))}
                      className="space-y-4"
                    >
                      {currentQuestion?.options?.map((option, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-pink-50 hover:border-pink-200 transition-colors"
                        >
                          <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-navy-800" style={{ fontFamily: "Arial, sans-serif" }}>
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    <div className="pt-4">
                      <Button
                        variant="outline"
                        onClick={() => toggleExplanation(currentQuestion.id)}
                        disabled={isGeneratingExplanation[currentQuestion.id]}
                        className="w-full flex items-center justify-center gap-2 border-pink-200 text-pink-700 hover:bg-pink-50"
                        style={{ fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}
                      >
                        {isGeneratingExplanation[currentQuestion.id] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            AI 해설 생성 중...
                          </>
                        ) : showExplanation[currentQuestion.id] ? (
                          "해설 숨기기"
                        ) : (
                          "🤖 해설 보기"
                        )}
                      </Button>
                    </div>

                    {showExplanation[currentQuestion.id] && explanations[currentQuestion.id] && (
                      <div className="mt-4 p-6 bg-pink-50 border border-pink-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-pink-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">AI</span>
                          </div>
                          <h4 className="font-bold text-pink-900 uppercase" style={{ fontFamily: "Arial, sans-serif" }}>
                            AI 해설
                          </h4>
                        </div>
                        <div className="text-navy-800 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "Arial, sans-serif" }}>
                          {explanations[currentQuestion.id]}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-300 bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-700 font-medium uppercase" style={{ fontFamily: "Arial, sans-serif" }}>
                  QUESTION NAVIGATION
                </span>
                <div className="flex space-x-2">
                  {actualQuestions.map((question, index) => (
                    <button
                      key={question.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                        index === currentQuestionIndex
                          ? "bg-pink-600 text-white"
                          : selectedAnswers[question.id] !== undefined
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-gray-100 text-gray-600 border border-gray-300"
                      }`}
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      {selectedAnswers[question.id] !== undefined && index !== currentQuestionIndex ? (
                        <CheckCircle className="w-4 h-4 mx-auto" />
                      ) : (
                        index + 1
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-4">
          <Card className="border-gray-300 bg-white">
            <CardContent className="p-6">
              <h4 className="font-bold mb-4 text-navy-900 text-lg uppercase" style={{ fontFamily: "Arial, sans-serif" }}>
                AUDIO SCRIPT
              </h4>
              <div className="audio-script-scroll border border-gray-300 rounded-lg bg-white" style={{ height: "500px", maxHeight: "500px" }}>
                <div className="p-4 space-y-3">
                  {(() => {
                    const currentScript = testDataScript || displayScript;
                    return Array.isArray(currentScript) ? (
                      currentScript.map((line: ScriptLine, index: number) => (
                        <div key={index} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all">
                          <div className="flex space-x-3">
                            <span className="font-bold text-navy-700 min-w-0 flex-shrink-0" style={{ fontFamily: "Arial, sans-serif" }}>
                              {line.speaker?.toUpperCase() || "SPEAKER"}:
                            </span>
                            <span className="text-navy-800" style={{ fontFamily: "Arial, sans-serif" }}>
                              {line.text}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="text-navy-800 whitespace-pre-wrap" style={{ fontFamily: "Arial, sans-serif" }}>
                          {currentScript}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-pink-200 bg-pink-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-pink-900 uppercase" style={{ fontFamily: "Arial, sans-serif" }}>
              QUESTION {currentQuestionIndex + 1} OF {actualQuestions.length}
            </span>
            <span className="text-sm text-pink-700 font-medium uppercase" style={{ fontFamily: "Arial, sans-serif" }}>
              {Object.keys(selectedAnswers).length} ANSWERED
            </span>
          </div>
          <Progress value={((currentQuestionIndex + 1) / actualQuestions.length) * 100} className="mt-2" />
        </CardContent>
      </Card>

      <Card className="border-gray-300 bg-white">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-pink-600" style={{ fontFamily: "Arial, sans-serif" }}>
                  {currentQuestionIndex + 1}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-navy-900 mb-6" style={{ fontFamily: "Arial, sans-serif" }}>
                  {currentQuestion?.questionText}
                </h3>

                <RadioGroup
                  value={selectedAnswers[currentQuestion?.id]?.toString()}
                  onValueChange={(value) => handleAnswerSelect(currentQuestion.id, parseInt(value))}
                  className="space-y-4"
                >
                  {currentQuestion?.options.map((option, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-pink-50 hover:border-pink-200 transition-colors"
                    >
                      <RadioGroupItem value={index.toString()} id={`option-compact-${index}`} />
                      <Label
                        htmlFor={`option-compact-${index}`}
                        className="flex-1 cursor-pointer text-navy-800"
                        style={{ fontFamily: "Arial, sans-serif" }}
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={() => toggleExplanation(currentQuestion.id)}
                    disabled={isGeneratingExplanation[currentQuestion.id]}
                    className="w-full flex items-center justify-center gap-2 border-pink-200 text-pink-700 hover:bg-pink-50"
                    style={{ fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}
                  >
                    {isGeneratingExplanation[currentQuestion.id] ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI 해설 생성 중...
                      </>
                    ) : showExplanation[currentQuestion.id] ? (
                      "해설 숨기기"
                    ) : (
                      "🤖 해설 보기"
                    )}
                  </Button>
                </div>

                {showExplanation[currentQuestion.id] && explanations[currentQuestion.id] && (
                  <div className="mt-4 p-6 bg-pink-50 border border-pink-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-pink-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">AI</span>
                      </div>
                      <h4 className="font-bold text-pink-900 uppercase" style={{ fontFamily: "Arial, sans-serif" }}>
                        AI 해설
                      </h4>
                    </div>
                    <div className="text-navy-800 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "Arial, sans-serif" }}>
                      {explanations[currentQuestion.id]}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="ghost" size="sm" onClick={prevQuestion} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex space-x-2">
                {actualQuestions.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                      index === currentQuestionIndex
                        ? "bg-pink-600 text-white"
                        : selectedAnswers[question.id] !== undefined
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : "bg-gray-100 text-gray-600 border border-gray-300"
                    }`}
                    style={{ fontFamily: "Arial, sans-serif" }}
                  >
                    {selectedAnswers[question.id] !== undefined && index !== currentQuestionIndex ? (
                      <CheckCircle2 className="w-4 h-4 mx-auto" />
                    ) : (
                      index + 1
                    )}
                  </button>
                ))}
              </div>

              <Button size="sm" onClick={nextQuestion} className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
