import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Bot, Sparkles, Loader2, Maximize2, Star, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";

interface GreWritingTopic {
  id: string;
  title: string;
  taskType: "analyze_issue" | "analyze_argument";
  prompt: string;
  instructions: string;
  timeLimit: number;
  sampleEssay?: string;
  isActive: boolean;
}

export default function GreAnalyticalWriting() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isPro, membershipTier } = useAuth();
  const { language, t } = useLanguage();
  const { logTestStart } = useActivityTracker();
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [isStarted] = useState(true);

  useEffect(() => {
    logTestStart('gre_analytical_writing', 'default');
  }, []);

  const [essay, setEssay] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [currentTask] = useState<"analyze_issue" | "analyze_argument">("analyze_issue");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    overallScore?: number;
    criteria?: Array<{ name: string; nameKo: string; score: number; feedback: string }>;
    strengths?: string[];
    improvements?: string[];
    overallFeedback?: string;
    sentenceFeedback?: Array<{
      original: string;
      issue: string;
      issueKo: string;
      explanation: string;
      suggestion: string;
    }>;
  } | null>(null);
  const [modelAnswers, setModelAnswers] = useState<{
    intermediate?: string;
    advanced?: string;
    expert?: string;
  }>({});
  const [activeTab, setActiveTab] = useState<"summary" | "feedback" | "models">("summary");
  const [showAiSection, setShowAiSection] = useState(false);

  const getScoreLabel = (score: number) => {
    if (score >= 5.5) return "Outstanding";
    if (score >= 4.5) return "Strong";
    if (score >= 3.5) return "Adequate";
    if (score >= 2.5) return "Limited";
    if (score >= 1.5) return "Seriously Flawed";
    return "Fundamentally Deficient";
  };

  const getScoreBandClass = (score: number): { num: string; badge: string } => {
    if (score >= 5) return { num: "", badge: "gaw-grade-violet" }; // Outstanding/Strong → violet
    if (score >= 4) return { num: "cyan", badge: "gaw-grade-cyan" }; // Adequate → cyan
    if (score >= 3) return { num: "amber", badge: "gaw-grade-amber" }; // Limited → amber
    return { num: "red", badge: "gaw-grade-red" };
  };

  const getCategoryClass = (issue: string): string => {
    const k = (issue || "").toLowerCase();
    if (k === "content" || k === "내용") return "gaw-cat-content";
    if (k === "expression" || k === "표현") return "gaw-cat-expression";
    if (k === "grammar" || k === "문법") return "gaw-cat-grammar";
    return "gaw-cat-structure";
  };

  // Fetch GRE Writing topics
  const { data: dbTopics = [], isLoading: topicsLoading } = useQuery<GreWritingTopic[]>({
    queryKey: ["/api/gre/writing-topics"],
    queryFn: async () => {
      const response = await fetch("/api/gre/writing-topics");
      if (!response.ok) return [];
      return response.json();
    },
    retry: false,
  });

  const fallbackTasks = {
    analyze_issue: {
      title: "Analyze an Issue",
      prompt: "People's behavior is largely determined by forces not of their own making.",
      instructions:
        "Write a response in which you discuss the extent to which you agree or disagree with the statement and explain your reasoning for the position you take. In developing and supporting your position, you should consider ways in which the statement might or might not hold true and explain how these considerations shape your position.",
    },
    analyze_argument: {
      title: "Analyze an Argument",
      prompt:
        "The following appeared in a memo from the new vice president of Sartorian, a company that manufactures men's clothing: 'Five years ago, at a time when we had difficulties in obtaining reliable supplies of high quality wool fabric, we discontinued production of our alpaca overcoat. Now that we have a new fabric supplier, we should resume production. This coat should sell very well: since we have not sold an alpaca overcoat for five years and since our major competitor no longer makes an alpaca overcoat, there will be pent-up customer demand. Also, since the price of most types of clothing has increased in each of the past five years, customers should be willing to pay significantly higher prices for alpaca overcoats than they were five years ago.'",
      instructions:
        "Write a response in which you examine the stated and/or unstated assumptions of the argument. Be sure to explain how the argument depends on these assumptions and what the implications are for the argument if the assumptions prove unwarranted.",
    },
  };

  const getCurrentTaskData = () => {
    if (selectedTopicId && dbTopics.length > 0) {
      const topic = dbTopics.find((t) => t.id === selectedTopicId);
      if (topic) {
        return {
          title: topic.taskType === "analyze_issue" ? "Analyze an Issue" : "Analyze an Argument",
          prompt: topic.prompt,
          instructions: topic.instructions,
        };
      }
    }
    return fallbackTasks[currentTask as keyof typeof fallbackTasks];
  };

  const currentTaskData = getCurrentTaskData();

  useEffect(() => {
    if (dbTopics.length > 0 && !selectedTopicId) {
      const firstTopic = dbTopics.find((t) => t.taskType === currentTask);
      if (firstTopic) setSelectedTopicId(firstTopic.id);
    }
  }, [dbTopics, currentTask]);

  // Mutations
  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/gre/analytical-writing/feedback", {
        essay,
        prompt: currentTaskData.prompt,
        taskType: currentTask,
        language,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAiFeedback(data.feedback);
      setShowAiSection(true);
      toast({ title: "인라이즈 피드백 완료", description: "상세한 분석이 준비되었습니다." });
    },
  });

  const modelAnswerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/gre/analytical-writing/model-answers", {
        prompt: currentTaskData.prompt,
        taskType: currentTask,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setModelAnswers(data.modelAnswers);
      setShowAiSection(true);
      toast({ title: "모범 답안 완료", description: "모든 레벨의 모범 답안이 준비되었습니다." });
    },
  });

  // Timer
  useEffect(() => {
    if (isStarted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isStarted, timeRemaining]);

  // Word count
  useEffect(() => {
    const words = essay.trim().split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
  }, [essay]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTimeUp = () => {
    toast({
      title: "⏰ 시간 종료",
      description: "30분이 경과했습니다. 에세이를 확인하고 제출 버튼을 눌러주세요.",
    });
  };

  const handleSubmit = () => {
    if (essay.trim().length === 0) {
      toast({ title: "에러", description: "에세이를 작성해주세요.", variant: "destructive" });
      return;
    }
    setShowResults(true);
    toast({ title: "제출 완료", description: "에세이가 제출되었습니다. AI 분석을 요청하세요." });
  };

  const requestFullscreen = () => {
    const el: any = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  // ─────────────────────────────────────────────────────────
  // RESULTS VIEW
  // ─────────────────────────────────────────────────────────
  if (showResults) {
    const score = aiFeedback?.overallScore;
    const band = score !== undefined ? getScoreBandClass(score) : null;

    return (
      <SecurityWrapper
        watermark="iNRISE GRE ANALYTICAL WRITING TEST"
        disableRightClick={true}
        disableKeyboardShortcuts={true}
        disableTextSelection={true}
        disableScreenshot={true}
        showSecurityNotice={true}
      >
        <FullscreenWrapper>
          <div className="gaw-page">
            {/* Header */}
            <div className="gaw-header">
              <div className="gaw-header-left">
                <button className="gaw-back" onClick={() => setLocation("/gre")}>
                  ← GRE 홈
                </button>
                <h1 className="gaw-title">GRE Analytical Writing</h1>
              </div>
              <div className="gaw-header-right">
                <span className="gaw-issue-badge">{wordCount} WORDS</span>
                <button className="gaw-btn-outline" onClick={requestFullscreen}>
                  <Maximize2 size={11} /> Full Screen
                </button>
              </div>
            </div>

            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 60px" }}>
              {/* Loading */}
              {(feedbackMutation.isPending || modelAnswerMutation.isPending) && (
                <div className="gaw-empty" style={{ marginBottom: 16 }}>
                  <span className="gaw-spinner" style={{ marginRight: 10, verticalAlign: "middle" }} />
                  피드백 제공 중...
                </div>
              )}

              {/* Action: Request feedback */}
              {!aiFeedback && !feedbackMutation.isPending && isPro && (
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <button
                    className="gaw-btn-submit"
                    style={{ padding: "10px 22px", fontSize: 12 }}
                    onClick={() => {
                      feedbackMutation.mutate();
                      modelAnswerMutation.mutate();
                    }}
                    disabled={feedbackMutation.isPending || modelAnswerMutation.isPending}
                  >
                    <Bot size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "-1px" }} />
                    피드백 요청
                  </button>
                </div>
              )}

              {/* PRO Upgrade Notice */}
              {!isPro && !aiFeedback && !feedbackMutation.isPending && (
                <div className="gaw-upgrade">
                  {["pro", "max", "master"].includes(membershipTier || "") ? (
                    <>
                      <div className="gaw-upgrade-title">⚠️ 구독 상태를 확인해주세요</div>
                      <div className="gaw-upgrade-body">
                        현재 회원 등급: <span style={{ color: "#FBBF24" }}>{membershipTier?.toUpperCase()}</span>
                        <br />
                        구독이 활성화되지 않아 인라이즈 피드백을 이용할 수 없습니다.
                      </div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                        <button className="gaw-btn-submit" onClick={() => window.location.reload()}>
                          새로고침
                        </button>
                        <button className="gaw-btn-outline" onClick={() => setLocation("/subscription")}>
                          구독 상태 확인
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="gaw-upgrade-title">PRO 회원 혜택으로 인라이즈 피드백을 받아보세요</div>
                      <div className="gaw-upgrade-body">
                        · ETS 공식 루브릭 기반 0–6점 채점<br />
                        · 6가지 평가 기준별 상세 피드백<br />
                        · 3단계 수준별 모범답안
                      </div>
                      <button className="gaw-btn-submit" onClick={() => setLocation("/subscription")}>
                        PRO로 업그레이드 →
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Score + Tabs */}
              {aiFeedback && score !== undefined && band && (
                <>
                  {/* Overall Score */}
                  <div className="gaw-card-accent" style={{ marginBottom: 14 }}>
                    <div className="gaw-score-label">OVERALL SCORE</div>
                    <div>
                      <span className={`gaw-score-num ${band.num}`}>{score.toFixed(1)}</span>
                      <span className="gaw-score-denom">/6.0</span>
                    </div>
                    <div className={`gaw-grade-badge ${band.badge}`}>{getScoreLabel(score)}</div>
                  </div>

                  {/* Tabs */}
                  <div className="gaw-tabs">
                    <button
                      className={`gaw-tab ${activeTab === "summary" ? "active" : ""}`}
                      onClick={() => setActiveTab("summary")}
                    >
                      <Star size={12} /> {t("gre.feedback.overview") || "총평"}
                    </button>
                    <button
                      className={`gaw-tab ${activeTab === "feedback" ? "active" : ""}`}
                      onClick={() => setActiveTab("feedback")}
                    >
                      <AlertCircle size={12} /> {t("gre.feedback.feedback") || "피드백"}
                    </button>
                    <button
                      className={`gaw-tab ${activeTab === "models" ? "active" : ""}`}
                      onClick={() => setActiveTab("models")}
                    >
                      <Sparkles size={12} /> {t("gre.feedback.modelAnswer") || "모범답안"}
                    </button>
                  </div>

                  {/* Summary tab */}
                  {activeTab === "summary" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {aiFeedback.overallFeedback && (
                        <div className="gaw-card">
                          <div className="gaw-label">
                            <span className="gaw-label-bar" />
                            ASSESSMENT
                          </div>
                          <div className="gaw-body">{aiFeedback.overallFeedback}</div>
                        </div>
                      )}

                      {/* Strengths / Improve */}
                      <div className="gaw-2col">
                        {aiFeedback.strengths && aiFeedback.strengths.length > 0 && (
                          <div className="gaw-tint-strengths">
                            <div className="gaw-label">STRENGTHS</div>
                            <ul className="gaw-list strengths">
                              {aiFeedback.strengths.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiFeedback.improvements && aiFeedback.improvements.length > 0 && (
                          <div className="gaw-tint-improve">
                            <div className="gaw-label">AREAS TO IMPROVE</div>
                            <ul className="gaw-list improve">
                              {aiFeedback.improvements.map((imp, i) => (
                                <li key={i}>{imp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Scoring Criteria */}
                      {aiFeedback.criteria && aiFeedback.criteria.length > 0 && (
                        <div className="gaw-card">
                          <div className="gaw-label">
                            <span className="gaw-label-bar" />
                            SCORING CRITERIA
                          </div>
                          <div>
                            {aiFeedback.criteria.map((c, idx) => (
                              <div key={idx} className="gaw-criteria-row">
                                <div className="gaw-criteria-name">{c.nameKo}</div>
                                <div className="gaw-progress-track">
                                  <div className="gaw-progress-fill" style={{ width: `${(c.score / 6) * 100}%` }} />
                                </div>
                                <div className="gaw-criteria-score">{c.score.toFixed(1)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback tab */}
                  {activeTab === "feedback" && (
                    <div>
                      <div className="gaw-intro-card">
                        <div className="gaw-label" style={{ marginBottom: 4 }}>
                          <span className="gaw-label-bar cyan" />
                          SENTENCE-LEVEL FEEDBACK
                        </div>
                        <p>각 문장의 문법, 표현, 내용, 구조 문제를 분석하고 개선 방안을 제시합니다.</p>
                      </div>

                      {aiFeedback.sentenceFeedback && aiFeedback.sentenceFeedback.length > 0 ? (
                        aiFeedback.sentenceFeedback.map((sf, idx) => (
                          <div key={idx} className="gaw-sf-card">
                            <div className="gaw-sf-head">
                              <span className={`gaw-cat-badge ${getCategoryClass(sf.issue)}`}>{sf.issueKo}</span>
                              <span className="gaw-sf-num">#{idx + 1}</span>
                            </div>
                            <div className="gaw-sf-block">
                              <span className="gaw-label-sub">ORIGINAL</span>
                              <div className="gaw-block-original">{sf.original}</div>
                            </div>
                            <div className="gaw-sf-block">
                              <span className="gaw-label-sub">ISSUE</span>
                              <div className="gaw-block-issue">{sf.explanation}</div>
                            </div>
                            <div className="gaw-sf-block">
                              <span className="gaw-label-sub">SUGGESTION</span>
                              <div className="gaw-block-suggestion">
                                <span className="gaw-suggest-arrow">→</span>
                                {sf.suggestion}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="gaw-empty">문장별 피드백이 아직 생성되지 않았거나 큰 문제가 발견되지 않았습니다.</div>
                      )}

                      {/* Detailed criteria feedback */}
                      {aiFeedback.criteria && aiFeedback.criteria.length > 0 && (
                        <div className="gaw-card" style={{ marginTop: 14 }}>
                          <div className="gaw-label">
                            <span className="gaw-label-bar" />
                            DETAILED CRITERIA FEEDBACK
                          </div>
                          {aiFeedback.criteria.map((c, idx) => (
                            <div key={idx} style={{ paddingTop: idx === 0 ? 0 : 12, borderTop: idx === 0 ? "none" : "1px solid var(--gaw-border-subtle)", marginTop: idx === 0 ? 0 : 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <span style={{ color: "var(--gaw-text-primary)", fontSize: 12, fontWeight: 500 }}>{c.nameKo}</span>
                                <span className="gaw-criteria-score">{c.score.toFixed(1)}/6</span>
                              </div>
                              <div className="gaw-criteria-feedback">{c.feedback}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Models tab */}
                  {activeTab === "models" && (
                    <div>
                      <div className="gaw-intro-card">
                        <div className="gaw-label" style={{ marginBottom: 4 }}>
                          <span className="gaw-label-bar" />
                          MODEL ESSAYS BY LEVEL
                        </div>
                        <p>피드백을 반영하여 개선된 모범답안을 3가지 수준으로 제공합니다.</p>
                      </div>

                      {modelAnswers.intermediate || modelAnswers.advanced || modelAnswers.expert ? (
                        <>
                          {modelAnswers.intermediate && (
                            <div className="gaw-card" style={{ marginBottom: 12 }}>
                              <div className="gaw-model-head">
                                <span className="gaw-level-badge gaw-level-intermediate">Intermediate</span>
                                <span className="gaw-model-score">Score 3-4</span>
                              </div>
                              <div className="gaw-model-body">{modelAnswers.intermediate}</div>
                            </div>
                          )}
                          {modelAnswers.advanced && (
                            <div className="gaw-card" style={{ marginBottom: 12 }}>
                              <div className="gaw-model-head">
                                <span className="gaw-level-badge gaw-level-advanced">Advanced</span>
                                <span className="gaw-model-score">Score 4-5</span>
                              </div>
                              <div className="gaw-model-body">{modelAnswers.advanced}</div>
                            </div>
                          )}
                          {modelAnswers.expert && (
                            <div className="gaw-card" style={{ marginBottom: 12 }}>
                              <div className="gaw-model-head">
                                <span className="gaw-level-badge gaw-level-expert">Expert</span>
                                <span className="gaw-model-score">Score 5-6</span>
                              </div>
                              <div className="gaw-model-body">{modelAnswers.expert}</div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="gaw-empty">
                          <span className="gaw-spinner" style={{ marginRight: 10, verticalAlign: "middle" }} />
                          모범답안을 생성하고 있습니다...
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </FullscreenWrapper>
      </SecurityWrapper>
    );
  }

  // ─────────────────────────────────────────────────────────
  // TEST-TAKING VIEW
  // ─────────────────────────────────────────────────────────
  return (
    <SecurityWrapper
      watermark="iNRISE GRE ANALYTICAL WRITING TEST"
      disableRightClick={true}
      disableKeyboardShortcuts={false}
      disableTextSelection={false}
      disableScreenshot={true}
      showSecurityNotice={true}
    >
      <FullscreenWrapper>
        <div className="gaw-page">
          {/* Header */}
          <div className="gaw-header">
            <div className="gaw-header-left">
              <button className="gaw-back" onClick={() => setLocation("/gre")}>
                ← GRE 홈
              </button>
              <h1 className="gaw-title">GRE Analytical Writing</h1>
            </div>
            <div className="gaw-header-right">
              <span className="gaw-timer">{formatTime(timeRemaining)}</span>
              <button className="gaw-btn-submit" onClick={handleSubmit}>
                제출하기
              </button>
              <button className="gaw-btn-outline" onClick={requestFullscreen}>
                <Maximize2 size={11} /> Full Screen
              </button>
            </div>
          </div>

          {/* Topic bar */}
          <div className="gaw-topic-bar">
            <span className="gaw-issue-badge">Issue</span>
            {dbTopics.length > 0 ? (
              <select
                className="gaw-topic-select"
                value={selectedTopicId || ""}
                onChange={(e) => {
                  setSelectedTopicId(e.target.value);
                  setEssay("");
                }}
              >
                {dbTopics
                  .filter((topic) => topic.taskType === currentTask)
                  .map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
              </select>
            ) : (
              <div style={{ flex: 1, color: "var(--gaw-text-muted)", fontSize: 12 }}>
                {topicsLoading ? "토픽을 불러오는 중..." : "기본 토픽 사용 중"}
              </div>
            )}
            <span className="gaw-topic-hint">30분 제한</span>
          </div>

          {/* Main 2-column */}
          <div style={{ padding: "8px 24px 40px" }}>
            <div className="gaw-2col">
              {/* PROMPT */}
              <div className="gaw-card">
                <div className="gaw-label">
                  <span className="gaw-label-bar" />
                  PROMPT
                </div>
                <div className="gaw-quote">{currentTaskData.prompt}</div>
                <div className="gaw-instr-text">{currentTaskData.instructions}</div>
              </div>

              {/* YOUR ESSAY */}
              <div className="gaw-card">
                <div className="gaw-essay-meta">
                  <div className="gaw-label" style={{ marginBottom: 0 }}>
                    <span className="gaw-label-bar cyan" />
                    YOUR ESSAY
                  </div>
                  <div className="gaw-wordcount">
                    <span className="gaw-wordcount-num">{wordCount}</span>
                    <span className="gaw-wordcount-unit">words</span>
                  </div>
                </div>
                <textarea
                  className="gaw-essay-textarea"
                  value={essay}
                  onChange={(e) => setEssay(e.target.value)}
                  placeholder="Begin your essay here... 여기에 에세이를 작성하세요..."
                  onPaste={(e) => e.stopPropagation()}
                  onCopy={(e) => e.stopPropagation()}
                  onCut={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Bottom AI section preview (kept inline so users see loading state) */}
            {(feedbackMutation.isPending || modelAnswerMutation.isPending) && (
              <div className="gaw-empty" style={{ marginTop: 16 }}>
                <span className="gaw-spinner" style={{ marginRight: 10, verticalAlign: "middle" }} />
                피드백 제공 중...
              </div>
            )}

            {showAiSection && aiFeedback && !showResults && (
              <div style={{ marginTop: 20, color: "var(--gaw-text-muted)", fontSize: 11, textAlign: "center" }}>
                제출 후 결과 화면에서 상세 피드백을 확인하세요.
              </div>
            )}
          </div>
        </div>
      </FullscreenWrapper>
    </SecurityWrapper>
  );
}
