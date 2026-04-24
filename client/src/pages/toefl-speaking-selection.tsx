import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Users, Headphones, Clock, Target, Mic, ChevronRight } from "lucide-react";

type CategoryType = 'full' | 'independent' | 'integrated' | null;
type SpeakingTest = {
  id: string;
  type: "independent" | "integrated";
  title?: string | null;
  questionType?: string | null;
  questionText: string;
  preparationTime: number;
  responseTime: number;
  readingTime?: number | null;
};

export default function TOEFLSpeakingSelection() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>(null);

  const { data: speakingTests = [], isLoading } = useQuery<SpeakingTest[]>({
    queryKey: ["/api/speaking/tests"],
  });

  const independentTests = speakingTests.filter((test) => test.type === "independent");
  const integratedTests = speakingTests.filter((test) => 
    test.type === "integrated" && test.questionType
  ).sort((a, b) => (a.questionType || "").localeCompare(b.questionType || ""));
  const allTests = [...independentTests, ...integratedTests];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-700 via-teal-800 to-teal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-300 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-teal-100 text-lg" style={{fontFamily: 'Arial, sans-serif'}}>테스트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Step 1: Category Selection
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-700 via-teal-800 to-teal-900">
        {/* Header */}
        <div className="bg-teal-900/80 backdrop-blur-sm border-b border-teal-600/50 text-white p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-xl flex items-center justify-center">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-xl tracking-wide">TOEFL Speaking</span>
                <p className="text-teal-200 text-xs">Practice your speaking skills</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-teal-100 hover:text-white hover:bg-white/10 text-sm" asChild>
              <Link href="/tests">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Tests
              </Link>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">유형을 선택하세요</h2>
            <p className="text-teal-100 text-lg">원하는 Speaking 유형을 클릭하여 문제 목록을 확인하세요</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Full Test Card */}
            <div 
              onClick={() => setSelectedCategory('full')}
              className="group cursor-pointer"
              data-testid="card-speaking-full-test"
            >
              <div className="bg-gradient-to-br from-cyan-500/20 to-teal-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-cyan-400/30 hover:border-cyan-400 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-[1.02] h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-2">Full Test</h3>
                <p className="text-cyan-100 text-center text-sm mb-4">
                  실제 시험처럼<br />전체 문제를 순서대로 풀기
                </p>
                <div className="flex flex-col items-center gap-2 text-cyan-200 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    전체 소요: 약 17분
                  </span>
                  <span className="bg-cyan-400/30 px-3 py-1 rounded-full">
                    {allTests.length}개 문제
                  </span>
                </div>
              </div>
            </div>

            {/* Independent Speaking Card */}
            <div 
              onClick={() => setSelectedCategory('independent')}
              className="group cursor-pointer"
              data-testid="card-speaking-independent"
            >
              <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-teal-400/30 hover:border-teal-400 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/20 hover:scale-[1.02] h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-2">Independent Task</h3>
                <p className="text-teal-200 text-center text-sm mb-4">
                  주어진 주제에 대해<br />자신의 의견을 말하는 문제
                </p>
                <div className="flex flex-col items-center gap-2 text-teal-300 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    15초 준비 / 45초 답변
                  </span>
                  <span className="bg-teal-400/30 px-3 py-1 rounded-full">
                    {independentTests.length}개 문제
                  </span>
                </div>
              </div>
            </div>

            {/* Integrated Speaking Card */}
            <div 
              onClick={() => setSelectedCategory('integrated')}
              className="group cursor-pointer"
              data-testid="card-speaking-integrated"
            >
              <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-emerald-400/30 hover:border-emerald-400 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.02] h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                  <Headphones className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-2">Integrated Task</h3>
                <p className="text-emerald-200 text-center text-sm mb-4">
                  Reading + Listening 후<br />내용을 요약하여 말하는 문제
                </p>
                <div className="flex flex-col items-center gap-2 text-emerald-300 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    30초 준비 / 60초 답변
                  </span>
                  <span className="bg-emerald-400/30 px-3 py-1 rounded-full">
                    {integratedTests.length}개 문제
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Test List
  const getTestsForCategory = () => {
    switch (selectedCategory) {
      case 'full':
        return allTests;
      case 'independent':
        return independentTests;
      case 'integrated':
        return integratedTests;
      default:
        return [];
    }
  };

  const getCategoryInfo = () => {
    switch (selectedCategory) {
      case 'full':
        return {
          title: '전체 테스트',
          description: '실제 시험처럼 전체 문제를 순서대로 풀기',
          icon: Target,
          gradient: 'from-cyan-400 to-teal-400',
          colorClass: 'cyan'
        };
      case 'independent':
        return {
          title: '독립형 문제',
          description: '주제에 대한 의견 말하기 (15초 준비 / 45초 답변)',
          icon: Users,
          gradient: 'from-teal-400 to-cyan-400',
          colorClass: 'teal'
        };
      case 'integrated':
        return {
          title: '통합형 문제',
          description: 'Reading + Listening 후 요약 말하기 (30초 준비 / 60초 답변)',
          icon: Headphones,
          gradient: 'from-emerald-400 to-green-400',
          colorClass: 'emerald'
        };
      default:
        return {
          title: '',
          description: '',
          icon: Mic,
          gradient: 'from-teal-400 to-cyan-400',
          colorClass: 'teal'
        };
    }
  };

  const categoryInfo = getCategoryInfo();
  const testsToShow = getTestsForCategory();
  const IconComponent = categoryInfo.icon;

  const getTestUrl = (test: SpeakingTest) => {
    if (test.type === 'independent') {
      return `/toefl-speaking-new/${test.id}`;
    } else {
      return `/toefl-speaking-integrated/${test.id}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-700 via-teal-800 to-teal-900">
      {/* Header */}
      <div className="bg-teal-900/80 backdrop-blur-sm border-b border-teal-600/50 text-white p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-xl flex items-center justify-center">
              <Mic className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-xl tracking-wide">TOEFL Speaking</span>
              <p className="text-teal-200 text-xs">Practice your speaking skills</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-teal-100 hover:text-white hover:bg-white/10 text-sm" asChild>
            <Link href="/tests">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Tests
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Button 
          onClick={() => setSelectedCategory(null)}
          variant="ghost"
          className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
          data-testid="button-back-to-categories"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          유형 선택으로 돌아가기
        </Button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${categoryInfo.gradient}`}>
            <IconComponent className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">{categoryInfo.title}</h2>
            <p className="text-teal-100">{categoryInfo.description}</p>
          </div>
        </div>

        {/* Full Test Special Card */}
        {selectedCategory === 'full' && (
          <Link href="/toefl-speaking-full">
            <div className="bg-gradient-to-r from-cyan-500/30 to-teal-500/30 backdrop-blur-sm rounded-2xl p-6 border-2 border-cyan-400/50 hover:border-cyan-400 transition-all cursor-pointer group mb-6 hover:shadow-xl hover:shadow-cyan-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-teal-400 rounded-xl flex items-center justify-center">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">전체 테스트 시작</h3>
                    <p className="text-teal-200 text-sm">Task #1(독립형), #2, #3, #4(통합형) 순서대로 진행</p>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-cyan-500/30 text-cyan-200 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                  <ChevronRight className="h-6 w-6" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Test List */}
        <div className="space-y-4">
          {testsToShow.map((test, index) => (
            <Link key={test.id} href={getTestUrl(test)}>
              <div 
                className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group hover:shadow-xl ${
                  selectedCategory === 'full'
                    ? 'hover:shadow-cyan-500/10'
                    : selectedCategory === 'independent' 
                      ? 'hover:shadow-teal-500/10' 
                      : 'hover:shadow-emerald-500/10'
                }`}
                data-testid={`card-speaking-test-${test.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                      selectedCategory === 'full'
                        ? 'bg-cyan-500/30 text-cyan-200'
                        : selectedCategory === 'independent' 
                          ? 'bg-teal-500/30 text-teal-300' 
                          : 'bg-emerald-500/30 text-emerald-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-lg group-hover:text-white/90">
                          {test.title || `Task #${test.questionType}`}
                        </h3>
                        {selectedCategory === 'full' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            test.type === 'independent' 
                              ? 'bg-teal-500/30 text-teal-300' 
                              : 'bg-emerald-500/30 text-emerald-300'
                          }`}>
                            {test.type === 'independent' ? 'Independent' : 'Integrated'}
                          </span>
                        )}
                      </div>
                      <p className="text-teal-200 text-sm mt-1 line-clamp-2">
                        {test.questionText}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-teal-300">
                        <span>준비: {test.preparationTime}초</span>
                        <span>답변: {test.responseTime}초</span>
                        {test.readingTime && <span>읽기: {test.readingTime}초</span>}
                      </div>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedCategory === 'full'
                      ? 'bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500 group-hover:text-white'
                      : selectedCategory === 'independent'
                        ? 'bg-teal-500/20 text-teal-400 group-hover:bg-teal-500 group-hover:text-white'
                        : 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                  } transition-all`}>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {testsToShow.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic className="h-10 w-10 text-teal-400" />
            </div>
            <p className="text-teal-200 text-lg">
              {categoryInfo.title} 문제가 아직 없습니다
            </p>
            <p className="text-teal-300 text-sm mt-2">관리자에게 문의하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
