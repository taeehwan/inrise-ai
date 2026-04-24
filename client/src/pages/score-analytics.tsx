import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BookOpen,
  Volume2,
  Mic,
  Edit3,
  BarChart3,
  Calendar,
  Clock,
  Award,
  AlertTriangle,
  ChevronRight,
  Brain,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus,
  Star
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const ScoreAnalyticsPerformanceChart = lazy(() => import("@/components/charts/ScoreAnalyticsPerformanceChart"));

interface ScoreData {
  date: string;
  totalScore: number;
  readingScore: number;
  listeningScore: number;
  speakingScore: number;
  writingScore: number;
  testType: string;
}

interface AIInsight {
  category: "strength" | "weakness" | "improvement" | "recommendation";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionItems: string[];
}

export default function ScoreAnalytics() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  const [selectedExam, setSelectedExam] = useState<"toefl" | "gre" | "all">("all");

  // Mock data for demonstration - replace with actual API calls
  const { data: scoreHistory = [] } = useQuery<ScoreData[]>({
    queryKey: ["/api/score-analytics", user?.id, selectedPeriod, selectedExam],
    enabled: !!user?.id,
    placeholderData: [
      { date: "2024-01-15", totalScore: 85, readingScore: 22, listeningScore: 20, speakingScore: 21, writingScore: 22, testType: "toefl" },
      { date: "2024-01-22", totalScore: 88, readingScore: 24, listeningScore: 21, speakingScore: 21, writingScore: 22, testType: "toefl" },
      { date: "2024-01-29", totalScore: 92, readingScore: 25, listeningScore: 23, speakingScore: 22, writingScore: 22, testType: "toefl" },
      { date: "2024-02-05", totalScore: 89, readingScore: 24, listeningScore: 22, speakingScore: 21, writingScore: 22, testType: "toefl" },
      { date: "2024-02-12", totalScore: 95, readingScore: 26, listeningScore: 24, speakingScore: 23, writingScore: 22, testType: "toefl" },
      { date: "2024-02-19", totalScore: 98, readingScore: 27, listeningScore: 25, speakingScore: 23, writingScore: 23, testType: "toefl" },
      { date: "2024-02-26", totalScore: 102, readingScore: 28, listeningScore: 26, speakingScore: 24, writingScore: 24, testType: "toefl" },
    ]
  });

  const generateAIInsightsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/score-analytics/insights", {
        userId: user?.id,
        scoreHistory,
        examType: selectedExam
      });
    },
    onSuccess: (insights) => {
      queryClient.setQueryData(["/api/score-analytics/insights", user?.id], insights);
    },
    onError: () => {
      toast({
        title: "오류",
        description: "AI 분석 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const { data: aiInsights = [] } = useQuery<AIInsight[]>({
    queryKey: ["/api/score-analytics/insights", user?.id],
    enabled: false, // Will be triggered manually
    placeholderData: [
      {
        category: "strength",
        title: "리딩 영역 지속적 향상",
        description: "최근 4번의 테스트에서 리딩 점수가 꾸준히 상승하고 있습니다. 어휘력과 독해 속도가 크게 개선되었습니다.",
        impact: "high",
        actionItems: [
          "현재 학습 방법을 유지하세요",
          "고급 어휘 학습을 통해 더욱 향상시킬 수 있습니다",
          "복잡한 학술 텍스트 연습을 추가하세요"
        ]
      },
      {
        category: "weakness",
        title: "스피킹 영역 정체",
        description: "스피킹 점수가 21-24점 사이에서 정체되어 있습니다. 발음과 유창성 개선이 필요합니다.",
        impact: "high",
        actionItems: [
          "매일 15분씩 발음 연습을 하세요",
          "실제 대화 상황을 시뮬레이션하세요",
          "녹음 후 자가 분석을 통해 약점을 파악하세요"
        ]
      },
      {
        category: "improvement",
        title: "종합 점수 17점 상승",
        description: "지난 6주간 총점이 85점에서 102점으로 20% 향상되었습니다. 목표 달성에 근접하고 있습니다.",
        impact: "high",
        actionItems: [
          "현재 학습 패턴을 유지하세요",
          "약한 영역에 추가 집중하세요",
          "실전 모의고사를 늘려보세요"
        ]
      },
      {
        category: "recommendation",
        title: "맞춤형 학습 계획",
        description: "현재 성적과 학습 패턴을 바탕으로 110점 달성을 위한 4주 집중 계획을 제안합니다.",
        impact: "medium",
        actionItems: [
          "1-2주차: 스피킹 집중 훈련",
          "3주차: 종합 모의고사 3회",
          "4주차: 약점 보완 및 최종 점검"
        ]
      }
    ]
  });

  useEffect(() => {
    if (scoreHistory.length > 0) {
      generateAIInsightsMutation.mutate();
    }
  }, [scoreHistory]);

  const currentScore = scoreHistory[scoreHistory.length - 1];
  const previousScore = scoreHistory[scoreHistory.length - 2];
  const scoreChange = currentScore && previousScore ? currentScore.totalScore - previousScore.totalScore : 0;

  const sectionData = currentScore ? [
    { name: "리딩", score: currentScore.readingScore, maxScore: 30, color: "#3B82F6" },
    { name: "리스닝", score: currentScore.listeningScore, maxScore: 30, color: "#10B981" },
    { name: "스피킹", score: currentScore.speakingScore, maxScore: 30, color: "#F59E0B" },
    { name: "라이팅", score: currentScore.writingScore, maxScore: 30, color: "#EF4444" }
  ] : [];

  const performanceData = scoreHistory.map(score => ({
    date: new Date(score.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    총점: score.totalScore,
    리딩: score.readingScore,
    리스닝: score.listeningScore,
    스피킹: score.speakingScore,
    라이팅: score.writingScore
  }));

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-400";
  };

  const getInsightIcon = (category: string) => {
    switch (category) {
      case "strength": return <Star className="h-5 w-5 text-yellow-500" />;
      case "weakness": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "improvement": return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "recommendation": return <Lightbulb className="h-5 w-5 text-blue-500" />;
      default: return <Brain className="h-5 w-5 text-purple-500" />;
    }
  };

  const getCategoryName = (category: string) => {
    const names = {
      strength: "강점",
      weakness: "약점",
      improvement: "개선",
      recommendation: "추천"
    };
    return names[category as keyof typeof names] || category;
  };

  const chartFallback = (
    <div className="h-80 flex items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
      차트 로딩 중...
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            성적 분석을 보려면 로그인이 필요합니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">성적 분석</h1>
              <p className="text-gray-600 mt-2">AI 기반 맞춤형 성적 분석 및 학습 방향 제시</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">시험 유형:</label>
                <select 
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value as any)}
                >
                  <option value="all">전체</option>
                  <option value="toefl">TOEFL</option>
                  <option value="gre">GRE</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">기간:</label>
                <select 
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as any)}
                >
                  <option value="week">최근 1주</option>
                  <option value="month">최근 1달</option>
                  <option value="quarter">최근 3달</option>
                  <option value="year">최근 1년</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">현재 점수</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {currentScore?.totalScore || 0}
              </div>
              <div className="flex items-center mt-2">
                {getChangeIcon(scoreChange)}
                <span className={`text-sm font-medium ml-1 ${getChangeColor(scoreChange)}`}>
                  {scoreChange > 0 ? '+' : ''}{scoreChange}점
                </span>
                <span className="text-sm text-gray-500 ml-2">지난 시험 대비</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">목표 달성도</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">87%</div>
              <div className="mt-2">
                <Progress value={87} className="h-2" />
              </div>
              <p className="text-sm text-gray-500 mt-2">목표: 110점</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">학습 일수</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">45일</div>
              <p className="text-sm text-gray-500 mt-2">연속 학습 12일</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">예상 달성일</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">3주</div>
              <p className="text-sm text-gray-500 mt-2">현재 속도 기준</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Performance Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>성적 추이</CardTitle>
                <CardDescription>
                  시간에 따른 점수 변화와 섹션별 성과를 확인하세요.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={chartFallback}>
                  <ScoreAnalyticsPerformanceChart performanceData={performanceData} />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          {/* Current Section Scores */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>현재 섹션별 점수</CardTitle>
                <CardDescription>
                  각 영역의 현재 점수와 목표 달성률
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sectionData.map((section) => (
                    <div key={section.name}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {section.name}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {section.score}/{section.maxScore}
                        </span>
                      </div>
                      <Progress 
                        value={(section.score / section.maxScore) * 100} 
                        className="h-2"
                        style={{ 
                          ['--progress-background' as any]: section.color 
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{Math.round((section.score / section.maxScore) * 100)}%</span>
                        <Badge variant="outline" className="text-xs">
                          {section.score >= 25 ? "우수" : section.score >= 20 ? "양호" : "보통"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  AI 분석 결과
                </CardTitle>
                <CardDescription>
                  성적 데이터를 바탕으로 한 맞춤형 분석과 학습 방향 제시
                </CardDescription>
              </div>
              <Button 
                onClick={() => generateAIInsightsMutation.mutate()}
                disabled={generateAIInsightsMutation.isPending}
                size="sm"
              >
                {generateAIInsightsMutation.isPending ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                분석 새로고침
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {aiInsights.map((insight, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.category === 'strength' ? 'border-l-green-500 bg-green-50' :
                    insight.category === 'weakness' ? 'border-l-red-500 bg-red-50' :
                    insight.category === 'improvement' ? 'border-l-blue-500 bg-blue-50' :
                    'border-l-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.category)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryName(insight.category)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">실행 계획:</p>
                        {insight.actionItems.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-start gap-2">
                            <ChevronRight className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-gray-600">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Study Plan Recommendation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              맞춤형 학습 계획
            </CardTitle>
            <CardDescription>
              현재 성적과 목표를 바탕으로 한 4주 학습 로드맵
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { week: 1, focus: "스피킹 집중", tasks: ["발음 교정", "유창성 훈련", "실전 연습"] },
                { week: 2, focus: "라이팅 강화", tasks: ["문법 점검", "논리 구조", "템플릿 활용"] },
                { week: 3, focus: "종합 모의고사", tasks: ["주 3회 풀테스트", "약점 분석", "시간 관리"] },
                { week: 4, focus: "최종 점검", tasks: ["실전 감각", "컨디션 조절", "자신감 향상"] }
              ].map((plan) => (
                <div key={plan.week} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="text-center mb-3">
                    <div className="w-8 h-8 bg-blue-primary text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-2">
                      {plan.week}
                    </div>
                    <h4 className="font-semibold text-gray-900">{plan.focus}</h4>
                  </div>
                  <ul className="space-y-1">
                    {plan.tasks.map((task, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-primary rounded-full"></div>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button>
                학습 계획 적용하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
