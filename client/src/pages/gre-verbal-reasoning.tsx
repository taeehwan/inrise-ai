import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Clock, BookOpen, ArrowLeft, ArrowRight, ChevronRight, Lightbulb, Bot, FileText, Loader2, Sparkles, Maximize, Minimize, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import { useFullscreen } from "@/hooks/useFullscreen";
import type { GreVerbalAnswer as VerbalAnswer, GreVerbalQuestion as Question } from "@/components/gre-verbal/shared";

const DeferredGreVerbalResultsView = lazy(() => import("@/components/gre-verbal/GreVerbalResultsView"));
const DeferredGreVerbalTestSelectionView = lazy(
  () => import("@/components/gre-verbal/GreVerbalTestSelectionView"),
);

type CompletionOptions = {
  blank1?: string[];
  blank2?: string[];
  blank3?: string[];
  [key: string]: string[] | undefined;
};

interface TestSetQuestionApi {
  id?: string;
  questionType?: Question["type"];
  passage?: string;
  direction?: string;
  questionText?: string;
  options?: string[] | CompletionOptions | null;
  correctAnswer?: string | string[] | null;
  explanation?: string | null;
  blanks?: number | null;
  sentences?: string[] | null;
}

interface TestSetApiResponse {
  section?: string | null;
  questions?: TestSetQuestionApi[] | null;
}

const defaultSampleQuestions: Question[] = [
  {
    id: "1",
    type: "reading_comprehension",
    passage: "The author of the passage mentions the classical conception of fire and primarily as order to suggest that Greek philosophers, regarding certain basic phenomena of the physical world, had a tendency to provide explanations that might or might not be scientifically sound. Judgments regarding their objectives or subjectivity appropriateness are likely that their theories were based on their direct experiences with fire, and they did not show correspondence between the two phenomena that one might expect. A priori, it appears as though this approach would allow them to provide accurate predictions, but we need to understand how their approach worked compared to other approaches to see if their results.",
    question: "Consider each of the choices separately and select all that apply. Which of the following statements is supported by the information given?",
    options: [
      "The pull theory is not universally accepted by scientists.",
      "The pull theory depends on one of water's physical properties.",
      "The push theory originated earlier than did the pull theory.",
      "The relationship cannot be determined from the information given."
    ],
    correctAnswer: ["The pull theory is not universally accepted by scientists.", "The pull theory depends on one of water's physical properties."],
    explanation: "The passage indicates both that the pull theory isn't universally accepted and that it relies on water's physical properties."
  },
  {
    id: "2",
    type: "reading_comprehension",
    passage: "Many historians have noted that the Industrial Revolution, which began in Britain in the late 18th century, fundamentally transformed human society. The shift from agrarian economies to industrial ones created new social classes, altered family structures, and gave rise to urbanization on an unprecedented scale. Workers who had previously farmed small plots of land now found themselves in crowded cities, toiling in factories for long hours under difficult conditions.",
    question: "According to the passage, which of the following was a consequence of the Industrial Revolution?",
    options: [
      "A decrease in the urban population",
      "The emergence of new social classes",
      "An improvement in working conditions",
      "The preservation of agrarian economies"
    ],
    correctAnswer: "The emergence of new social classes",
    explanation: "The passage explicitly states that the Industrial Revolution 'created new social classes.'"
  },
  {
    id: "3",
    type: "text_completion",
    question: "The scientist's research was so _______ that it covered every possible aspect of the problem, leaving no question _______.",
    options: {
      blank1: ["meticulous", "hasty", "careless"],
      blank2: ["unexplored", "answered", "forgotten"]
    },
    correctAnswer: "meticulous ... unexplored",
    explanation: "A meticulous account pays careful attention to detail, ensuring no aspect is left unexplored."
  }
];

const dashRangePattern = "[-:" + "\\u2013" + "\\u2014]";
const dashOnlyPattern = "[-" + "\\u2013" + "\\u2014]";

const passagePrefixPattern = new RegExp(
  `^Passage for [Qq]uestion(?:\\(s\\)|s)?\\s*\\d+(?:\\s*(?:to|through|between|${dashRangePattern})\\s*\\d+)?[.:\\-\\s]*`,
  "i",
);

