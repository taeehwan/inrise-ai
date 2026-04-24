import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Target, CheckCircle, XCircle, Home, RotateCcw, BarChart3 } from "lucide-react";
import type { TestAttempt, Test, Answer } from "@shared/schema";

export default function Results() {
  const { attemptId } = useParams();

  const { data: attempt, isLoading: attemptLoading, isError: attemptError } = useQuery<TestAttempt>({
    queryKey: ["/api/test-attempts", attemptId],
    enabled: !!attemptId,
  });

  const { data: test, isLoading: testLoading, isError: testError } = useQuery<Test>({
    queryKey: ["/api/tests", attempt?.testId],
    enabled: !!attempt?.testId,
  });

  const { data: answers = [] } = useQuery<Answer[]>({
    queryKey: ["/api/test-attempts", attemptId, "answers"],
    enabled: !!attemptId,
  });

  if (attemptError || testError) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-charcoal mb-2">결과를 불러오지 못했습니다</h2>
          <p className="text-cool-gray mb-4">
            네트워크 오류이거나 이 시험의 접근 권한이 없을 수 있습니다.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">대시보드로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (attemptLoading || testLoading || !attempt || !test) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-cool-gray">Loading results...</p>
        </div>
      </div>
    );
  }

  const correctAnswers = answers.filter(answer => answer.isCorrect).length;
  const totalQuestions = answers.length;
  // Guard against division-by-zero when answers haven't loaded or the attempt
  // has no associated answers (e.g. abandoned attempt).
  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const getScoreColor = (score: number, examType: string) => {
    if (examType === "toefl") {
      if (score >= 25) return "text-green-success";
      if (score >= 20) return "text-orange-warning";
      return "text-red-500";
    } else {
      if (score >= 160) return "text-green-success";
      if (score >= 150) return "text-orange-warning";
      return "text-red-500";
    }
  };

  const getScoreMessage = (score: number, examType: string) => {
    if (examType === "toefl") {
      if (score >= 25) return "Excellent! You're well-prepared for the real test.";
      if (score >= 20) return "Good progress! Focus on practice to improve further.";
      return "Keep practicing! You have room for improvement.";
    } else {
      if (score >= 160) return "Outstanding! You're ready for top graduate programs.";
      if (score >= 150) return "Good work! Continue practicing to reach your target.";
      return "Keep studying! Focus on your weak areas for improvement.";
    }
  };

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                percentage >= 80 ? "bg-green-success/10" : percentage >= 60 ? "bg-orange-warning/10" : "bg-red-50"
              }`}>
                <Trophy className={`h-8 w-8 ${
                  percentage >= 80 ? "text-green-success" : percentage >= 60 ? "text-orange-warning" : "text-red-500"
                }`} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-charcoal mb-2">Test Completed!</h1>
            <p className="text-cool-gray">Here are your results for {test.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Overall Score */}
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-lg">Your Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(attempt.totalScore || 0, test.examType)}`}>
                {attempt.totalScore || 0}
              </div>
              <div className="text-sm text-cool-gray mb-4">
                {test.examType === "toefl" ? "out of 30" : test.examType === "gre" && test.section === "analytical" ? "out of 6" : "out of 170"}
              </div>
              <Badge className={test.examType === "toefl" ? "bg-blue-primary" : "bg-green-success"}>
                {test.examType.toUpperCase()} {test.section}
              </Badge>
              <p className="text-sm text-cool-gray mt-4">
                {getScoreMessage(attempt.totalScore || 0, test.examType)}
              </p>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-cool-gray">Correct Answers</span>
                <span className="font-semibold">{correctAnswers} / {totalQuestions}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cool-gray">Accuracy</span>
                  <span className="font-semibold">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-cool-gray">Time Spent</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-cool-gray" />
                  <span className="font-semibold">{attempt.timeSpent || test.duration} min</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-cool-gray">Difficulty</span>
                <Badge variant={test.difficulty === "hard" ? "destructive" : test.difficulty === "medium" ? "default" : "secondary"}>
                  {test.difficulty}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Scores */}
        {typeof attempt.sectionScores === 'object' && attempt.sectionScores !== null && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Section Breakdown</CardTitle>
              <CardDescription>Performance by test section</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {Object.entries(attempt.sectionScores as Record<string, number>).map(([section, score]: [string, number]) => (
                  <div key={section} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium capitalize">{section}</span>
                    <span className={`text-lg font-bold ${getScoreColor(score, test.examType)}`}>
                      {score}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Review */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Question Review</CardTitle>
            <CardDescription>See how you performed on each question</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {answers.map((answer, index) => (
                <div
                  key={answer.id}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold ${
                    answer.isCorrect
                      ? "bg-green-success/10 text-green-success"
                      : "bg-red-50 text-red-500"
                  }`}
                  title={`Question ${index + 1}: ${answer.isCorrect ? "Correct" : "Incorrect"}`}
                >
                  {answer.isCorrect ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Performance Analysis */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-primary" />
              Detailed Performance Analysis
            </CardTitle>
            <CardDescription>
              Deep insights into your test performance and areas for improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Score Breakdown */}
              <div>
                <h3 className="font-semibold mb-4">Score Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Correct Answers</span>
                    <span className="font-bold text-green-success">{correctAnswers}/{totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Accuracy Rate</span>
                    <span className="font-bold">{percentage}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Time Efficiency</span>
                    <span className="font-bold">
                      {attempt.timeSpent ? Math.round((attempt.timeSpent / test.duration) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Section Score</span>
                    <span className={`font-bold ${getScoreColor(attempt.totalScore || 0, test.examType)}`}>
                      {attempt.totalScore}/{test.examType === "toefl" ? "30" : test.section === "analytical" ? "6" : "170"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Insights */}
              <div>
                <h3 className="font-semibold mb-4">Performance Insights</h3>
                <div className="space-y-3">
                  {/* Time Analysis */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-primary" />
                      <span className="font-medium text-blue-primary">Time Management</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {attempt.timeSpent && attempt.timeSpent < test.duration * 0.8 
                        ? "Good pacing! You finished with time to spare."
                        : attempt.timeSpent && attempt.timeSpent > test.duration * 0.95
                        ? "Consider working on time management for better results."
                        : "Well-managed timing throughout the test."
                      }
                    </p>
                  </div>

                  {/* Accuracy Analysis */}
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-green-success" />
                      <span className="font-medium text-green-success">Accuracy Analysis</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {percentage >= 85 
                        ? "Excellent accuracy! Your understanding is very strong."
                        : percentage >= 70
                        ? "Good accuracy. Focus on reviewing incorrect answers."
                        : "More practice needed. Review fundamentals and practice regularly."
                      }
                    </p>
                  </div>

                  {/* Recommendations */}
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-4 w-4 text-orange-warning" />
                      <span className="font-medium text-orange-warning">Recommendations</span>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {percentage < 70 && (
                        <li>• Focus on fundamental concepts and basic skills</li>
                      )}
                      {attempt.timeSpent && attempt.timeSpent > test.duration * 0.9 && (
                        <li>• Practice time management strategies</li>
                      )}
                      {correctAnswers < totalQuestions * 0.8 && (
                        <li>• Review incorrect answers and study explanations</li>
                      )}
                      <li>• Take more practice tests in this section</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Comparison */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-primary" />
              Score Comparison & Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-primary mb-2">{attempt.totalScore}</div>
                <div className="text-sm text-gray-600">Your Score</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-success mb-2">
                  {test.examType === "toefl" ? "24" : test.section === "analytical" ? "4.0" : "155"}
                </div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-warning mb-2">
                  {test.examType === "toefl" ? "26" : test.section === "analytical" ? "4.5" : "165"}
                </div>
                <div className="text-sm text-gray-600">Target Score</div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress to Target</span>
                <span>
                  {test.examType === "toefl" 
                    ? Math.round(((attempt.totalScore || 0) / 26) * 100)
                    : test.section === "analytical"
                    ? Math.round(((attempt.totalScore || 0) / 4.5) * 100)
                    : Math.round(((attempt.totalScore || 0) / 165) * 100)
                  }%
                </span>
              </div>
              <Progress 
                value={
                  test.examType === "toefl" 
                    ? Math.min(((attempt.totalScore || 0) / 26) * 100, 100)
                    : test.section === "analytical"
                    ? Math.min(((attempt.totalScore || 0) / 4.5) * 100, 100)
                    : Math.min(((attempt.totalScore || 0) / 165) * 100, 100)
                } 
                className="h-3"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          
          <Link href="/tests">
            <Button 
              className={`flex items-center gap-2 ${
                test.examType === "toefl" 
                  ? "bg-blue-primary hover:bg-blue-primary/90" 
                  : "bg-green-success hover:bg-green-success/90"
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              Take Another Test
            </Button>
          </Link>
          
          <Link href="/dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              View All Results
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
