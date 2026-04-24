import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Clock, Calculator, ArrowLeft, ArrowRight, ChevronRight, Lightbulb, Bot, Loader2, Award, Play, FileText, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { formatMathText } from "@/lib/utils";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";

interface SATTest {
  id: string;
  title: string;
  difficulty: string;
  isActive: boolean;
  createdAt: string;
  questionCount: number;
}

function ScientificCalculator({ onClose }: { onClose?: () => void }) {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [memory, setMemory] = useState<number>(0);
  const [isNewNumber, setIsNewNumber] = useState(true);

  const handleNumber = (num: string) => {
    if (isNewNumber) {
      setDisplay(num);
      setIsNewNumber(false);
    } else {
      setDisplay(prev => prev === "0" ? num : prev + num);
    }
  };

  const handleOperator = (op: string) => {
    setExpression(prev => prev + display + op);
    setIsNewNumber(true);
  };

  const handleEquals = () => {
    try {
      const fullExpr = expression + display;
      const sanitized = fullExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, Math.PI.toString())
        .replace(/e(?![x])/g, Math.E.toString());
      const result = Function('"use strict"; return (' + sanitized + ')')();
      setDisplay(String(Number(result.toFixed(10))));
      setExpression("");
      setIsNewNumber(true);
    } catch {
      setDisplay("Error");
      setExpression("");
      setIsNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setExpression("");
    setIsNewNumber(true);
  };

  const handleFunction = (func: string) => {
    const num = parseFloat(display);
    let result: number;
    switch (func) {
      case 'sin': result = Math.sin(num * Math.PI / 180); break;
      case 'cos': result = Math.cos(num * Math.PI / 180); break;
      case 'tan': result = Math.tan(num * Math.PI / 180); break;
      case 'sqrt': result = Math.sqrt(num); break;
      case 'square': result = num * num; break;
      case 'log': result = Math.log10(num); break;
      case 'ln': result = Math.log(num); break;
      case 'abs': result = Math.abs(num); break;
      case '1/x': result = 1 / num; break;
      case 'percent': result = num / 100; break;
      case 'negate': result = -num; break;
      default: result = num;
    }
    setDisplay(String(Number(result.toFixed(10))));
    setIsNewNumber(true);
  };

  const CalcButton = ({ value, onClick, className = "", wide = false }: { value: string; onClick: () => void; className?: string; wide?: boolean }) => (
    <button
      onClick={onClick}
      className={`${wide ? 'col-span-2' : ''} h-12 rounded-lg font-semibold text-lg transition-all active:scale-95 ${className}`}
    >
      {value}
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-2xl p-4 w-80">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-purple-800">Scientific Calculator</h3>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <div className="bg-gray-900 text-white p-4 rounded-lg mb-3">
        <div className="text-xs text-gray-400 h-4 overflow-hidden">{expression}</div>
        <div className="text-3xl font-mono text-right overflow-x-auto">{display}</div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        <CalcButton value="sin" onClick={() => handleFunction('sin')} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="cos" onClick={() => handleFunction('cos')} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="tan" onClick={() => handleFunction('tan')} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="√" onClick={() => handleFunction('sqrt')} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />
        <CalcButton value="x²" onClick={() => handleFunction('square')} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />

        <CalcButton value="log" onClick={() => handleFunction('log')} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="ln" onClick={() => handleFunction('ln')} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />
        <CalcButton value="π" onClick={() => handleNumber(Math.PI.toString())} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />
        <CalcButton value="e" onClick={() => handleNumber(Math.E.toString())} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />
        <CalcButton value="1/x" onClick={() => handleFunction('1/x')} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />

        <CalcButton value="C" onClick={handleClear} className="bg-red-100 text-red-600 hover:bg-red-200" />
        <CalcButton value="±" onClick={() => handleFunction('negate')} className="bg-gray-200 text-gray-700 hover:bg-gray-300" />
        <CalcButton value="%" onClick={() => handleFunction('percent')} className="bg-gray-200 text-gray-700 hover:bg-gray-300" />
        <CalcButton value="÷" onClick={() => handleOperator('÷')} className="bg-fuchsia-500 text-white hover:bg-fuchsia-600" />
        <CalcButton value="(" onClick={() => handleNumber('(')} className="bg-gray-200 text-gray-700 hover:bg-gray-300" />

        <CalcButton value="7" onClick={() => handleNumber('7')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="8" onClick={() => handleNumber('8')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="9" onClick={() => handleNumber('9')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="×" onClick={() => handleOperator('×')} className="bg-fuchsia-500 text-white hover:bg-fuchsia-600" />
        <CalcButton value=")" onClick={() => handleNumber(')')} className="bg-gray-200 text-gray-700 hover:bg-gray-300" />

        <CalcButton value="4" onClick={() => handleNumber('4')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="5" onClick={() => handleNumber('5')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="6" onClick={() => handleNumber('6')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="-" onClick={() => handleOperator('-')} className="bg-fuchsia-500 text-white hover:bg-fuchsia-600" />
        <CalcButton value="^" onClick={() => handleOperator('**')} className="bg-purple-100 text-purple-700 hover:bg-purple-200" />

        <CalcButton value="1" onClick={() => handleNumber('1')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="2" onClick={() => handleNumber('2')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="3" onClick={() => handleNumber('3')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="+" onClick={() => handleOperator('+')} className="bg-fuchsia-500 text-white hover:bg-fuchsia-600" />
        <CalcButton value="|x|" onClick={() => handleFunction('abs')} className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm" />

        <CalcButton value="0" onClick={() => handleNumber('0')} className="bg-gray-100 hover:bg-gray-200" wide />
        <CalcButton value="." onClick={() => handleNumber('.')} className="bg-gray-100 hover:bg-gray-200" />
        <CalcButton value="=" onClick={handleEquals} className="bg-purple-600 text-white hover:bg-purple-700 col-span-2" wide />
      </div>
    </div>
  );
}

interface Question {
  id: string;
  type: 'multiple_choice' | 'student_response';
  domain: 'algebra' | 'advanced_math' | 'problem_solving' | 'geometry_trig';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  figure?: string;
}

const sampleQuestions: Question[] = [
  {
    id: "1",
    type: "multiple_choice",
    domain: "algebra",
    question: "If 3x + 7 = 22, what is the value of x?",
    options: ["3", "5", "7", "15"],
    correctAnswer: "5",
    explanation: "Subtract 7 from both sides: 3x = 15. Then divide both sides by 3: x = 5."
  },
  {
    id: "2",
    type: "multiple_choice",
    domain: "algebra",
    question: "A linear function f is defined by f(x) = mx + b, where m and b are constants. If f(2) = 11 and f(5) = 20, what is the value of m?",
    options: ["2", "3", "4", "5"],
    correctAnswer: "3",
    explanation: "Using the two points (2, 11) and (5, 20), the slope m = (20 - 11)/(5 - 2) = 9/3 = 3."
  },
  {
    id: "3",
    type: "multiple_choice",
    domain: "advanced_math",
    question: "Which expression is equivalent to (x² - 4)(x + 3)?",
    options: [
      "x³ + 3x² - 4x - 12",
      "x³ - 3x² - 4x + 12",
      "x³ + 3x² + 4x - 12",
      "x³ - 4x² + 3x - 12"
    ],
    correctAnswer: "x³ + 3x² - 4x - 12",
    explanation: "First, expand (x² - 4)(x + 3) = x²(x + 3) - 4(x + 3) = x³ + 3x² - 4x - 12."
  },
  {
    id: "4",
    type: "student_response",
    domain: "problem_solving",
    question: "A store sells notebooks for $3 each and pens for $2 each. If a customer buys a total of 10 items and spends exactly $24, how many notebooks did the customer buy?",
    correctAnswer: "4",
    explanation: "Let n = notebooks and p = pens. We have: n + p = 10 and 3n + 2p = 24. From the first equation, p = 10 - n. Substituting: 3n + 2(10 - n) = 24 → 3n + 20 - 2n = 24 → n = 4."
  },
  {
    id: "5",
    type: "multiple_choice",
    domain: "geometry_trig",
    question: "In a right triangle, one angle measures 30°. If the side opposite to this angle has length 5, what is the length of the hypotenuse?",
    options: ["5√3", "10", "5√2", "10√3"],
    correctAnswer: "10",
    explanation: "In a 30-60-90 triangle, the side opposite the 30° angle is half the hypotenuse. If this side is 5, then the hypotenuse is 2 × 5 = 10."
  },
  {
    id: "6",
    type: "multiple_choice",
    domain: "problem_solving",
    question: "The mean of 5 numbers is 12. If one of the numbers is removed, the mean of the remaining 4 numbers is 10. What is the value of the removed number?",
    options: ["16", "18", "20", "22"],
    correctAnswer: "20",
    explanation: "Sum of 5 numbers = 5 × 12 = 60. Sum of remaining 4 numbers = 4 × 10 = 40. The removed number = 60 - 40 = 20."
  },
  {
    id: "7",
    type: "student_response",
    domain: "advanced_math",
    question: "If f(x) = 2x² - 3x + 1, what is the value of f(3)?",
    correctAnswer: "10",
    explanation: "f(3) = 2(3)² - 3(3) + 1 = 2(9) - 9 + 1 = 18 - 9 + 1 = 10."
  },
  {
    id: "8",
    type: "multiple_choice",
    domain: "geometry_trig",
    question: "A circle has a radius of 6. What is the area of a sector of this circle with a central angle of 60°?",
    options: ["6π", "12π", "18π", "36π"],
    correctAnswer: "6π",
    explanation: "Area of sector = (θ/360°) × πr² = (60°/360°) × π(6)² = (1/6) × 36π = 6π."
  }
];

export default function SatMath() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const { isPro, membershipTier } = useAuth();
  const { t, language } = useLanguage();
  const testId = new URLSearchParams(searchParams).get('testId') || '';
  
  const [timeRemaining, setTimeRemaining] = useState(35 * 60); // 35 minutes per module
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [explanations, setExplanations] = useState<{ [key: string]: string }>({});
  const [loadingExplanations, setLoadingExplanations] = useState<{ [key: string]: boolean }>({});
  const [module, setModule] = useState(1);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [useSampleTest, setUseSampleTest] = useState(false);

  const { data: availableTests = [], isLoading: isLoadingTests } = useQuery<SATTest[]>({
    queryKey: ["/api/sat/math"],
    enabled: !testId,
  });

  const { data: testData, isLoading: isLoadingTest } = useQuery({
    queryKey: ['/api/sat/math', testId],
    enabled: testId.length > 0,
    retry: false,
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'hard': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '쉬움';
      case 'medium': return '보통';
      case 'hard': return '어려움';
      default: return difficulty;
    }
  };

  const testDataTyped = testData as { questions?: any[] } | undefined;
  
  const normalizeQuestionType = (type: string): Question['type'] => {
    const normalizedType = type?.toLowerCase() || '';
    if (normalizedType === 'grid-in' || normalizedType === 'student_response' || normalizedType === 'student-produced') {
      return 'student_response';
    }
    return 'multiple_choice';
  };
  
  const normalizeDomain = (domain: string): Question['domain'] => {
    const normalizedDomain = domain?.toLowerCase().replace(/[-\s]/g, '_') || '';
    if (normalizedDomain.includes('algebra')) return 'algebra';
    if (normalizedDomain.includes('advanced') || normalizedDomain.includes('quadratic')) return 'advanced_math';
    if (normalizedDomain.includes('problem') || normalizedDomain.includes('data')) return 'problem_solving';
    if (normalizedDomain.includes('geometry') || normalizedDomain.includes('trig')) return 'geometry_trig';
    return 'algebra';
  };
  
  const loadedQuestions = testDataTyped?.questions?.map((q: any, index: number) => ({
    id: q.id || `q${index + 1}`,
    type: normalizeQuestionType(q.questionType || q.type || ''),
    domain: normalizeDomain(q.domain || ''),
    question: q.questionText || q.question || '',
    options: q.options || undefined,
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
    figure: q.figures?.[0] || undefined,
  })) || [];

  const questions = loadedQuestions.length > 0 ? loadedQuestions : sampleQuestions;

  useEffect(() => {
    if (showResults) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showResults]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q: Question) => {
      const userAnswer = answers[q.id]?.trim().toLowerCase();
      const correctAnswer = q.correctAnswer.trim().toLowerCase();
      if (userAnswer === correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const getScaledScore = (rawScore: number, totalQuestions: number) => {
    const percentage = rawScore / totalQuestions;
    return Math.round(200 + (percentage * 600));
  };

  const handleSubmit = () => {
    const score = calculateScore();
    toast({
      title: "테스트 완료!",
      description: `${questions.length}문제 중 ${score}문제 정답`,
    });
    setShowResults(true);
  };

  const getDomainLabel = (domain: Question['domain']) => {
    switch (domain) {
      case 'algebra': return 'Algebra';
      case 'advanced_math': return 'Advanced Math';
      case 'problem_solving': return 'Problem Solving & Data';
      case 'geometry_trig': return 'Geometry & Trigonometry';
      default: return domain;
    }
  };

  const getDomainColor = (domain: Question['domain']) => {
    switch (domain) {
      case 'algebra': return 'bg-purple-500';
      case 'advanced_math': return 'bg-fuchsia-500';
      case 'problem_solving': return 'bg-rose-500';
      case 'geometry_trig': return 'bg-purple-600';
      default: return 'bg-gray-500';
    }
  };

  const requestAIExplanation = async (questionId: string, question: Question) => {
    if (!isPro) {
      toast({
        title: "PRO 멤버십 필요",
        description: "상세 해설은 PRO 회원만 이용 가능합니다.",
        variant: "destructive"
      });
      return;
    }

    setLoadingExplanations(prev => ({ ...prev, [questionId]: true }));

    try {
      const response = await fetch('/api/ai/explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType: 'sat',
          section: 'math',
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          userAnswer: answers[questionId],
          language
        })
      });
      const data = await response.json();
      setExplanations(prev => ({ ...prev, [questionId]: data.explanation }));
    } catch (error) {
      toast({
        title: "오류",
        description: "해설을 불러오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [questionId]: false }));
    }
  };

  if (isLoadingTest || isLoadingTests) {
    return (
      <div className="sat-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <Loader2 style={{ width: 40, height: 40, color: "#DD3344" }} className="animate-spin" />
          <p style={{ color: "rgba(255,255,255,.5)", fontSize: "0.9rem" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!testId && !useSampleTest) {
    return (
      <div className="sat-page">
        <div className="amb" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div className="o1" /><div className="o2" />
        </div>
        <div style={{ position: "relative", padding: "28px 20px 20px", borderBottom: "1px solid rgba(200,60,80,.08)" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <Link href="/sat">
              <button className="btn-sat slate" style={{ marginBottom: 16, padding: "7px 14px", fontSize: "0.8rem" }} data-testid="button-back-sat-selection">
                <ArrowLeft size={14} /> {t("sat.selection.back")}
              </button>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div className="sec-icon" style={{ margin: 0 }}><Calculator size={16} /></div>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1.3rem", fontWeight: 500, color: "#fff", letterSpacing: "0.04em" }}>SAT Math</span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.4)" }}>{t("sat.selection.selectTestDesc")}</div>
          </div>
        </div>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 48px", position: "relative" }}>
          <div className="sat-tabs-list" style={{ marginBottom: 20 }}>
            <div className="sat-tab sat-tab-active">{t("sat.selection.availableTests")}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {availableTests.length > 0 ? (
              availableTests.map((test) => (
                <Link key={test.id} href={`/sat/math?testId=${test.id}`}>
                  <div className="test-item" data-testid={`test-item-${test.id}`}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.95rem", marginBottom: 6 }}>{test.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`diff-badge ${test.difficulty === 'easy' ? 'easy' : test.difficulty === 'hard' ? 'hard' : 'med'}`}>
                          {getDifficultyLabel(test.difficulty)}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.4)" }}>{test.questionCount} Q</span>
                      </div>
                    </div>
                    <button className="btn-sat red" style={{ padding: "8px 16px", fontSize: "0.8rem" }}>
                      <Play size={13} /> {t("sat.selection.start")}
                    </button>
                  </div>
                </Link>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", background: "#181214", border: "1px solid rgba(200,60,80,.08)", borderRadius: 14 }}>
                <FileText size={40} style={{ color: "rgba(221,51,68,.3)", margin: "0 auto 12px" }} />
                <p style={{ color: "rgba(255,255,255,.6)", fontSize: "0.95rem", marginBottom: 6 }}>{t("sat.selection.emptyTests")}</p>
                <p style={{ color: "rgba(255,255,255,.35)", fontSize: "0.8rem" }}>{t("sat.selection.emptyTestsDesc")}</p>
              </div>
            )}
          </div>
          <div style={{ borderTop: "1px solid rgba(200,60,80,.08)", paddingTop: 20 }}>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.4)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              {t("sat.selection.sampleSection")}
            </div>
            <button className="btn-sat outline" onClick={() => setUseSampleTest(true)} data-testid="button-start-sample-test">
              <Play size={14} /> {t("sat.selection.sampleStart")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <SecurityWrapper>
      <FullscreenWrapper hideButton>
        <div className="sat-page" style={{ display: "flex", flexDirection: "column" }}>

          {/* Top bar */}
          <div className="sat-topbar">
            <button className="btn-sat slate" style={{ padding: "6px 10px" }} onClick={() => setLocation('/sat')} data-testid="button-back-sat">
              <ArrowLeft size={15} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <div className="sec-icon" style={{ margin: 0, width: 32, height: 32 }}><Calculator size={14} /></div>
              <div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.92rem", fontWeight: 500, color: "#fff", letterSpacing: "0.03em" }}>SAT Math</div>
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,.4)" }}>{t("sat.test.moduleOf")} {module} / 2</div>
              </div>
            </div>
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="btn-sat"
              style={{ padding: "6px 12px", fontSize: "0.75rem", background: showCalculator ? "rgba(0,200,100,.15)" : "rgba(100,100,110,.25)", color: showCalculator ? "#00E87B" : "rgba(255,255,255,.7)", border: showCalculator ? "1px solid rgba(0,200,100,.3)" : "1px solid rgba(255,255,255,.1)", borderRadius: 10 }}
              data-testid="button-toggle-calculator"
            >
              <Calculator size={13} /> Calc
            </button>
            <div className="sat-timer" style={{ color: timeRemaining < 300 ? "#DD3344" : "#fff", fontFamily: "monospace" }}>
              <Clock size={13} style={{ display: "inline", marginRight: 5 }} />{formatTime(timeRemaining)}
            </div>
          </div>

          {/* Progress */}
          <div className="sat-progress-track">
            <div className="sat-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
            {!showResults ? (
              <div style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "16px", display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, boxSizing: "border-box" }}>
                {/* Left: Question */}
                <div className="q-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div className="qc1" /><div className="qc2" />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className="cat">{getDomainLabel(currentQ.domain)}</span>
                      <span className="type">{currentQ.type === 'student_response' ? 'Grid-In' : 'MC'}</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.4)" }}>Q {currentQuestion + 1} / {questions.length}</span>
                  </div>

                  {currentQ.figure && (
                    <div style={{ marginBottom: 16, padding: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, display: "flex", justifyContent: "center" }}>
                      <img src={currentQ.figure} alt="Math figure" style={{ maxWidth: "100%", height: "auto" }} />
                    </div>
                  )}

                  <p style={{ fontSize: "1rem", fontWeight: 500, color: "rgba(255,255,255,.9)", lineHeight: 1.7, marginBottom: 20, fontFamily: "Arial, sans-serif", whiteSpace: "pre-wrap" }}>
                    {formatMathText(currentQ.question)}
                  </p>

                  {currentQ.type === 'multiple_choice' && currentQ.options ? (
                    <div style={{ flex: 1 }}>
                      {currentQ.options.map((option: string, index: number) => (
                        <div
                          key={index}
                          className={`mc-opt${answers[currentQ.id] === option ? ' sel' : ''}`}
                          onClick={() => handleAnswerSelect(currentQ.id, option)}
                        >
                          <div className="mc-dot" />
                          <span style={{ lineHeight: 1.5 }}>{formatMathText(option)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.4)", marginBottom: 8, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        {t("sat.test.enterAnswer")}
                      </div>
                      <input
                        type="text"
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                        placeholder="Enter numerical answer"
                        className="answer-input"
                        data-testid="input-student-response"
                      />
                      <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.3)", marginTop: 6, fontFamily: "Arial, sans-serif" }}>
                        Enter a numerical answer. Do not include spaces or symbols unless specified.
                      </p>
                    </div>
                  )}

                  {/* Explanation toggle */}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                    <button
                      className="btn-sat outline"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        if (explanations[currentQ.id]) { setShowExplanation(!showExplanation); }
                        else { requestAIExplanation(currentQ.id, currentQ); setShowExplanation(true); }
                      }}
                      disabled={loadingExplanations[currentQ.id]}
                      data-testid="button-show-explanation"
                    >
                      {loadingExplanations[currentQ.id] ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />}
                      {showExplanation && explanations[currentQ.id] ? '해설 숨기기' : '해설 보기'}
                    </button>
                    {showExplanation && explanations[currentQ.id] && (
                      <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(255,184,0,.04)", border: "1px solid rgba(255,184,0,.1)", borderRadius: 8 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                          <Bot size={13} style={{ color: "#FFB800" }} />
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#FFB800", fontFamily: "'Oswald', sans-serif" }}>{t("sat.test.explanation")}</span>
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.6)", lineHeight: 1.55, fontFamily: "Arial, sans-serif", whiteSpace: "pre-wrap" }}>{explanations[currentQ.id]}</p>
                      </div>
                    )}
                  </div>

                  {/* Nav */}
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)", marginTop: 14 }}>
                    <button className="btn-sat slate" onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))} disabled={currentQuestion === 0} data-testid="button-prev-question">
                      <ArrowLeft size={14} /> {t("sat.test.prevQ")}
                    </button>
                    {currentQuestion === questions.length - 1 ? (
                      <button className="btn-sat red" onClick={handleSubmit} data-testid="button-submit-test">Submit <ChevronRight size={14} /></button>
                    ) : (
                      <button className="btn-sat red" onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))} data-testid="button-next-question">
                        {t("sat.test.nextQ")} <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right sidebar */}
                <div className="sat-sidebar">
                  {/* Q navigator */}
                  <div className="sidebar-card">
                    <div className="sidebar-title">Q Navigator</div>
                    <div className="q-nav-grid">
                      {questions.map((q: Question, index: number) => (
                        <button
                          key={q.id}
                          onClick={() => setCurrentQuestion(index)}
                          className={`q-nav-btn${currentQuestion === index ? ' cur' : answers[q.id] ? ' done' : ''}`}
                          data-testid={`button-nav-question-${index + 1}`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.62rem", color: "rgba(255,255,255,.3)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(221,51,68,.3)" }} />Done
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.62rem", color: "rgba(255,255,255,.3)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(255,255,255,.06)" }} />Todo
                      </div>
                    </div>
                  </div>

                  {/* Calculator toggle */}
                  <div className="sidebar-card" style={{ cursor: "pointer" }} onClick={() => setShowCalculator(!showCalculator)} data-testid="button-open-calculator">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Calculator size={20} style={{ color: showCalculator ? "#00E87B" : "#DD3344" }} />
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#fff" }}>Calculator</div>
                        <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,.4)" }}>{showCalculator ? 'Click to close' : 'Click to open'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="sidebar-card">
                    <div className="sidebar-title">Reference</div>
                    {["A = πr²", "C = 2πr", "V = (4/3)πr³", "a² + b² = c²", "x = (-b ± √(b²-4ac)) / 2a"].map((f, i) => (
                      <div key={i} style={{ fontSize: "0.72rem", fontFamily: "Arial, monospace", color: "rgba(255,255,255,.5)", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{f}</div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Results */
              <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 48px", width: "100%" }}>
                <div className="sat-card" style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(221,51,68,.15)", border: "2px solid rgba(221,51,68,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <Award size={24} style={{ color: "#DD3344" }} />
                  </div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1.6rem", fontWeight: 600, color: "#fff", marginBottom: 4 }}>SAT Math</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.4)", marginBottom: 20 }}>{t("sat.test.moduleOf")} {module} / 2</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, maxWidth: 400, margin: "0 auto" }}>
                    {[
                      { val: calculateScore(), label: "정답" },
                      { val: questions.length, label: "총 문제" },
                      { val: getScaledScore(calculateScore(), questions.length), label: "예상 점수" }
                    ].map((s, i) => (
                      <div key={i} style={{ background: "#221A1E", border: "1px solid rgba(200,60,80,.1)", borderRadius: 10, padding: "14px 8px", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#DD3344" }}>{s.val}</div>
                        <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,.4)" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1rem", fontWeight: 500, color: "#fff", letterSpacing: "0.04em", marginBottom: 14 }}>문제 리뷰</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {questions.map((q: Question, index: number) => {
                      const userAnswer = answers[q.id]?.trim().toLowerCase();
                      const correctAnswer = q.correctAnswer.trim().toLowerCase();
                      const isCorrect = userAnswer === correctAnswer;
                      return (
                        <div key={q.id} className="sat-card" style={{ borderColor: isCorrect ? "rgba(0,200,100,.15)" : "rgba(221,51,68,.15)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,.5)" }}>Q{index + 1}</span>
                              <span className="cat" style={{ fontSize: "0.62rem" }}>{getDomainLabel(q.domain)}</span>
                              <span className="type" style={{ fontSize: "0.6rem" }}>{q.type === 'student_response' ? 'Grid-In' : 'MC'}</span>
                            </div>
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: isCorrect ? "rgba(0,200,100,.12)" : "rgba(221,51,68,.12)", color: isCorrect ? "#00E87B" : "#DD3344" }}>
                              {isCorrect ? "✓" : "✗"}
                            </span>
                          </div>
                          <p style={{ fontSize: "0.88rem", fontWeight: 500, color: "rgba(255,255,255,.8)", marginBottom: 10, fontFamily: "Arial, sans-serif", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{formatMathText(q.question)}</p>
                          {q.type === 'multiple_choice' && q.options ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                              {q.options.map((option, optIdx) => (
                                <div key={optIdx} style={{
                                  padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", fontFamily: "Arial, sans-serif",
                                  background: option === q.correctAnswer ? "rgba(0,200,100,.08)" : option === answers[q.id] && !isCorrect ? "rgba(221,51,68,.08)" : "rgba(255,255,255,.02)",
                                  border: `1px solid ${option === q.correctAnswer ? "rgba(0,200,100,.25)" : option === answers[q.id] && !isCorrect ? "rgba(221,51,68,.25)" : "rgba(255,255,255,.05)"}`,
                                  color: option === q.correctAnswer ? "#00E87B" : option === answers[q.id] && !isCorrect ? "#DD3344" : "rgba(255,255,255,.6)"
                                }}>
                                  <span style={{ fontWeight: 700, marginRight: 6 }}>{String.fromCharCode(65 + optIdx)}.</span>{formatMathText(option)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ marginBottom: 10, display: "flex", gap: 20, padding: "8px 12px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 8 }}>
                              <div>
                                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,.4)", marginBottom: 2 }}>{t("sat.test.answer")}</div>
                                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#00E87B", fontFamily: "Arial, monospace" }}>{q.correctAnswer}</div>
                              </div>
                              {answers[q.id] && (
                                <div>
                                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,.4)", marginBottom: 2 }}>내 답</div>
                                  <div style={{ fontSize: "1rem", fontWeight: 700, color: isCorrect ? "#00E87B" : "#DD3344", fontFamily: "Arial, monospace" }}>{answers[q.id]}</div>
                                </div>
                              )}
                            </div>
                          )}
                          <div style={{ padding: "10px 12px", background: "rgba(255,184,0,.04)", border: "1px solid rgba(255,184,0,.1)", borderRadius: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <Lightbulb size={13} style={{ color: "#FFB800" }} />
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#FFB800", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>{t("sat.test.explanation")}</span>
                            </div>
                            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.6)", lineHeight: 1.55, fontFamily: "Arial, sans-serif" }}>{explanations[q.id] || q.explanation}</p>
                          </div>
                          {isPro && !explanations[q.id] && (
                            <button className="btn-sat outline" style={{ marginTop: 10, fontSize: "0.78rem" }}
                              onClick={() => requestAIExplanation(q.id, q)} disabled={loadingExplanations[q.id]}>
                              {loadingExplanations[q.id] ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                              AI 해설
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                  <button className="btn-sat slate" onClick={() => setLocation('/sat')}>SAT 메뉴</button>
                  <button className="btn-sat red" onClick={() => { setShowResults(false); setCurrentQuestion(0); setAnswers({}); setTimeRemaining(35 * 60); }}>
                    다시 풀기
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Floating Calculator */}
          {showCalculator && (
            <div 
              className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200"
              data-testid="floating-calculator"
            >
              <ScientificCalculator onClose={() => setShowCalculator(false)} />
            </div>
          )}

        </div>
      </FullscreenWrapper>
    </SecurityWrapper>
  );
}