const questionsPrefixPattern = new RegExp(
  `^Questions?\\s*\\d+(?:\\s*(?:to|through|between|${dashOnlyPattern})\\s*\\d+)?\\s*(?:is|are)\\s*based\\s*on\\s*the\\s*following\\s*reading\\s*passage[.:\\-\\s]*`,
  "i",
);

export default function GreVerbalReasoning() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast} = useToast();
  const { isPro, membershipTier } = useAuth();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { language } = useLanguage();
  const { logTestStart, logAIUsage } = useActivityTracker();
  const testId = new URLSearchParams(searchParams).get('testId') || '';
  
  useEffect(() => {
    logTestStart('gre_verbal_reasoning', testId || 'default');
  }, [testId]);
  
  const [timeRemaining, setTimeRemaining] = useState(18 * 60);
  const [isStarted, setIsStarted] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, VerbalAnswer>>({});
  const [showResults, setShowResults] = useState(false);
  const [explanations, setExplanations] = useState<{ [key: string]: string }>({});
  const [loadingExplanations, setLoadingExplanations] = useState<{ [key: string]: boolean }>({});

  const { data: availableTests, isLoading: testsLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/verbal/tests'],
  });

  const cleanPassage = (passage: string): string => {
    return passage
      .replace(passagePrefixPattern, '')
      .replace(questionsPrefixPattern, '')
      .trim();
  };

  const { data: testData, isLoading: isLoadingTest } = useQuery<TestSetApiResponse>({
    queryKey: [`/api/test-sets/${testId}`],
    enabled: testId.length > 0,
    retry: false,
  });

  useEffect(() => {
    if (testData && testData.section === 'quantitative') {
      setLocation(`/gre/quantitative-reasoning?testId=${testId}`);
    }
  }, [testData, testId, setLocation]);

  const loadedQuestions: Question[] = testData?.questions?.map((q, index) => {
    let processedOptions: Question["options"];
    if (q.questionType === 'text_completion' && q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
      processedOptions = q.options;
    } else if (Array.isArray(q.options)) {
      processedOptions = q.options;
    } else if (q.options && typeof q.options === 'object') {
      processedOptions = Object.values(q.options).flat().filter((option): option is string => typeof option === "string");
    } else {
      processedOptions = [];
    }

    return {
      id: q.id || `q${index + 1}`,
      type: q.questionType as 'reading_comprehension' | 'text_completion' | 'sentence_equivalence' | 'sentence_selection' | 'select_all_that_apply',
      passage: q.passage || undefined,
      direction: q.direction || undefined,
      question: q.questionText || '',
      options: processedOptions,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      blanks: q.blanks || undefined,
      sentences: q.sentences || undefined
    };
  }) || [];

  const questions = testId && loadedQuestions.length > 0 ? loadedQuestions : [];
  
  const hasTestId = testId && testId.length > 0;
  const shouldShowTestSelection = !hasTestId || (!isLoadingTest && questions.length === 0);

  const generateReport = (correctCount: number, totalCount: number) => {
    const percentage = Math.round((correctCount / totalCount) * 100);
    const reportData = {
      testType: "GRE Verbal Reasoning",
      score: `${correctCount}/${totalCount}`,
      percentage,
      date: new Date().toLocaleDateString('ko-KR'),
      sections: [
        { name: "Reading Comprehension", performance: percentage >= 80 ? "우수" : percentage >= 60 ? "보통" : "개선 필요" },
        { name: "Text Completion", performance: percentage >= 80 ? "우수" : percentage >= 60 ? "보통" : "개선 필요" },
        { name: "Sentence Equivalence", performance: percentage >= 80 ? "우수" : percentage >= 60 ? "보통" : "개선 필요" }
      ]
    };
    
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(`
        <html>
          <head>
            <title>GRE Verbal Reasoning 성적표</title>
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
              <h1>GRE Verbal Reasoning 성적표</h1>
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
    
    toast({ title: "성적표 생성 완료", description: "새 창에서 성적표를 확인하세요." });
  };

  const explanationMutation = useMutation({
    mutationFn: async ({ questionId, question }: { questionId: string; question: any }) => {
      console.log("Verbal AI 해설 요청", question);
      const response = await apiRequest("POST", "/api/gre/verbal/explanation", {
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        questionType: question.type,
        passage: question.passage || null,
        language: language
      });
      const data = await response.json();
      console.log("Verbal AI 해설 응답", data);
      return data;
    },
    onSuccess: (data: any, variables) => {
      console.log("Verbal 해설 설정", data);
      const explanation = data?.explanation || "해설을 가져올 수 없습니다.";
      setExplanations(prev => ({ ...prev, [variables.questionId]: explanation }));
      setLoadingExplanations(prev => ({ ...prev, [variables.questionId]: false }));
    },
    onError: (error, variables) => {
      console.error("Verbal 해설 오류", error);
      setLoadingExplanations(prev => ({ ...prev, [variables.questionId]: false }));
      toast({ title: "오류", description: "AI 해설 생성 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (isStarted && timeRemaining > 0 && !showResults) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) { handleTimeUp(); return 0; }
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
    toast({ title: "시험 시작", description: "18분 타이머가 시작되었습니다." });
  };

  const handleTimeUp = () => {
    toast({ title: "⏰ 시간 종료", description: "18분이 경과했습니다. 답안을 확인하고 제출 버튼을 눌러주세요." });
  };

  const handleAnswerChange = (questionId: string, answer: VerbalAnswer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleRequestExplanation = (questionId: string, question: Question) => {
    if (!isPro) {
      toast({ title: "🔒 PRO 등급 필요", description: "AI 해설 기능은 PRO 이상 회원만 이용 가능합니다.", variant: "destructive" });
      return;
    }
    setLoadingExplanations((prev) => ({ ...prev, [questionId]: true }));
    explanationMutation.mutate({ questionId, question });
  };

  const handleSubmit = () => {
    setShowResults(true);
    const correctCount = questions.filter(q => {
      const userAnswer = answers[q.id];
      if (Array.isArray(q.correctAnswer)) {
        return Array.isArray(userAnswer) && 
               userAnswer.length === q.correctAnswer.length &&
               userAnswer.every(ans => q.correctAnswer.includes(ans));
      }
      return userAnswer === q.correctAnswer;
    }).length;
    toast({ title: "제출 완료", description: `${questions.length}문제 중 ${correctCount}문제 정답` });
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'reading_comprehension': return '독해';
      case 'text_completion': return '빈칸추론';
      case 'sentence_equivalence': return '문장완성';
      default: return type;
    }
  };

  const progressPercentage = ((18 * 60 - timeRemaining) / (18 * 60)) * 100;

  /* ──────────────────────────────────────────────
     AI Explanation helper (used in RC + sentence_selection panels)
  ────────────────────────────────────────────── */
  const renderAIExplanationInline = (qId: string, q: Question) => (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(124,58,237,0.12)' }}>
      {!explanations[qId] && !loadingExplanations[qId] && (
        <div className="relative inline-block group">
          <button
            className={`gv-btn-primary text-sm py-1.5 px-4 ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => {
              if (!isPro) {
                toast({ title: "🔒 PRO 등급 필요", description: "AI 해설 기능은 PRO 이상 회원만 이용 가능합니다.", variant: "destructive" });
                return;
              }
              setLoadingExplanations(prev => ({ ...prev, [qId]: true }));
              explanationMutation.mutate({ questionId: qId, question: q });
            }}
          >
            <Bot className="w-4 h-4" />
            해설 보기
            {!isPro && <span className="ml-1 text-xs">🔒</span>}
          </button>
          {!isPro && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                PRO 등급 이상 필요
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
        </div>
      )}
      {loadingExplanations[qId] && (
        <div className="gv-loading-bar">
          <Bot className="w-4 h-4 animate-pulse" />
          <span>AI가 해설을 생성중입니다...</span>
        </div>
      )}
      {explanations[qId] && (
        <div className="space-y-2">
          <div className="flex items-center gap-2" style={{ color: 'var(--gve-accent-soft)' }}>
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-medium">AI 해설</span>
          </div>
          <div className="gv-ai-body max-h-40 overflow-y-auto rounded-lg" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)', padding: '10px 14px', fontSize: '13px' }}>
            {explanations[qId]}
          </div>
        </div>
      )}
    </div>
  );

  /* ──────────────────────────────────────────────
     INTRO VIEW (isStarted=false — currently starts immediately so rarely shown)
  ────────────────────────────────────────────── */
  if (!isStarted) {
    return (
      <SecurityWrapper 
        watermark="iNRISE GRE VERBAL REASONING TEST"
        disableRightClick={true}
        disableKeyboardShortcuts={true}
        disableTextSelection={true}
        disableScreenshot={true}
        showSecurityNotice={true}
      >
        <FullscreenWrapper className="gv-page gre-font">
          <div className="gv-header">
            <h1 className="text-2xl font-bold tracking-wide" style={{ color: 'var(--gve-text-primary)' }}>GRE Verbal Reasoning</h1>
          </div>
          <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
              <button className="gv-btn-secondary" onClick={() => setLocation("/gre")}>
                <ArrowLeft className="w-4 h-4" />
                GRE 선택으로 돌아가기
              </button>
            </div>

            <div className="gv-card p-6">
              <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid var(--gve-border-default)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
                  <BookOpen className="w-5 h-5" style={{ color: 'var(--gve-accent-soft)' }} />
                </div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--gve-text-primary)' }}>GRE Verbal Reasoning</h2>
              </div>

              <div className="space-y-6 p-2">
                <div>
                  <h3 className="font-semibold mb-4" style={{ color: 'var(--gve-text-secondary)', fontSize: '115%' }}>문제 유형</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { title: 'Reading Comprehension', desc: '지문을 읽고 내용을 이해하여 문제에 답하기' },
                      { title: 'Text Completion', desc: '문맥에 맞는 단어나 구문으로 빈칸 채우기' },
                      { title: 'Sentence Equivalence', desc: '문장의 의미가 같아지는 두 개의 답 선택' },
                    ].map(f => (
                      <div key={f.title} className="gv-intro-feature">
                        <h4 className="font-semibold mb-1" style={{ color: 'var(--gve-text-secondary)', fontSize: '95%' }}>{f.title}</h4>
                        <p style={{ color: 'var(--gve-text-muted)', fontSize: '88%' }}>{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <span className="gv-q-badge flex items-center gap-1.5 px-4 py-2">
                    <Clock className="w-4 h-4" /> 18분
                  </span>
                  <span className="gv-q-badge px-4 py-2">{questions.length}문제</span>
                </div>

                <div className="text-center">
                  <button onClick={handleStart} className="gv-btn-primary text-base px-10 py-3">
                    시험 시작하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FullscreenWrapper>
      </SecurityWrapper>
    );
  }

  /* ──────────────────────────────────────────────
     RESULTS VIEW
  ────────────────────────────────────────────── */
  if (showResults) {
    return (
      <Suspense fallback={<div className="gv-page flex items-center justify-center gre-font"><div className="gv-loading-bar px-8 py-5 rounded-xl"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--gve-accent-primary)" }} /><span style={{ color: "var(--gve-text-secondary)" }}>결과를 불러오는 중...</span></div></div>}>
        <DeferredGreVerbalResultsView
          questions={questions}
          answers={answers}
          explanations={explanations}
          loadingExplanations={loadingExplanations}
          isPro={isPro}
          membershipTier={membershipTier}
          getQuestionTypeLabel={getQuestionTypeLabel}
          onRequestExplanation={handleRequestExplanation}
          onGenerateReport={generateReport}
          onBack={() => setLocation("/gre")}
          onUpgrade={() => setLocation("/subscription")}
        />
      </Suspense>
    );
  }

  /* ──────────────────────────────────────────────
     LOADING VIEW
  ────────────────────────────────────────────── */
  if (isLoadingTest) {
    return (
      <div className="gv-page flex items-center justify-center gre-font">
        <div className="gv-loading-bar px-8 py-5 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--gve-accent-primary)' }} />
          <span style={{ color: 'var(--gve-text-secondary)' }}>테스트를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────
     TEST SELECTION VIEW
  ────────────────────────────────────────────── */
  if (shouldShowTestSelection) {
    return (
      <Suspense fallback={<div className="gv-page flex items-center justify-center gre-font"><div className="gv-loading-bar px-8 py-5 rounded-xl"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--gve-accent-primary)" }} /><span style={{ color: "var(--gve-text-secondary)" }}>테스트 목록을 불러오는 중...</span></div></div>}>
        <DeferredGreVerbalTestSelectionView
          testsLoading={testsLoading}
          availableTests={availableTests}
          onBack={() => setLocation("/gre")}
          onSelectTest={(selectedTestId) => setLocation(`/gre/verbal-reasoning?testId=${selectedTestId}`)}
          onCreateAiTest={() => setLocation("/ai-test-creator")}
        />
      </Suspense>
    );
  }

  /* ──────────────────────────────────────────────
     MAIN EXAM VIEW
  ────────────────────────────────────────────── */
  const question = questions[currentQuestion];

  return (
    <SecurityWrapper 
      watermark="iNRISE GRE VERBAL REASONING TEST"
      disableRightClick={true}
      disableKeyboardShortcuts={true}
      disableTextSelection={true}
      disableScreenshot={true}
      showSecurityNotice={true}
    >
      <FullscreenWrapper hideButton={true}>
      <div className="gv-page">
        {/* ── Header ── */}
        <div className="gv-header">
          <div className="container mx-auto px-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <button
                  className="gv-btn-secondary py-1.5 px-3 text-sm"
                  onClick={() => setLocation("/gre")}
                >
                  <ArrowLeft className="w-4 h-4" />
                  GRE
                </button>
                <div className="gv-separator"></div>
                <div>
                  <span className="gv-section-label">GRE Verbal Reasoning</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="gv-q-badge">Q {currentQuestion + 1} / {questions.length}</span>
                    <span className="gv-type-badge">{getQuestionTypeLabel(question?.type)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="gv-timer">
                  <Clock className="w-4 h-4" />
                  {formatTime(timeRemaining)}
                </div>
                <button
                  onClick={handleSubmit}
                  className="gv-btn-submit"
                >
                  <FileText className="w-4 h-4" />
                  제출
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="gv-btn-secondary py-1.5 px-3"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  {isFullscreen ? "Exit" : "Full"}
                </button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="gv-progress-track mt-3">
              <div className="gv-progress-fill" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-4">
          {/* ── Question Navigator ── */}
          <div className="gv-navigator mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className="gv-nav-arrow"
                    data-testid="btn-prev-question"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--gve-text-secondary)' }}>
                    Q {currentQuestion + 1}/{questions.length}
                  </span>
                  <button
                    onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                    disabled={currentQuestion === questions.length - 1}
                    className="gv-nav-arrow"
                    data-testid="btn-next-question"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="gv-separator"></div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {questions.map((q: Question, index: number) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestion(index)}
                      className={`gv-nav-num ${
                        currentQuestion === index ? 'gv-num-current' : answers[q.id] ? 'gv-num-answered' : ''
                      }`}
                      data-testid={`button-nav-question-${index + 1}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--gve-text-dim)' }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: 'rgba(124,58,237,0.14)', border: '1px solid rgba(124,58,237,0.16)' }}></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: 'transparent', border: '1px solid rgba(124,58,237,0.12)' }}></div>
                  <span>Unanswered</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Content Area ── */}

          {/* SENTENCE SELECTION — Split Panel */}
          {question.type === 'sentence_selection' ? (() => {
            const sentenceList: string[] = question.sentences && question.sentences.length > 0
              ? question.sentences
              : question.passage
                ? question.passage.split(/(?<=[.!?])\s+/).map((s: string) => s.trim()).filter((s: string) => s.length > 10)
                : [];
            const passageText = question.passage || sentenceList.join(' ');
            const selectedSentence: string | null =
              typeof answers[question.id] === "string" ? (answers[question.id] as string) : null;

            return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
              {/* Left: Passage */}
              <div className="gv-passage-panel flex flex-col">
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
                  <BookOpen className="w-4 h-4" style={{ color: 'var(--gve-accent-soft)' }} />
                  <span className="font-semibold" style={{ color: 'var(--gve-text-secondary)', fontSize: '95%' }}>Reading Passage</span>
                </div>
                <div className="overflow-y-auto flex-1">
                  <p className="gv-passage-text" style={{ fontFamily: 'Arial, sans-serif', fontSize: '115%' }}>
                    {passageText ? cleanPassage(passageText) : ''}
                  </p>
                </div>
              </div>

              {/* Right: Question + Sentence choices */}
              <div className="gv-question-panel flex flex-col overflow-y-auto">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--gve-text-muted)', fontSize: '90%' }}>Question {currentQuestion + 1}</h3>
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="gv-question-text mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>{question.question}</p>
                    <p className="text-xs" style={{ color: 'var(--gve-text-dim)' }}>아래에서 해당 문장 번호를 선택하세요.</p>
                  </div>

                  <div className="space-y-2">
                    {sentenceList.map((sentence, index) => {
                      const sentenceId = `Sentence ${index + 1}`;
                      const isSelected = answers[question.id] === sentenceId;
                      return (
                        <button
                          key={index}
                          onClick={() => setAnswers(prev => ({ ...prev, [question.id]: sentenceId }))}
                          className={`gv-sentence-sel-btn ${isSelected ? 'gv-selected' : ''}`}
                        >
                          <span className="gv-sentence-num">{index + 1}</span>
                          <p className="leading-relaxed text-sm flex-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {sentence.length > 120 ? sentence.substring(0, 120) + '…' : sentence}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {selectedSentence && (
                    <div className="rounded-lg p-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
                      <p className="text-xs font-medium" style={{ color: 'var(--gve-accent-soft)' }}>
                        선택: {selectedSentence}
                      </p>
                    </div>
                  )}

                  {renderAIExplanationInline(question.id, question)}
                </div>
              </div>
            </div>
            );
          })() : question.passage ? (
            /* READING COMPREHENSION — Split Panel */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
              {/* Left: Passage */}
              <div className="gv-passage-panel flex flex-col">
                <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
                  <BookOpen className="w-4 h-4" style={{ color: 'var(--gve-accent-soft)' }} />
                  <span className="font-semibold" style={{ color: 'var(--gve-text-secondary)', fontSize: '95%' }}>Reading Passage</span>
                </div>
                <div className="overflow-y-auto flex-1">
                  <p className="gv-passage-text" style={{ fontFamily: 'Arial, sans-serif', fontSize: '115%' }}>
                    {question.passage ? cleanPassage(question.passage) : ''}
                  </p>
                </div>
              </div>
              
              {/* Right: Question */}
              <div className="gv-question-panel flex flex-col overflow-y-auto">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--gve-text-muted)', fontSize: '90%' }}>Question {currentQuestion + 1}</h3>
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="gv-question-text mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>{question.question}</p>
                  </div>

                  <div className="space-y-2">
                    {(question.type === 'select_all_that_apply' || Array.isArray(question.correctAnswer)) ? (
                      <div className="space-y-2">
                        <p className="text-sm mb-3" style={{ color: 'var(--gve-text-dim)' }}>다음 중 해당하는 것을 모두 선택하세요:</p>
                        {Array.isArray(question.options) && question.options.map((option: string, index: number) => {
                          const isSelected = (answers[question.id] as string[] || []).includes(option);
                          return (
                            <button
                              key={index}
                              className={`gv-choice ${isSelected ? 'gv-selected' : ''}`}
                              onClick={() => {
                                const currentAnswers = (answers[question.id] as string[]) || [];
                                if (isSelected) {
                                  setAnswers(prev => ({ ...prev, [question.id]: currentAnswers.filter(ans => ans !== option) }));
                                } else {
                                  setAnswers(prev => ({ ...prev, [question.id]: [...currentAnswers, option] }));
                                }
                              }}
                            >
                              <span className="gv-choice-sq">{isSelected ? '✓' : String.fromCharCode(65 + index)}</span>
                              <span style={{ fontFamily: 'Arial, sans-serif' }}>{option}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      Array.isArray(question.options) && question.options.map((option: string, index: number) => {
                        const isSelected = answers[question.id] === option;
                        return (
                          <button
                            key={index}
                            className={`gv-choice ${isSelected ? 'gv-selected' : ''}`}
                            onClick={() => setAnswers(prev => ({ ...prev, [question.id]: option }))}
                          >
                            <span className="gv-choice-indicator">{isSelected ? '●' : String.fromCharCode(65 + index)}</span>
                            <span style={{ fontFamily: 'Arial, sans-serif' }}>{option}</span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {renderAIExplanationInline(question.id, question)}
                </div>
              </div>
            </div>
          ) : (
            /* NON-READING QUESTIONS — Full Width */
            <div className="gv-card p-6 md:p-8">
              {/* Question Header */}
              <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.18)' }}>
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--gve-accent-soft)' }} />
                </div>
                <span className="font-semibold" style={{ color: 'var(--gve-text-secondary)' }}>Question {currentQuestion + 1}</span>
              </div>

              {/* Direction */}
              {question.direction && (
                <p className="gv-direction-text mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {question.direction}
                </p>
              )}
              
              {/* Question/Prompt */}
              <p className="mb-6 leading-relaxed" style={{ fontFamily: 'Arial, sans-serif', fontSize: '115%', color: 'var(--gve-text-secondary)' }}>
                {question.question}
              </p>

              {/* Answer Options */}
              <div className="mb-6">
                {question.type === 'text_completion' && !Array.isArray(question.options) ? (
                  /* TEXT COMPLETION — Multi-blank */
                  <div className="space-y-5">
                    {Object.keys(question.options).map((blankKey, blankIndex) => {
                      const blankOptions = (question.options as CompletionOptions)[blankKey];
                      
                      return (
                        <div key={blankKey} className="gv-blank-group">
                          <div className="gv-blank-label">Blank ({['i', 'ii', 'iii'][blankIndex]})</div>
                          <div className="space-y-2">
                            {blankOptions?.map((option: string, index: number) => {
                              const currentAnswer = (answers[question.id] as Record<string, string> | undefined) || {};
                              const isSelected = currentAnswer[blankKey] === option;
                              return (
                                <button
                                  key={index}
                                  className={`gv-choice ${isSelected ? 'gv-selected' : ''}`}
                                  onClick={() => {
                                    handleAnswerChange(question.id, { ...currentAnswer, [blankKey]: option });
                                  }}
                                >
                                  <span className="gv-choice-indicator">{isSelected ? '●' : String.fromCharCode(65 + index)}</span>
                                  <span style={{ fontFamily: 'Arial, sans-serif' }}>{String.fromCharCode(65 + index)}. {option}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : question.type === 'sentence_equivalence' ? (
                  /* SENTENCE EQUIVALENCE — Select 2 */
                  <div className="space-y-2">
                    {Array.isArray(question.options) && question.options.map((option: string, index: number) => {
                      const isSelected = Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option);
                      return (
                        <button
                          key={index}
                          className={`gv-choice ${isSelected ? 'gv-selected' : ''}`}
                          onClick={() => {
                            const currentAnswers = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : [];
                            if (isSelected) {
                              handleAnswerChange(question.id, currentAnswers.filter(ans => ans !== option));
                            } else {
                              if (currentAnswers.length < 2) {
                                handleAnswerChange(question.id, [...currentAnswers, option]);
                              }
                            }
                          }}
                        >
                          <span className="gv-choice-sq">{isSelected ? '✓' : String.fromCharCode(65 + index)}</span>
                          <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '115%' }}>{String.fromCharCode(65 + index)}. {option}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : question.type === 'select_all_that_apply' ? (
                  /* SELECT ALL THAT APPLY */
                  <div className="space-y-2">
                    <p className="text-sm mb-3" style={{ color: 'var(--gve-text-dim)' }}>다음 중 해당하는 것을 모두 선택하세요 (복수 선택 가능):</p>
                    {Array.isArray(question.options) && question.options.map((option: string, index: number) => {
                      const isSelected = Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option);
                      return (
                        <button
                          key={index}
                          className={`gv-choice ${isSelected ? 'gv-selected' : ''}`}
                          onClick={() => {
                            const currentAnswers = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : [];
                            if (isSelected) {
                              handleAnswerChange(question.id, currentAnswers.filter(ans => ans !== option));
                            } else {
                              handleAnswerChange(question.id, [...currentAnswers, option]);
                            }
                          }}
                        >
                          <span className="gv-choice-sq">{isSelected ? '✓' : String.fromCharCode(65 + index)}</span>
                          <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '115%' }}>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* STANDARD SINGLE CHOICE (RC without passage, default) */
                  <div className="space-y-2">
                    {Array.isArray(question.options) && question.options.map((option: string, index: number) => {
                      const isSelected = answers[question.id] === option;
                      return (
                        <button
                          key={index}
                          className={`gv-choice ${isSelected ? 'gv-selected' : ''}`}
                          onClick={() => handleAnswerChange(question.id, option)}
                        >
                          <span className="gv-choice-indicator">{isSelected ? '●' : String.fromCharCode(65 + index)}</span>
                          <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '115%' }}>
                            {String.fromCharCode(65 + index)}. {option}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid rgba(124,58,237,0.1)' }}>
                <button
                  className="gv-btn-secondary"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  <ArrowLeft className="w-4 h-4" />
                  이전
                </button>

                <div className="text-sm font-medium" style={{ color: 'var(--gve-text-dim)' }}>
                  {question.type === 'sentence_equivalence' && 
                    `선택된 답: ${Array.isArray(answers[question.id]) ? (answers[question.id] as string[]).length : 0}/2`
                  }
                </div>

                {currentQuestion < questions.length - 1 ? (
                  <button
                    className="gv-btn-primary"
                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  >
                    다음
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button className="gv-btn-submit" onClick={handleSubmit}>
                    제출
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        
          {/* ── Bottom AI Explanation (Non-Reading questions) ── */}
          {question && !question.passage && (
            <div className="mt-8">
              {!explanations[question.id] && !loadingExplanations[question.id] && (
                <div className="text-center">
                  <div className="relative inline-block group">
                    <button 
                      className={`gv-btn-primary px-8 py-3 text-base ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (!isPro) {
                          toast({ title: "🔒 PRO 등급 필요", description: "AI 해설 기능은 PRO 이상 회원만 이용 가능합니다.", variant: "destructive" });
                          return;
                        }
                        setLoadingExplanations(prev => ({ ...prev, [question.id]: true }));
                        explanationMutation.mutate({ questionId: question.id, question });
                      }}
                    >
                      <Bot className="w-5 h-5" />
                      해설 보기
                      {!isPro && <span className="ml-2 text-sm">🔒 PRO</span>}
                    </button>
                    {!isPro && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap">
                          PRO 등급 이상 필요
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Upgrade Notice */}
              {!isPro && !explanations[question.id] && !loadingExplanations[question.id] && (
                <div className="mt-6 gv-upgrade-box">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.25)' }}>
                      <Award className="h-7 w-7" style={{ color: 'var(--gve-accent-pale)' }} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--gve-text-primary)' }}>
                    PRO 회원 혜택으로 AI 해설을 받아보세요!
                  </h3>
                  <p className="mb-4" style={{ color: 'var(--gve-text-muted)' }}>
                    • AI 상세 해설 무제한 이용<br/>
                    • 독해 지문 분석 및 해석<br/>
                    • 어휘 학습 팁 제공
                  </p>
                  <p className="text-sm mb-4" style={{ color: 'var(--gve-text-dim)' }}>
                    현재 등급: <span className="font-bold uppercase" style={{ color: 'var(--gve-accent-soft)' }}>{membershipTier}</span>
                  </p>
                  <button 
                    onClick={() => setLocation('/subscription')}
                    className="gv-btn-primary px-8 py-3 text-lg font-bold"
                  >
                    PRO로 업그레이드 →
                  </button>
                </div>
              )}

              {loadingExplanations[question.id] && (
                <div className="gv-loading-bar rounded-xl p-6 mt-4">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--gve-accent-primary)' }} />
                  <span className="text-lg font-medium" style={{ color: 'var(--gve-text-secondary)' }}>AI가 상세 해설을 생성하고 있습니다...</span>
                </div>
              )}

              {explanations[question.id] && (
                <div className="gv-ai-card mt-4">
                  <div className="gv-ai-header">
                    <Sparkles className="w-5 h-5" style={{ color: 'var(--gve-accent-pale)' }} />
                    <h3 className="text-lg font-bold" style={{ color: 'var(--gve-text-primary)' }}>AI 상세 해설</h3>
                  </div>
                  <div className="gv-ai-body">
                    {explanations[question.id]}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </FullscreenWrapper>
    </SecurityWrapper>
  );
}
