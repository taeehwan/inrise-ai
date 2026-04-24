import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Target, BookOpen, Home, BarChart3, Trophy, Star } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface PerformanceAnalyticsData {
  totalAttempts: number;
  averageScore: number;
  improvement: number;
  sectionAverages: Record<string, number>;
  recentTests: Array<{
    id?: string;
    testTitle?: string;
    score: number;
    completedAt?: string;
    examType?: string;
    section?: string;
  }>;
}

export default function PerformanceAnalytics() {
  const { user } = useAuth();
  const [selectedExamType, setSelectedExamType] = useState<"toefl" | "gre">("toefl");
  
  const { data: analytics, isLoading, error } = useQuery<PerformanceAnalyticsData>({
    queryKey: ["/api/performance-analytics", user?.id, selectedExamType],
    enabled: !!user?.id,
  });

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 85) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600 font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
            성과 분석 데이터를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  if (error || !analytics || analytics.totalAttempts === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-blue-200/20">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <BarChart3 className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    성적 분석
                  </h1>
                  <p className="text-slate-600 font-medium mt-2">AI 생성 테스트를 포함한 종합적인 성과 분석</p>
                </div>
              </div>
              <Link href="/">
                <Button className="flex items-center gap-2 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white border-0 rounded-xl shadow-lg transition-all duration-300 hover:scale-105" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                  <Home className="h-4 w-4" />
                  홈으로
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-8">
              <div className="p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-2xl mx-auto w-fit">
                <BookOpen className="h-16 w-16 text-white mx-auto" />
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
              분석할 데이터가 없습니다
            </h2>
            <p className="text-slate-600 font-medium mb-8 leading-relaxed">
              먼저 몇 개의 모의고사를 완료하여 성적 분석을 확인해보세요.
            </p>
            <Link href="/tests">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 px-8 py-3 text-lg font-semibold" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                <Target className="h-5 w-5 mr-2" />
                모의고사 시작하기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-blue-200/20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <BarChart3 className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                  성적 분석
                </h1>
                <p className="text-slate-600 font-medium mt-2">AI 생성 테스트를 포함한 종합적인 성과 분석</p>
              </div>
            </div>
            <Link href="/">
              <Button className="flex items-center gap-2 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white border-0 rounded-xl shadow-lg transition-all duration-300 hover:scale-105" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                <Home className="h-4 w-4" />
                홈으로
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Exam Type Selector */}
        <div className="mb-12">
          <Tabs value={selectedExamType} onValueChange={(value) => setSelectedExamType(value as "toefl" | "gre")}>
            <TabsList className="grid w-full max-w-sm grid-cols-2 bg-slate-100/80 rounded-2xl p-1 mx-auto">
              <TabsTrigger 
                value="toefl" 
                className="font-semibold text-base py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300" 
                style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
              >
                TOEFL
              </TabsTrigger>
              <TabsTrigger 
                value="gre" 
                className="font-semibold text-base py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300" 
                style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
              >
                GRE
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Analytics Content */}
        <div className="space-y-12">
          {/* Overall Performance Card */}
          <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                <div className="p-2 bg-white/20 rounded-xl">
                  <Trophy className="w-6 h-6" />
                </div>
                {selectedExamType.toUpperCase()} 성과 개요
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-200/20">
                  <div className={`text-4xl font-bold mb-2 ${getScoreColor(analytics.averageScore, selectedExamType === 'toefl' ? 120 : 340)}`} style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {analytics.averageScore}
                  </div>
                  <div className="text-sm font-semibold text-slate-700 mb-1">평균 점수</div>
                  <div className="text-xs text-slate-500">
                    / {selectedExamType === 'toefl' ? '120' : '340'}
                  </div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl border border-indigo-200/20">
                  <div className="text-3xl font-bold text-indigo-600 mb-2" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {analytics.totalAttempts}
                  </div>
                  <div className="text-sm font-semibold text-slate-700">총 시험 횟수</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl border border-green-200/20">
                  <div className={`text-3xl font-bold flex items-center justify-center gap-2 mb-2 ${
                    analytics.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {analytics.improvement >= 0 ? (
                      <TrendingUp className="w-6 h-6" />
                    ) : (
                      <TrendingDown className="w-6 h-6" />
                    )}
                    {analytics.improvement >= 0 ? '+' : ''}{analytics.improvement}
                  </div>
                  <div className="text-sm font-semibold text-slate-700">점수 향상</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border border-purple-200/20">
                  <div className="text-3xl font-bold text-purple-600 mb-2" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {Object.keys(analytics.sectionAverages).length}
                  </div>
                  <div className="text-sm font-semibold text-slate-700">연습한 섹션</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Performance */}
          <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-8">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                <div className="p-2 bg-white/20 rounded-xl">
                  <BarChart3 className="w-6 h-6" />
                </div>
                섹션별 성과
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {Object.entries(analytics.sectionAverages).map(([section, average]) => (
                  <div key={section} className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/20">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-lg capitalize text-slate-700" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                        {section}
                      </span>
                      <span className={`font-bold text-xl ${getScoreColor(average, selectedExamType === 'toefl' ? 30 : 170)}`} style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                        {Math.round(average)}
                        {selectedExamType === 'toefl' ? '/30' : '/170'}
                      </span>
                    </div>
                    <Progress 
                      value={(average / (selectedExamType === 'toefl' ? 30 : 170)) * 100} 
                      className="h-3 bg-slate-200"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tests */}
          <Card className="bg-white/80 backdrop-blur-lg border-0 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-8">
              <CardTitle className="flex items-center gap-3 text-2xl font-bold" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                <div className="p-2 bg-white/20 rounded-xl">
                  <Star className="w-6 h-6" />
                </div>
                최근 시험 결과
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-4">
                {analytics.recentTests.map((test, index) => (
                  <div key={test.id} className="flex items-center justify-between p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/20 hover:shadow-lg transition-all duration-300">
                    <div>
                      <div className="font-bold text-lg text-slate-800 mb-1" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                        {test.testTitle || `최근 시험 ${index + 1}`}
                      </div>
                      <div className="text-sm text-slate-600 capitalize font-medium">
                        {test.section || "section"} • {test.completedAt ? new Date(test.completedAt).toLocaleDateString() : "-"}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(test.score, selectedExamType === 'toefl' ? 30 : 170)}`} style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                      {test.score}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
