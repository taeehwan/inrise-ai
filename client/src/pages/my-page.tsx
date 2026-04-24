import { lazy, Suspense, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import UserNavbar from "@/components/user-navbar";

const MyPageScoreHistoryChart = lazy(() => import("@/components/charts/MyPageScoreHistoryChart"));

interface UserCredits {
  balance: number;
  lifetimeEarned: number;
  lifetimeUsed: number;
  lastUpdated: string;
}

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  featureType: string;
  createdAt: string;
}

interface ScoreHistoryPoint {
  date: string;
  score: number;
  attemptId: string;
}

interface PerformanceSummary {
  examType: string;
  totalAttempts: number;
  sectionAnalysis: Array<{
    section: string;
    status: string;
    average: number | null;
    average30: number | null;
    predicted30: number | null;
    target: number;
    target30: number;
    gap: number;
    attempts: number;
    trend: number;
    scoreHistory: ScoreHistoryPoint[];
  }>;
  estimatedCurrentScore: number;
  estimatedTargetScore: number;
  weakestSections: string[];
  strongestSections: string[];
}

interface UserStudyPlan {
  id: string;
  name: string;
  examType: string;
  status: string;
  completedTasks: number;
  totalTasks: number;
  targetScore: number;
  createdAt: string;
}

interface RecentFeedback {
  id: string;
  testType: string;
  section: string;
  sectionCategory: string;
  score: number;
  feedback: string;
  questionContent?: string;
  userAnswer?: string;
  createdAt: string;
}

interface UserReview {
  id: string;
  rating: number;
  comment: string;
  examType: string;
  achievedScore?: number;
  isApproved: boolean;
  createdAt: string;
}

interface TestAttemptAchievement {
  id: string;
  testId: string;
  testTitle: string;
  examType: string;
  section: string;
  totalScore: number;
  completedAt: string;
  status: string;
}

const reviewSchema = z.object({
  examType: z.enum(["toefl", "gre", "general"]),
  achievedScore: z.string().optional(),
  comment: z.string().min(10).max(1000),
});

