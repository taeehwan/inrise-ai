import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, Target, BookOpen, Star, Crown, Zap } from "lucide-react";
import type { StudyPlan } from "@shared/schema";

export default function StudyPlans() {
  const { data: plans = [] } = useQuery<StudyPlan[]>({
    queryKey: ["/api/study-plans"],
  });

  const toeflPlans = plans.filter(plan => plan.examType === "toefl");
  const grePlans = plans.filter(plan => plan.examType === "gre");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-20">
        <Badge className="mb-6 bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 px-6 py-2 text-sm font-medium">
          🎯 맞춤형 학습 플랜
        </Badge>
        <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          목표 점수를 위한 <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">완벽한 로드맵</span>
        </h2>
        <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
          개인별 맞춤형 학습 계획으로 
          <span className="font-semibold text-orange-600">효율적이고 체계적인</span> 
          시험 준비를 시작하세요
        </p>
      </div>
      
      {/* TOEFL Plans */}
      <div className="mb-20">
        <div className="flex items-center justify-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-xl">
            <Target className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-4xl font-bold text-gray-900">TOEFL Study Plans</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="relative border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-50"></div>
            <div className="absolute top-6 right-6">
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg">
                <Star className="h-4 w-4 mr-1" />
                STARTER
              </Badge>
            </div>
            <CardHeader className="relative z-10 p-8">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">TOEFL Starter Plan</CardTitle>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-bold text-blue-600">$49</span>
                <span className="text-lg text-gray-500">일회성</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-blue-500" />
                  목표: 80점
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  8주 과정
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  15개 테스트
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-8 pt-0">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">일일 맞춤형 학습 스케줄</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">실시간 진도 추적</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">개인별 피드백 제공</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">기초 전략 가이드</span>
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 text-lg font-semibold">
                플랜 선택하기
              </Button>
            </CardContent>
          </Card>

          <Card className="relative border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group transform hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-red-50 opacity-60"></div>
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 px-6 py-2 shadow-xl">
                <Crown className="h-4 w-4 mr-1" />
                MOST POPULAR
              </Badge>
            </div>
            <div className="absolute top-6 right-6">
              <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 shadow-lg">
                <Zap className="h-4 w-4 mr-1" />
                ADVANCED
              </Badge>
            </div>
            <CardHeader className="relative z-10 p-8 pt-12">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">TOEFL Advanced Plan</CardTitle>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-bold text-orange-600">$89</span>
                <span className="text-lg text-gray-500">일회성</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-orange-500" />
                  목표: 100점
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-orange-500" />
                  12주 과정
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4 text-orange-500" />
                  25개 테스트
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-8 pt-0">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">고급 학습 전략 제공</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">전체 실전 모의고사</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">전문가 1:1 피드백</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">우선 지원 서비스</span>
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 text-lg font-semibold">
                플랜 선택하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* GRE Plans */}
      <div>
        <div className="flex items-center justify-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-4 shadow-xl">
            <Target className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-4xl font-bold text-gray-900">GRE Study Plans</h3>
        </div>
        
        <div className="flex justify-center">
          <Card className="relative border-0 bg-white shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden group max-w-md">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50"></div>
            <div className="absolute top-6 right-6">
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                <Star className="h-4 w-4 mr-1" />
                STANDARD
              </Badge>
            </div>
            <CardHeader className="relative z-10 p-8">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">GRE Standard Plan</CardTitle>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-bold text-green-600">$79</span>
                <span className="text-lg text-gray-500">일회성</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-green-500" />
                  목표: 320점
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-green-500" />
                  10주 과정
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4 text-green-500" />
                  20개 테스트
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-8 pt-0">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">적응형 학습 시스템</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">성과 분석 리포트</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">전략 가이드북</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-700">24시간 학습 지원</span>
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3 text-lg font-semibold">
                플랜 선택하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}