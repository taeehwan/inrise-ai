import { lazy, Suspense, useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Clock, Calculator, ArrowLeft, ArrowRight, ChevronRight, Lightbulb, Bot, FileText, Loader2, Sparkles, Maximize, Minimize, Award, BarChart3, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { formatMathText } from "@/lib/utils";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import { GeometryDiagram } from "@/components/GeometryDiagram";
import type { Annotation, DiagramElement } from "@/components/GeometryDiagram";
import { useFullscreen } from "@/hooks/useFullscreen";
const GreQuantDataChart = lazy(() => import("@/components/charts/GreQuantDataChart"));
const DeferredScientificCalculator = lazy(() => import("@/components/gre/ScientificCalculator"));

interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
}

interface GeometryDiagramElement {
  type: string;
  id?: string;
  x?: number;
  y?: number;
  label?: string;
  from?: string;
  to?: string;
  center?: { x: number; y: number };
  radius?: number;
  height?: number;
  startAngle?: number;
  endAngle?: number;
  vertex?: string;
  value?: string;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  equation?: string;
  color?: string;
  labels?: { radius?: string; height?: string; slant?: string };
}

interface GeometryDiagramData {
  diagramType: string;
  elements: DiagramElement[];
  annotations?: Annotation[];
}

interface QuantitativeTestQuestionApi {
  id?: string;
  type?: Question["type"];
  questionType?: Question["type"] | "multiple_answer";
  question?: string;
  questionText?: string;
  quantityA?: string;
  quantityB?: string;
  columnA?: string;
  columnB?: string;
  options?: string[] | null;
  correctAnswer?: string | number | number[] | null;
  explanation?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  chartType?: Question["chartType"] | null;
  chartTitle?: string | null;
  chartData?: ChartDataPoint[] | null;
  category?: string | null;
  geometryDiagram?: GeometryDiagramData | null;
}

interface QuantitativeTestData {
  section?: string | null;
  title?: string | null;
  questions?: QuantitativeTestQuestionApi[] | null;
}

interface Question {
  id: string;
  type: 'quantitative_comparison' | 'multiple_choice' | 'multiple_choice_multiple_answer' | 'numeric_entry' | 'data_interpretation';
  question: string;
  columnA?: string;
  columnB?: string;
  options?: string[];
  correctAnswer: string | number | number[];
  explanation: string;
  image?: string;
  chartType?: 'bar' | 'line' | 'pie' | 'table' | 'scatter' | 'stacked_bar' | 'grouped_bar';
  chartTitle?: string;
  chartData?: ChartDataPoint[];
  category?: string;
  geometryDiagram?: GeometryDiagramData;
}

const sampleQuestions: Question[] = [
  {
    id: "1",
    type: "quantitative_comparison",
    question: "O is the center of the circle, and the perimeter of △ AOC is 8.",
    columnA: "The circumference of the circle",
    columnB: "12",
    correctAnswer: "The relationship cannot be determined from the information given.",
    explanation: "Without knowing the radius of the circle, we cannot determine the circumference. The perimeter of triangle AOC alone is insufficient information."
  },
  {
    id: "2", 
    type: "multiple_choice",
    question: "In the figure, if a training camp for convenience store staff had four of the five ratings high then which of the following statements are correct according to the survey results?",
    options: [
      "Article A's training rating for convenience is 60%",
      "Article A's training rating for convenience is 50%", 
      "Article A's training rating for convenience is 40%",
      "Article A's training rating for convenience is 30%",
      "Article A's training rating for convenience is 20%"
    ],
    correctAnswer: "Article A's training rating for convenience is 40%",
    explanation: "Based on the survey data provided in the chart, Article A received a 40% rating for convenience training."
  },
  {
    id: "3",
    type: "numeric_entry",
    question: "A survey asked 150 people about their preferences for two products A and B. The survey showed: 95% like Product A, and 80% like Product B. What is the minimum number of people who like both products?",
    correctAnswer: 112,
    explanation: "Using the principle of inclusion-exclusion: minimum overlap = (95% + 80% - 100%) × 150 = 75% × 150 = 112.5, rounded down to 112."
  },
  {
    id: "4",
    type: "quantitative_comparison",
    question: "The sum of five integer ratings was positive, and at least two of the ratings were negative.",
    columnA: "The sum of the positive ratings",
    columnB: "The absolute value of the sum of negative ratings",
    correctAnswer: "Quantity A is greater.",
    explanation: "Since the total sum is positive and includes negative values, the positive ratings must exceed the absolute value of negative ratings."
  },
  {
    id: "5",
    type: "multiple_choice",
    question: "The figure shows survey results with ratings distributed as shown. If the median of 9 women is rated 3 or rated 2, and if rated 3, then the number of women rated 2 is:",
    options: ["25%", "30%", "35%", "40%", "45%"],
    correctAnswer: "35%",
    explanation: "Based on the distribution pattern and the median constraint, 35% of women are rated 2."
  },
  {
    id: "6",
    type: "quantitative_comparison",
    question: "In the circle with center O, arc AB = 60°",
    columnA: "The area of sector AOB",
    columnB: "1/6 of the circle's area",  
    correctAnswer: "The two quantities are equal.",
    explanation: "A 60° sector represents 60°/360° = 1/6 of the circle, so the areas are equal."
  },
  {
    id: "7",
    type: "numeric_entry",
    question: "If f(x) = 2x² - 3x + 1, what is f(3)?",
    correctAnswer: 10,
    explanation: "f(3) = 2(3)² - 3(3) + 1 = 2(9) - 9 + 1 = 18 - 9 + 1 = 10"
  }
];

