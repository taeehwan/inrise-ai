import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calculator, FileText, ArrowLeft, Play, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function GreSelection() {
  const [, navigate] = useLocation();

  const { data: verbalTests = [], isLoading: verbalLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/verbal/tests'],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: quantTests = [], isLoading: quantLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/quantitative/tests'],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: writingTopics = [], isLoading: writingLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/writing-topics'],
    staleTime: 0,
    refetchOnMount: true,
  });

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'border-green-400/60 text-green-300';
    if (d === 'hard') return 'border-red-400/60 text-red-300';
    return 'border-yellow-400/60 text-yellow-300';
  };
  const difficultyLabel = (d: string) => {
    if (d === 'easy') return '쉬움';
    if (d === 'hard') return '어려움';
    return '보통';
  };

  const sections = [
    {
      id: 'verbal',
      title: 'Verbal Reasoning',
      subtitle: '언어 추론 • 18분',
      icon: <BookOpen className="h-4 w-4 text-white" />,
      cardGradient: 'from-violet-600/90 to-purple-800/90',
      borderColor: 'border-violet-500/50',
      iconGradient: 'from-violet-500 to-purple-600',
      accentColor: 'text-violet-300',
      buttonColor: 'bg-violet-500 hover:bg-violet-400',
      moreButtonColor: 'border-violet-400/50 text-violet-300 hover:bg-violet-600/20',
      tests: verbalTests,
      isLoading: verbalLoading,
      startPath: (id: string) => `/gre/verbal-reasoning?testId=${id}`,
      defaultPath: '/gre/verbal-reasoning',
      listPath: '/gre/verbal/list',
      description: 'Reading Comprehension · Text Completion · Sentence Equivalence',
    },
    {
      id: 'quantitative',
      title: 'Quantitative Reasoning',
      subtitle: '수량 추론 • 35분',
      icon: <Calculator className="h-4 w-4 text-white" />,
      cardGradient: 'from-cyan-600/90 to-blue-800/90',
      borderColor: 'border-cyan-500/50',
      iconGradient: 'from-cyan-500 to-blue-600',
      accentColor: 'text-cyan-300',
      buttonColor: 'bg-cyan-500 hover:bg-cyan-400',
      moreButtonColor: 'border-cyan-400/50 text-cyan-300 hover:bg-cyan-600/20',
      tests: quantTests,
      isLoading: quantLoading,
      startPath: (id: string) => `/gre/quantitative-reasoning?testId=${id}`,
      defaultPath: '/gre/quantitative-reasoning',
      listPath: '/gre/quantitative/list',
      description: 'Quantitative Comparison · Problem Solving · Data Interpretation',
    },
    {
      id: 'writing',
      title: 'Analytical Writing',
      subtitle: '논증 분석 • 30분',
      icon: <FileText className="h-4 w-4 text-white" />,
      cardGradient: 'from-indigo-600/90 to-violet-900/90',
      borderColor: 'border-indigo-500/50',
      iconGradient: 'from-indigo-500 to-violet-700',
      accentColor: 'text-indigo-300',
      buttonColor: 'bg-indigo-500 hover:bg-indigo-400',
      moreButtonColor: 'border-indigo-400/50 text-indigo-300 hover:bg-indigo-600/20',
      tests: writingTopics,
      isLoading: writingLoading,
      startPath: (_id: string) => `/gre/analytical-writing`,
      defaultPath: '/gre/analytical-writing',
      listPath: '/gre/writing/list',
      description: 'Analyze an Issue · Analyze an Argument 에세이 작성',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1840] to-[#0f0f2e] flex flex-col">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-12">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-purple-600 h-8 text-sm">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                홈으로
              </Button>
            </Link>
            <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-0 px-3 py-0.5 text-xs">
              <Sparkles className="w-3 h-3 mr-1 inline" />
              GRE 모의고사
            </Badge>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-4 flex flex-col">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-1 leading-tight">
            GRE
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent ml-2">
              모의고사
            </span>
          </h1>
          <p className="text-xs text-gray-400">
            AI 기반 실시간 피드백 · 실제 시험 환경과 동일한 조건에서 체계적인 실력 향상
          </p>
        </div>

        {/* Three Section Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {sections.map((section) => (
            <Card
              key={section.id}
              className={`border-2 ${section.borderColor} bg-gradient-to-br ${section.cardGradient} backdrop-blur-sm shadow-xl transition-all hover:shadow-2xl hover:scale-[1.005] flex flex-col`}
            >
              {/* Card Header */}
              <CardHeader className="p-3 pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 bg-gradient-to-br ${section.iconGradient} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                      {section.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-white leading-tight">{section.title}</CardTitle>
                      <CardDescription className={`${section.accentColor} text-xs`}>{section.subtitle}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-white">{section.tests.length}</div>
                    <div className="text-[10px] text-gray-300">테스트</div>
                  </div>
                </div>
                <p className="text-white/60 text-[10px] mt-1.5 leading-relaxed">{section.description}</p>
              </CardHeader>

              <CardContent className="p-3 pt-1 flex-1 flex flex-col gap-2">
                {section.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className={`h-5 w-5 animate-spin ${section.accentColor}`} />
                  </div>
                ) : section.tests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <p className="text-gray-300 text-xs">등록된 테스트가 없습니다</p>
                    <Link href={section.defaultPath}>
                      <Button size="sm" className={`${section.buttonColor} text-white text-xs h-7 px-3`}>
                        <Play className="h-3 w-3 mr-1" />
                        기본 시작
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Preview: first 3 tests as compact rows */}
                    <div className="space-y-1.5">
                      {section.tests.slice(0, 3).map((test, idx) => (
                        <button
                          key={test.id}
                          onClick={() => navigate(section.startPath(test.id?.toString()))}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/20 hover:bg-black/35 border border-white/10 hover:border-white/25 transition-all text-left group"
                        >
                          <span className="text-[10px] text-gray-400 w-4 flex-shrink-0 font-mono">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-xs text-white/90 font-medium flex-1 truncate group-hover:text-white">
                            {test.title || test.topic || `테스트 #${test.id}`}
                          </span>
                          {test.difficulty && (
                            <span className={`text-[9px] px-1 py-0 rounded border flex-shrink-0 ${difficultyColor(test.difficulty)}`}>
                              {difficultyLabel(test.difficulty)}
                            </span>
                          )}
                          <ChevronRight className="h-3 w-3 text-white/30 group-hover:text-white/60 flex-shrink-0" />
                        </button>
                      ))}
                    </div>

                    {/* "더 보기" link to full list page */}
                    {section.tests.length > 0 && (
                      <Link href={section.listPath}>
                        <button className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border ${section.moreButtonColor} text-xs transition-all`}>
                          전체 {section.tests.length}개 보기
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                    )}

                    {/* Quick start button */}
                    <Button
                      className={`w-full ${section.buttonColor} text-white font-semibold text-sm h-9 gap-1.5 mt-auto`}
                      onClick={() => navigate(section.defaultPath)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      바로 시작
                      <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
