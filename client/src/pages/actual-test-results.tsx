import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  BookOpen,
  Headphones,
  Mic,
  Edit3,
  TrendingUp,
  Target,
  Clock,
  ChevronRight,
  Home,
  RotateCcw,
  Award,
  Calculator
} from "lucide-react";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";

interface TestSetAttempt {
  id: string;
  testSetId: string;
  userId: string;
  status: string;
  totalScore: number;
  sectionScores: Record<string, number>;
  timeSpent: number;
  startedAt: string;
  completedAt: string;
  testSet?: {
    id: string;
    title: string;
    testType: string;
  };
}

const sectionIcons: Record<string, any> = {
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
  writing: Edit3,
  analyticalWriting: Edit3,
  verbal: BookOpen,
  verbal1: BookOpen,
  verbal2: BookOpen,
  quantitative: Calculator,
  quantitative1: Calculator,
  quantitative2: Calculator,
};

const sectionColors: Record<string, string> = {
  reading: "from-purple-500 to-purple-700",
  listening: "from-pink-500 to-pink-700",
  speaking: "from-teal-500 to-teal-700",
  writing: "from-blue-500 to-blue-700",
  analyticalWriting: "from-amber-500 to-amber-700",
  verbal: "from-indigo-500 to-indigo-700",
  verbal1: "from-indigo-500 to-indigo-700",
  verbal2: "from-violet-500 to-violet-700",
  quantitative: "from-emerald-500 to-emerald-700",
  quantitative1: "from-emerald-500 to-emerald-700",
  quantitative2: "from-green-500 to-green-700",
};

const getScoreLevel = (score: number, maxScore: number): { level: string; color: string } => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return { level: "Excellent", color: "text-emerald-400" };
  if (percentage >= 75) return { level: "Good", color: "text-blue-400" };
  if (percentage >= 60) return { level: "Fair", color: "text-amber-400" };
  return { level: "Needs Improvement", color: "text-red-400" };
};

const getSectionFeedback = (section: string, score: number, isGre: boolean = false): string => {
  if (isGre) {
    const greFeedbacks: Record<string, Record<string, string>> = {
      analyticalWriting: {
        high: "논리적 사고와 에세이 구성 능력이 뛰어납니다. 복잡한 주제도 명확하게 분석할 수 있습니다.",
        medium: "기본적인 논증 능력은 있으나, 더 구체적인 예시와 논리적 연결이 필요합니다.",
        low: "에세이 구조와 논증 방법을 더 연습하세요. 명확한 주장과 근거 제시가 중요합니다.",
      },
      verbal: {
        high: "어휘력과 독해력이 뛰어납니다. 복잡한 학술 텍스트도 잘 이해합니다.",
        medium: "전반적으로 양호하나, 고급 어휘와 추론 능력을 더 키워야 합니다.",
        low: "어휘력 향상과 다양한 지문 독해 연습이 필요합니다.",
      },
      verbal1: {
        high: "어휘력과 독해력이 뛰어납니다. 복잡한 학술 텍스트도 잘 이해합니다.",
        medium: "전반적으로 양호하나, 고급 어휘와 추론 능력을 더 키워야 합니다.",
        low: "어휘력 향상과 다양한 지문 독해 연습이 필요합니다.",
      },
      verbal2: {
        high: "적응형 섹션에서도 우수한 성적을 거두었습니다. Verbal 영역에 자신감을 가지세요.",
        medium: "기본기는 갖추었으나, 더 어려운 문제에 대비한 연습이 필요합니다.",
        low: "기본 어휘와 독해 전략을 복습하고, 시간 관리에 신경 쓰세요.",
      },
      quantitative: {
        high: "수학적 추론 능력이 뛰어납니다. 복잡한 문제도 빠르게 해결할 수 있습니다.",
        medium: "기본 개념은 이해하나, 응용 문제와 데이터 분석 연습이 필요합니다.",
        low: "기초 수학 개념을 복습하고, 다양한 유형의 문제를 풀어보세요.",
      },
      quantitative1: {
        high: "수학적 추론 능력이 뛰어납니다. 복잡한 문제도 빠르게 해결할 수 있습니다.",
        medium: "기본 개념은 이해하나, 응용 문제와 데이터 분석 연습이 필요합니다.",
        low: "기초 수학 개념을 복습하고, 다양한 유형의 문제를 풀어보세요.",
      },
      quantitative2: {
        high: "적응형 섹션에서도 높은 점수를 획득했습니다. Quant 영역이 강점입니다.",
        medium: "중급 수준의 문제는 잘 해결하나, 고난도 문제 대비가 필요합니다.",
        low: "기본기를 다지고, 시간 내에 문제를 푸는 연습을 하세요.",
      },
    };
    if (section === "analyticalWriting") {
      const level = score >= 5 ? "high" : score >= 3.5 ? "medium" : "low";
      return greFeedbacks[section]?.[level] || "";
    }
    const level = score >= 160 ? "high" : score >= 145 ? "medium" : "low";
    return greFeedbacks[section]?.[level] || "";
  }
  
  const percentage = (score / 30) * 100;
  
  const feedbacks: Record<string, Record<string, string>> = {
    reading: {
      high: "지문 이해력과 세부 정보 파악 능력이 뛰어납니다. 학술 자료 독해에 자신감을 가지세요.",
      medium: "전반적으로 양호하나, 추론 문제와 어휘 문제에서 더 연습이 필요합니다.",
      low: "지문의 주제와 세부 정보 파악 연습을 더 해보세요. 시간 관리도 중요합니다.",
    },
    listening: {
      high: "강의와 대화의 핵심 내용을 정확히 이해합니다. 노트테이킹 스킬이 훌륭합니다.",
      medium: "주요 내용은 파악하나, 세부 사항이나 화자의 의도 파악에 더 집중하세요.",
      low: "다양한 영어 억양에 익숙해지고, 노트테이킹 연습을 권장합니다.",
    },
    speaking: {
      high: "발음, 유창성, 내용 구성 모두 우수합니다. 자신감 있게 답변하세요.",
      medium: "의사 전달은 되나, 더 구체적인 예시와 논리적 구성을 연습하세요.",
      low: "말하기 템플릿을 익히고, 다양한 주제로 연습해보세요.",
    },
    writing: {
      high: "논리적 구성과 문법 사용이 뛰어납니다. 학술 에세이 작성에 자신감을 가지세요.",
      medium: "기본 구조는 갖추었으나, 더 다양한 문장 구조와 어휘 사용을 연습하세요.",
      low: "에세이 구조(서론-본론-결론)를 익히고, 기본 문법을 복습하세요.",
    },
  };

  const level = percentage >= 75 ? "high" : percentage >= 50 ? "medium" : "low";
  return feedbacks[section]?.[level] || "";
};

