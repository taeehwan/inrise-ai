import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Clock, BookOpen, ArrowLeft, ArrowRight, ChevronRight, Lightbulb, Bot, Loader2, Award, FileText, Sparkles, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
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

interface Question {
  id: string;
  type: 'craft_structure' | 'information_ideas' | 'expression_ideas' | 'standard_english';
  passage?: string;
  passageTitle?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const sampleQuestions: Question[] = [
  {
    id: "1",
    type: "craft_structure",
    passageTitle: "Literary Analysis",
    passage: "In her 2019 study, researcher Maya Chen examined the relationship between urban green spaces and community well-being. Chen found that neighborhoods with access to parks and gardens reported 23% higher rates of social interaction among residents. ==These findings suggest that urban planners should prioritize the integration of natural elements into city design.==",
    question: "Which choice best describes the function of the highlighted sentence in the overall structure of the passage?",
    options: [
      "It introduces the main topic of the study.",
      "It provides evidence to support a research finding.",
      "It draws a conclusion based on the presented data.",
      "It questions the validity of previous research."
    ],
    correctAnswer: "It draws a conclusion based on the presented data.",
    explanation: "The highlighted sentence 'These findings suggest that urban planners should prioritize...' is drawing a practical conclusion from the research data presented in the previous sentence about the 23% higher rates of social interaction."
  },
  {
    id: "2",
    type: "information_ideas",
    passageTitle: "Scientific Discovery",
    passage: "Scientists have long believed that the giant squid was a solitary creature, rarely interacting with others of its species. However, recent deep-sea footage captured by marine biologists at the Monterey Bay Aquarium Research Institute reveals that these mysterious animals may actually engage in complex social behaviors, including what appears to be cooperative hunting strategies.",
    question: "Based on the passage, which statement best describes the significance of the new footage?",
    options: [
      "It confirms previously held beliefs about giant squid behavior.",
      "It challenges the traditional understanding of giant squid social patterns.",
      "It provides the first-ever visual evidence of giant squid in their natural habitat.",
      "It explains why giant squid prefer to live alone."
    ],
    correctAnswer: "It challenges the traditional understanding of giant squid social patterns.",
    explanation: "The passage explicitly states that scientists 'long believed' giant squid were solitary, but the new footage 'reveals that these mysterious animals may actually engage in complex social behaviors.' This directly challenges the traditional understanding."
  },
  {
    id: "3",
    type: "expression_ideas",
    passageTitle: "Historical Essay",
    passage: "The Renaissance period marked a significant transformation in European art and culture. Artists began to explore new techniques in perspective and anatomy. _______ they also drew inspiration from classical Greek and Roman works.",
    question: "Which choice completes the text with the most logical transition?",
    options: [
      "For example,",
      "In contrast,",
      "Additionally,",
      "Nevertheless,"
    ],
    correctAnswer: "Additionally,",
    explanation: "'Additionally' is the best choice because the sentence that follows continues to add more information about what artists were doing during the Renaissance. Both exploring new techniques and drawing from classical works are complementary activities."
  },
  {
    id: "4",
    type: "standard_english",
    passageTitle: "Biography",
    passage: "Marie Curie, the pioneering physicist and chemist who discovered radioactivity, _______ the first person to win Nobel Prizes in two different sciences.",
    question: "Which choice completes the text so that it conforms to the conventions of Standard English?",
    options: [
      "were",
      "was",
      "are",
      "have been"
    ],
    correctAnswer: "was",
    explanation: "The subject 'Marie Curie' is singular, so the verb must be singular: 'was.' The sentence is describing a past event (winning Nobel Prizes), which requires past tense."
  },
  {
    id: "5",
    type: "craft_structure",
    passageTitle: "Literary Criticism",
    passage: "In his review of the novel, critic James Morton argues that the author's use of an unreliable narrator serves a specific purpose. 'By presenting events through a lens of uncertainty,' Morton writes, ==the author forces readers to question not just the story, but their own assumptions about truth and memory.==",
    question: "Which choice best describes the main purpose of the quotation from Morton?",
    options: [
      "To criticize the author's narrative choices.",
      "To explain the effect of a specific literary technique.",
      "To compare the novel to other works of fiction.",
      "To summarize the plot of the novel."
    ],
    correctAnswer: "To explain the effect of a specific literary technique.",
    explanation: "Morton's quotation explains what happens to readers as a result of the unreliable narrator technique: they are forced to 'question not just the story, but their own assumptions.' This is an explanation of the effect of the technique."
  }
];

export default function SatReadingWriting() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const { isPro, membershipTier } = useAuth();
  const { t, language } = useLanguage();
  const testId = new URLSearchParams(searchParams).get('testId') || '';
  
