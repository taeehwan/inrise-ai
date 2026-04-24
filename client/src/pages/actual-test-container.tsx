import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import TestDirection from "@/components/TestDirection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
const DeferredActualTestPauseDialog = lazy(() => import("@/components/tests/ActualTestPauseDialog"));
import { 
  Loader2, 
  AlertCircle, 
  BookOpen, 
  Headphones, 
  Mic, 
  Edit3,
  Clock,
  ChevronRight,
  Target,
  Calculator
} from "lucide-react";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";

interface TestSet {
  id: string;
  title: string;
  examType: "toefl" | "gre";
  testType: "toefl" | "newToefl" | "gre";
  description: string;
  totalDuration: number;
  sectionOrder: string[];
  isActive: boolean;
}

interface TestSetAttempt {
  id: string;
  testSetId: string;
  userId: string;
  status: "in_progress" | "completed" | "paused" | "abandoned";
  currentTestIndex: number;
  totalScore?: number;
  sectionScores?: Record<string, number>;
  startedAt: string;
  completedAt?: string;
}

interface SectionTest {
  id: string;
  section: string;
  title: string;
  duration: number;
  questionCount: number;
}

type TestPhase = "loading" | "direction" | "test" | "scoring" | "results";
type ActualSection =
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "analyticalWriting"
  | "verbal1"
  | "verbal2"
  | "quantitative1"
  | "quantitative2";

const DEFAULT_SECTION_ORDER: Record<string, ActualSection[]> = {
  toefl: ["reading", "listening", "speaking", "writing"],
  newToefl: ["reading", "listening", "writing", "speaking"],
  gre: ["analyticalWriting", "verbal1", "verbal2", "quantitative1", "quantitative2"],
};

const sectionDurations: Record<string, Partial<Record<ActualSection, number>>> = {
  toefl: { reading: 35, listening: 36, speaking: 16, writing: 29 },
  newToefl: { reading: 27, listening: 27, writing: 12, speaking: 8 },
  gre: { analyticalWriting: 30, verbal1: 18, verbal2: 23, quantitative1: 21, quantitative2: 26 },
};

const sectionQuestions: Record<string, Partial<Record<ActualSection, number>>> = {
  toefl: { reading: 20, listening: 28, speaking: 4, writing: 2 },
  newToefl: { reading: 40, listening: 40, writing: 3, speaking: 11 },
  gre: { analyticalWriting: 1, verbal1: 12, verbal2: 15, quantitative1: 12, quantitative2: 15 },
};

