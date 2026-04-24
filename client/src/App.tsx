import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/theme-provider";
import { lazy, Suspense, ComponentType, useState, useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

const Home = lazy(() => import("@/pages/home"));
const Login = lazy(() => import("@/pages/login"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Tests = lazy(() => import("@/pages/tests"));
const TestTaking = lazy(() => import("@/pages/test-taking"));
const Results = lazy(() => import("@/pages/results"));
const TestResult = lazy(() => import("@/pages/test-result"));
const TestHistory = lazy(() => import("@/pages/test-history"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const AdminPanel = lazy(() => import("@/pages/admin"));
const AdminPanelNew = lazy(() => import("@/pages/admin-panel"));
const AdminSettings = lazy(() => import("@/pages/admin-settings"));
const AIQuestionGenerator = lazy(() => import("@/pages/ai-question-generator"));
const FaqPage = lazy(() => import("@/pages/faq"));
const ReviewsPage = lazy(() => import("@/pages/reviews"));
const StudyPlanPage = lazy(() => import("@/pages/study-plan"));
const TOEFLReading = lazy(() => import("@/pages/toefl-reading"));
const TOEFLListening = lazy(() => import("@/pages/toefl-listening-new"));
const AIListeningTest = lazy(() => import("@/pages/ai-listening-test"));
const TOEFLSpeakingSelection = lazy(() => import("@/pages/toefl-speaking-selection"));
const TOEFLSpeaking = lazy(() => import("@/pages/toefl-speaking-new"));
const TOEFLSpeakingIntegrated = lazy(() => import("@/pages/toefl-speaking-integrated"));
const TOEFLSpeakingIntegratedFull = lazy(() => import("@/pages/toefl-speaking-integrated-full"));
const TOEFLSpeakingIntegratedDemo = lazy(() => import("@/pages/toefl-speaking-integrated-demo"));
const TOEFLSpeakingFullTest = lazy(() => import("@/pages/toefl-speaking-full-test"));
const TOEFLWriting = lazy(() => import("@/pages/toefl-writing"));
const TOEFLWritingFull = lazy(() => import("@/pages/toefl-writing-full"));
const GreAnalyticalWriting = lazy(() => import("@/pages/gre-analytical-writing"));
const GreVerbalReasoning = lazy(() => import("@/pages/gre-verbal-reasoning"));
const GreQuantitativeReasoning = lazy(() => import("@/pages/gre-quantitative-reasoning"));
const GreVerbalList = lazy(() => import("@/pages/gre-verbal-list"));
const GreQuantitativeList = lazy(() => import("@/pages/gre-quantitative-list"));
const GreWritingList = lazy(() => import("@/pages/gre-writing-list"));
const SatSelection = lazy(() => import("@/pages/sat-selection"));
const SatReadingWriting = lazy(() => import("@/pages/sat-reading-writing"));
const SatMath = lazy(() => import("@/pages/sat-math"));
const NewTOEFLSelection = lazy(() => import("@/pages/new-toefl-selection"));
const NewTOEFLReading = lazy(() => import("@/pages/new-toefl-reading"));
const NewTOEFLListening = lazy(() => import("@/pages/new-toefl-listening"));
const NewTOEFLSpeaking = lazy(() => import("@/pages/new-toefl-speaking"));
const NewTOEFLWriting = lazy(() => import("@/pages/new-toefl-writing"));
const NewTOEFLReadingList = lazy(() => import("@/pages/new-toefl-reading-list"));
const NewTOEFLListeningList = lazy(() => import("@/pages/new-toefl-listening-list"));
const NewTOEFLSpeakingList = lazy(() => import("@/pages/new-toefl-speaking-list"));
const NewTOEFLWritingList = lazy(() => import("@/pages/new-toefl-writing-list"));
const NewTOEFLFullTest = lazy(() => import("@/pages/new-toefl-full-test"));
const NewTOEFLFullTestReport = lazy(() => import("@/pages/new-toefl-full-test-report"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AdminSpeakingTopics = lazy(() => import("@/pages/admin-speaking-topics"));
const AdminFullTestCreator = lazy(() => import("@/pages/admin-full-test-creator"));
const PerformanceAnalytics = lazy(() => import("@/pages/performance-analytics"));
const TestSets = lazy(() => import("@/pages/test-sets"));
const FullTestInterface = lazy(() => import("@/pages/full-test-interface"));
const FullTestResults = lazy(() => import("@/pages/full-test-results"));
const ScoreAnalytics = lazy(() => import("@/pages/score-analytics"));
const YouTubeReviews = lazy(() => import("@/pages/youtube-reviews"));
const AITestCreator = lazy(() => import("@/pages/ai-test-creator"));
const AdminSystemPanel = lazy(() => import("@/pages/admin-system"));
const AdminAnalytics = lazy(() => import("@/pages/admin-analytics"));
const AdminAchievements = lazy(() => import("@/pages/admin-achievements"));
const AdminReviews = lazy(() => import("@/pages/admin-reviews"));
const AdminNewToeflReading = lazy(() => import("@/pages/admin-new-toefl-reading"));
const AdminNewToeflListening = lazy(() => import("@/pages/admin-new-toefl-listening"));
const AdminNewToeflSpeaking = lazy(() => import("@/pages/admin-new-toefl-speaking"));
const AdminNewToeflWriting = lazy(() => import("@/pages/admin-new-toefl-writing"));
const AdminStudentResults = lazy(() => import("@/pages/admin-student-results"));
const AdminFeedback = lazy(() => import("@/pages/admin-feedback"));
const AdminAudioFiles = lazy(() => import("@/pages/admin-audio-files"));
const SubscriptionPage = lazy(() => import("@/pages/subscription"));
const PaymentSuccess = lazy(() => import("./pages/payment/success"));
const PaymentFail = lazy(() => import("./pages/payment/fail"));
const TestRouter = lazy(() => import("@/pages/test-router"));
const ActualTests = lazy(() => import("@/pages/actual-tests"));
const ActualTestContainer = lazy(() => import("@/pages/actual-test-container"));
const ActualTestResults = lazy(() => import("@/pages/actual-test-results"));
const MyPage = lazy(() => import("@/pages/my-page"));
const ResultsAnalysis = lazy(() => import("@/pages/results-analysis"));

type IdleCallbackHandle = number;
type IdleCallback = (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void;
type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleCallback) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

function runWhenIdle(callback: IdleCallback): IdleCallbackHandle {
  const idleWindow = typeof window !== "undefined" ? (window as IdleWindow) : null;
  if (idleWindow?.requestIdleCallback) {
    return idleWindow.requestIdleCallback(callback);
  }

  return window.setTimeout(() => callback({ timeRemaining: () => 0, didTimeout: false }), 1);
}

function cancelIdle(handle: IdleCallbackHandle) {
  const idleWindow = typeof window !== "undefined" ? (window as IdleWindow) : null;
  if (idleWindow?.cancelIdleCallback) {
    idleWindow.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}

function DeferredToaster() {
  const [ToasterComponent, setToasterComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    const handle = runWhenIdle(() => {
      void import("@/components/ui/toaster").then((module) => {
        setToasterComponent(() => module.Toaster);
      });
    });

    return () => cancelIdle(handle);
  }, []);

  return ToasterComponent ? <ToasterComponent /> : null;
}

function DeferredVisitorTracker() {
  const [VisitorTrackerComponent, setVisitorTrackerComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    const handle = runWhenIdle(() => {
      void import("@/components/VisitorTracker").then((module) => {
        setVisitorTrackerComponent(() => module.default);
      });
    });

    return () => cancelIdle(handle);
  }, []);

  return VisitorTrackerComponent ? <VisitorTrackerComponent /> : null;
}

function DeferredActivityTrackerProvider({ children }: { children: React.ReactNode }) {
  const [ProviderComponent, setProviderComponent] = useState<ComponentType<{ children: React.ReactNode }> | null>(null);

  useEffect(() => {
    const handle = runWhenIdle(() => {
      void import("@/components/ActivityTrackerProvider").then((module) => {
        setProviderComponent(() => module.ActivityTrackerProvider);
      });
    });

    return () => cancelIdle(handle);
  }, []);

  return ProviderComponent ? <ProviderComponent>{children}</ProviderComponent> : <>{children}</>;
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#064e3b] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function withSuspense<P extends object>(Component: ComponentType<P>) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

const LazyTests = withSuspense(Tests);
const LazyTestTaking = withSuspense(TestTaking);
const LazyResults = withSuspense(Results);
const LazyTestResult = withSuspense(TestResult);
const LazyTestHistory = withSuspense(TestHistory);
const LazyDashboard = withSuspense(Dashboard);
const LazyAdminPanel = withSuspense(AdminPanel);
const LazyAdminPanelNew = withSuspense(AdminPanelNew);
const LazyAdminSettings = withSuspense(AdminSettings);
const LazyAIQuestionGenerator = withSuspense(AIQuestionGenerator);
const LazyFaqPage = withSuspense(FaqPage);
const LazyReviewsPage = withSuspense(ReviewsPage);
const LazyStudyPlanPage = withSuspense(StudyPlanPage);
const LazyTOEFLReading = withSuspense(TOEFLReading);
const LazyTOEFLListening = withSuspense(TOEFLListening);
const LazyAIListeningTest = withSuspense(AIListeningTest);
const LazyTOEFLSpeakingSelection = withSuspense(TOEFLSpeakingSelection);
const LazyTOEFLSpeaking = withSuspense(TOEFLSpeaking);
const LazyTOEFLSpeakingIntegrated = withSuspense(TOEFLSpeakingIntegrated);
const LazyTOEFLSpeakingIntegratedFull = withSuspense(TOEFLSpeakingIntegratedFull);
const LazyTOEFLSpeakingIntegratedDemo = withSuspense(TOEFLSpeakingIntegratedDemo);
const LazyTOEFLSpeakingFullTest = withSuspense(TOEFLSpeakingFullTest);
const LazyTOEFLWriting = withSuspense(TOEFLWriting);
const LazyTOEFLWritingFull = withSuspense(TOEFLWritingFull);
const LazyGreAnalyticalWriting = withSuspense(GreAnalyticalWriting);
const LazyGreVerbalReasoning = withSuspense(GreVerbalReasoning);
const LazyGreQuantitativeReasoning = withSuspense(GreQuantitativeReasoning);
const LazySatSelection = withSuspense(SatSelection);
const LazySatReadingWriting = withSuspense(SatReadingWriting);
const LazySatMath = withSuspense(SatMath);
const LazyNewTOEFLSelection = withSuspense(NewTOEFLSelection);
const LazyNewTOEFLReading = withSuspense(NewTOEFLReading);
const LazyNewTOEFLListening = withSuspense(NewTOEFLListening);
const LazyNewTOEFLSpeaking = withSuspense(NewTOEFLSpeaking);
const LazyNewTOEFLWriting = withSuspense(NewTOEFLWriting);
const LazyNewTOEFLReadingList = withSuspense(NewTOEFLReadingList);
const LazyNewTOEFLListeningList = withSuspense(NewTOEFLListeningList);
const LazyNewTOEFLSpeakingList = withSuspense(NewTOEFLSpeakingList);
const LazyNewTOEFLWritingList = withSuspense(NewTOEFLWritingList);
const LazyNewTOEFLFullTest = withSuspense(NewTOEFLFullTest);
const LazyNewTOEFLFullTestReport = withSuspense(NewTOEFLFullTestReport);
const LazyAdminLogin = withSuspense(AdminLogin);
const LazyForgotPassword = withSuspense(ForgotPassword);
const LazyResetPassword = withSuspense(ResetPassword);
const LazyAdminSpeakingTopics = withSuspense(AdminSpeakingTopics);
const LazyAdminFullTestCreator = withSuspense(AdminFullTestCreator);
const LazyPerformanceAnalytics = withSuspense(PerformanceAnalytics);
const LazyTestSets = withSuspense(TestSets);
const LazyFullTestInterface = withSuspense(FullTestInterface);
const LazyFullTestResults = withSuspense(FullTestResults);
const LazyScoreAnalytics = withSuspense(ScoreAnalytics);
const LazyYouTubeReviews = withSuspense(YouTubeReviews);
const LazyAITestCreator = withSuspense(AITestCreator);
const LazyAdminSystemPanel = withSuspense(AdminSystemPanel);
const LazyAdminAnalytics = withSuspense(AdminAnalytics);
const LazyAdminAchievements = withSuspense(AdminAchievements);
const LazyAdminReviews = withSuspense(AdminReviews);
const LazyAdminNewToeflReading = withSuspense(AdminNewToeflReading);
const LazyAdminNewToeflListening = withSuspense(AdminNewToeflListening);
const LazyAdminNewToeflSpeaking = withSuspense(AdminNewToeflSpeaking);
const LazyAdminNewToeflWriting = withSuspense(AdminNewToeflWriting);
const LazyAdminStudentResults = withSuspense(AdminStudentResults);
const LazyAdminFeedback = withSuspense(AdminFeedback);
const LazyAdminAudioFiles = withSuspense(AdminAudioFiles);
const LazySubscriptionPage = withSuspense(SubscriptionPage);
const LazyPaymentSuccess = withSuspense(PaymentSuccess);
const LazyPaymentFail = withSuspense(PaymentFail);
const LazyTestRouter = withSuspense(TestRouter);
const LazyActualTests = withSuspense(ActualTests);
const LazyActualTestContainer = withSuspense(ActualTestContainer);
const LazyActualTestResults = withSuspense(ActualTestResults);
const LazyMyPage = withSuspense(MyPage);
const LazyResultsAnalysis = withSuspense(ResultsAnalysis);
const LazyHome = withSuspense(Home);
const LazyLogin = withSuspense(Login);
const LazyNotFound = withSuspense(NotFound);

function AnalyticsTracker() {
  const [location] = useLocation();
  const hasTrackedSession = useRef(false);

  useEffect(() => {
    if (!hasTrackedSession.current) {
      hasTrackedSession.current = true;
      trackEvent('session_start');
    }
  }, []);

  useEffect(() => {
    trackEvent('page_view', { path: location });
  }, [location]);

  return null;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={LazyHome} />
      <Route path="/login" component={LazyLogin} />
      <Route path="/admin-login" component={LazyAdminLogin} />
      <Route path="/forgot-password" component={LazyForgotPassword} />
      <Route path="/reset-password" component={LazyResetPassword} />
      
      <Route path="/admin/system">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminSystemPanel />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminPanel />
        </ProtectedRoute>
      </Route>
      <Route path="/admin-panel">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminPanelNew />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/admin-analytics">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminSettings />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/new-toefl-reading">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminNewToeflReading />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/new-toefl-listening">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminNewToeflListening />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/new-toefl-speaking">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminNewToeflSpeaking />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/new-toefl-writing">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminNewToeflWriting />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/student-results">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminStudentResults />
        </ProtectedRoute>
      </Route>
      <Route path="/admin-student-results">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminStudentResults />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/feedback">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminFeedback />
        </ProtectedRoute>
      </Route>
      <Route path="/admin-feedback">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminFeedback />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/audio-files">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminAudioFiles />
        </ProtectedRoute>
      </Route>
      <Route path="/admin-audio-files">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminAudioFiles />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/ai-generator">
        <ProtectedRoute requireAdmin={true}>
          <LazyAIQuestionGenerator />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/achievements">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminAchievements />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reviews">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminReviews />
        </ProtectedRoute>
      </Route>
      <Route path="/tests">
        <ProtectedRoute>
          <LazyTests />
        </ProtectedRoute>
      </Route>
      <Route path="/tests/:examType">
        <ProtectedRoute>
          <LazyTests />
        </ProtectedRoute>
      </Route>
      <Route path="/test-taking/ai-toefl-reading-:testId">
        <ProtectedRoute>
          <LazyTOEFLReading />
        </ProtectedRoute>
      </Route>
      <Route path="/test-taking/:testId">
        <ProtectedRoute>
          <LazyTestTaking />
        </ProtectedRoute>
      </Route>
      <Route path="/results/:attemptId">
        <ProtectedRoute>
          <LazyResults />
        </ProtectedRoute>
      </Route>
      <Route path="/test/result/:attemptId">
        <ProtectedRoute>
          <LazyTestResult />
        </ProtectedRoute>
      </Route>
      <Route path="/history">
        <ProtectedRoute>
          <LazyTestHistory />
        </ProtectedRoute>
      </Route>
      <Route path="/results">
        <ProtectedRoute>
          <LazyResultsAnalysis />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <LazyDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/my-page">
        <ProtectedRoute>
          <LazyMyPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/speaking-topics">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminSpeakingTopics />
        </ProtectedRoute>
      </Route>
      <Route path="/admin-speaking-topics">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminSpeakingTopics />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/full-test-creator">
        <ProtectedRoute requireAdmin={true}>
          <LazyAdminFullTestCreator />
        </ProtectedRoute>
      </Route>
      <Route path="/faq" component={LazyFaqPage} />
      <Route path="/reviews" component={LazyReviewsPage} />
      <Route path="/study-plan">
        <ProtectedRoute>
          <LazyStudyPlanPage />
        </ProtectedRoute>
      </Route>
      <Route path="/performance-analytics">
        <ProtectedRoute>
          <LazyPerformanceAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/test-sets" component={LazyTestSets} />
      <Route path="/actual-tests" component={LazyActualTests} />
      <Route path="/actual-test/:id">
        <ProtectedRoute>
          <LazyActualTestContainer />
        </ProtectedRoute>
      </Route>
      <Route path="/actual-test-results/:id">
        <ProtectedRoute>
          <LazyActualTestResults />
        </ProtectedRoute>
      </Route>
      <Route path="/full-test/:id">
        <ProtectedRoute>
          <LazyFullTestInterface />
        </ProtectedRoute>
      </Route>
      <Route path="/full-test-results/:id">
        <ProtectedRoute>
          <LazyFullTestResults />
        </ProtectedRoute>
      </Route>
      <Route path="/score-analytics">
        <ProtectedRoute>
          <LazyScoreAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/youtube-reviews" component={LazyYouTubeReviews} />
      <Route path="/ai-test-creator" component={LazyAITestCreator} />
      <Route path="/ai-question-generator">
        <ProtectedRoute>
          <LazyAIQuestionGenerator />
        </ProtectedRoute>
      </Route>

      <Route path="/subscription" component={LazySubscriptionPage} />
      <Route path="/payment/success" component={LazyPaymentSuccess} />
      <Route path="/payment/fail" component={LazyPaymentFail} />
      <Route path="/test/:testId">
        <ProtectedRoute>
          <LazyTestRouter />
        </ProtectedRoute>
      </Route>
      <Route path="/full-test/:examType/:testSetId" component={LazyFullTestInterface} />
      <Route path="/full-test-results/:attemptId" component={LazyFullTestResults} />
      <Route path="/toefl-reading/:testId?">
        <ProtectedRoute>
          <LazyTOEFLReading />
        </ProtectedRoute>
      </Route>
      <Route path="/toefl-listening/:testId?">
        <ProtectedRoute>
          <LazyTOEFLListening />
        </ProtectedRoute>
      </Route>
      <Route path="/ai-listening-test" component={LazyAIListeningTest} />
      <Route path="/toefl-speaking">
        <ProtectedRoute>
          <LazyTOEFLSpeakingSelection />
        </ProtectedRoute>
      </Route>
      <Route path="/toefl-speaking-selection">
        <ProtectedRoute>
          <LazyTOEFLSpeakingSelection />
        </ProtectedRoute>
      </Route>
      <Route path="/toefl-speaking-new/:id">
        <ProtectedRoute>
          <LazyTOEFLSpeaking />
        </ProtectedRoute>
      </Route>
      <Route path="/toefl-speaking-integrated/:id">
        <ProtectedRoute>
          <LazyTOEFLSpeakingIntegrated />
        </ProtectedRoute>
      </Route>
      <Route path="/toefl-speaking-integrated/full">
        <ProtectedRoute>
          <LazyTOEFLSpeakingIntegratedFull />
        </ProtectedRoute>
      </Route>
      <Route path="/toefl-speaking-full">
        <ProtectedRoute>
          <LazyTOEFLSpeakingIntegratedFull />
        </ProtectedRoute>
      </Route>
      <Route path="/toefl-speaking-full-test">
        <ProtectedRoute>
          <LazyTOEFLSpeakingFullTest />
        </ProtectedRoute>
      </Route>
      <Route path="/toefl-speaking-integrated-demo" component={LazyTOEFLSpeakingIntegratedDemo} />
      <Route path="/toefl-writing/:testId?">
        <ProtectedRoute>
          <LazyTOEFLWriting />
        </ProtectedRoute>
      </Route>
      <Route path="/toefl-writing-full">
        <ProtectedRoute>
          <LazyTOEFLWritingFull />
        </ProtectedRoute>
      </Route>
      <Route path="/gre">
        <Redirect to="/tests/gre" />
      </Route>
      <Route path="/gre/analytical-writing">
        <ProtectedRoute>
          <LazyGreAnalyticalWriting />
        </ProtectedRoute>
      </Route>
      <Route path="/gre/verbal-reasoning">
        <ProtectedRoute>
          <LazyGreVerbalReasoning />
        </ProtectedRoute>
      </Route>
      <Route path="/gre/quantitative-reasoning">
        <ProtectedRoute>
          <LazyGreQuantitativeReasoning />
        </ProtectedRoute>
      </Route>
      <Route path="/gre/verbal/list">
        <ProtectedRoute>
          <Suspense fallback={<div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>}>
            <GreVerbalList />
          </Suspense>
        </ProtectedRoute>
      </Route>
      <Route path="/gre/quantitative/list">
        <ProtectedRoute>
          <Suspense fallback={<div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div></div>}>
            <GreQuantitativeList />
          </Suspense>
        </ProtectedRoute>
      </Route>
      <Route path="/gre/writing/list">
        <ProtectedRoute>
          <Suspense fallback={<div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>}>
            <GreWritingList />
          </Suspense>
        </ProtectedRoute>
      </Route>

      <Route path="/sat">
        <ProtectedRoute>
          <LazySatSelection />
        </ProtectedRoute>
      </Route>
      <Route path="/sat/reading-writing">
        <ProtectedRoute>
          <LazySatReadingWriting />
        </ProtectedRoute>
      </Route>
      <Route path="/sat/math">
        <ProtectedRoute>
          <LazySatMath />
        </ProtectedRoute>
      </Route>

      <Route path="/new-toefl">
        <ProtectedRoute>
          <LazyNewTOEFLSelection />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/full-test">
        <ProtectedRoute>
          <LazyNewTOEFLFullTest />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/full-test/report">
        <ProtectedRoute>
          <LazyNewTOEFLFullTestReport />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/reading/list">
        <ProtectedRoute>
          <LazyNewTOEFLReadingList />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/listening/list">
        <ProtectedRoute>
          <LazyNewTOEFLListeningList />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/speaking/list">
        <ProtectedRoute>
          <LazyNewTOEFLSpeakingList />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/writing/list">
        <ProtectedRoute>
          <LazyNewTOEFLWritingList />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/reading">
        <ProtectedRoute>
          <LazyNewTOEFLReading />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/listening">
        <ProtectedRoute>
          <LazyNewTOEFLListening />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/speaking">
        <ProtectedRoute>
          <LazyNewTOEFLSpeaking />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl/writing">
        <ProtectedRoute>
          <LazyNewTOEFLWriting />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl-reading">
        <ProtectedRoute>
          <LazyNewTOEFLReading />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl-reading/:testId">
        <ProtectedRoute>
          <LazyNewTOEFLReading />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl-listening/:testId">
        <ProtectedRoute>
          <LazyNewTOEFLListening />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl-speaking/:testId">
        <ProtectedRoute>
          <LazyNewTOEFLSpeaking />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl-writing/:testId">
        <ProtectedRoute>
          <LazyNewTOEFLWriting />
        </ProtectedRoute>
      </Route>
      <Route path="/new-toefl-writing">
        <ProtectedRoute>
          <LazyNewTOEFLWriting />
        </ProtectedRoute>
      </Route>

      <Route component={LazyNotFound} />
    </Switch>
  );
}

// ─── Survey trigger logic (shown after 3+ AI feedbacks) ──────────────
const SURVEY_DISMISSED_KEY = 'inrise_survey_dismissed_until';
const SURVEY_NEVER_KEY = 'inrise_survey_never';
const AI_FEEDBACK_COUNT_KEY = 'inrise_ai_feedback_count';

function SurveyTrigger() {
  const { isAuthenticated } = useAuth();
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [SurveyModalComponent, setSurveyModalComponent] = useState<ComponentType<{
    surveyId: string;
    onClose: (never?: boolean) => void;
  }> | null>(null);

  const { data } = useQuery<{ survey: { id: string; title: string } | null; hasResponded: boolean }>({
    queryKey: ['/api/survey/active'],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!data?.survey || data.hasResponded) return;
    if (localStorage.getItem(SURVEY_NEVER_KEY)) return;
    const dismissedUntil = localStorage.getItem(SURVEY_DISMISSED_KEY);
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) return;

    const count = parseInt(localStorage.getItem(AI_FEEDBACK_COUNT_KEY) || '0', 10);
    if (count < 3) return;

    const timer = setTimeout(() => {
      setSurveyId(data.survey!.id);
      setShowSurvey(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    if (!showSurvey || SurveyModalComponent) return;

    const handle = runWhenIdle(() => {
      void import("@/components/SurveyModal").then((module) => {
        setSurveyModalComponent(() => module.default);
      });
    });

    return () => cancelIdle(handle);
  }, [showSurvey, SurveyModalComponent]);

  if (!showSurvey || !surveyId) return null;

  const handleClose = (never = false) => {
    setShowSurvey(false);
    if (never) {
      localStorage.setItem(SURVEY_NEVER_KEY, '1');
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      localStorage.setItem(SURVEY_DISMISSED_KEY, d.toISOString());
    }
  };

  if (!SurveyModalComponent) {
    return null;
  }

  return <SurveyModalComponent surveyId={surveyId} onClose={handleClose} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <DeferredVisitorTracker />
            <AnalyticsTracker />
            <DeferredActivityTrackerProvider>
              <div className="w-full min-h-screen flex flex-col">
                <DeferredToaster />
                <Router />
                <SurveyTrigger />
              </div>
            </DeferredActivityTrackerProvider>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