  const [timeRemaining, setTimeRemaining] = useState(32 * 60); // 32 minutes per module
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [explanations, setExplanations] = useState<{ [key: string]: string }>({});
  const [loadingExplanations, setLoadingExplanations] = useState<{ [key: string]: boolean }>({});
  const [module, setModule] = useState(1);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseText, setParseText] = useState('');
  const [parseCount, setParseCount] = useState(5);
  const [useSampleTest, setUseSampleTest] = useState(false);

  const { data: availableTests = [], isLoading: isLoadingTests } = useQuery<SATTest[]>({
    queryKey: ["/api/sat/reading-writing"],
    enabled: !testId,
  });

  const { data: testData, isLoading: isLoadingTest } = useQuery({
    queryKey: ['/api/sat/reading-writing', testId],
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
  const loadedQuestions = testDataTyped?.questions?.map((q: any, index: number) => ({
    id: q.id || `q${index + 1}`,
    type: q.questionType as Question['type'],
    passage: q.passage || undefined,
    passageTitle: q.passageTitle || undefined,
    question: q.questionText || '',
    options: q.options || [],
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
  })) || [];

  const questions = parsedQuestions.length > 0 ? parsedQuestions : (loadedQuestions.length > 0 ? loadedQuestions : sampleQuestions);

  const parseTextAndGenerateQuestions = async () => {
    if (parseText.trim().length < 50) {
      toast({
        title: "텍스트 부족",
        description: "최소 50자 이상의 텍스트를 입력해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsParsing(true);
    try {
      const response = await apiRequest("POST", "/api/sat/reading-writing/parse", {
        text: parseText,
        questionCount: parseCount,
        language: language
      });
      const data = await response.json();
      
      if (data.questions) {
        const formattedQuestions: Question[] = data.questions.map((q: any) => ({
          id: q.id,
          type: q.type as Question['type'],
          passage: q.passage,
          passageTitle: q.passageTitle,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }));
        setParsedQuestions(formattedQuestions);
        setCurrentQuestion(0);
        setAnswers({});
        setShowResults(false);
        setTimeRemaining(32 * 60);
        setShowParseModal(false);
        setParseText('');
        toast({
          title: "문제 생성 완료!",
          description: `${formattedQuestions.length}개의 문제가 텍스트에서 생성되었습니다.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "생성 실패",
        description: error.message || "텍스트 파싱에 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsParsing(false);
    }
  };

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
      if (answers[q.id] === q.correctAnswer) {
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

  const getDomainLabel = (type: Question['type']) => {
    switch (type) {
      case 'craft_structure': return 'Craft & Structure';
      case 'information_ideas': return 'Information & Ideas';
      case 'expression_ideas': return 'Expression of Ideas';
      case 'standard_english': return 'Standard English';
      default: return type;
    }
  };

  const getDomainColor = (type: Question['type']) => {
    switch (type) {
      case 'craft_structure': return 'bg-rose-500';
      case 'information_ideas': return 'bg-amber-500';
      case 'expression_ideas': return 'bg-yellow-500';
      case 'standard_english': return 'bg-purple-600';
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
      const response = await fetch('/api/sat/reading-writing/explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          passage: question.passage?.replace(/==|__|(\*\*)/g, ''),
          options: question.options,
          correctAnswer: question.correctAnswer,
          userAnswer: answers[questionId],
          language
        })
      });
      const data = await response.json();
      if (data.explanation) {
        setExplanations(prev => ({ ...prev, [questionId]: data.explanation }));
      } else {
        throw new Error('No explanation received');
      }
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
        {/* Header */}
        <div style={{ position: "relative", padding: "28px 20px 20px", borderBottom: "1px solid rgba(200,60,80,.08)" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <Link href="/sat">
              <button className="btn-sat slate" style={{ marginBottom: 16, padding: "7px 14px", fontSize: "0.8rem" }} data-testid="button-back-sat-selection">
                <ArrowLeft size={14} /> {t("sat.selection.back")}
              </button>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div className="sec-icon" style={{ margin: 0 }}><BookOpen size={16} /></div>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1.3rem", fontWeight: 500, color: "#fff", letterSpacing: "0.04em" }}>
                SAT Reading & Writing
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.4)" }}>{t("sat.selection.selectTestDesc")}</div>
          </div>
        </div>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 48px", position: "relative" }}>
          {/* Tab */}
          <div className="sat-tabs-list" style={{ marginBottom: 20 }}>
            <div className="sat-tab sat-tab-active">{t("sat.selection.availableTests")}</div>
          </div>

          {/* Test list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {availableTests.length > 0 ? (
              availableTests.map((test) => (
                <Link key={test.id} href={`/sat/reading-writing?testId=${test.id}`}>
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

          {/* Sample */}
          <div style={{ borderTop: "1px solid rgba(200,60,80,.08)", paddingTop: 20 }}>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.4)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              {t("sat.selection.sampleSection")}
            </div>
            <button
              className="btn-sat outline"
              onClick={() => setUseSampleTest(true)}
              data-testid="button-start-sample-test"
            >
              <Sparkles size={14} /> {t("sat.selection.sampleStart")}
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
              <div className="sec-icon" style={{ margin: 0, width: 32, height: 32 }}><BookOpen size={14} /></div>
              <div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.92rem", fontWeight: 500, color: "#fff", letterSpacing: "0.03em" }}>SAT Reading & Writing</div>
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,.4)" }}>{t("sat.test.moduleOf")} {module} / 2</div>
              </div>
            </div>
            <button onClick={() => setShowParseModal(true)} className="btn-sat slate" style={{ padding: "6px 12px", fontSize: "0.75rem" }} data-testid="button-parse-text">
              <FileText size={13} /> Parse
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
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Compact Q navigator */}
                <div style={{ background: "#0E0A0C", borderBottom: "1px solid rgba(200,60,80,.08)", padding: "10px 16px", position: "sticky", top: 0, zIndex: 9 }}>
                  <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 10, overflowX: "auto" }}>
                    <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,.35)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>
                      Q Nav
                    </span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
                    <div style={{ marginLeft: "auto", display: "flex", gap: 12, flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", color: "rgba(255,255,255,.3)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(221,51,68,.3)" }} />Answered
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", color: "rgba(255,255,255,.3)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(255,255,255,.06)" }} />Unanswered
                      </div>
                    </div>
                  </div>
                </div>

                {/* Split: Passage Left / Question Right */}
                <div style={{ flex: 1, maxWidth: 1400, margin: "0 auto", width: "100%", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, boxSizing: "border-box" }}>
                  {/* Left — Passage */}
                  <div className="q-card" style={{ display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 200px)", overflow: "auto" }}>
                    <div className="qc1" /><div className="qc2" />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <BookOpen size={14} style={{ color: "#DD3344" }} />
                        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,.6)" }}>Passage</span>
                      </div>
                      {currentQ.passageTitle && (
                        <span className="type">{currentQ.passageTitle}</span>
                      )}
                    </div>
                    {currentQ.passage ? (
                      <p
                        style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "rgba(255,255,255,.75)", fontFamily: "Arial, sans-serif", whiteSpace: "pre-wrap" }}
                        dangerouslySetInnerHTML={{
                          __html: (() => {
                            const escapeHtml = (str: string) =>
                              str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
                            const escaped = escapeHtml(currentQ.passage || '');
                            return escaped
                              .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700;color:#fff">$1</strong>')
                              .replace(/__(.*?)__/g, '<mark style="background:rgba(221,51,68,.18);color:#DD3344;padding:0 3px;border-radius:3px">$1</mark>')
                              .replace(/==(.*?)==/g, '<mark style="background:rgba(221,51,68,.18);color:#DD3344;padding:0 3px;border-radius:3px">$1</mark>');
                          })()
                        }}
                      />
                    ) : (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.25)", fontSize: "0.85rem" }}>
                        No passage for this question
                      </div>
                    )}
                  </div>

                  {/* Right — Question */}
                  <div className="q-card" style={{ display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 200px)", overflow: "auto" }}>
                    <div className="qc1" /><div className="qc2" />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
                      <span className="cat">{getDomainLabel(currentQ.type)}</span>
                      <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.4)" }}>Q {currentQuestion + 1} / {questions.length}</span>
                    </div>
                    <p style={{ fontSize: "0.95rem", fontWeight: 500, color: "rgba(255,255,255,.9)", lineHeight: 1.65, marginBottom: 18, fontFamily: "Arial, sans-serif" }}>
                      {currentQ.question}
                    </p>
                    <div style={{ flex: 1 }}>
                      {currentQ.options.map((option: string, index: number) => (
                        <div
                          key={index}
                          className={`mc-opt${answers[currentQ.id] === option ? ' sel' : ''}`}
                          onClick={() => handleAnswerSelect(currentQ.id, option)}
                        >
                          <div className="mc-dot" />
                          <span style={{ lineHeight: 1.5 }}>{option}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.06)", marginTop: 8, flexShrink: 0 }}>
                      <button
                        className="btn-sat slate"
                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestion === 0}
                        data-testid="button-prev-question"
                      >
                        <ArrowLeft size={14} /> {t("sat.test.prevQ")}
                      </button>
                      {currentQuestion === questions.length - 1 ? (
                        <button className="btn-sat red" onClick={handleSubmit} data-testid="button-submit-test">
                          Submit <ChevronRight size={14} />
                        </button>
                      ) : (
                        <button
                          className="btn-sat red"
                          onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                          data-testid="button-next-question"
                        >
                          {t("sat.test.nextQ")} <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Results */
              <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 48px", width: "100%" }}>
                {/* Score card */}
                <div className="sat-card" style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(221,51,68,.15)", border: "2px solid rgba(221,51,68,.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <Award size={24} style={{ color: "#DD3344" }} />
                  </div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1.6rem", fontWeight: 600, color: "#fff", marginBottom: 4 }}>SAT Reading & Writing</div>
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

                {/* Review */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1rem", fontWeight: 500, color: "#fff", letterSpacing: "0.04em", marginBottom: 14 }}>문제 리뷰</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {questions.map((q: Question, index: number) => {
                      const isCorrect = answers[q.id] === q.correctAnswer;
                      return (
                        <div key={q.id} className="sat-card" style={{ borderColor: isCorrect ? "rgba(0,200,100,.15)" : "rgba(221,51,68,.15)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,.5)" }}>Q{index + 1}</span>
                              <span className="cat" style={{ fontSize: "0.62rem" }}>{getDomainLabel(q.type)}</span>
                            </div>
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: isCorrect ? "rgba(0,200,100,.12)" : "rgba(221,51,68,.12)", color: isCorrect ? "#00E87B" : "#DD3344" }}>
                              {isCorrect ? "✓" : "✗"}
                            </span>
                          </div>
                          {q.passage && (
                            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.45)", marginBottom: 10, padding: "8px 10px", background: "rgba(255,255,255,.03)", borderRadius: 8, fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
                              {q.passage.substring(0, 200)}{q.passage.length > 200 ? "…" : ""}
                            </div>
                          )}
                          <p style={{ fontSize: "0.88rem", fontWeight: 500, color: "rgba(255,255,255,.8)", marginBottom: 10, fontFamily: "Arial, sans-serif", lineHeight: 1.55 }}>{q.question}</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
                            {q.options.map((option, optIdx) => (
                              <div key={optIdx} style={{
                                padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", fontFamily: "Arial, sans-serif", lineHeight: 1.4,
                                background: option === q.correctAnswer ? "rgba(0,200,100,.08)" : option === answers[q.id] && !isCorrect ? "rgba(221,51,68,.08)" : "rgba(255,255,255,.02)",
                                border: `1px solid ${option === q.correctAnswer ? "rgba(0,200,100,.25)" : option === answers[q.id] && !isCorrect ? "rgba(221,51,68,.25)" : "rgba(255,255,255,.05)"}`,
                                color: option === q.correctAnswer ? "#00E87B" : option === answers[q.id] && !isCorrect ? "#DD3344" : "rgba(255,255,255,.6)"
                              }}>
                                <span style={{ fontWeight: 700, marginRight: 6 }}>{String.fromCharCode(65 + optIdx)}.</span>{option}
                              </div>
                            ))}
                          </div>
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
                  <button className="btn-sat red" onClick={() => { setShowResults(false); setCurrentQuestion(0); setAnswers({}); setTimeRemaining(32 * 60); }}>
                    다시 풀기
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Text Parsing Modal */}
          <Dialog open={showParseModal} onOpenChange={setShowParseModal}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-rose-500" />
                  텍스트 파싱으로 문제 생성
                </DialogTitle>
                <DialogDescription>
                  지문이나 기사 텍스트를 입력하면 SAT Reading & Writing 문제로 변환합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>텍스트 입력 (최소 50자)</Label>
                  <Textarea
                    value={parseText}
                    onChange={(e) => setParseText(e.target.value)}
                    placeholder="여기에 지문, 기사, 에세이 등의 텍스트를 붙여넣기 하세요..."
                    className="min-h-[200px] resize-y"
                    data-testid="textarea-parse-input"
                  />
                  <p className="text-xs text-gray-500">
                    현재: {parseText.length}자 {parseText.length < 50 && parseText.length > 0 && "(최소 50자 필요)"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>생성할 문제 수</Label>
                  <Select
                    value={String(parseCount)}
                    onValueChange={(value) => setParseCount(Number(value))}
                  >
                    <SelectTrigger data-testid="select-parse-count">
                      <SelectValue placeholder="문제 수 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3문제</SelectItem>
                      <SelectItem value="5">5문제</SelectItem>
                      <SelectItem value="8">8문제</SelectItem>
                      <SelectItem value="10">10문제</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <h4 className="font-medium text-rose-800 mb-2">생성되는 문제 유형:</h4>
                  <ul className="text-sm text-rose-700 space-y-1">
                    <li>• Craft & Structure (글의 구조 및 기법)</li>
                    <li>• Information & Ideas (정보 및 아이디어)</li>
                    <li>• Expression of Ideas (아이디어 표현)</li>
                    <li>• Standard English (표준 영어)</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowParseModal(false)}>
                  취소
                </Button>
                <Button
                  onClick={parseTextAndGenerateQuestions}
                  disabled={isParsing || parseText.length < 50}
                  className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600"
                  data-testid="button-parse-confirm"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      파싱 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      문제 생성하기
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </FullscreenWrapper>
    </SecurityWrapper>
  );
}
