import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Target, 
  BookOpen, 
  Lightbulb,
  RefreshCw,
  ArrowLeft,
  Brain,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface LearningFeedback {
  overallAnalysis: string;
  weakPoints: {
    area: string;
    description: string;
    frequency: number;
    examples: string[];
  }[];
  strongPoints: {
    area: string;
    description: string;
  }[];
  recommendations: {
    priority: "high" | "medium" | "low";
    title: string;
    description: string;
    actionItems: string[];
  }[];
  studyPlan: {
    week: number;
    focus: string;
    goals: string[];
  }[];
}

export default function ResultsAnalysis() {
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("weakPoints");

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery<any[]>({
    queryKey: ["/api/user/test-attempts"],
  });

  const { data: learningFeedback, isLoading: feedbackLoading, refetch: refetchFeedback } = useQuery<LearningFeedback>({
    queryKey: ["/api/student/learning-feedback"],
    enabled: attempts.length > 0,
  });

  const generateFeedbackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/student/generate-learning-feedback");
      return res.json();
    },
    onSuccess: () => {
      refetchFeedback();
    }
  });

  const completedAttempts = attempts.filter((a: any) => a.status === "completed");
  const totalTests = completedAttempts.length;
  const avgScore = totalTests > 0 
    ? Math.round(completedAttempts.reduce((sum: number, a: any) => sum + (a.totalScore || 0), 0) / totalTests)
    : 0;

  const examTypeStats: Record<string, { count: number; avgScore: number; correct: number; total: number }> = {};
  completedAttempts.forEach((attempt: any) => {
    const type = attempt.examType || "unknown";
    if (!examTypeStats[type]) {
      examTypeStats[type] = { count: 0, avgScore: 0, correct: 0, total: 0 };
    }
    examTypeStats[type].count++;
    examTypeStats[type].avgScore += attempt.totalScore || 0;
    examTypeStats[type].correct += attempt.correctAnswers || 0;
    examTypeStats[type].total += attempt.totalQuestions || 0;
  });

  Object.keys(examTypeStats).forEach(type => {
    if (examTypeStats[type].count > 0) {
      examTypeStats[type].avgScore = Math.round(examTypeStats[type].avgScore / examTypeStats[type].count);
    }
  });

  const sectionStats: Record<string, { count: number; correct: number; total: number }> = {};
  completedAttempts.forEach((attempt: any) => {
    const section = attempt.section || "general";
    if (!sectionStats[section]) {
      sectionStats[section] = { count: 0, correct: 0, total: 0 };
    }
    sectionStats[section].count++;
    sectionStats[section].correct += attempt.correctAnswers || 0;
    sectionStats[section].total += attempt.totalQuestions || 0;
  });

  if (attemptsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d15] to-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">성적 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d0d15] to-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                대시보드
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="h-7 w-7 text-cyan-400" />
                성적 분석
              </h1>
              <p className="text-zinc-400 text-sm mt-1">학습 현황과 맞춤형 피드백을 확인하세요</p>
            </div>
          </div>
          <Button
            onClick={() => generateFeedbackMutation.mutate()}
            disabled={generateFeedbackMutation.isPending || totalTests === 0}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            {generateFeedbackMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                AI 학습 분석
              </>
            )}
          </Button>
        </div>

        {totalTests === 0 ? (
          <Card className="bg-[#141419] border-white/5">
            <CardContent className="py-16 text-center">
              <BookOpen className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">아직 완료한 테스트가 없습니다</h3>
              <p className="text-zinc-400 mb-6">테스트를 완료하면 상세한 성적 분석을 받을 수 있습니다</p>
              <Link href="/tests">
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  테스트 시작하기
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-[#141419] border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">총 테스트</p>
                      <p className="text-3xl font-bold text-white">{totalTests}</p>
                    </div>
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                      <Target className="h-6 w-6 text-cyan-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#141419] border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">평균 점수</p>
                      <p className="text-3xl font-bold text-white">{avgScore}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#141419] border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">정답률</p>
                      <p className="text-3xl font-bold text-white">
                        {completedAttempts.reduce((sum: number, a: any) => sum + (a.correctAnswers || 0), 0) > 0
                          ? Math.round(
                              (completedAttempts.reduce((sum: number, a: any) => sum + (a.correctAnswers || 0), 0) /
                                completedAttempts.reduce((sum: number, a: any) => sum + (a.totalQuestions || 1), 0)) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#141419] border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-zinc-400 text-sm">취약 영역</p>
                      <p className="text-3xl font-bold text-orange-400">
                        {learningFeedback?.weakPoints?.length || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-orange-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="bg-[#141419] border-white/5">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-cyan-400" />
                    시험 유형별 성적
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(examTypeStats).map(([type, stats]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-300 font-medium uppercase">{type}</span>
                        <span className="text-zinc-400 text-sm">
                          {stats.count}회 응시 · 평균 {stats.avgScore}점
                        </span>
                      </div>
                      <Progress 
                        value={stats.total > 0 ? (stats.correct / stats.total) * 100 : 0} 
                        className="h-2 bg-zinc-800"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-[#141419] border-white/5">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-400" />
                    섹션별 정답률
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(sectionStats).map(([section, stats]) => {
                    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                    return (
                      <div key={section} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-300 font-medium capitalize">{section}</span>
                          <span className={`text-sm ${accuracy >= 70 ? 'text-emerald-400' : accuracy >= 50 ? 'text-orange-400' : 'text-red-400'}`}>
                            {accuracy}% ({stats.correct}/{stats.total})
                          </span>
                        </div>
                        <Progress 
                          value={accuracy} 
                          className="h-2 bg-zinc-800"
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {learningFeedback && (
              <div className="space-y-6">
                <Card className="bg-[#141419] border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-400" />
                      AI 학습 분석 결과
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-zinc-300 leading-relaxed">{learningFeedback.overallAnalysis}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-[#141419] border-white/5">
                    <CardHeader 
                      className="cursor-pointer"
                      onClick={() => setExpandedSection(expandedSection === "weakPoints" ? null : "weakPoints")}
                    >
                      <CardTitle className="text-white text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-400" />
                          취약점 분석
                          <Badge variant="outline" className="ml-2 text-orange-400 border-orange-500/30">
                            {learningFeedback.weakPoints?.length || 0}
                          </Badge>
                        </div>
                        {expandedSection === "weakPoints" ? (
                          <ChevronUp className="h-5 w-5 text-zinc-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-zinc-400" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    {expandedSection === "weakPoints" && (
                      <CardContent className="space-y-4">
                        {learningFeedback.weakPoints?.map((weak, idx) => (
                          <div key={idx} className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-orange-400">{weak.area}</h4>
                              <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                                {weak.frequency}회 오류
                              </Badge>
                            </div>
                            <p className="text-zinc-400 text-sm mb-3">{weak.description}</p>
                            {weak.examples?.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs text-zinc-500">예시:</p>
                                {weak.examples.slice(0, 2).map((ex, i) => (
                                  <p key={i} className="text-xs text-zinc-400 pl-2 border-l-2 border-orange-500/30">
                                    {ex}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    )}
                  </Card>

                  <Card className="bg-[#141419] border-white/5">
                    <CardHeader 
                      className="cursor-pointer"
                      onClick={() => setExpandedSection(expandedSection === "strongPoints" ? null : "strongPoints")}
                    >
                      <CardTitle className="text-white text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-emerald-400" />
                          강점 분석
                          <Badge variant="outline" className="ml-2 text-emerald-400 border-emerald-500/30">
                            {learningFeedback.strongPoints?.length || 0}
                          </Badge>
                        </div>
                        {expandedSection === "strongPoints" ? (
                          <ChevronUp className="h-5 w-5 text-zinc-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-zinc-400" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    {expandedSection === "strongPoints" && (
                      <CardContent className="space-y-4">
                        {learningFeedback.strongPoints?.map((strong, idx) => (
                          <div key={idx} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                            <h4 className="font-medium text-emerald-400 mb-2">{strong.area}</h4>
                            <p className="text-zinc-400 text-sm">{strong.description}</p>
                          </div>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                </div>

                <Card className="bg-[#141419] border-white/5">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-400" />
                      맞춤형 학습 추천
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {learningFeedback.recommendations?.map((rec, idx) => (
                      <div key={idx} className={`p-4 border rounded-lg ${getPriorityColor(rec.priority)}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority === "high" ? "높음" : rec.priority === "medium" ? "중간" : "낮음"}
                          </Badge>
                          <h4 className="font-medium text-white">{rec.title}</h4>
                        </div>
                        <p className="text-zinc-400 text-sm mb-3">{rec.description}</p>
                        <ul className="space-y-1">
                          {rec.actionItems?.map((item, i) => (
                            <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                              <span className="text-cyan-400 mt-1">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {learningFeedback.studyPlan && learningFeedback.studyPlan.length > 0 && (
                  <Card className="bg-[#141419] border-white/5">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-400" />
                        주간 학습 계획
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {learningFeedback.studyPlan.map((week, idx) => (
                          <div key={idx} className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                            <div className="text-blue-400 font-medium mb-2">Week {week.week}</div>
                            <div className="text-white font-medium mb-3">{week.focus}</div>
                            <ul className="space-y-1">
                              {week.goals?.map((goal, i) => (
                                <li key={i} className="text-xs text-zinc-400 flex items-start gap-1">
                                  <CheckCircle className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                                  {goal}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
