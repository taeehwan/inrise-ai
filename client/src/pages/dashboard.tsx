import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Star, 
  Trophy,
  ArrowLeft,
  Sun,
  Moon,
  ChevronRight,
  MessageSquare,
  X,
} from "lucide-react";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import type { TestAttempt, Test, UserStudyPlan } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/theme-provider";
import { UserProfileHeader } from "@/components/UserProfileHeader";
import { NotificationBell } from "@/components/NotificationBell";
import type { FeedbackRequest, SavedExplanation } from "@/components/dashboard/shared";

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}

const DeferredSurveyModal = lazy(() => import("@/components/SurveyModal"));
const DeferredDashboardResultsSection = lazy(
  () => import("@/components/dashboard/DashboardResultsSection"),
);
const DeferredDashboardFeedbackSection = lazy(
  () => import("@/components/dashboard/DashboardFeedbackSection"),
);

export default function Dashboard() {
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [explanationTab, setExplanationTab] = useState<string>('all');
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);
  
  const { data: attempts = [] } = useQuery<TestAttempt[]>({
    queryKey: ["/api/users", user?.id, "test-attempts"],
    enabled: !!user?.id,
  });

  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const { data: stats } = useQuery<ReviewStats>({
    queryKey: ["/api/reviews/stats"],
  });

  const { data: studyPlans = [] } = useQuery<UserStudyPlan[]>({
    queryKey: ["/api/study-plans/user"],
    enabled: !!user?.id,
  });

  const { data: savedExplanations = [] } = useQuery<SavedExplanation[]>({
    queryKey: ["/api/user/saved-explanations"],
    enabled: !!user?.id,
  });

  const { data: feedbackRequests = [] } = useQuery<FeedbackRequest[]>({
    queryKey: ["/api/new-toefl/feedback/my-requests"],
    enabled: !!user?.id,
  });

  const { data: surveyInfo } = useQuery<{ survey: { id: string; title: string } | null; hasResponded: boolean }>({
    queryKey: ['/api/survey/active'],
    enabled: !!user?.id,
  });
  const [showSurvey, setShowSurvey] = useState(false);
  const surveyAvailable = surveyInfo?.survey && !surveyInfo?.hasResponded;

  const pendingRequests = feedbackRequests.filter(r => r.status === 'pending');
  const approvedRequests = feedbackRequests.filter(r => r.status === 'approved');

  const completedAttempts = attempts.filter(attempt => attempt.status === "completed");
  const toeflAttempts = completedAttempts.filter(attempt => {
    const test = tests.find(t => t.id === attempt.testId);
    return test?.examType === "toefl";
  });
  const greAttempts = completedAttempts.filter(attempt => {
    const test = tests.find(t => t.id === attempt.testId);
    return test?.examType === "gre";
  });
  const satAttempts = completedAttempts.filter(attempt => {
    const test = tests.find(t => t.id === attempt.testId);
    return test?.examType === "sat";
  });

  const averageScore = completedAttempts.length > 0 
    ? Math.round(completedAttempts.reduce((sum, attempt) => sum + (attempt.totalScore || 0), 0) / completedAttempts.length)
    : 0;

  const totalTimeSpent = completedAttempts.reduce((sum, attempt) => sum + (attempt.timeSpent || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* Compact Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/">
              <img 
                src={logoPath} 
                alt="INRISE" 
                className="h-7 w-auto cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
            
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white text-sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  홈
                </Button>
              </Link>
              <button
                className="theme-toggle"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                title={resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
              >
                {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <NotificationBell />
              <UserProfileHeader variant="dark" />
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compact Header with Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="h-6 w-6 text-emerald-400" />
              학습 대시보드
            </h1>
            <p className="text-gray-400 text-sm mt-1">TOEFL/GRE 모의고사 성과를 한눈에 확인하세요</p>
          </div>
          
          {/* Quick Action Buttons - Compact */}
          <div className="flex flex-wrap gap-2">
            <Link href="/tests">
              <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white shadow-lg shadow-emerald-600/30 font-medium">
                시험 보기
              </Button>
            </Link>
            <Link href="/study-plan">
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white shadow-lg shadow-violet-600/30 font-medium">
                학습 계획
              </Button>
            </Link>
            <Link href="/results">
              <Button size="sm" className="bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/30 font-medium">
                성적 분석
              </Button>
            </Link>
            <Link href="/reviews">
              <Button size="sm" className="bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white shadow-lg shadow-amber-600/30 font-medium">
                리뷰
              </Button>
            </Link>
          </div>
        </div>

        {/* Survey Banner */}
        {surveyAvailable && (
          <div className="mb-4 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-base">📋</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">설문에 참여하고 크레딧 50개를 받으세요!</p>
              <p className="text-[11px] text-indigo-300">서비스 개선을 위한 짧은 설문 (1분 소요)</p>
            </div>
            <Button size="sm" onClick={() => setShowSurvey(true)}
              className="flex-shrink-0 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 h-auto">
              참여하기
            </Button>
          </div>
        )}

        <Suspense fallback={<div className="mt-8 h-48 rounded-xl bg-white/5 animate-pulse" aria-label="Loading results" />}>
          <DeferredDashboardResultsSection
            completedAttempts={completedAttempts}
            tests={tests}
            toeflAttempts={toeflAttempts}
            greAttempts={greAttempts}
            satAttempts={satAttempts}
            averageScore={averageScore}
            totalTimeSpent={totalTimeSpent}
          />
        </Suspense>

        <Suspense fallback={<div className="mt-8 h-48 rounded-xl bg-white/5 animate-pulse" aria-label="Loading feedback" />}>
          <DeferredDashboardFeedbackSection
            feedbackRequests={feedbackRequests}
            pendingRequests={pendingRequests}
            approvedRequests={approvedRequests}
            savedExplanations={savedExplanations}
            explanationTab={explanationTab}
            expandedExplanation={expandedExplanation}
            setExplanationTab={setExplanationTab}
            setExpandedExplanation={setExpandedExplanation}
          />
        </Suspense>
      </div>

      {showSurvey && surveyInfo?.survey && (
        <Suspense fallback={null}>
          <DeferredSurveyModal
            surveyId={surveyInfo.survey.id}
            onClose={() => setShowSurvey(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
