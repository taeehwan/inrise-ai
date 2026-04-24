import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Trophy,
  TrendingUp,
  Target,
  Clock,
  BarChart3,
  BookOpen,
  Volume2,
  Mic,
  Edit3,
  ArrowLeft,
  Download,
  Share2
} from "lucide-react";
import type { TestSetAttempt, TestSet } from "@shared/schema";

export default function FullTestResults() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const attemptId = params.id;

  const { data: attempt } = useQuery<TestSetAttempt>({
    queryKey: ["/api/full-test-attempts", attemptId],
    enabled: !!attemptId
  });

  const { data: testSet } = useQuery<TestSet>({
    queryKey: ["/api/test-sets", attempt?.testSetId],
    enabled: !!attempt?.testSetId
  });

  const getSectionIcon = (section: string) => {
    switch (section) {
      case "reading": return <BookOpen className="h-5 w-5" />;
      case "listening": return <Volume2 className="h-5 w-5" />;
      case "speaking": return <Mic className="h-5 w-5" />;
      case "writing": return <Edit3 className="h-5 w-5" />;
      default: return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getSectionName = (section: string): string => {
    const names = {
      reading: "리딩",
      listening: "리스닝", 
      speaking: "스피킹",
      writing: "라이팅",
      verbal: "언어추론",
      quantitative: "수리추론",
      analytical: "분석적 글쓰기"
    };
    return names[section as keyof typeof names] || section;
  };

  const calculatePercentile = (score: number): number => {
    // Simple percentile calculation - would be more sophisticated in real app
    if (score >= 110) return 95;
    if (score >= 100) return 80;
    if (score >= 90) return 60;
    if (score >= 80) return 40;
    return 20;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 100) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLevel = (score: number): string => {
    if (score >= 100) return "우수";
    if (score >= 80) return "양호"; 
    if (score >= 60) return "보통";
    return "개선 필요";
  };

  if (!attempt || !testSet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalScore = attempt.totalScore || 0;
  const sectionScores = attempt.sectionScores as Record<string, number> || {};
  const percentile = calculatePercentile(totalScore);
  const testDuration = Math.round((new Date(attempt.completedAt!).getTime() - new Date(attempt.startedAt).getTime()) / (1000 * 60));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">테스트 결과</h1>
              <p className="text-gray-600 mt-1">{testSet.title}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                결과 다운로드
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                공유하기
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                홈으로
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Overall Score */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Trophy className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-bold">총점</CardTitle>
            <CardDescription>전체 시험 결과</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div>
                <div className={`text-6xl font-bold ${getScoreColor(totalScore)} mb-2`}>
                  {totalScore}
                </div>
                <div className="text-lg text-gray-600">/ 120점</div>
              </div>
              
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>상위 {100 - percentile}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span>{getScoreLevel(totalScore)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span>{testDuration}분 소요</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">전체 성취도</span>
                  <span className="font-medium">{Math.round((totalScore / 120) * 100)}%</span>
                </div>
                <Progress value={(totalScore / 120) * 100} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Scores */}
        <Card>
          <CardHeader>
            <CardTitle>섹션별 점수</CardTitle>
            <CardDescription>
              각 섹션의 상세 점수와 분석 결과입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(sectionScores).map(([section, score]) => (
                <div key={section} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getSectionIcon(section)}
                      <span className="font-medium text-gray-900">
                        {getSectionName(section)}
                      </span>
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {score}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">성취도</span>
                      <span className="font-medium">{Math.round((score / 30) * 100)}%</span>
                    </div>
                    <Progress value={(score / 30) * 100} className="h-2" />
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">수준</span>
                      <Badge variant="outline" className={getScoreColor(score)}>
                        {getScoreLevel(score)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">강점 영역</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(sectionScores)
                .filter(([, score]) => score >= 25)
                .map(([section]) => (
                  <div key={section} className="flex items-center gap-2 mb-2">
                    {getSectionIcon(section)}
                    <span className="text-sm font-medium text-green-700">
                      {getSectionName(section)}
                    </span>
                  </div>
                ))}
              {Object.entries(sectionScores).filter(([, score]) => score >= 25).length === 0 && (
                <p className="text-sm text-gray-500">모든 영역에서 개선이 필요합니다.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">개선 필요</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(sectionScores)
                .filter(([, score]) => score < 20)
                .map(([section]) => (
                  <div key={section} className="flex items-center gap-2 mb-2">
                    {getSectionIcon(section)}
                    <span className="text-sm font-medium text-red-700">
                      {getSectionName(section)}
                    </span>
                  </div>
                ))}
              {Object.entries(sectionScores).filter(([, score]) => score < 20).length === 0 && (
                <p className="text-sm text-gray-500">모든 영역이 양호한 수준입니다.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">다음 목표</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <div className="font-medium text-gray-900 mb-1">목표 점수</div>
                  <div className="text-gray-600">{totalScore + 10}점 이상</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900 mb-1">예상 학습 기간</div>
                  <div className="text-gray-600">4-6주</div>
                </div>
                <Button size="sm" className="w-full mt-4">
                  맞춤 학습 계획 보기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>다음 단계</CardTitle>
            <CardDescription>
              결과를 바탕으로 학습을 계속하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setLocation("/performance-analytics")}>
                성적 분석 보기
              </Button>
              <Button variant="outline" onClick={() => setLocation("/study-plan")}>
                학습 계획 수립
              </Button>
              <Button variant="outline" onClick={() => setLocation("/test-sets")}>
                다른 풀테스트 보기
              </Button>
              <Button variant="outline" onClick={() => setLocation("/tests")}>
                섹션별 연습하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}