export default function GreQuantitativeReasoning() {
  const [location, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const { user, isPro, membershipTier } = useAuth();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { language, t } = useLanguage();
  const { logTestStart, logAIUsage } = useActivityTracker();
  
  // URL에서 testId 파라미터 읽기
  const testId = new URLSearchParams(searchParams).get('testId') || '';
  
  useEffect(() => {
    logTestStart('gre_quantitative_reasoning', testId || 'default');
  }, [testId]);
  
  // 저장된 GRE Quant 테스트 목록 불러오기 (공개 API 사용)
  const { data: availableTests, isLoading: testsLoading } = useQuery<any[]>({
    queryKey: ['/api/tests', 'gre', 'quantitative'],
    queryFn: async () => {
      const response = await fetch('/api/tests?examType=gre&section=quantitative');
      if (!response.ok) throw new Error('Failed to fetch tests');
      return response.json();
    },
  });
  
  // Admin check helper
  const isAdmin = user?.role === 'admin';
  
  // API에서 테스트 데이터 불러오기 (section 확인 및 문제 포함)
  const { data: testData, isLoading: questionsLoading } = useQuery<QuantitativeTestData>({
    queryKey: ['/api/test-sets', testId],
    enabled: testId.length > 0,
    retry: false,
  });
  
  // Debug: log testData when it loads
  useEffect(() => {
    if (testId && testData) {
      console.log('GRE Quant Test Loaded:', testId, 'Questions:', testData.questions?.length);
    }
  }, [testId, testData]);
  
  // Redirect to correct page if section doesn't match
  useEffect(() => {
    if (testData && testData.section === 'verbal') {
      setLocation(`/gre/verbal-reasoning?testId=${testId}`);
    }
  }, [testData, testId, setLocation]);
  
  // Extract questions from testData
  const apiQuestions = testData?.questions || [];
  
  // Normalize quantitative comparison answers (handle legacy A/B/C/D or index format)
  const normalizeQCAnswer = (answer: any): string => {
    const qcAnswerMap: Record<string | number, string> = {
      0: "Quantity A is greater.",
      1: "Quantity B is greater.",
      2: "The two quantities are equal.",
      3: "The relationship cannot be determined from the information given.",
      'A': "Quantity A is greater.",
      'B': "Quantity B is greater.",
      'C': "The two quantities are equal.",
      'D': "The relationship cannot be determined from the information given.",
      'a': "Quantity A is greater.",
      'b': "Quantity B is greater.",
      'c': "The two quantities are equal.",
      'd': "The relationship cannot be determined from the information given.",
    };
    return qcAnswerMap[answer] || String(answer);
  };

  // API 문제를 페이지 형식으로 변환
  const transformApiQuestions = (rawQuestions: QuantitativeTestQuestionApi[]): Question[] => {
    if (!rawQuestions || !Array.isArray(rawQuestions)) return [];
    
    return rawQuestions.map((q, index) => {
      const questionText = q.questionText || q.question || '';
      
      // questionType 또는 type에 따라 type 결정
      let type: 'quantitative_comparison' | 'multiple_choice' | 'multiple_choice_multiple_answer' | 'numeric_entry' | 'data_interpretation' = 'multiple_choice';
      
      // 0. Data Interpretation 감지 (차트 데이터가 있는 경우)
      if (q.type === 'data_interpretation' || q.questionType === 'data_interpretation' || q.chartType || q.chartData) {
        type = 'data_interpretation';
      }
      // 1. Quantitative Comparison 감지
      else if (q.type === 'quantitative_comparison' || q.questionType === 'quantitative_comparison' || q.quantityA || q.quantityB || q.columnA || q.columnB) {
        type = 'quantitative_comparison';
      }
      // 2. Multiple Choice Multiple Answer (Select All That Apply)
      else if (q.type === 'multiple_choice_multiple_answer' || Array.isArray(q.correctAnswer)) {
        type = 'multiple_choice_multiple_answer';
      }
      // 3. Numeric Entry 감지 (questionType, options 없음, 또는 "answer ___" 패턴)
      else if (
        q.type === 'numeric_entry' || 
        q.questionType === 'numeric_entry' || 
        (!q.options || q.options.length === 0) ||
        questionText.toLowerCase().includes('answer') ||
        questionText.includes('____') ||
        questionText.includes('___')
      ) {
        type = 'numeric_entry';
      }
      
      // Normalize correctAnswer for quantitative_comparison type
      let correctAnswer = q.correctAnswer ?? '';
      if (type === 'quantitative_comparison') {
        correctAnswer = normalizeQCAnswer(correctAnswer);
      }
      
      return {
        id: q.id || String(index + 1),
        type,
        question: questionText,
        columnA: q.quantityA || q.columnA || undefined,
        columnB: q.quantityB || q.columnB || undefined,
        options: q.options || undefined,
        correctAnswer,
        explanation: q.explanation || '',
        image: q.imageUrl || q.image || undefined,
        chartType: q.chartType || undefined,
        chartTitle: q.chartTitle || undefined,
        chartData: q.chartData || undefined,
        category: q.category || undefined,
        geometryDiagram: q.geometryDiagram || undefined,
      };
    });
  };
  
  // 사용할 문제 결정: API 문제가 있으면 그것을 사용
  // CRITICAL FIX: Never fallback to sample questions - require valid testId
  const questions = testId && apiQuestions && apiQuestions.length > 0 
    ? transformApiQuestions(apiQuestions) 
    : [];
  
  // Show test selection only when:
  // 1. No testId provided at all, OR
  // 2. testId exists but loading finished AND questions are empty (failed fetch or empty test)
  const hasTestId = testId && testId.length > 0;
  const isLoadingWithTestId = hasTestId && questionsLoading;
  const shouldShowTestSelection = !hasTestId || (!questionsLoading && questions.length === 0);

  const generateReport = (correctCount: number, totalCount: number) => {
    const percentage = Math.round((correctCount / totalCount) * 100);
    const reportData = {
      testType: "GRE Quantitative Reasoning",
      score: `${correctCount}/${totalCount}`,
      percentage,
      date: new Date().toLocaleDateString('ko-KR'),
      sections: [
        {
          name: "Arithmetic",
          performance: percentage >= 80 ? "우수" : percentage >= 60 ? "보통" : "개선 필요"
        },
        {
          name: "Algebra", 
          performance: percentage >= 80 ? "우수" : percentage >= 60 ? "보통" : "개선 필요"
        },
        {
          name: "Geometry",
          performance: percentage >= 80 ? "우수" : percentage >= 60 ? "보통" : "개선 필요"
        }
      ]
    };
    
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(`
        <html>
          <head>
            <title>GRE Quantitative Reasoning 성적표</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; font-size: 120%; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .score { font-size: 24px; font-weight: bold; color: #4a90e2; }
              .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
              .date { color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>GRE Quantitative Reasoning 성적표</h1>
              <p class="date">시험 일자: ${reportData.date}</p>
              <p class="score">총점: ${reportData.score} (${reportData.percentage}%)</p>
            </div>
            <div class="sections">
              ${reportData.sections.map(section => `
                <div class="section">
                  <h3>${section.name}</h3>
                  <p>수행도: ${section.performance}</p>
                </div>
              `).join('')}
            </div>
            <div style="margin-top: 30px; text-align: center; color: #666;">
              <p>iNRISE GRE 준비 플랫폼에서 생성됨</p>
            </div>
          </body>
        </html>
      `);
      reportWindow.document.close();
    }
    
    toast({
      title: "성적표 생성 완료",
      description: "새 창에서 성적표를 확인하세요.",
    });
  };
  const [timeRemaining, setTimeRemaining] = useState(35 * 60); // 35 minutes
  const [isStarted, setIsStarted] = useState(true); // Start immediately
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number | number[]>>({});
  const [multiAnswers, setMultiAnswers] = useState<Record<string, Set<number>>>({});
  const [showResults, setShowResults] = useState(false);
  const [explanations, setExplanations] = useState<{ [key: string]: string }>({});
  const [loadingExplanations, setLoadingExplanations] = useState<{ [key: string]: boolean }>({});
  const [showCalculator, setShowCalculator] = useState(false);

  // AI Explanation Mutation
  const explanationMutation = useMutation({
    mutationFn: async ({ questionId, question }: { questionId: string; question: any }) => {
      console.log("AI 해설 요청", question);
      const response = await apiRequest("POST", "/api/gre/quantitative/explanation", {
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        questionType: question.type,
        columnA: question.columnA,
        columnB: question.columnB,
        language: language
      });
      const data = await response.json();
      console.log("AI 해설 응답", data);
      return data;
    },
    onSuccess: (data: any, variables) => {
      console.log("해설 설정", data);
      const explanation = data?.explanation || "해설을 가져올 수 없습니다.";
      setExplanations(prev => ({
        ...prev,
        [variables.questionId]: explanation
      }));
      setLoadingExplanations(prev => ({
        ...prev,
        [variables.questionId]: false
      }));
    },
    onError: (error, variables) => {
      console.error("해설 오류", error);
      setLoadingExplanations(prev => ({
        ...prev,
        [variables.questionId]: false
      }));
      toast({
        title: "오류",
        description: "AI 해설 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (isStarted && timeRemaining > 0 && !showResults) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isStarted, timeRemaining, showResults]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsStarted(true);
    toast({
      title: "Test Started",
      description: "You have 35 minutes to complete this section.",
    });
  };

  const handleTimeUp = () => {
    toast({
      title: "⏰ Time's Up",
      description: "35 minutes have elapsed. Please review and submit your answers.",
    });
    // NO AUTO-SUBMIT: User must manually submit after time expires
  };

  const handleAnswerChange = (questionId: string, answer: string | number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleMultiAnswerToggle = (questionId: string, optionIndex: number) => {
    setMultiAnswers(prev => {
      const current = new Set(prev[questionId] || []);
      if (current.has(optionIndex)) {
        current.delete(optionIndex);
      } else {
        current.add(optionIndex);
      }
      const updated = new Set(current);
      // Also sync to answers as sorted array
      setAnswers(a => ({ ...a, [questionId]: Array.from(updated).sort((a, b) => a - b) }));
      return { ...prev, [questionId]: updated };
    });
  };

  const isMultiAnswerCorrect = (q: Question): boolean => {
    const correct = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort((a, b) => a - b) : [];
    const selected = Array.from(multiAnswers[q.id] || []).sort((a, b) => a - b);
    return correct.length === selected.length && correct.every((v, i) => v === selected[i]);
  };

  const isAnswerCorrect = (q: Question): boolean => {
    if (q.type === 'multiple_choice_multiple_answer') return isMultiAnswerCorrect(q);
    const userAnswer = answers[q.id];
    if (q.type === 'numeric_entry') {
      const userNum = parseFloat(userAnswer as string);
      const correctStr = String(q.correctAnswer);
      if (correctStr.includes('/')) {
        const [num, den] = correctStr.split('/').map(Number);
        return Math.abs(userNum - num / den) < 0.001;
      }
      return Math.abs(userNum - parseFloat(correctStr)) < 0.001;
    }
    return userAnswer === q.correctAnswer;
  };

  const handleSubmit = () => {
    setShowResults(true);
    const correctCount = questions.filter(q => isAnswerCorrect(q)).length;

    toast({
      title: "Test Submitted",
      description: `You answered ${correctCount} out of ${questions.length} questions correctly.`,
    });
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'quantitative_comparison': return 'Quantitative Comparison';
      case 'multiple_choice': return 'Multiple Choice';
      case 'multiple_choice_multiple_answer': return 'Multiple Answer';
      case 'numeric_entry': return 'Numeric Entry';
      case 'data_interpretation': return 'Data Interpretation';
      default: return type;
    }
  };

  const progressPercentage = ((35 * 60 - timeRemaining) / (35 * 60)) * 100;

  // Show loading spinner when testId exists but questions are still loading
  if (isLoadingWithTestId) {
    return (
      <SecurityWrapper 
        watermark="iNRISE GRE QUANTITATIVE REASONING"
        disableRightClick={true}
        disableKeyboardShortcuts={true}
        disableTextSelection={true}
        disableScreenshot={true}
        showSecurityNotice={true}
      >
        <FullscreenWrapper className="min-h-screen bg-[#0D0A18] p-4 gre-font flex items-center justify-center" style={{fontSize: '110%'}}>
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-purple-800 mb-2">테스트를 불러오는 중...</h2>
            <p className="text-gray-600">잠시만 기다려주세요</p>
          </div>
        </FullscreenWrapper>
      </SecurityWrapper>
    );
  }

  // CRITICAL: If no testId or questions failed to load, show test selection UI
  if (shouldShowTestSelection) {
    return (
      <SecurityWrapper 
        watermark="iNRISE GRE QUANTITATIVE REASONING"
        disableRightClick={true}
        disableKeyboardShortcuts={true}
        disableTextSelection={true}
        disableScreenshot={true}
        showSecurityNotice={true}
      >
        <FullscreenWrapper className="min-h-screen bg-[#0D0A18] p-4 gre-font" style={{fontSize: '110%'}}>
          <div className="bg-[#140F24] text-white p-4 rounded-xl mb-6 shadow-lg border border-purple-500/20">
            <h1 className="text-2xl font-bold tracking-wide">GRE Quantitative Reasoning</h1>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" onClick={() => setLocation("/gre")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                GRE 선택으로 돌아가기
              </Button>
            </div>
            
            <Card className="border-2 border-purple-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-100 to-violet-100">
                <CardTitle className="flex items-center gap-3 text-purple-800">
                  <AlertCircle className="w-7 h-7" />
                  테스트를 선택해주세요
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {testsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
                    <span className="ml-3 text-lg text-purple-700">테스트 목록을 불러오는 중...</span>
                  </div>
                ) : availableTests && availableTests.length > 0 ? (
                  <div className="space-y-6">
                    <p className="text-gray-600 text-lg mb-6">
                      아래 목록에서 풀고 싶은 테스트를 선택하거나, 새로운 테스트를 생성하세요.
                    </p>
                    
                    <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
                      {availableTests.map((test) => (
                        <div 
                          key={test.id}
                          className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer"
                          onClick={() => setLocation(`/gre/quantitative-reasoning?testId=${test.id}`)}
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">{test.title || 'GRE Quantitative Test'}</h4>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                              <span>{test.questionCount || 0}개 문제</span>
                              <Badge variant="outline" className="capitalize">{test.difficulty || 'medium'}</Badge>
                              {test.isOwner && <Badge className="bg-purple-100 text-purple-700">내 테스트</Badge>}
                            </div>
                          </div>
                          <Button 
                            className="bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/gre/quantitative-reasoning?testId=${test.id}`);
                            }}
                          >
                            시작하기
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                      {isAdmin && (
                        <Button 
                          variant="outline"
                          className="flex-1 border-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                          onClick={() => setLocation("/ai-test-creator?examType=gre&section=quantitative")}
                        >
                          <Sparkles className="w-5 h-5 mr-2" />
                          AI로 새 테스트 생성
                        </Button>
                      )}
                      <Button 
                        variant="outline"
                        className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => setLocation("/tests/gre?section=quantitative")}
                      >
                        <FileText className="w-5 h-5 mr-2" />
                        전체 테스트 목록 보기
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bot className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">아직 저장된 테스트가 없습니다</h3>
                    <p className="text-gray-600 mb-6">
                      {isAdmin ? 'AI를 사용하여 새로운 GRE Quantitative 문제를 생성해보세요!' : '관리자가 곧 테스트를 추가할 예정입니다.'}
                    </p>
                    <div className="flex gap-4 justify-center">
                      {isAdmin ? (
                        <Button 
                          className="bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 px-8 py-3 text-lg"
                          onClick={() => setLocation("/ai-test-creator?examType=gre&section=quantitative")}
                        >
                          <Sparkles className="w-5 h-5 mr-2" />
                          AI로 테스트 생성하기
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg"
                          onClick={() => setLocation("/tests/gre")}
                        >
                          <FileText className="w-5 h-5 mr-2" />
                          전체 테스트 목록 보기
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </FullscreenWrapper>
      </SecurityWrapper>
    );
  }

  if (!isStarted) {
    return (
      <SecurityWrapper 
        watermark="iNRISE GRE QUANTITATIVE REASONING TEST"
        disableRightClick={true}
        disableKeyboardShortcuts={true}
        disableTextSelection={true}
        disableScreenshot={true}
        showSecurityNotice={true}
      >
        <FullscreenWrapper className="min-h-screen bg-[#0D0A18] p-4 gre-font" style={{fontSize: '110%'}}>
        {/* Header Bar - 세련된 보라색 */}
        <div className="bg-[#140F24] text-white p-4 rounded-xl mb-6 shadow-lg border border-purple-500/20">
          <h1 className="text-2xl font-bold tracking-wide">GRE Quantitative Reasoning</h1>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => setLocation("/gre")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              GRE 선택으로 돌아가기
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-6 h-6" />
                GRE Quantitative Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">문제 유형</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-purple-800">Quantitative Comparison</h4>
                        <p className="text-sm text-purple-600 mt-2">
                          두 수량의 크기를 비교하는 문제
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-violet-800">Multiple Choice</h4>
                        <p className="text-sm text-violet-600 mt-2">
                          주어진 선택지 중에서 정답을 고르는 문제
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <h4 className="font-semibold text-indigo-800">Numeric Entry</h4>
                        <p className="text-sm text-indigo-600 mt-2">
                          계산 결과를 직접 입력하는 문제
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">주요 영역</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 대수학 (Algebra)</li>
                    <li>• 기하학 (Geometry)</li>
                    <li>• 산술 (Arithmetic)</li>
                    <li>• 자료분석 (Data Analysis)</li>
                  </ul>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    35분
                  </Badge>
                  <Badge variant="outline">
                    {questions.length}문제
                  </Badge>
                </div>

                {/* 저장된 테스트 목록 */}
                {availableTests && availableTests.length > 0 && (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      저장된 테스트 ({availableTests.length}개)
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableTests.map((test: any) => (
                        <div 
                          key={test.id} 
                          className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer transition-colors border border-purple-200"
                          onClick={() => setLocation(`/gre/quantitative-reasoning?testId=${test.id}`)}
                        >
                          <div>
                            <span className="font-medium text-purple-800">{test.title}</span>
                            <div className="text-xs text-purple-600 mt-1">
                              {test.questionCount}문제 • {test.difficulty === 'hard' ? '어려움' : test.difficulty === 'easy' ? '쉬움' : '보통'}
                              {test.isOwner && <Badge variant="secondary" className="ml-2 text-xs">내 테스트</Badge>}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-purple-400 text-purple-700 hover:bg-purple-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/gre/quantitative-reasoning?testId=${test.id}`);
                            }}
                          >
                            시작
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {testsLoading && (
                  <div className="text-center py-4 text-purple-600">
                    저장된 테스트 로딩 중...
                  </div>
                )}

                <div className="text-center">
                  {testId ? (
                    questionsLoading ? (
                      <div className="space-y-3">
                        <Button disabled size="lg" className="w-full md:w-auto bg-gray-400 text-white">
                          테스트 로딩 중...
                        </Button>
                      </div>
                    ) : questions.length > 0 ? (
                      <Button onClick={handleStart} size="lg" className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all">
                        선택한 테스트 시작하기 ({questions.length}문제)
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-red-500">테스트를 불러올 수 없습니다.</p>
                        <Button variant="outline" onClick={() => setLocation('/gre/quantitative-reasoning')}>
                          다른 테스트 선택하기
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      <Button onClick={handleStart} size="lg" className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all">
                        샘플 문제로 시작하기 ({sampleQuestions.length}문제)
                      </Button>
                      <p className="text-sm text-gray-500">위의 저장된 테스트를 선택하거나 샘플 문제로 시작하세요</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </FullscreenWrapper>
      </SecurityWrapper>
    );
  }

  if (showResults) {
    const correctCount = questions.filter(q => isAnswerCorrect(q)).length;

    return (
      <SecurityWrapper 
        watermark="iNRISE GRE QUANTITATIVE REASONING TEST"
        disableRightClick={true}
        disableKeyboardShortcuts={true}
        disableTextSelection={true}
        disableScreenshot={true}
        showSecurityNotice={true}
      >
        <FullscreenWrapper className="min-h-screen bg-[#0D0A18] p-4 gre-font" style={{fontSize: '110%'}}>
        {/* Header Bar - 세련된 보라색 */}
        <div className="bg-[#140F24] text-white p-4 rounded-xl mb-6 shadow-lg border border-purple-500/20">
          <h1 className="text-2xl font-bold tracking-wide">GRE Quantitative Reasoning - 결과</h1>
        </div>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>시험 결과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-8 bg-gradient-to-r from-purple-100 to-violet-100 p-6 rounded-xl">
                <div className="text-4xl font-bold text-purple-700 mb-2">
                  {correctCount}/{questions.length}
                </div>
                <p className="text-lg text-purple-600 font-medium">정답률: {Math.round((correctCount / questions.length) * 100)}%</p>
              </div>

              <div className="space-y-4">
                {questions.map((question, index) => {
                  const isCorrect = isAnswerCorrect(question);

                  return (
                    <Card key={question.id} className={isCorrect ? "border-green-500" : "border-red-500"}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={isCorrect ? "default" : "destructive"}>
                            문제 {index + 1} - {getQuestionTypeLabel(question.type)}
                          </Badge>
                          <Badge variant={isCorrect ? "secondary" : "destructive"}>
                            {isCorrect ? "정답" : "오답"}
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">{formatMathText(question.question)}</p>
                        {question.columnA && question.columnB && (
                          <div className="grid grid-cols-2 gap-4 mb-2">
                            <div className="text-center">
                              <p className="font-medium">Column A</p>
                              <p className="text-sm">{formatMathText(question.columnA || '')}</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium">Column B</p>
                              <p className="text-sm">{formatMathText(question.columnB || '')}</p>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mb-2">
                          <strong>정답:</strong> {Array.isArray(question.correctAnswer)
                            ? question.options
                              ? (question.correctAnswer as number[]).map(i => question.options![i]).join(', ')
                              : (question.correctAnswer as number[]).join(', ')
                            : question.correctAnswer.toString()}
                        </p>
                        
                        {!explanations[question.id] && !loadingExplanations[question.id] && (
                          <div className="mt-3 relative group">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (!isPro) {
                                  toast({
                                    title: "🔒 PRO 등급 필요",
                                    description: "해설 기능은 PRO 이상 회원만 이용 가능합니다.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                setLoadingExplanations(prev => ({ ...prev, [question.id]: true }));
                                explanationMutation.mutate({ questionId: question.id, question });
                              }}
                              className={`flex items-center gap-2 ${!isPro ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                            >
                              <Bot className="w-4 h-4" />
                              해설 보기
                              {!isPro && <span className="ml-1 text-xs">🔒</span>}
                            </Button>
                            {!isPro && (
                              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                  PRO 등급 이상 필요
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {loadingExplanations[question.id] && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                            <Bot className="w-4 h-4 animate-pulse" />
                            <span className="text-sm">해설을 생성중입니다...</span>
                          </div>
                        )}
                        
                        {explanations[question.id] && (
                          <div className="mt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-600">해설</span>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                              {explanations[question.id]}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500">
                          <strong>기본 해설:</strong> {question.explanation}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <Button variant="outline" onClick={() => generateReport(correctCount, questions.length)} className="border-purple-300 hover:bg-purple-50 px-6 py-3">
                  <FileText className="w-5 h-5 mr-2" />
                  <span className="text-base">성적표 생성</span>
                </Button>
                <Button onClick={() => setLocation("/gre")} className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 px-6 py-3">
                  <span className="text-base">GRE 선택으로 돌아가기</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </FullscreenWrapper>
      </SecurityWrapper>
    );
  }

  // 로딩 상태 처리
  if (testId && questionsLoading) {
    return (
      <div className="min-h-screen bg-[#0D0A18] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
            <h2 className="text-xl font-semibold mb-2">테스트 문제를 불러오는 중...</h2>
            <p className="text-gray-600">잠시만 기다려주세요</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestion];

  // Handle case when question is undefined (no questions loaded)
  if (!question) {
    return (
      <div className="min-h-screen bg-[#0D0A18] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
            <h2 className="text-xl font-semibold mb-2">문제를 불러올 수 없습니다</h2>
            <p className="text-gray-600 mb-6">테스트 데이터가 없거나 로드 중입니다.</p>
            <Button onClick={() => setLocation('/tests/gre')} className="bg-purple-600 hover:bg-purple-700">
              테스트 목록으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SecurityWrapper 
      watermark="iNRISE GRE QUANTITATIVE REASONING TEST"
      disableRightClick={true}
      disableKeyboardShortcuts={true}
      disableTextSelection={true}
      disableScreenshot={true}
      showSecurityNotice={true}
    >
      <FullscreenWrapper hideButton={true}>
      <div className="min-h-screen bg-[#0D0A18]" style={{fontSize: '110%'}}>
        <style>{`
          .gq-dark-card { background:#140F24 !important; border-color:rgba(167,139,250,.12) !important; color:#F4F4F5; }
          .gq-dark-card .text-gray-700 { color:#C4B5FD; }
          .gq-dark-card .text-gray-900 { color:#F4F4F5; }
          .gq-dark-card .text-gray-600 { color:rgba(255,255,255,.5); }
          .gq-option-row:hover { background:rgba(167,139,250,.06) !important; }
          .gq-option-selected { background:rgba(124,58,237,.18) !important; border-color:rgba(167,139,250,.5) !important; }
          .gq-qty-box { background:rgba(109,40,217,.08) !important; border-color:rgba(167,139,250,.2) !important; }
          .gq-qty-label { color:#A78BFA !important; }
          .gq-qty-text { color:#E9D5FF !important; }
        `}</style>
        {/* Modern Header */}
        <div className="bg-[#140F24] text-white shadow-2xl border-b border-purple-500/20">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Button
                  variant="ghost"
                  onClick={() => setLocation('/gre')}
                  className="text-white hover:bg-white/10 rounded-xl px-4 py-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  GRE 홈
                </Button>
                <div className="border-l border-white/30 pl-6">
                  <h1 className="text-2xl font-bold tracking-wide">
                    GRE QUANTITATIVE REASONING
                  </h1>
                  {testData?.title && (
                    <p className="text-purple-200 text-sm mt-0.5">{testData.title}</p>
                  )}
                  <div className="flex items-center space-x-3 mt-1">
                    <Badge className="bg-gradient-to-r from-purple-400 to-violet-400 text-white px-3 py-1 rounded-lg shadow-md">
                      문제 {currentQuestion + 1}/{questions.length}
                    </Badge>
                    <Badge className="bg-gradient-to-r from-violet-400 to-purple-400 text-white px-3 py-1 rounded-lg shadow-md">
                      {getQuestionTypeLabel(question.type)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => setShowCalculator(!showCalculator)}
                  className={`${showCalculator ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'} text-white border-0 hover:from-violet-600 hover:to-purple-600 px-4 py-3 rounded-xl shadow-lg transition-all h-12`}
                  data-testid="button-open-calculator"
                >
                  <Calculator className="w-5 h-5 mr-2" />
                  계산기
                </Button>
                
                <Button 
                  variant="outline"
                  className="bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 hover:from-violet-600 hover:to-purple-600 px-6 py-3 rounded-xl shadow-lg transition-all h-12"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  <span className="font-mono text-lg font-bold">
                    {formatTime(timeRemaining)}
                  </span>
                </Button>
                
                <Button 
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white border-0 px-6 py-3 rounded-xl shadow-lg transition-all h-12"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  제출
                </Button>
                
                <Button 
                  onClick={toggleFullscreen}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0 px-6 py-3 rounded-xl shadow-lg transition-all h-12"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="w-5 h-5 mr-2" />
                      종료
                    </>
                  ) : (
                    <>
                      <Maximize className="w-5 h-5 mr-2" />
                      전체화면
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <Progress 
                value={progressPercentage} 
                className="h-2 bg-white/20"
              />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          <div className="grid lg:grid-cols-[1fr,280px] gap-6">
            {/* Main Question Panel */}
            <div>
              <Card className="gq-dark-card overflow-hidden shadow-xl border">
                <CardHeader className="bg-[#1A1035] text-white py-3">
                  <CardTitle className="text-lg font-bold tracking-wide flex items-center">
                    <Calculator className="w-5 h-5 mr-3 text-[#A78BFA]" />
                    Question {currentQuestion + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
            {/* Question */}
            <div className="mb-8">
              <h3 className="font-semibold mb-4 text-lg text-gray-700">Question:</h3>
              <p className="text-xl leading-relaxed mb-4 text-gray-900" style={{ fontSize: '1.5rem', lineHeight: '2rem' }}>{formatMathText(question.question)}</p>
              
              {/* Geometry Diagram for geometry questions */}
              {question.category === 'geometry' && question.geometryDiagram && (
                <GeometryDiagram diagram={question.geometryDiagram} width={350} height={280} />
              )}
            </div>

            {/* Quantitative Comparison */}
            {question.type === 'quantitative_comparison' && (
              <div className="mb-6">
                <div className="flex items-center justify-center gap-8 mb-6">
                  <div className="flex-1 max-w-sm">
                    <h4 className="gq-qty-label font-semibold mb-3 text-lg text-center">Quantity A</h4>
                    <div className="gq-qty-box p-8 rounded-lg shadow-md border-2 min-h-[120px] flex items-center justify-center">
                      <p className="gq-qty-text text-xl font-medium text-center">{formatMathText(question.columnA || '')}</p>
                    </div>
                  </div>
                  <div className="flex-1 max-w-sm">
                    <h4 className="gq-qty-label font-semibold mb-3 text-lg text-center">Quantity B</h4>
                    <div className="gq-qty-box p-8 rounded-lg shadow-md border-2 min-h-[120px] flex items-center justify-center">
                      <p className="gq-qty-text text-xl font-medium text-center">{formatMathText(question.columnB || '')}</p>
                    </div>
                  </div>
                </div>

                <RadioGroup
                  value={answers[question.id] as string || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  {[
                    "Quantity A is greater.",
                    "Quantity B is greater.", 
                    "The two quantities are equal.",
                    "The relationship cannot be determined from the information given."
                  ].map((option, index) => (
                    <div key={index} className="gq-option-row flex items-center space-x-4 p-4 rounded-lg transition-colors border border-purple-500/15 mb-2">
                      <RadioGroupItem value={option} id={`option-${index}`} className="h-5 w-5" />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1" style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Multiple Choice Single Answer */}
            {question.type === 'multiple_choice' && question.options && (
              <div className="mb-8">
                <RadioGroup
                  value={answers[question.id] as string || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  {question.options.map((option, index) => (
                    <div key={index} className="gq-option-row flex items-center space-x-4 p-4 rounded-lg transition-colors border border-purple-500/15 mb-2">
                      <RadioGroupItem value={option} id={`option-${index}`} className="h-5 w-5" />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1 text-[#E9D5FF]" style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>
                        {formatMathText(option)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Multiple Choice Multiple Answer (Select All That Apply) */}
            {question.type === 'multiple_choice_multiple_answer' && question.options && (
              <div className="mb-8">
                <p className="text-sm font-semibold text-violet-700 mb-3 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                  해당하는 것을 모두 선택하세요 (Select ALL that apply)
                </p>
                <div className="space-y-2">
                  {question.options.map((option, index) => {
                    const selected = multiAnswers[question.id]?.has(index) ?? false;
                    return (
                      <div
                        key={index}
                        onClick={() => handleMultiAnswerToggle(question.id, index)}
                        className={`flex items-center space-x-4 p-4 rounded-lg transition-colors border cursor-pointer ${
                          selected
                            ? 'gq-option-selected border-purple-400/50'
                            : 'gq-option-row border-purple-500/15'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                          selected ? 'bg-violet-600 border-violet-600' : 'border-gray-400'
                        }`}>
                          {selected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="cursor-pointer flex-1" style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>
                          {formatMathText(option)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Numeric Entry */}
            {question.type === 'numeric_entry' && (
              <div className="mb-8">
                {(() => {
                  const numericAnswerValue: string | number =
                    typeof answers[question.id] === "number" || typeof answers[question.id] === "string"
                      ? (answers[question.id] as string | number)
                      : "";
                  return (
                    <>
                <Label htmlFor="numeric-answer" className="text-lg font-semibold text-gray-800">
                  Enter your answer:
                </Label>
                <Input
                  id="numeric-answer"
                  type="number"
                  step="any"
                  placeholder="Enter a number"
                  value={numericAnswerValue}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="mt-3 max-w-xs text-xl p-4 h-14 border-2 border-gray-400 focus:border-purple-500"
                  style={{ fontSize: '1.25rem' }}
                />
                    </>
                  );
                })()}
              </div>
            )}

            {/* Data Interpretation with Charts */}
            {question.type === 'data_interpretation' && (
              <div className="mb-8">
                {question.chartType && question.chartData && (
                  <Suspense
                    fallback={
                      <div className="bg-white rounded-lg p-6 mb-6 border-2 border-gray-800 shadow-lg text-center text-gray-600">
                        차트 로딩 중...
                      </div>
                    }
                  >
                    <GreQuantDataChart
                      type={question.chartType}
                      title={question.chartTitle || 'Data Chart'}
                      data={question.chartData}
                    />
                  </Suspense>
                )}
                {question.options && (
                  <RadioGroup
                    value={answers[question.id] as string || ""}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                  >
                    {question.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 hover:bg-purple-50 rounded-lg transition-colors border border-gray-200 mb-2">
                        <RadioGroupItem value={option} id={`option-${index}`} className="h-5 w-5" />
                        <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1" style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>
                          {formatMathText(option)}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            )}

                </CardContent>
              </Card>
            </div>

            {/* Question Navigator Sidebar */}
            <div className="space-y-4">
              <Card className="gq-dark-card shadow-lg border">
                <CardHeader className="bg-[#1A1035] border-b border-purple-500/20 py-3">
                  <CardTitle className="text-base text-[#C4B5FD]">{t('gre.nav.answered')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q: Question, index: number) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestion(index)}
                        className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                          currentQuestion === index
                            ? 'bg-[#7C3AED] text-white shadow-lg scale-110'
                            : (q.type === 'multiple_choice_multiple_answer' ? (multiAnswers[q.id]?.size ?? 0) > 0 : !!answers[q.id])
                            ? 'bg-[#4C1D95] text-[#C4B5FD]'
                            : 'bg-white/5 text-[#A78BFA]/60 hover:bg-[#4C1D95]/30'
                        }`}
                        data-testid={`button-nav-question-${index + 1}`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-purple-500/15">
                    <div className="flex items-center gap-4 text-xs text-[#A78BFA]/60">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#4C1D95]"></div>
                        <span>{t('gre.nav.answered')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-white/5"></div>
                        <span>{t('gre.nav.unanswered')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="gq-dark-card shadow-lg border">
                <CardContent className="p-4">
                  <button
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="w-full flex items-center gap-3 p-3 bg-[#1A1035] rounded-lg hover:bg-[#2D1B69]/50 transition-colors"
                    data-testid="button-sidebar-calculator"
                  >
                    <Calculator className="h-6 w-6 text-[#A78BFA]" />
                    <div className="text-left">
                      <p className="font-semibold text-[#C4B5FD] text-sm">{t('gre.quant_ui.calculator')}</p>
                      <p className="text-xs text-[#A78BFA]/60">{t('gre.quant_ui.clickToOpen')}</p>
                    </div>
                  </button>
                </CardContent>
              </Card>

              <Card className="gq-dark-card shadow-lg border">
                <CardHeader className="bg-[#1A1035] border-b border-purple-500/20 py-2">
                  <CardTitle className="text-sm text-[#C4B5FD]">{t('gre.quant_ui.reference')}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 text-xs text-[#A78BFA]/70 space-y-1">
                  <p>Area of circle: A = πr²</p>
                  <p>Circumference: C = 2πr</p>
                  <p>Volume of sphere: V = (4/3)πr³</p>
                  <p>Pythagorean theorem: a² + b² = c²</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom AI Explanation Section */}
          <div className="mt-6">
            {!explanations[question.id] && !loadingExplanations[question.id] && (
              <div className="text-center">
                <div className="relative inline-block group">
                  <Button 
                    variant="outline" 
                    size="lg"
                    className={`px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all ${isPro ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white border-0 hover:from-purple-600 hover:to-violet-600' : 'bg-gray-400 text-gray-100 border-0 cursor-not-allowed'}`}
                    onClick={() => {
                      if (!isPro) {
                        toast({
                          title: "🔒 PRO 등급 필요",
                          description: "AI 해설 기능은 PRO 이상 회원만 이용 가능합니다.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setLoadingExplanations(prev => ({ ...prev, [question.id]: true }));
                      explanationMutation.mutate({ questionId: question.id, question });
                    }}
                  >
                    <Bot className="w-6 h-6 mr-2" />
                    해설 보기
                    {!isPro && <span className="ml-2 text-sm">🔒 PRO</span>}
                  </Button>
                  {!isPro && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap">
                        PRO 등급 이상 필요
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Upgrade Notice for Free Users */}
            {!isPro && !explanations[question.id] && !loadingExplanations[question.id] && (
              <div className="mt-6 bg-[#140F24] border border-[#A78BFA]/20 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-[#7C3AED] rounded-full flex items-center justify-center">
                    <Award className="h-7 w-7 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-[#E9D5FF] mb-2">
                  PRO 회원 혜택으로 AI 해설을 받아보세요!
                </h3>
                <p className="text-[#C4B5FD] mb-4">
                  • AI 상세 해설 무제한 이용<br/>
                  • 단계별 풀이 과정 제공<br/>
                  • 개념 설명 및 학습 팁
                </p>
                <p className="text-sm text-[#A78BFA] mb-4">현재 등급: <span className="font-bold uppercase">{membershipTier}</span></p>
                <Button 
                  onClick={() => setLocation('/subscription')}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-8 py-3 text-lg font-bold"
                >
                  PRO로 업그레이드 →
                </Button>
              </div>
            )}

            {loadingExplanations[question.id] && (
              <Card className="gq-dark-card border shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#A78BFA]" />
                    <span className="text-lg font-medium text-[#C4B5FD]">AI가 상세 해설을 생성하고 있습니다...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {explanations[question.id] && (
              <Card className="gq-dark-card border shadow-xl">
                <CardHeader className="bg-[#1A1035] text-white">
                  <CardTitle className="text-xl font-bold flex items-center">
                    <Sparkles className="w-5 h-5 mr-3" />
                    AI 상세 해설
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="prose max-w-none">
                    <div className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">
                      {explanations[question.id]}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Modern Navigation */}
          <div className="mt-8 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="px-8 py-3 rounded-xl shadow-md hover:bg-purple-50 border-purple-200 hover:border-purple-300 transition-all disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-base">Previous</span>
            </Button>

            <div className="text-center">
              {question.type === 'numeric_entry' && (
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  Your Answer: {answers[question.id] || "Not entered"}
                </Badge>
              )}
            </div>

            {currentQuestion < questions.length - 1 ? (
              <Button 
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <span className="text-base">Next</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <span className="text-base">Submit</span>
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Floating Calculator */}
        {showCalculator && (
          <div 
            className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200"
            data-testid="floating-calculator"
          >
            <Suspense fallback={<div className="bg-white rounded-xl shadow-2xl p-8 w-80 text-center text-gray-600">Loading calculator...</div>}>
              <DeferredScientificCalculator onClose={() => setShowCalculator(false)} />
            </Suspense>
          </div>
        )}
      </div>
    </FullscreenWrapper>
    </SecurityWrapper>
  );
}