export default function ActualTestResults() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const attemptId = params.id;

  const { data: attempt, isLoading } = useQuery<TestSetAttempt>({
    queryKey: ["/api/test-set-attempts", attemptId],
    enabled: !!attemptId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700 p-8 text-center">
          <h2 className="text-xl text-white mb-4">결과를 찾을 수 없습니다</h2>
          <Button onClick={() => setLocation("/actual-tests")} className="bg-emerald-500">
            테스트 목록으로
          </Button>
        </Card>
      </div>
    );
  }

  const totalScore = attempt.totalScore || 0;
  const rawSectionScores = attempt.sectionScores || {};
  const isGre = attempt.testSet?.testType === "gre" || Object.keys(rawSectionScores).some(s => s.includes("verbal") || s.includes("quantitative") || s === "analyticalWriting");
  
  let sectionScores: Record<string, number>;
  let maxScore: number;
  let progressValue: number;
  
  if (isGre) {
    const awScore = rawSectionScores.analyticalWriting || 0;
    const verbal1 = rawSectionScores.verbal1 || 130;
    const verbal2 = rawSectionScores.verbal2 || 130;
    const quant1 = rawSectionScores.quantitative1 || 130;
    const quant2 = rawSectionScores.quantitative2 || 130;
    const verbalScore = Math.round((verbal1 + verbal2) / 2);
    const quantScore = Math.round((quant1 + quant2) / 2);
    sectionScores = {
      analyticalWriting: awScore,
      verbal: verbalScore,
      quantitative: quantScore,
    };
    maxScore = 340;
    progressValue = ((totalScore - 260) / 80) * 100;
  } else {
    sectionScores = rawSectionScores;
    maxScore = 120;
    progressValue = (totalScore / 120) * 100;
  }
  
  const scoreLevel = getScoreLevel(totalScore, maxScore);

  const sections = Object.entries(sectionScores).map(([section, score]) => ({
    section,
    score,
    Icon: sectionIcons[section] || BookOpen,
    colorClass: sectionColors[section] || "from-gray-500 to-gray-700",
    feedback: getSectionFeedback(section, score, isGre),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <img src={logoPath} alt="iNRISE" className="h-10 cursor-pointer" />
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" className="text-slate-300 hover:text-white" data-testid="link-dashboard">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mb-4">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">테스트 완료!</h1>
          <p className="text-slate-400">
            {attempt.testSet?.title || "TOEFL Actual Test"}
          </p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <p className="text-slate-400 text-sm mb-2">Total Score</p>
              <div className="flex items-center justify-center gap-4">
                <span className="text-6xl font-bold text-white">{totalScore}</span>
                <span className="text-3xl text-slate-500">/{maxScore}</span>
              </div>
              <Badge className={`mt-4 ${scoreLevel.color} bg-slate-700/50 border-0 px-4 py-2`}>
                <Award className="h-4 w-4 mr-2" />
                {scoreLevel.level}
              </Badge>
            </div>

            <Progress 
              value={Math.max(0, Math.min(100, progressValue))} 
              className="h-4 bg-slate-700"
            />

            <div className={`grid ${isGre ? 'grid-cols-3' : 'grid-cols-4'} gap-4 mt-6 text-center`}>
              {sections.map(({ section, score }) => {
                const sectionLabels: Record<string, string> = {
                  reading: "Reading",
                  listening: "Listening", 
                  speaking: "Speaking",
                  writing: "Writing",
                  analyticalWriting: "AW",
                  verbal: "Verbal",
                  quantitative: "Quant",
                };
                const getSectionMax = (sec: string, gre: boolean) => {
                  if (!gre) return 30;
                  if (sec === "analyticalWriting") return 6;
                  return 170;
                };
                const sectionMax = getSectionMax(section, isGre);
                return (
                  <div key={section}>
                    <p className="text-slate-400 text-xs uppercase mb-1">{sectionLabels[section] || section}</p>
                    <p className="text-xl font-bold text-white">{score}<span className="text-sm text-slate-500">/{sectionMax}</span></p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white">섹션별 분석</h2>
          {sections.map(({ section, score, Icon, colorClass, feedback }) => {
            const sectionLabels: Record<string, string> = {
              reading: "Reading",
              listening: "Listening",
              speaking: "Speaking",
              writing: "Writing",
              analyticalWriting: "Analytical Writing",
              verbal: "Verbal Reasoning",
              quantitative: "Quantitative Reasoning",
              verbal1: "Verbal Section 1",
              verbal2: "Verbal Section 2",
              quantitative1: "Quantitative Section 1",
              quantitative2: "Quantitative Section 2",
            };
            const getSectionMaxScore = (sec: string, gre: boolean) => {
              if (!gre) return 30;
              if (sec === "analyticalWriting") return 6;
              return 170;
            };
            const sectionMax = getSectionMaxScore(section, isGre);
            const progressValue = isGre 
              ? (section === "analyticalWriting" ? (score / 6) * 100 : ((score - 130) / 40) * 100)
              : (score / 30) * 100;
            return (
              <Card key={section} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${colorClass}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold">{sectionLabels[section] || section}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-white">{score}</span>
                          <span className="text-slate-500">/{sectionMax}</span>
                        </div>
                      </div>
                      <Progress 
                        value={Math.max(0, Math.min(100, progressValue))} 
                        className="h-2 bg-slate-700 mb-3"
                      />
                      <p className="text-slate-400 text-sm">{feedback}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              학습 추천
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sections
              .sort((a, b) => a.score - b.score)
              .slice(0, 2)
              .map(({ section, score, Icon }) => {
                const sectionLabels: Record<string, string> = {
                  reading: "Reading",
                  listening: "Listening",
                  speaking: "Speaking",
                  writing: "Writing",
                  analyticalWriting: "Analytical Writing",
                  verbal: "Verbal",
                  quantitative: "Quantitative",
                  verbal1: "Verbal",
                  verbal2: "Verbal",
                  quantitative1: "Quantitative",
                  quantitative2: "Quantitative",
                };
                const getMaxForSection = (sec: string, gre: boolean) => {
                  if (!gre) return 30;
                  if (sec === "analyticalWriting") return 6;
                  return 170;
                };
                const sectionMax = getMaxForSection(section, isGre);
                return (
                  <div key={section} className="flex items-center gap-4 bg-slate-700/30 p-4 rounded-lg">
                    <Target className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="text-white font-medium">
                        {sectionLabels[section] || section} 집중 학습 권장
                      </p>
                      <p className="text-slate-400 text-sm">
                        현재 점수 {score}/{sectionMax} - 추가 연습으로 점수 향상이 가능합니다.
                      </p>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => setLocation("/actual-tests")}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            data-testid="button-back-to-tests"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            다른 테스트 보기
          </Button>
          <Button
            onClick={() => setLocation("/dashboard")}
            className="bg-gradient-to-r from-emerald-500 to-teal-500"
            data-testid="button-go-dashboard"
          >
            <Home className="mr-2 h-4 w-4" />
            대시보드로 가기
          </Button>
        </div>
      </main>
    </div>
  );
}