export default function ActualTestContainer() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const testSetId = params.id;

  const [phase, setPhase] = useState<TestPhase>("loading");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const [sectionScores, setSectionScores] = useState<Record<string, number>>({});
  const [sectionTests, setSectionTests] = useState<SectionTest[]>([]);

  const { data: testSet, isLoading: testSetLoading } = useQuery<TestSet>({
    queryKey: ["/api/test-sets", testSetId],
    enabled: !!testSetId,
  });

  const { data: existingAttempt } = useQuery<TestSetAttempt | null>({
    queryKey: ["/api/test-set-attempts/active", testSetId],
    enabled: !!testSetId && isAuthenticated,
  });

  const { data: testComponents = [] } = useQuery<any[]>({
    queryKey: ["/api/test-set-components", testSetId],
    enabled: !!testSetId,
  });

  const createAttemptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/test-set-attempts", {
        testSetId,
        status: "in_progress",
      });
      return response.json();
    },
    onSuccess: (data) => {
      attemptIdRef.current = data.id;
      setAttemptId(data.id);
      setPhase("direction");
    },
    onError: () => {
      toast({
        title: "오류",
        description: "테스트를 시작할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  const updateAttemptMutation = useMutation({
    mutationFn: async (data: Partial<TestSetAttempt> & { explicitAttemptId?: string }) => {
      const { explicitAttemptId, ...updateData } = data;
      const targetId = explicitAttemptId || attemptIdRef.current || attemptId;
      if (!targetId) {
        throw new Error("Attempt ID is required to update test progress");
      }
      const response = await apiRequest("PATCH", `/api/test-set-attempts/${targetId}`, updateData);
      return response.json();
    },
  });

  const pauseTestMutation = useMutation({
    mutationFn: async () => {
      const targetId = attemptIdRef.current || attemptId;
      if (!targetId) {
        throw new Error("Attempt ID is required to pause test");
      }
      const response = await apiRequest("PATCH", `/api/test-set-attempts/${targetId}`, {
        status: "paused",
        currentTestIndex: currentSectionIndex,
        sectionScores,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-set-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-progress"] });
      toast({
        title: "저장 완료",
        description: "테스트 진행 상황이 저장되었습니다. 나중에 이어서 풀 수 있습니다.",
      });
      setLocation("/actual-tests");
    },
    onError: () => {
      toast({
        title: "오류",
        description: "테스트 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const completeTestMutation = useMutation({
    mutationFn: async (finalScores: Record<string, number>) => {
      const targetId = attemptIdRef.current || attemptId;
      if (!targetId) {
        throw new Error("Attempt ID is required to complete test");
      }
      let totalScore: number;
      if (testType === "gre") {
        const awScore = finalScores.analyticalWriting || 0;
        const verbal1 = finalScores.verbal1 || 130;
        const verbal2 = finalScores.verbal2 || 130;
        const quant1 = finalScores.quantitative1 || 130;
        const quant2 = finalScores.quantitative2 || 130;
        const verbalScore = Math.round((verbal1 + verbal2) / 2);
        const quantScore = Math.round((quant1 + quant2) / 2);
        totalScore = verbalScore + quantScore;
        finalScores = {
          analyticalWriting: awScore,
          verbal1,
          verbal2,
          quantitative1: quant1,
          quantitative2: quant2,
        };
      } else {
        totalScore = Object.values(finalScores).reduce((a, b) => a + b, 0);
      }
      const response = await apiRequest("PATCH", `/api/test-set-attempts/${targetId}`, {
        status: "completed",
        completedAt: new Date().toISOString(),
        totalScore,
        sectionScores: finalScores,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-set-attempts"] });
      setLocation(`/actual-test-results/${attemptId}`);
    },
  });

  const testType = testSet?.testType || "toefl";
  const sectionOrder = (testSet?.sectionOrder as ActualSection[] | undefined) || DEFAULT_SECTION_ORDER[testType];
  const currentSection = sectionOrder[currentSectionIndex] as ActualSection;
  const totalSections = sectionOrder.length;
  const getSectionDuration = (section: ActualSection) => sectionDurations[testType]?.[section] ?? 30;
  const getSectionQuestionCount = (section: ActualSection) => sectionQuestions[testType]?.[section] ?? 10;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
      return;
    }

    if (testSet && !testSetLoading) {
      const canResume = existingAttempt && (existingAttempt.status === "in_progress" || existingAttempt.status === "paused");
      if (canResume) {
        attemptIdRef.current = existingAttempt.id;
        setAttemptId(existingAttempt.id);
        setCurrentSectionIndex(existingAttempt.currentTestIndex || 0);
        setSectionScores(existingAttempt.sectionScores || {});
        if (existingAttempt.status === "paused") {
          updateAttemptMutation.mutate({ 
            status: "in_progress",
            explicitAttemptId: existingAttempt.id 
          });
        }
        setPhase("direction");
      } else {
        setPhase("loading");
      }
    }
  }, [testSet, testSetLoading, existingAttempt, authLoading, isAuthenticated]);

  useEffect(() => {
    if (testComponents.length > 0) {
      const tests = testComponents.map((comp: any) => ({
        section: (comp.test?.section || sectionOrder[comp.orderIndex]) as ActualSection,
        id: comp.testId,
        title: comp.test?.title || `${sectionOrder[comp.orderIndex]} Section`,
        duration: comp.test?.duration || sectionDurations[testType]?.[sectionOrder[comp.orderIndex] as ActualSection] || 30,
        questionCount: comp.test?.questionCount || sectionQuestions[testType]?.[sectionOrder[comp.orderIndex] as ActualSection] || 10,
      }));
      setSectionTests(tests);
    }
  }, [testComponents, testType, sectionOrder]);

  const handleStartTest = useCallback(() => {
    if (!attemptId) {
      createAttemptMutation.mutate();
    } else {
      setPhase("direction");
    }
  }, [attemptId, createAttemptMutation]);

  const handleStartSection = useCallback(() => {
    setPhase("test");
    updateAttemptMutation.mutate({
      currentTestIndex: currentSectionIndex,
    });
  }, [currentSectionIndex, updateAttemptMutation]);

  const handleSectionComplete = useCallback((sectionScore: number) => {
    const newScores = { ...sectionScores, [currentSection]: sectionScore };
    setSectionScores(newScores);

    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      setPhase("direction");
      updateAttemptMutation.mutate({
        currentTestIndex: currentSectionIndex + 1,
        sectionScores: newScores,
      });
    } else {
      setPhase("scoring");
      completeTestMutation.mutate(newScores);
    }
  }, [currentSection, currentSectionIndex, totalSections, sectionScores, updateAttemptMutation, completeTestMutation]);

  // Listen for section completion messages from iframe (must be after handleSectionComplete definition)
  useEffect(() => {
    if (phase !== "test") return;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "SECTION_COMPLETE" && event.data.score !== undefined) {
        handleSectionComplete(event.data.score);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [phase, handleSectionComplete]);

  const getSectionUrl = (section: string, testId?: string): string => {
    const baseTestId = testId || "default";
    const attemptParam = attemptId ? `?attemptId=${attemptId}&fullTest=true` : "";
    
    if (testType === "toefl") {
      switch (section) {
        case "reading": return `/toefl-reading/${baseTestId}${attemptParam}`;
        case "listening": return `/toefl-listening/${baseTestId}${attemptParam}`;
        case "speaking": return `/toefl-speaking/${baseTestId}${attemptParam}`;
        case "writing": return `/toefl-writing/${baseTestId}${attemptParam}`;
        default: return `/toefl-reading/${baseTestId}${attemptParam}`;
      }
    } else if (testType === "newToefl") {
      switch (section) {
        case "reading": return `/new-toefl-reading/${baseTestId}${attemptParam}`;
        case "listening": return `/new-toefl-listening/${baseTestId}${attemptParam}`;
        case "speaking": return `/new-toefl-speaking/${baseTestId}${attemptParam}`;
        case "writing": return `/new-toefl-writing/${baseTestId}${attemptParam}`;
        default: return `/new-toefl-reading/${baseTestId}${attemptParam}`;
      }
    } else {
      switch (section) {
        case "analyticalWriting": return `/gre-analytical-writing/${baseTestId}${attemptParam}`;
        case "verbal1": return `/gre-verbal/${baseTestId}${attemptParam}&section=1`;
        case "verbal2": return `/gre-verbal/${baseTestId}${attemptParam}&section=2`;
        case "quantitative1": return `/gre-quantitative/${baseTestId}${attemptParam}&section=1`;
        case "quantitative2": return `/gre-quantitative/${baseTestId}${attemptParam}&section=2`;
        default: return `/gre-analytical-writing/${baseTestId}${attemptParam}`;
      }
    }
  };

  if (testSetLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-full blur-3xl" />
        </div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Main content */}
        <div className="relative z-10 text-center">
          {/* Large centered logo with glow effect */}
          <div className="relative mb-12">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-32 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
            </div>
            <img 
              src={logoPath} 
              alt="iNRISE" 
              className="relative h-24 md:h-32 mx-auto drop-shadow-2xl brightness-0 invert opacity-95"
            />
          </div>
          
          {/* Loading text with gradient */}
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-200 via-white to-purple-200 bg-clip-text text-transparent mb-8">
            실전 모의고사 준비 중
          </h2>
          
          {/* Elegant loading bar */}
          <div className="w-64 mx-auto">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 rounded-full animate-pulse" />
            </div>
          </div>
          
          {/* Subtle dots loading indicator */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!testSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700 p-8 text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">테스트를 찾을 수 없습니다</h2>
          <p className="text-slate-400 mb-4">요청하신 테스트가 존재하지 않거나 비활성화되었습니다.</p>
          <Button onClick={() => setLocation("/actual-tests")} className="bg-emerald-500">
            테스트 목록으로 돌아가기
          </Button>
        </Card>
      </div>
    );
  }

  if (phase === "loading" && !attemptId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-white mb-2">{testSet.title}</CardTitle>
            <p className="text-slate-400">{testSet.description}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-700/50 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-4 text-center">테스트 구성</h3>
              <div className={`grid ${testType === "gre" ? "grid-cols-5" : "grid-cols-4"} gap-4`}>
                {sectionOrder.map((section, index) => {
                  const getSectionIcon = (sec: string) => {
                    if (sec === "reading") return BookOpen;
                    if (sec === "listening") return Headphones;
                    if (sec === "speaking") return Mic;
                    if (sec === "writing") return Edit3;
                    if (sec === "analyticalWriting") return Edit3;
                    if (sec.includes("verbal")) return BookOpen;
                    if (sec.includes("quantitative")) return Calculator;
                    return Target;
                  };
                  const Icon = getSectionIcon(section);
                  const sectionLabels: Record<string, string> = {
                    reading: "Reading",
                    listening: "Listening",
                    speaking: "Speaking",
                    writing: "Writing",
                    analyticalWriting: "AW",
                    verbal1: "V1",
                    verbal2: "V2",
                    quantitative1: "Q1",
                    quantitative2: "Q2",
                  };
                  return (
                    <div key={section} className="text-center">
                      <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-white text-sm font-medium">{sectionLabels[section] || section}</p>
                      <p className="text-slate-400 text-xs">
                        {sectionDurations[testType]?.[section] || 0}분
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-300 bg-slate-700/30 p-4 rounded-lg">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                총 소요 시간
              </span>
              <span className="font-semibold text-white">{testSet.totalDuration}분</span>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-amber-300 text-sm">
                ⚠️ 테스트가 시작되면 중단할 수 없습니다. 모든 섹션을 완료해야 점수가 산출됩니다.
              </p>
            </div>

            <Button
              onClick={handleStartTest}
              disabled={createAttemptMutation.isPending}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 py-6 text-lg"
              data-testid="button-begin-test"
            >
              {createAttemptMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : null}
              테스트 시작하기
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "direction") {
    const currentTest = sectionTests[currentSectionIndex];
    return (
      <TestDirection
        section={currentSection}
        testType={testType}
        duration={currentTest?.duration ?? getSectionDuration(currentSection)}
        questionCount={currentTest?.questionCount ?? getSectionQuestionCount(currentSection)}
        onStart={handleStartSection}
        currentSection={currentSectionIndex + 1}
        totalSections={totalSections}
      />
    );
  }

  if (phase === "test") {
    const currentTest = sectionTests[currentSectionIndex];
    const testUrl = getSectionUrl(currentSection, currentTest?.id);

    return (
      <div className="min-h-screen bg-slate-900">
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {testSet.title}
            </Badge>
            <span className="text-slate-400 text-sm">
              Section {currentSectionIndex + 1} of {totalSections}: {currentSection.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Progress 
              value={((currentSectionIndex + 1) / totalSections) * 100} 
              className="w-32 h-2"
            />
            <Suspense
              fallback={
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  disabled
                >
                  저장 후 나가기
                </Button>
              }
            >
              <DeferredActualTestPauseDialog
                currentSection={currentSection}
                currentSectionIndex={currentSectionIndex}
                totalSections={totalSections}
                isPending={pauseTestMutation.isPending}
                onPause={() => pauseTestMutation.mutate()}
              />
            </Suspense>
          </div>
        </div>
        
        <iframe
          src={testUrl}
          className="w-full h-[calc(100vh-48px)] border-0"
          title={`${currentSection} section`}
        />
      </div>
    );
  }

  if (phase === "scoring") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700 p-8 text-center max-w-md">
          <Loader2 className="h-16 w-16 animate-spin text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">채점 중...</h2>
          <p className="text-slate-400">잠시만 기다려주세요. 결과를 분석하고 있습니다.</p>
        </Card>
      </div>
    );
  }

  return null;
}