export default function MyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("ai");
  const [feedbackFilter, setFeedbackFilter] = useState("all");
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState("reading");
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewExamType, setReviewExamType] = useState("toefl");
  const [reviewScore, setReviewScore] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const { data: credits } = useQuery<UserCredits>({
    queryKey: ['/api/user/credits'],
    enabled: !!user,
  });

  const { data: transactions } = useQuery<CreditTransaction[]>({
    queryKey: ['/api/user/credits/transactions'],
    enabled: !!user,
  });

  const { data: performanceToefl } = useQuery<PerformanceSummary>({
    queryKey: ['/api/performance-summary?examType=toefl'],
    enabled: !!user,
  });

  const { data: studyPlans } = useQuery<UserStudyPlan[]>({
    queryKey: ['/api/study-plans/user'],
    enabled: !!user,
  });

  const { data: recentFeedbacks } = useQuery<RecentFeedback[]>({
    queryKey: ['/api/user/recent-feedbacks?limit=500'],
    enabled: !!user,
  });

  const { data: userReviews } = useQuery<UserReview[]>({
    queryKey: ['/api/reviews/user'],
    enabled: !!user,
  });

  const { data: testAttempts } = useQuery<TestAttemptAchievement[]>({
    queryKey: ['/api/user/test-attempts'],
    enabled: !!user,
  });

  interface LearningFeedback {
    overallAnalysis: string;
    sectionScores?: { reading?: number; listening?: number; speaking?: number; writing?: number };
    weakPoints: Array<{ area: string; description: string; frequency: number; examples: string[] }>;
    strongPoints: Array<{ area: string; description: string }>;
    recommendations: Array<{ priority: 'high'|'medium'|'low'; title: string; description: string; actionItems: string[] }>;
    studyPlan: Array<{ week: number; focus: string; goals: string[] }>;
  }

  const { data: learningFeedback, refetch: refetchFeedback } = useQuery<LearningFeedback | null>({
    queryKey: ['/api/student/learning-feedback'],
    enabled: !!user,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiRequest("POST", "/api/reviews", {
        rating: selectedRating,
        examType: reviewExamType,
        achievedScore: reviewScore ? parseInt(reviewScore) : null,
        comment: reviewComment,
        reviewerName: user?.firstName && user?.lastName
          ? `${user.firstName} ${user.lastName}`
          : user?.email?.split('@')[0] || '익명',
        reviewerCountry: user?.country || 'Korea',
      });
      return resp.json();
    },
    onSuccess: () => {
      toast({ title: t('mypage.review.successTitle'), description: t('mypage.review.successDesc') });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/user'] });
      setSelectedRating(0); setReviewScore(""); setReviewComment(""); setReviewExamType("toefl");
    },
    onError: (e: Error) => {
      toast({ title: t('mypage.review.failTitle'), description: e.message, variant: "destructive" });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (attempt: TestAttemptAchievement) => {
      const resp = await apiRequest("POST", "/api/live-activities", {
        attemptId: attempt.id, testId: attempt.testId, section: attempt.section,
        score: attempt.totalScore, examType: attempt.examType,
      });
      return resp.json();
    },
    onSuccess: () => {
      toast({ title: t('mypage.share.successTitle'), description: t('mypage.share.successDesc') });
    },
    onError: (e: Error) => {
      toast({ title: t('mypage.share.failTitle'), description: e.message, variant: "destructive" });
    },
  });

  const generateFeedback = async () => {
    setIsGeneratingFeedback(true);
    try {
      const resp = await apiRequest("POST", "/api/student/generate-learning-feedback");
      if (resp.ok) { await refetchFeedback(); toast({ title: t('mypage.recommend.doneTitle'), description: t('mypage.recommend.doneDesc') }); }
    } catch (e: any) {
      toast({ title: t('mypage.recommend.failTitle'), description: e.message || t('mypage.recommend.retryDesc'), variant: "destructive" });
    } finally { setIsGeneratingFeedback(false); }
  };

  const generatePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const resp = await apiRequest("POST", "/api/study-plans/generate");
      if (resp.ok) { queryClient.invalidateQueries({ queryKey: ['/api/study-plans/user'] }); toast({ title: t('mypage.recommend.doneTitle') }); }
    } catch (e: any) {
      toast({ title: t('mypage.recommend.failTitle'), description: e.message, variant: "destructive" });
    } finally { setIsGeneratingPlan(false); }
  };

  const handleSubmitReview = () => {
    if (selectedRating === 0) { toast({ title: t('mypage.review.rating'), variant: "destructive" }); return; }
    if (reviewComment.length < 10) { toast({ title: "10자 이상 작성해주세요", variant: "destructive" }); return; }
    reviewMutation.mutate();
  };

  if (authLoading) {
    return (
      <div className="mp-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mp-spin" />
      </div>
    );
  }

  if (!user) { navigate('/login'); return null; }

  const userName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email?.split('@')[0] || 'User';
  const avatarLetter = (user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase();
  const predictedScore = performanceToefl?.estimatedCurrentScore || 0;
  const streak = (user as any).streak || 0;
  const creditBalance = credits?.balance ?? 50;
  const completedCount = testAttempts?.length || 0;

  const tier = (user as any).membershipTier || 'guest';
  const tierClass = tier === 'master' || tier === 'admin' ? '' : tier === 'pro' || tier === 'max' ? 'tier-pro' : tier === 'light' ? 'tier-light' : 'tier-guest';
  const tierLabel = tier === 'admin' ? 'MASTER' : tier.toUpperCase();
  const chartFallback = (
    <div className="mp-chart-area">
      <div style={{ fontSize: 32, opacity: .2, marginBottom: 8 }}>📈</div>
      <div style={{ fontSize: 13, color: 'var(--mp-t1)', marginBottom: 4 }}>차트 로딩 중...</div>
    </div>
  );

  const sectionAnalysis = performanceToefl?.sectionAnalysis || [];
  const readingData = sectionAnalysis.find(s => s.section.toLowerCase().includes('reading'));
  const listeningData = sectionAnalysis.find(s => s.section.toLowerCase().includes('listening'));
  const speakingData = sectionAnalysis.find(s => s.section.toLowerCase().includes('speaking'));
  const writingData = sectionAnalysis.find(s => s.section.toLowerCase().includes('writing'));

  const selectedSectionData = sectionAnalysis.find(s => s.section.toLowerCase().includes(selectedSection));
  const scoreHistory = selectedSectionData?.scoreHistory || [];
  const chartData = scoreHistory.map(p => ({
    date: new Date(p.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
    score: p.score,
  }));

  const sectionMax: Record<string, number> = { reading: 30, listening: 30, speaking: 30, writing: 30 };

  const filteredFeedbacks = (recentFeedbacks || []).filter(fb =>
    feedbackFilter === 'all' || fb.sectionCategory?.toLowerCase() === feedbackFilter
  );

  const getSectionPath = (section: string) => {
    const l = section.toLowerCase();
    if (l.includes('reading')) return '/new-toefl/reading/list';
    if (l.includes('listening')) return '/new-toefl/listening/list';
    if (l.includes('speaking')) return '/new-toefl/speaking/list';
    if (l.includes('writing')) return '/new-toefl/writing/list';
    return '/new-toefl';
  };

  const activePlan = studyPlans?.find(p => p.status === 'active');

  const tabs = [
    { id: 'ai', icon: '⚡', label: t('mypage.tab.recommend') },
    { id: 'plan', icon: '📋', label: t('mypage.tab.plan') },
    { id: 'score', icon: '📊', label: t('mypage.tab.performance') },
    { id: 'feedback', icon: '💬', label: t('mypage.tab.feedback') },
    { id: 'review', icon: '✍️', label: t('mypage.tab.review') },
    { id: 'activity', icon: '📤', label: t('mypage.tab.activity') },
  ];

  const recentTransactions = (transactions || []).slice(0, 5);

  return (
    <div className="mp-wrap">
      <UserNavbar activeCredits={creditBalance} />
      <div className="mp-inner">

        {/* Profile Bar */}
        <div className="mp-profile-bar">
          <div className="pb-avatar">{avatarLetter}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="pb-name">{userName}</span>
              <span className={`pb-tier ${tierClass}`}>{tierLabel}</span>
            </div>
            <div className="pb-email">{user.email}</div>
          </div>

          <div className="pb-divider" />

          <div className="pb-stat">
            <div className="pb-stat-num blue">{predictedScore || '—'}</div>
            <div className="pb-stat-label">{t('mypage.profile.predicted')}</div>
          </div>

          <div className="pb-stat">
            <div className="pb-stat-num amber">{streak}</div>
            <div className="pb-stat-label">{t('mypage.profile.streak')}</div>
          </div>

          <div className="pb-divider" />

          <div className="pb-credit">
            <div>
              <div className="pb-credit-num">{creditBalance}</div>
              <div className="pb-credit-label">{t('mypage.profile.credits')}</div>
            </div>
            <Link href="/credits">
              <button className="pb-credit-btn">{t('mypage.profile.charge')}</button>
            </Link>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="mp-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`mp-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="mp-panels">

            {/* TAB 1: AI 학습최적화 */}
            {activeTab === 'ai' && (
              <div className="mp-card">
                {/* 4 Stats */}
                <div className="t1-stats">
                  <div className="t1-stat">
                    <div className="t1-stat-num blue">{predictedScore || '—'}</div>
                    <div className="t1-stat-label">{t('mypage.ai.predictedTotal')}</div>
                  </div>
                  <Link href="/history">
                    <a className="t1-stat" style={{ cursor: 'pointer', transition: 'opacity .15s', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div className="t1-stat-num green">{completedCount}</div>
                      <div className="t1-stat-label">{t('mypage.ai.completedTests')}</div>
                    </a>
                  </Link>
                  <div className="t1-stat">
                    <div className="t1-stat-num amber">{streak}</div>
                    <div className="t1-stat-label">{t('mypage.profile.streak')}</div>
                  </div>
                  <div className="t1-stat">
                    <div className="t1-stat-num violet">
                      {(() => {
                        const avg = sectionAnalysis.length > 0
                          ? sectionAnalysis.filter(s => s.trend).reduce((a, s) => a + s.trend, 0)
                          : 0;
                        return avg > 0 ? `+${avg.toFixed(0)}` : avg.toFixed(0);
                      })()}
                    </div>
                    <div className="t1-stat-label">{t('mypage.ai.scoreImprove')}</div>
                  </div>
                </div>

                {/* 2-col: AI recs + scores/activity */}
                <div className="t1-grid">
                  {/* Left: AI recommendations */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div className="mp-sec-title">{t('mypage.ai.title')}</div>
                      <button
                        className="mp-btn primary"
                        onClick={generateFeedback}
                        disabled={isGeneratingFeedback}
                        style={{ fontSize: 11 }}
                      >
                        {isGeneratingFeedback ? '⏳' : '⚡'} {t('mypage.ai.startAnalysis')}
                      </button>
                    </div>

                    <Link href="/new-toefl/reading/list" style={{ textDecoration: 'none' }}>
                      <div className="si">
                        <div className="si-icon r">📖</div>
                        <div className="si-body">
                          <div className="si-title">Reading</div>
                          <div className="si-desc">{t('mypage.ai.readingInference')}</div>
                        </div>
                        <span className={`si-badge ${(readingData?.status === 'weak') ? 'weak' : 'rec'}`}>
                          {(readingData?.status === 'weak') ? t('mypage.ai.weak') : t('mypage.ai.recommended')}
                        </span>
                      </div>
                    </Link>

                    <Link href="/new-toefl/listening/list" style={{ textDecoration: 'none' }}>
                      <div className="si">
                        <div className="si-icon l">🎧</div>
                        <div className="si-body">
                          <div className="si-title">Listening</div>
                          <div className="si-desc">{t('mypage.ai.listeningNote')}</div>
                        </div>
                        <span className={`si-badge ${(listeningData?.status === 'weak') ? 'weak' : 'rec'}`}>
                          {(listeningData?.status === 'weak') ? t('mypage.ai.weak') : t('mypage.ai.recommended')}
                        </span>
                      </div>
                    </Link>

                    <Link href="/new-toefl/speaking/list" style={{ textDecoration: 'none' }}>
                      <div className="si">
                        <div className="si-icon s">🎤</div>
                        <div className="si-body">
                          <div className="si-title">Speaking</div>
                          <div className="si-desc">{t('mypage.ai.speakingIntegrated')}</div>
                        </div>
                        <span className={`si-badge ${(speakingData?.status === 'weak') ? 'weak' : 'rec'}`}>
                          {(speakingData?.status === 'weak') ? t('mypage.ai.weak') : t('mypage.ai.recommended')}
                        </span>
                      </div>
                    </Link>

                    <Link href="/new-toefl/writing/list" style={{ textDecoration: 'none' }}>
                      <div className="si">
                        <div className="si-icon w">✍️</div>
                        <div className="si-body">
                          <div className="si-title">Writing</div>
                          <div className="si-desc">{t('mypage.ai.writingDiscussion')}</div>
                        </div>
                        <span className={`si-badge ${(writingData?.status === 'weak') ? 'weak' : 'rec'}`}>
                          {(writingData?.status === 'weak') ? t('mypage.ai.weak') : t('mypage.ai.recommended')}
                        </span>
                      </div>
                    </Link>

                    {learningFeedback?.overallAnalysis && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(0,187,255,.04)', border: '1px solid rgba(0,187,255,.1)', fontSize: 12, color: 'var(--mp-t2)', lineHeight: 1.6, maxHeight: 120, overflow: 'hidden', WebkitLineClamp: 6, display: '-webkit-box', WebkitBoxOrient: 'vertical' as const }}>
                          {String(learningFeedback.overallAnalysis || '')}
                        </div>

                        {learningFeedback.weakPoints?.length > 0 && (
                          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(248,113,113,.04)', border: '1px solid rgba(248,113,113,.12)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#F87171', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>취약 영역</div>
                            {learningFeedback.weakPoints.slice(0, 3).map((wp, i) => {
                              const desc = String(wp?.description ?? '');
                              return (
                                <div key={i} style={{ fontSize: 12, color: 'var(--mp-t2)', marginBottom: i < 2 ? 6 : 0, lineHeight: 1.5 }}>
                                  <span style={{ fontWeight: 600, color: 'var(--mp-t1)' }}>{String(wp?.area ?? '')}</span>
                                  <span style={{ margin: '0 4px', color: 'var(--mp-t3)' }}>·</span>
                                  {desc.substring(0, 80)}{desc.length > 80 ? '...' : ''}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {learningFeedback.recommendations?.length > 0 && (
                          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(52,211,153,.04)', border: '1px solid rgba(52,211,153,.12)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>추천 학습</div>
                            {learningFeedback.recommendations.slice(0, 3).map((rec, i) => {
                              const rDesc = String(rec?.description ?? '');
                              const rTitle = String(rec?.title ?? '');
                              const rPriority = String(rec?.priority ?? 'low');
                              return (
                                <div key={i} style={{ fontSize: 12, color: 'var(--mp-t2)', marginBottom: i < 2 ? 6 : 0, lineHeight: 1.5, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, flexShrink: 0, fontWeight: 600, background: rPriority === 'high' ? 'rgba(248,113,113,.15)' : rPriority === 'medium' ? 'rgba(251,191,36,.15)' : 'rgba(148,163,184,.15)', color: rPriority === 'high' ? '#F87171' : rPriority === 'medium' ? '#FBBF24' : '#94A3B8' }}>
                                    {rPriority === 'high' ? '높음' : rPriority === 'medium' ? '보통' : '낮음'}
                                  </span>
                                  <span><span style={{ fontWeight: 600, color: 'var(--mp-t1)' }}>{rTitle}</span> — {rDesc.substring(0, 60)}{rDesc.length > 60 ? '...' : ''}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: section scores + recent activity */}
                  <div>
                    <div className="mp-sec-title" style={{ marginBottom: 10 }}>{t('mypage.ai.sectionScores')}</div>
                    {[
                      { label: 'R', data: readingData, cls: 'blue', max: 30 },
                      { label: 'L', data: listeningData, cls: 'green', max: 30 },
                      { label: 'S', data: speakingData, cls: 'amber', max: 30 },
                      { label: 'W', data: writingData, cls: 'violet', max: 30 },
                    ].map(({ label, data, cls, max }) => (
                      <div key={label} className="ss-row">
                        <div className="ss-label">{label}</div>
                        <div className="ss-bar-bg">
                          <div
                            className={`ss-bar ${cls}`}
                            style={{ width: `${data?.average30 ? Math.round((data.average30 / max) * 100) : 0}%` }}
                          />
                        </div>
                        <div className="ss-val">{data?.average30 ? Math.round(data.average30) : '—'}</div>
                      </div>
                    ))}

                    <div className="mp-sec-title" style={{ marginTop: 16, marginBottom: 8 }}>{t('mypage.ai.recentActivity')}</div>
                    {recentTransactions.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--mp-t3)' }}>—</div>
                    ) : recentTransactions.map(tx => (
                      <div key={tx.id} className="al">
                        <div className="al-icon">{tx.type === 'bonus' ? '✦' : tx.type === 'usage' ? '✓' : '💳'}</div>
                        <div className="al-desc">{tx.description}</div>
                        <div className={`al-val ${tx.amount > 0 ? 'plus' : 'minus'}`}>
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 학습계획 */}
            {activeTab === 'plan' && (
              <div className="mp-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div className="mp-sec-title" style={{ margin: 0, fontSize: 13, color: 'var(--mp-t1)' }}>{t('mypage.plan.title')}</div>
                  <button className="mp-btn primary" onClick={generateFeedback} style={{ fontSize: 11 }}>
                    ⚡ {t('mypage.ai.startAnalysis')} →
                  </button>
                </div>

                {activePlan ? (
                  <div>
                    <div style={{ padding: 16, background: 'var(--mp-sf2)', borderRadius: 10, border: '1px solid var(--mp-bdr)', marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--mp-t1)', marginBottom: 6 }}>{activePlan.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--mp-t2)', marginBottom: 10 }}>
                        {t('mypage.plan.goal')} {activePlan.targetScore}
                      </div>
                      <div style={{ height: 4, background: 'var(--mp-sf3)', borderRadius: 2, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%', background: 'var(--mp-blue)', borderRadius: 2,
                            width: `${Math.round((activePlan.completedTasks / Math.max(activePlan.totalTasks, 1)) * 100)}%`,
                            transition: 'width .6s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mp-t3)', marginTop: 6 }}>
                        {activePlan.completedTasks}/{activePlan.totalTasks} {t('mypage.plan.tasksComplete')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mp-empty">
                    <div className="mp-empty-icon">📋</div>
                    <div className="mp-empty-title">{t('mypage.plan.empty')}</div>
                    <div className="mp-empty-desc" style={{ marginBottom: 16 }}>{t('mypage.plan.emptyDesc')}</div>
                    <button
                      className="mp-btn amber"
                      onClick={generatePlan}
                      disabled={isGeneratingPlan}
                    >
                      ⚡ {t('mypage.plan.generate')} ({t('mypage.plan.creditCost')})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: 예측점수 */}
            {activeTab === 'score' && (
              <div className="mp-card">
                {/* Section tabs */}
                <div className="t3-tabs">
                  {[
                    { id: 'reading', icon: '📖', label: 'Reading' },
                    { id: 'listening', icon: '🎧', label: 'Listening' },
                    { id: 'speaking', icon: '🎤', label: 'Speaking' },
                    { id: 'writing', icon: '✍️', label: 'Writing' },
                  ].map(sec => (
                    <button
                      key={sec.id}
                      className={`t3-tab${selectedSection === sec.id ? ' active' : ''}`}
                      onClick={() => setSelectedSection(sec.id)}
                    >
                      {sec.icon} {sec.label}
                    </button>
                  ))}
                </div>

                {/* Score boxes */}
                <div className="t3-scores">
                  <div className="t3-score-box">
                    <div className="t3-score-num">{selectedSectionData?.predicted30 ? Math.round(selectedSectionData.predicted30) : '—'}</div>
                    <div className="t3-score-label">{t('mypage.score.predicted')}</div>
                  </div>
                  <div className="t3-score-box">
                    <div className="t3-score-num">{selectedSectionData?.average30 ? Math.round(selectedSectionData.average30) : '—'}</div>
                    <div className="t3-score-label">{t('mypage.score.currentAvg')}</div>
                  </div>
                  <div className="t3-score-box">
                    <div className="t3-score-num">{sectionMax[selectedSection] || 30}</div>
                    <div className="t3-score-label">{t('mypage.score.fullScore')}</div>
                  </div>
                </div>

                {/* Chart */}
                {chartData.length > 0 ? (
                  <Suspense fallback={chartFallback}>
                    <MyPageScoreHistoryChart chartData={chartData} maxScore={sectionMax[selectedSection] || 30} />
                  </Suspense>
                ) : (
                  <div className="mp-chart-area">
                    <div style={{ fontSize: 32, opacity: .2, marginBottom: 8 }}>📈</div>
                    <div style={{ fontSize: 13, color: 'var(--mp-t1)', marginBottom: 4 }}>
                      {t('mypage.score.noHistory').replace('{section}', selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--mp-t3)' }}>{t('mypage.score.historyDesc')}</div>
                  </div>
                )}

                <div style={{ fontSize: 11, color: 'var(--mp-t3)', textAlign: 'right' }}>
                  {t('mypage.score.totalAttempts').replace('{count}', String(selectedSectionData?.attempts || 0))}
                </div>
              </div>
            )}

            {/* TAB 4: 피드백 */}
            {activeTab === 'feedback' && (
              <div className="mp-card">
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--mp-t1)', marginBottom: 2 }}>{t('mypage.feedback.title')}</div>
                  <div style={{ fontSize: 12, color: 'var(--mp-t2)', marginBottom: 14 }}>{t('mypage.feedback.desc')}</div>
                </div>

                {/* Filter buttons */}
                <div className="mp-filters">
                  {[
                    { key: 'all', label: t('mypage.feedback.all') },
                    { key: 'speaking', label: 'Speaking' },
                    { key: 'writing', label: 'Writing' },
                    { key: 'reading', label: 'Reading' },
                    { key: 'listening', label: 'Listening' },
                  ].map(f => (
                    <button
                      key={f.key}
                      className={`mp-filter-btn${feedbackFilter === f.key ? ' active' : ''}`}
                      onClick={() => setFeedbackFilter(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {filteredFeedbacks.length === 0 ? (
                  <div className="mp-empty">
                    <div className="mp-empty-icon">💬</div>
                    <div className="mp-empty-title">{t('mypage.feedback.empty')}</div>
                    <div className="mp-empty-desc" style={{ marginBottom: 16 }}>{t('mypage.feedback.emptyDesc')}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <Link href="/new-toefl/speaking/list">
                        <button className="mp-btn ghost">🎤 {t('mypage.feedback.speakingPractice')}</button>
                      </Link>
                      <Link href="/new-toefl/writing/list">
                        <button className="mp-btn ghost">✍️ {t('mypage.feedback.writingPractice')}</button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mp-scroll">
                    {filteredFeedbacks.map(fb => (
                      <div
                        key={fb.id}
                        className={`mp-fb-item${expandedFeedback === fb.id ? ' expanded' : ''}`}
                        onClick={() => setExpandedFeedback(expandedFeedback === fb.id ? null : fb.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontSize: 20 }}>
                              {fb.sectionCategory?.includes('speaking') ? '🎤' : fb.sectionCategory?.includes('writing') ? '✍️' : fb.sectionCategory?.includes('reading') ? '📖' : '🎧'}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mp-t1)' }}>
                                {fb.testType?.toUpperCase()} — {fb.section}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--mp-t3)' }}>
                                {new Date(fb.createdAt).toLocaleDateString('ko-KR')}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="mp-fb-score">{fb.score}</div>
                            <div style={{ fontSize: 16, color: 'var(--mp-t3)', transform: expandedFeedback === fb.id ? 'rotate(90deg)' : '', transition: 'transform .2s' }}>›</div>
                          </div>
                        </div>

                        {expandedFeedback === fb.id && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                            <div style={{ fontSize: 12, color: 'var(--mp-t2)', lineHeight: 1.7, marginBottom: 10 }}>{fb.feedback}</div>
                            {fb.questionContent && (
                              <div style={{ fontSize: 11, color: 'var(--mp-t3)', marginBottom: 8, padding: '8px 10px', background: 'rgba(255,184,0,.04)', borderRadius: 6 }}>
                                {fb.questionContent.substring(0, 200)}...
                              </div>
                            )}
                            <Link href={getSectionPath(fb.sectionCategory || fb.section)}>
                              <button className="mp-btn ghost" style={{ fontSize: 11 }}>▶ {t('mypage.recommend.practiceNow')}</button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: 후기작성 */}
            {activeTab === 'review' && (
              <div className="mp-card">
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--mp-t1)', marginBottom: 4 }}>{t('mypage.review.title')}</div>
                <div style={{ fontSize: 12, color: 'var(--mp-t2)', marginBottom: 16 }}>{t('mypage.review.desc')}</div>

                <div className="t5-grid">
                  {/* Left: form */}
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <div className="t5-label">{t('mypage.review.rating')}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[1,2,3,4,5].map(s => (
                          <span
                            key={s}
                            className={`t5-star${s <= selectedRating ? ' on' : ''}`}
                            onClick={() => setSelectedRating(s)}
                          >★</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div className="t5-label">{t('mypage.review.examType')}</div>
                      <select
                        className="t5-select"
                        value={reviewExamType}
                        onChange={e => setReviewExamType(e.target.value)}
                      >
                        <option value="toefl">TOEFL</option>
                        <option value="gre">GRE</option>
                        <option value="general">{t('mypage.review.general')}</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div className="t5-label">{t('mypage.review.score')}</div>
                      <input
                        type="number"
                        className="t5-input"
                        placeholder={t('mypage.review.scorePlaceholder')}
                        value={reviewScore}
                        onChange={e => setReviewScore(e.target.value)}
                      />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div className="t5-label">{t('mypage.review.content')}</div>
                      <textarea
                        className="t5-textarea"
                        placeholder={t('mypage.review.contentPlaceholder')}
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                      />
                    </div>

                    <button
                      className="t5-submit"
                      onClick={handleSubmitReview}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? '...' : t('mypage.review.submit')}
                    </button>
                  </div>

                  {/* Right: my reviews */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mp-t1)', marginBottom: 12 }}>
                      📄 {t('mypage.review.myReviews')}
                    </div>

                    {!userReviews || userReviews.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <div style={{ fontSize: 40, opacity: .2, marginBottom: 10 }}>⭐</div>
                        <div style={{ fontSize: 13, color: 'var(--mp-t2)', marginBottom: 6 }}>{t('mypage.review.none')}</div>
                        <div style={{ fontSize: 11, color: 'var(--mp-t3)' }}>{t('mypage.review.hint')}</div>
                      </div>
                    ) : (
                      <div className="mp-scroll">
                        {userReviews.map(rev => (
                          <div key={rev.id} className="mp-review-item">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <div style={{ display: 'flex', gap: 2 }}>
                                {[1,2,3,4,5].map(s => (
                                  <span key={s} style={{ color: s <= rev.rating ? 'var(--mp-amber)' : 'var(--mp-sf3)', fontSize: 14 }}>★</span>
                                ))}
                              </div>
                              <span className={`mp-review-status ${rev.isApproved ? 'approved' : 'pending'}`}>
                                {rev.isApproved ? t('mypage.review.approved') : t('mypage.review.pending')}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--mp-t2)', marginBottom: 6, lineHeight: 1.5 }}>
                              {rev.comment.substring(0, 100)}{rev.comment.length > 100 ? '...' : ''}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--mp-t3)' }}>
                              {rev.examType?.toUpperCase()}
                              {rev.achievedScore ? ` · ${rev.achievedScore}${t('mypage.review.scoreUnit')}` : ''}
                              {' · '}{new Date(rev.createdAt).toLocaleDateString('ko-KR')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: 활동공유 */}
            {activeTab === 'activity' && (
              <div className="mp-card">
                {/* Share card */}
                <div className="t6-share-card">
                  <div style={{ fontSize: 28 }}>🏆</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mp-t1)', marginBottom: 3 }}>{t('mypage.activity.shareTitle')}</div>
                    <div style={{ fontSize: 12, color: 'var(--mp-t2)' }}>{t('mypage.activity.shareDesc')}</div>
                  </div>
                </div>

                {!testAttempts || testAttempts.length === 0 ? (
                  <div className="mp-empty">
                    <div className="mp-empty-icon">🏆</div>
                    <div className="mp-empty-title">{t('mypage.activity.empty')}</div>
                    <div className="mp-empty-desc" style={{ marginBottom: 16 }}>{t('mypage.activity.emptyDesc')}</div>
                    <Link href="/new-toefl">
                      <button className="mp-btn primary">▶ {t('mypage.activity.startTest')}</button>
                    </Link>
                  </div>
                ) : (
                  <div className="mp-scroll">
                    {testAttempts.map(att => (
                      <div key={att.id} className="mp-attempt-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 20 }}>
                            {att.section?.includes('reading') ? '📖' : att.section?.includes('listening') ? '🎧' : att.section?.includes('speaking') ? '🎤' : '✍️'}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mp-t1)' }}>
                              {att.testTitle || `${att.examType?.toUpperCase()} ${att.section}`}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--mp-t3)' }}>
                              {new Date(att.completedAt).toLocaleDateString('ko-KR')}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="mp-attempt-score">{att.totalScore}</div>
                          <button
                            className="mp-btn ghost"
                            style={{ fontSize: 11, padding: '6px 12px' }}
                            onClick={() => shareMutation.mutate(att)}
                            disabled={shareMutation.isPending}
                          >
                            📤 {t('mypage.activity.shareBtn')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

        </div>
      </div>
    </div>
  );
}
