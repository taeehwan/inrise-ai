import { BarChart3, Check, Home, Lightbulb, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ToeflReadingReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actualQuestions: any[] | undefined;
  answers: Record<string, string>;
  selectedSummaryAnswers: string[];
  categoryAnswers: Record<string, string[]>;
  timeRemaining: number;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function ToeflReadingReportDialog({
  open,
  onOpenChange,
  actualQuestions,
  answers,
  selectedSummaryAnswers,
  categoryAnswers,
  timeRemaining,
}: ToeflReadingReportDialogProps) {
  let correctCount = 0;
  let totalPoints = 0;

  actualQuestions?.forEach((question: any) => {
    totalPoints += question.points || 1;

    if (question.questionType === "multiple-choice") {
      if (answers[question.id] === question.correctAnswer) {
        correctCount += question.points || 1;
      }
    } else if (question.questionType === "summary") {
      let correctAnswers: string[];
      if (typeof question.correctAnswer === "string") {
        correctAnswers = question.correctAnswer.split(",");
      } else if (Array.isArray(question.correctAnswer)) {
        correctAnswers = question.correctAnswer;
      } else {
        correctAnswers = [];
      }
      const userCorrectCount = selectedSummaryAnswers.filter((ans) =>
        correctAnswers.includes(ans),
      ).length;
      correctCount += Math.min(userCorrectCount, 3);
    } else if (question.questionType === "category") {
      const correctCategories = question.correctAnswer;
      let categoryScore = 0;
      Object.entries(correctCategories).forEach(([category, correctItems]: [string, any]) => {
        const userItems = categoryAnswers[category] || [];
        const correctItemsArray = Array.isArray(correctItems) ? correctItems : [];
        const matches = userItems.filter((item) => correctItemsArray.includes(item)).length;
        categoryScore += matches;
      });
      correctCount += Math.min(categoryScore, 5);
    }
  });

  const overallScore = totalPoints > 0 ? Math.round((correctCount / totalPoints) * 100) : 0;
  const timeUsed = 3600 - timeRemaining;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between">
            <DialogTitle
              className="text-2xl font-bold flex items-center"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              <BarChart3 className="h-6 w-6 mr-2" />
              TOEFL Reading Test Report
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-purple-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6">
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <h3 className="text-3xl font-bold text-purple-700">{overallScore}%</h3>
                    <p className="text-purple-600 font-medium">Overall Score</p>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-green-600">
                      {correctCount}/{totalPoints}
                    </h3>
                    <p className="text-green-600 font-medium">Points Earned</p>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-blue-600">
                      {actualQuestions?.length || 0}
                    </h3>
                    <p className="text-blue-600 font-medium">Total Questions</p>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-orange-600">{formatTime(timeUsed)}</h3>
                    <p className="text-orange-600 font-medium">Time Used</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-lg text-gray-800">Question-by-Question Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {actualQuestions?.map((question: any, index: number) => {
                    let userAnswer = "";
                    let isCorrect = false;
                    let correctAnswer = "";
                    let pointsEarned = 0;

                    if (question.questionType === "multiple-choice") {
                      userAnswer = answers[question.id] || "No answer selected";
                      correctAnswer = question.correctAnswer;
                      isCorrect = userAnswer === correctAnswer;
                      pointsEarned = isCorrect ? (question.points || 1) : 0;
                    } else if (question.questionType === "summary") {
                      userAnswer = selectedSummaryAnswers.join(", ") || "No answers selected";
                      let correctAnswers: string[];
                      if (typeof question.correctAnswer === "string") {
                        correctAnswers = question.correctAnswer.split(",");
                      } else if (Array.isArray(question.correctAnswer)) {
                        correctAnswers = question.correctAnswer;
                      } else {
                        correctAnswers = [];
                      }
                      correctAnswer = correctAnswers.join(", ");
                      const userCorrectCount = selectedSummaryAnswers.filter((ans) =>
                        correctAnswers.includes(ans),
                      ).length;
                      pointsEarned = Math.min(userCorrectCount, 3);
                      isCorrect = pointsEarned >= 2;
                    } else if (question.questionType === "category") {
                      userAnswer =
                        Object.entries(categoryAnswers)
                          .map(([cat, items]) => `${cat}: [${(items || []).join(", ")}]`)
                          .join("; ") || "No categorization provided";

                      const correctCategories = question.correctAnswer;
                      correctAnswer = Object.entries(correctCategories)
                        .map(([cat, items]: [string, any]) => `${cat}: [${Array.isArray(items) ? items.join(", ") : ""}]`)
                        .join("; ");

                      let categoryScore = 0;
                      Object.entries(correctCategories).forEach(
                        ([category, correctItems]: [string, any]) => {
                          const userItems = categoryAnswers[category] || [];
                          const correctItemsArray = Array.isArray(correctItems) ? correctItems : [];
                          const matches = userItems.filter((item) =>
                            correctItemsArray.includes(item),
                          ).length;
                          categoryScore += matches;
                        },
                      );
                      pointsEarned = Math.min(categoryScore, 5);
                      isCorrect = pointsEarned >= 3;
                    }

                    return (
                      <div key={question.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <Badge
                              variant={isCorrect ? "default" : "destructive"}
                              className={
                                isCorrect
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {question.questionType}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {pointsEarned}/{question.points || 1} points
                            </Badge>
                          </div>
                          <div
                            className={`flex items-center space-x-2 ${
                              isCorrect ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                            <span className="font-medium">{isCorrect ? "Correct" : "Incorrect"}</span>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded">
                          <p className="font-medium text-gray-800 mb-2">Question:</p>
                          <p className="text-gray-700 text-sm">{question.questionText}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="font-medium text-blue-800 mb-1">Your Answer:</p>
                            <p className="text-blue-700 text-sm">{userAnswer}</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded">
                            <p className="font-medium text-green-800 mb-1">Correct Answer:</p>
                            <p className="text-green-700 text-sm">{correctAnswer}</p>
                          </div>
                        </div>

                        {question.explanation && (
                          <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                            <p className="font-medium text-yellow-800 mb-1">Explanation:</p>
                            <p className="text-yellow-700 text-sm">{question.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader className="bg-orange-50 border-b border-orange-200">
                <CardTitle className="text-lg text-orange-800 flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  AI Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Strengths</h4>
                    <ul className="text-blue-700 space-y-1 text-sm">
                      <li>• Strong performance on vocabulary questions</li>
                      <li>• Good understanding of main ideas</li>
                      <li>• Effective time management</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold text-yellow-800 mb-2">Areas for Improvement</h4>
                    <ul className="text-yellow-700 space-y-1 text-sm">
                      <li>• Practice more detail-oriented questions</li>
                      <li>• Focus on inference and implication questions</li>
                      <li>• Review summary question strategies</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Study Recommendations</h4>
                    <ul className="text-green-700 space-y-1 text-sm">
                      <li>• Take more practice reading tests</li>
                      <li>• Focus on academic vocabulary building</li>
                      <li>• Practice with longer passages</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="bg-gray-50 p-6 border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Test completed on {new Date().toLocaleDateString()}
            </div>
            <div className="space-x-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close Report
              </Button>
              <Link href="/tests">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Tests
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
