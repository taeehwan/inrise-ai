import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { 
  BookOpen, Volume2, Mic, PenTool, Trophy, ArrowLeft,
  Target, TrendingUp, Brain, CheckCircle, AlertCircle,
  Star, BarChart3, Lightbulb, BookMarked, Clock, Award
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { clearFullTestState, loadFullTestState } from "@/lib/fullTestState";

type Section = "reading" | "listening" | "speaking" | "writing";

interface SectionScore {
  score: number | null;
  maxScore: number;
  percentage: number;
  cefrLevel: string;
}

interface FullTestState {
  currentSection: string;
  sectionIndex: number;
  completedSections: Section[];
  sectionScores: Record<Section, number | null>;
  startTime: string;
  elapsedTime: number;
  totalScore?: number;
  cefrLevel?: string;
  traditionalScore?: number;
}

interface AIFeedback {
  overview: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  sectionFeedback: Record<Section, {
    summary: string;
    keyPoints: string[];
    improvementAreas: string[];
  }>;
  studyPlan: {
    shortTerm: string[];
    longTerm: string[];
  };
}

const SECTION_CONFIG = {
  reading: { 
    title: "Reading", 
    koreanTitle: "리딩",
    icon: BookOpen, 
    color: "text-emerald-400",
    bgColor: "from-emerald-600 to-green-700",
    borderColor: "border-emerald-500"
  },
  listening: { 
    title: "Listening", 
    koreanTitle: "리스닝",
    icon: Volume2, 
    color: "text-teal-400",
    bgColor: "from-teal-600 to-cyan-700",
    borderColor: "border-teal-500"
  },
  speaking: { 
    title: "Speaking", 
    koreanTitle: "스피킹",
    icon: Mic, 
    color: "text-orange-400",
    bgColor: "from-orange-600 to-amber-700",
    borderColor: "border-orange-500"
  },
  writing: { 
    title: "Writing", 
    koreanTitle: "라이팅",
    icon: PenTool, 
    color: "text-indigo-400",
    bgColor: "from-indigo-600 to-purple-700",
    borderColor: "border-indigo-500"
  }
};

const getCEFRLevel = (score: number): string => {
  if (score >= 5.5) return "C2";
  if (score >= 5.0) return "C1";
  if (score >= 4.0) return "B2";
  if (score >= 3.0) return "B1";
  if (score >= 2.0) return "A2";
  return "A1";
};

const getCEFRDescription = (level: string): string => {
  const descriptions: Record<string, string> = {
    "C2": "Mastery - 원어민 수준의 완벽한 언어 구사",
    "C1": "Advanced - 복잡한 주제도 자유롭게 이해/표현",
    "B2": "Upper-Intermediate - 전문적 주제 토론 가능",
    "B1": "Intermediate - 일상 대화 및 기본 주제 처리",
    "A2": "Elementary - 간단한 표현과 기본 문장 이해",
    "A1": "Beginner - 아주 기초적인 표현만 이해"
  };
  return descriptions[level] || "";
};

const getTraditionalScore = (cefrScore: number): number => {
  return Math.round((cefrScore / 6) * 120);
};

export default function NewTOEFLFullTestReport() {
  const [testState, setTestState] = useState<FullTestState | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  const generateAIFeedbackMutation = useMutation({
    mutationFn: async (scores: Record<Section, number | null>): Promise<AIFeedback> => {
      const response = await apiRequest('POST', '/api/new-toefl/full-test/ai-feedback', { scores });
      return response as unknown as AIFeedback;
    },
    onSuccess: (data: AIFeedback) => {
      setAiFeedback(data);
      setIsLoadingFeedback(false);
    },
    onError: () => {
      setIsLoadingFeedback(false);
      const defaultScores: Record<Section, number | null> = { reading: null, listening: null, speaking: null, writing: null };
      setAiFeedback(generateLocalFeedback(testState?.sectionScores || defaultScores));
    }
  });

  useEffect(() => {
    const savedState = loadFullTestState();
    if (savedState) {
      const parsed = savedState as FullTestState;
      setTestState(parsed);
      
      setIsLoadingFeedback(true);
      generateAIFeedbackMutation.mutate(parsed.sectionScores);
    }
  }, []);

  const generateLocalFeedback = (scores: Record<Section, number | null>): AIFeedback => {
    const avgScore = Object.values(scores).filter(s => s !== null).reduce((a, b) => a + (b || 0), 0) / 
      Object.values(scores).filter(s => s !== null).length || 0;
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    Object.entries(scores).forEach(([section, score]) => {
      if (score && score >= 4.5) {
        strengths.push(`${SECTION_CONFIG[section as Section].koreanTitle} 영역에서 우수한 성적`);
      } else if (score && score < 3.5) {
        weaknesses.push(`${SECTION_CONFIG[section as Section].koreanTitle} 영역 추가 학습 필요`);
      }
    });

    return {
      overview: avgScore >= 4.5 
        ? "전반적으로 뛰어난 영어 실력을 보여주셨습니다. 고급 수준의 언어 능력을 갖추고 있습니다."
        : avgScore >= 3.5
        ? "중상위 수준의 영어 실력입니다. 약간의 보완으로 더 높은 점수를 기대할 수 있습니다."
        : "기초부터 차근차근 학습하시면 빠른 향상이 가능합니다. 꾸준한 연습이 중요합니다.",
      strengths: strengths.length > 0 ? strengths : ["전체적으로 고른 실력 분포"],
      weaknesses: weaknesses.length > 0 ? weaknesses : ["특별히 취약한 영역 없음"],
      recommendations: [
        "매일 30분 이상 영어 콘텐츠 노출",
        "취약 섹션 집중 연습",
        "실전 모의고사 정기적 응시",
        "오답 노트 작성 및 복습"
      ],
      sectionFeedback: {
        reading: {
          summary: scores.reading && scores.reading >= 4 
            ? "독해력이 우수합니다. 복잡한 학술 지문도 잘 이해합니다."
            : "지문 분석 능력 향상이 필요합니다.",
          keyPoints: ["주제 파악 능력", "세부 정보 이해", "추론 능력"],
          improvementAreas: ["어휘력 확장", "속독 연습", "논리 구조 파악"]
        },
        listening: {
          summary: scores.listening && scores.listening >= 4
            ? "청취 이해력이 뛰어납니다. 다양한 억양도 잘 구분합니다."
            : "듣기 집중력과 이해력 향상이 필요합니다.",
          keyPoints: ["주요 내용 파악", "세부 사항 기억", "화자 의도 파악"],
          improvementAreas: ["다양한 억양 노출", "노트테이킹 연습", "배경 지식 확장"]
        },
        speaking: {
          summary: scores.speaking && scores.speaking >= 4
            ? "유창하고 자연스러운 발화가 가능합니다."
            : "발음과 유창성 개선이 필요합니다.",
          keyPoints: ["발음 정확도", "유창성", "내용 구성"],
          improvementAreas: ["쉐도잉 연습", "녹음 후 자가 분석", "다양한 주제 연습"]
        },
        writing: {
          summary: scores.writing && scores.writing >= 4
            ? "논리적이고 체계적인 글쓰기가 가능합니다."
            : "글의 구조와 논리 전개 능력 향상이 필요합니다.",
          keyPoints: ["논리적 구성", "문법 정확성", "어휘 다양성"],
          improvementAreas: ["에세이 구조 연습", "문법 복습", "다독을 통한 표현 습득"]
        }
      },
      studyPlan: {
        shortTerm: [
          "매일 Reading 1지문 + Listening 1세트 풀기",
          "하루 Speaking 2문제 녹음 연습",
          "주 3회 Writing 에세이 작성"
        ],
        longTerm: [
          "TOEFL 공식 교재 2회 이상 반복",
          "영어 뉴스/팟캐스트 청취 습관화",
          "영작 첨삭 서비스 활용",
          "월 1회 실전 모의고사 응시"
        ]
      }
    };
  };

  if (!testState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#064e3b] flex items-center justify-center">
        <Card className="max-w-md border-2 border-white/20 bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">리포트를 불러올 수 없습니다</h2>
            <p className="text-gray-400 mb-4">실전 시험을 먼저 완료해주세요.</p>
            <Link href="/new-toefl">
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
                시험 선택으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scores = testState.sectionScores;
  
  // Use stored derived values if available, otherwise calculate
  const totalScore = testState.totalScore ?? (() => {
    const validScores = Object.values(scores).filter(s => s !== null) as number[];
    return validScores.length > 0 
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length 
      : 0;
  })();
  const cefrLevel = testState.cefrLevel ?? getCEFRLevel(totalScore);
  const traditionalScore = testState.traditionalScore ?? getTraditionalScore(totalScore);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#064e3b]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href="/new-toefl">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  뒤로
                </Button>
              </Link>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                <Trophy className="h-3 w-3 mr-1" />
                상세 리포트
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>총 소요시간: {formatTime(testState.elapsedTime)}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full px-4 sm:px-8 lg:px-12 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-900/40 to-orange-900/40 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 mx-auto mb-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Overall Score</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-6xl font-bold text-white">{totalScore.toFixed(1)}</div>
              <div className="text-yellow-300 text-sm">1-6 Scale (CEFR)</div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                <div>
                  <div className="text-3xl font-bold text-blue-300">{cefrLevel}</div>
                  <div className="text-gray-400 text-sm">CEFR Level</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-300">{traditionalScore}</div>
                  <div className="text-gray-400 text-sm">Traditional (120)</div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-3 text-sm text-gray-300">
                {getCEFRDescription(cefrLevel)}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-2 border-white/20 bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                섹션별 성적
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.entries(SECTION_CONFIG) as [Section, typeof SECTION_CONFIG.reading][]).map(([key, config]) => {
                const score = scores[key];
                const percentage = score ? (score / 6) * 100 : 0;
                const Icon = config.icon;
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.bgColor} flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-white font-medium">{config.title}</span>
                        <span className="text-gray-400 text-sm">({config.koreanTitle})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`bg-gradient-to-r ${config.bgColor} text-white border-0`}>
                          {getCEFRLevel(score || 0)}
                        </Badge>
                        <span className="text-2xl font-bold text-white w-12 text-right">
                          {score !== null ? score.toFixed(1) : "-"}
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-3" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="feedback" className="space-y-4">
          <TabsList className="bg-white/10 border border-white/20">
            <TabsTrigger value="feedback" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300">
              <Brain className="h-4 w-4 mr-2" />
              AI 분석
            </TabsTrigger>
            <TabsTrigger value="sections" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300">
              <BookOpen className="h-4 w-4 mr-2" />
              섹션별 피드백
            </TabsTrigger>
            <TabsTrigger value="study" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-300">
              <BookMarked className="h-4 w-4 mr-2" />
              학습 플랜
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feedback">
            {isLoadingFeedback ? (
              <Card className="border-2 border-white/20 bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-400">AI가 분석 중입니다...</p>
                </CardContent>
              </Card>
            ) : aiFeedback ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-2 border-white/20 bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-400" />
                      종합 평가
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 leading-relaxed">{aiFeedback.overview}</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-900/40 to-green-900/40">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Star className="h-5 w-5 text-emerald-400" />
                      강점
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {aiFeedback.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-300">
                          <CheckCircle className="h-4 w-4 text-emerald-400 mt-1 flex-shrink-0" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-900/40 to-red-900/40">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-400" />
                      개선 필요 영역
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {aiFeedback.weaknesses.map((weakness, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-300">
                          <TrendingUp className="h-4 w-4 text-orange-400 mt-1 flex-shrink-0" />
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-900/40 to-indigo-900/40">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-blue-400" />
                      추천 학습 방법
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {aiFeedback.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-300">
                          <Award className="h-4 w-4 text-blue-400 mt-1 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="sections">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {aiFeedback && (Object.entries(SECTION_CONFIG) as [Section, typeof SECTION_CONFIG.reading][]).map(([key, config]) => {
                const feedback = aiFeedback.sectionFeedback[key];
                const Icon = config.icon;
                
                return (
                  <Card key={key} className={`border-2 ${config.borderColor}/30 bg-gradient-to-br ${config.bgColor.replace('from-', 'from-').replace('to-', 'to-')}/20`}>
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {config.title} ({config.koreanTitle})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-300">{feedback.summary}</p>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">핵심 포인트</h4>
                        <div className="flex flex-wrap gap-2">
                          {feedback.keyPoints.map((point, idx) => (
                            <Badge key={idx} variant="outline" className="border-white/30 text-gray-300">
                              {point}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">개선 영역</h4>
                        <ul className="space-y-1">
                          {feedback.improvementAreas.map((area, idx) => (
                            <li key={idx} className="text-sm text-gray-400 flex items-center gap-2">
                              <TrendingUp className="h-3 w-3" />
                              {area}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="study">
            {aiFeedback && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-900/40 to-blue-900/40">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-cyan-400" />
                      단기 학습 목표 (1-2주)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {aiFeedback.studyPlan.shortTerm.map((plan, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-300">
                          <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                            {idx + 1}
                          </div>
                          <span>{plan}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-900/40 to-pink-900/40">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-400" />
                      장기 학습 목표 (1-3개월)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {aiFeedback.studyPlan.longTerm.map((plan, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-300">
                          <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                            {idx + 1}
                          </div>
                          <span>{plan}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-center gap-4 pt-6">
          <Link href="/new-toefl/full-test">
            <Button
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-6 text-lg"
              onClick={clearFullTestState}
            >
              다시 시험 보기
            </Button>
          </Link>
          <Link href="/new-toefl">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg">
              메인으로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
