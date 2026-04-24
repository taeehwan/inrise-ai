import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useLocation, useSearch } from "wouter";
import { 
  BookOpen, Volume2, Mic, PenTool, Clock, CheckCircle, 
  ArrowRight, Play, Target, AlertCircle, Trophy, ArrowLeft, Lock, Star
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  clearFullTestState,
  createEmptyFullTestState,
  loadFullTestState,
  saveFullTestState,
  type FullTestSection,
  type FullTestStateSnapshot,
} from "@/lib/fullTestState";
import type { 
  NewToeflReadingTest, NewToeflListeningTest, 
  NewToeflSpeakingTest, NewToeflWritingTest 
} from "@shared/schema";

type TestSection = FullTestSection;
type ViewSection = "intro" | TestSection | "complete";

interface SectionConfig {
  id: TestSection;
  title: string;
  koreanTitle: string;
  duration: string;
  icon: typeof BookOpen;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const SECTIONS: SectionConfig[] = [
  { 
    id: "reading", 
    title: "Reading", 
    koreanTitle: "리딩",
    duration: "22-33분",
    icon: BookOpen, 
    color: "text-emerald-400",
    bgColor: "from-emerald-600 to-green-700",
    borderColor: "border-emerald-500",
    description: "적응형 지문 독해 - 2개 모듈"
  },
  { 
    id: "listening", 
    title: "Listening", 
    koreanTitle: "리스닝",
    duration: "30-40분",
    icon: Volume2, 
    color: "text-teal-400",
    bgColor: "from-teal-600 to-cyan-700",
    borderColor: "border-teal-500",
    description: "적응형 청취 이해 - 2개 모듈"
  },
  { 
    id: "speaking", 
    title: "Speaking", 
    koreanTitle: "스피킹",
    duration: "9분",
    icon: Mic, 
    color: "text-orange-400",
    bgColor: "from-orange-600 to-amber-700",
    borderColor: "border-orange-500",
    description: "Listen & Repeat + Interview"
  },
  { 
    id: "writing", 
    title: "Writing", 
    koreanTitle: "라이팅",
    duration: "10분",
    icon: PenTool, 
    color: "text-indigo-400",
    bgColor: "from-indigo-600 to-purple-700",
    borderColor: "border-indigo-500",
    description: "Academic Discussion 작성"
  }
];

const getCEFRLevelHelper = (score: number): string => {
  if (score >= 5.5) return "C2";
  if (score >= 5.0) return "C1";
  if (score >= 4.0) return "B2";
  if (score >= 3.0) return "B1";
  if (score >= 2.0) return "A2";
  return "A1";
};

export default function NewTOEFLFullTest() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { isAuthenticated } = useAuth();
  const { canDoFullTest, membershipTier, tierLabel } = useSubscription();
  const { t } = useLanguage();
  const [currentSection, setCurrentSection] = useState<ViewSection>("intro");
  const [sectionIndex, setSectionIndex] = useState(-1);
  const [completedSections, setCompletedSections] = useState<Set<TestSection>>(new Set());
  const [sectionScores, setSectionScores] = useState<Record<TestSection, number | null>>({
    reading: null,
    listening: null,
    speaking: null,
    writing: null
  });
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // Fetch available tests for each section
  const { data: readingTests = [] } = useQuery<NewToeflReadingTest[]>({
    queryKey: ['/api/new-toefl/reading'],
  });
  
  const { data: listeningTests = [] } = useQuery<NewToeflListeningTest[]>({
    queryKey: ['/api/new-toefl/listening'],
  });
  
  const { data: speakingTests = [] } = useQuery<NewToeflSpeakingTest[]>({
    queryKey: ['/api/new-toefl/speaking'],
  });
  
  const { data: writingTests = [] } = useQuery<NewToeflWritingTest[]>({
    queryKey: ['/api/new-toefl/writing'],
  });

  const activeReadingTests = readingTests.filter(t => t.isActive);
  const activeListeningTests = listeningTests.filter(t => t.isActive);
  const activeSpeakingTests = speakingTests.filter(t => t.isActive);
  const activeWritingTests = writingTests.filter(t => t.isActive);

  const buildStateSnapshot = (
    overrides: Partial<FullTestStateSnapshot> = {},
  ): FullTestStateSnapshot => ({
    currentSection,
    sectionIndex,
    completedSections: Array.from(completedSections),
    sectionScores,
    startTime: startTime?.toISOString() || null,
    elapsedTime,
    attemptId,
    ...overrides,
  });

  const syncAttempt = async (id: string | null, payload: Record<string, unknown>) => {
    if (!id || !isAuthenticated) return;
    try {
      await apiRequest("PATCH", `/api/new-toefl/full-test-attempts/${id}`, payload);
    } catch (error) {
      console.error("Failed to sync full test attempt:", error);
    }
  };

  // On mount: restore state from localStorage and handle URL params from section completion
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const completedSection = params.get('section') as TestSection | null;
    const scoreStr = params.get('score');
    const returnedAttemptId = params.get('attemptId');
    const savedState = loadFullTestState();

    if (completedSection && scoreStr) {
      if (savedState) {
        const savedCompleted: TestSection[] = savedState.completedSections || [];
        const updatedCompleted = new Set([...savedCompleted, completedSection]);
        const updatedScores: Record<TestSection, number | null> = {
          ...savedState.sectionScores,
          [completedSection]: parseFloat(scoreStr)
        };
        const savedStart = savedState.startTime ? new Date(savedState.startTime) : new Date();
        const savedElapsed = savedState.elapsedTime || 0;
        const savedAttemptId = returnedAttemptId || savedState.attemptId || null;

        setCompletedSections(updatedCompleted);
        setSectionScores(updatedScores);
        setStartTime(savedStart);
        setElapsedTime(savedElapsed);
        setAttemptId(savedAttemptId);

        // Determine next section
        const completedIdx = SECTIONS.findIndex(s => s.id === completedSection);
        if (completedIdx < SECTIONS.length - 1) {
          const nextSection = SECTIONS[completedIdx + 1];
          setCurrentSection(nextSection.id);
          setSectionIndex(completedIdx + 1);

          saveFullTestState(buildStateSnapshot({
            currentSection: nextSection.id,
            sectionIndex: completedIdx + 1,
            completedSections: Array.from(updatedCompleted),
            sectionScores: updatedScores,
            startTime: savedStart.toISOString(),
            elapsedTime: savedElapsed,
            attemptId: savedAttemptId
          }));
          void syncAttempt(savedAttemptId, {
            currentSection: nextSection.id,
            currentSectionIndex: completedIdx + 1,
            [`${completedSection}Score`]: parseFloat(scoreStr),
            [`${completedSection}CompletedAt`]: new Date(),
            [`${nextSection.id}StartedAt`]: new Date(),
            status: "in_progress",
          });
        } else {
          const validScores = Object.values(updatedScores).filter(s => s !== null) as number[];
          const totalScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
          const cefrLevel = getCEFRLevelHelper(totalScore);
          const traditionalScore = Math.round((totalScore / 6) * 120);

          setCurrentSection("complete");
          setSectionIndex(SECTIONS.length);

          saveFullTestState(buildStateSnapshot({
            currentSection: 'complete',
            sectionIndex: SECTIONS.length,
            completedSections: Array.from(updatedCompleted),
            sectionScores: updatedScores,
            startTime: savedStart.toISOString(),
            elapsedTime: savedElapsed,
            totalScore,
            cefrLevel,
            traditionalScore,
            attemptId: savedAttemptId
          }));
          void syncAttempt(savedAttemptId, {
            currentSection: "completed",
            currentSectionIndex: SECTIONS.length,
            [`${completedSection}Score`]: parseFloat(scoreStr),
            [`${completedSection}CompletedAt`]: new Date(),
            totalScore,
            cefrLevel,
            completedAt: new Date(),
            status: "completed",
          });
        }
      }
    } else if (savedState && savedState.currentSection !== "intro" && savedState.currentSection !== "complete") {
      setCurrentSection(savedState.currentSection);
      setSectionIndex(savedState.sectionIndex);
      setCompletedSections(new Set(savedState.completedSections));
      setSectionScores(savedState.sectionScores);
      setStartTime(savedState.startTime ? new Date(savedState.startTime) : null);
      setElapsedTime(savedState.elapsedTime);
      setAttemptId(savedState.attemptId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer effect
  useEffect(() => {
    if (startTime && currentSection !== "intro" && currentSection !== "complete") {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, currentSection]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTest = () => {
    const begin = async () => {
      const now = new Date();
      let newAttemptId = `ft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (isAuthenticated) {
        try {
          const response = await apiRequest("POST", "/api/new-toefl/full-test-attempts", {
            currentSection: "reading",
            currentSectionIndex: 0,
            readingStartedAt: now,
            status: "in_progress",
          });
          const createdAttempt = await response.json();
          if (createdAttempt?.id) {
            newAttemptId = createdAttempt.id;
          }
        } catch (error) {
          console.error("Failed to create full test attempt:", error);
        }
      }

      setAttemptId(newAttemptId);
      setCurrentSection("reading");
      setSectionIndex(0);
      setCompletedSections(new Set());
      setSectionScores(createEmptyFullTestState().sectionScores);
      setStartTime(now);
      setElapsedTime(0);
      saveFullTestState({
        ...createEmptyFullTestState(),
        currentSection: "reading",
        sectionIndex: 0,
        startTime: now.toISOString(),
        attemptId: newAttemptId,
      });
    };

    void begin();
  };

  const completeSection = (section: TestSection, score?: number) => {
    const newCompletedSections = new Set(Array.from(completedSections).concat(section));
    setCompletedSections(newCompletedSections);
    
    const newScores = score !== undefined 
      ? { ...sectionScores, [section]: score }
      : sectionScores;
    if (score !== undefined) {
      setSectionScores(newScores as Record<TestSection, number | null>);
    }
    
    const currentIdx = SECTIONS.findIndex(s => s.id === section);
    if (currentIdx < SECTIONS.length - 1) {
      const nextSection = SECTIONS[currentIdx + 1];
      setCurrentSection(nextSection.id);
      setSectionIndex(currentIdx + 1);
    } else {
      setCurrentSection("complete");
      setSectionIndex(SECTIONS.length);
      
      // Calculate derived values
      const validScores = Object.values(newScores).filter(s => s !== null) as number[];
      const totalScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
      const cefrLevel = getCEFRLevelHelper(totalScore);
      const traditionalScore = Math.round((totalScore / 6) * 120);
      
      saveFullTestState(buildStateSnapshot({
        currentSection: 'complete',
        sectionIndex: SECTIONS.length,
        completedSections: Array.from(newCompletedSections),
        sectionScores: newScores,
        totalScore,
        cefrLevel,
        traditionalScore
      }));
    }
  };
  
  const goToSection = (section: TestSection, testId?: string) => {
    saveFullTestState(buildStateSnapshot({
      currentSection: section,
      sectionIndex: SECTIONS.findIndex(s => s.id === section),
    }));
    void syncAttempt(attemptId, {
      currentSection: section,
      currentSectionIndex: SECTIONS.findIndex(s => s.id === section),
      [`${section}StartedAt`]: new Date(),
      status: "in_progress",
    });

    const attemptParam = attemptId ? `&attemptId=${attemptId}` : '';

    // Navigate to section-specific test page
    const baseUrl = `/new-toefl/${section}`;
    if (testId) {
      setLocation(`${baseUrl}?testId=${testId}&fullTest=true${attemptParam}`);
    } else {
      // Use first available test
      let selectedTestId: string | undefined;
      switch (section) {
        case "reading":
          selectedTestId = activeReadingTests[0]?.id;
          break;
        case "listening":
          selectedTestId = activeListeningTests[0]?.id;
          break;
        case "speaking":
          selectedTestId = activeSpeakingTests[0]?.id;
          break;
        case "writing":
          selectedTestId = activeWritingTests[0]?.id;
          break;
      }
      if (selectedTestId) {
        setLocation(`${baseUrl}?testId=${selectedTestId}&fullTest=true${attemptParam}`);
      }
    }
  };

  const calculateTotalScore = () => {
    const scores = Object.values(sectionScores).filter(s => s !== null) as number[];
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  // Intro screen
  if (currentSection === "intro") {
    const savedState = loadFullTestState();
    const hasSavedProgress =
      !!savedState &&
      savedState.currentSection !== "intro" &&
      savedState.currentSection !== "complete";

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#064e3b] flex flex-col">
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
          <div className="w-full px-4 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between h-14">
              <Link href="/new-toefl">
                <Button variant="ghost" className="text-gray-700 hover:text-emerald-600">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('fulltest.back')}
                </Button>
              </Link>
              <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 px-4 py-1">
                {t('fulltest.examBadge')}
              </Badge>
            </div>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-5xl w-full border-2 border-white/20 bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                <Target className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                NEW TOEFL iBT 2026
              </CardTitle>
              <p className="text-gray-300 text-lg">{t('fulltest.mockExam')}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {SECTIONS.map((section, idx) => {
                  const Icon = section.icon;
                  return (
                    <div key={section.id} className={`p-4 rounded-xl bg-gradient-to-br ${section.bgColor} border ${section.borderColor}/50`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-bold">{section.title}</div>
                          <div className="text-white/70 text-sm">{section.koreanTitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/80">{section.description}</span>
                        <Badge className="bg-white/20 text-white border-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {section.duration}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white/10 rounded-xl p-4 space-y-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  {t('fulltest.examInfo')}
                </h3>
                <ul className="text-gray-300 text-sm space-y-2">
                  <li>• {t('fulltest.totalTime')}</li>
                  <li>• {t('fulltest.examOrder')}</li>
                  <li>• {t('fulltest.scoreSystem')}</li>
                  <li>• {t('fulltest.noBack')}</li>
                </ul>
              </div>

              {canDoFullTest ? (
                <div className="space-y-3">
                  <Button 
                    onClick={startTest}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-lg font-semibold py-6 shadow-lg"
                    data-testid="button-start-full-test"
                  >
                    <Play className="h-6 w-6 mr-2" />
                    {t('fulltest.startExam')}
                  </Button>
                  {hasSavedProgress && savedState && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentSection(savedState.currentSection);
                        setSectionIndex(savedState.sectionIndex);
                        setCompletedSections(new Set(savedState.completedSections));
                        setSectionScores(savedState.sectionScores);
                        setStartTime(savedState.startTime ? new Date(savedState.startTime) : null);
                        setElapsedTime(savedState.elapsedTime);
                        setAttemptId(savedState.attemptId);
                      }}
                      className="w-full border-white/20 bg-white/10 text-white hover:bg-white/15"
                    >
                      이어서 진행
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 backdrop-blur-sm">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex-shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-white">{t('fulltest.locked')}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" />{t('fulltest.proRequired')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        현재 <span className="text-sky-400">{tierLabel}</span> 플랜 · 프로 이상 구독 시 이용 가능
                      </p>
                    </div>
                    <Link href="/subscription">
                      <Button size="sm" className="h-8 text-xs px-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 flex-shrink-0">
                        {t('fulltest.upgrade')}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Complete screen
  if (currentSection === "complete") {
    const totalScore = calculateTotalScore();
    const cefrLevel = getCEFRLevelHelper(totalScore);
    const traditionalScore = Math.round((totalScore / 6) * 120);

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#064e3b] flex flex-col">
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
          <div className="w-full px-4 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between h-14">
              <Link href="/new-toefl">
                <Button variant="ghost" className="text-gray-700 hover:text-emerald-600">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('fulltest.back')}
                </Button>
              </Link>
              <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 px-4 py-1">
                {t('fulltest.completeBadge')}
              </Badge>
            </div>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-5xl w-full border-2 border-white/20 bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-white mb-2">
                {t('fulltest.complete')}
              </CardTitle>
              <p className="text-gray-300">{t('fulltest.totalTime').split(':')[0]}: {formatTime(elapsedTime)}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gradient-to-br from-emerald-600/50 to-green-700/50 rounded-xl p-6 border border-emerald-500/30">
                  <div className="text-5xl font-bold text-white mb-2">{totalScore.toFixed(1)}</div>
                  <div className="text-emerald-300">Overall Score</div>
                  <div className="text-gray-400 text-sm">1-6 Scale</div>
                </div>
                <div className="bg-gradient-to-br from-blue-600/50 to-indigo-700/50 rounded-xl p-6 border border-blue-500/30">
                  <div className="text-5xl font-bold text-white mb-2">{cefrLevel}</div>
                  <div className="text-blue-300">CEFR Level</div>
                  <div className="text-gray-400 text-sm">Language Proficiency</div>
                </div>
                <div className="bg-gradient-to-br from-purple-600/50 to-pink-700/50 rounded-xl p-6 border border-purple-500/30">
                  <div className="text-5xl font-bold text-white mb-2">{traditionalScore}</div>
                  <div className="text-purple-300">Traditional</div>
                  <div className="text-gray-400 text-sm">0-120 Scale</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {SECTIONS.map(section => {
                  const Icon = section.icon;
                  const score = sectionScores[section.id];
                  return (
                    <div key={section.id} className={`p-4 rounded-xl bg-gradient-to-br ${section.bgColor}/50 border ${section.borderColor}/30`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-5 w-5 text-white" />
                        <span className="text-white font-semibold">{section.title}</span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {score !== null ? score.toFixed(1) : "-"}
                      </div>
                      <div className="text-white/60 text-sm">{section.koreanTitle}</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <Link href="/new-toefl/full-test/report" className="flex-1">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-4">
                    {t('fulltest.viewReport')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/new-toefl" className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full border-white/30 text-white hover:bg-white/10 py-4"
                    onClick={clearFullTestState}
                  >
                    {t('fulltest.backToMain')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Section in progress screen
  const currentSectionConfig = SECTIONS.find(s => s.id === currentSection);
  const progress = ((sectionIndex + 1) / SECTIONS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#064e3b] flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 px-4 py-1">
                {t('fulltest.inProgress')}
              </Badge>
              <div className="text-gray-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {sectionIndex + 1} / {SECTIONS.length} {t('fulltest.section')}
              </div>
              <Progress value={progress} className="w-32 h-2" />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-4xl w-full border-2 border-white/20 bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center pb-4">
            {currentSectionConfig && (
              <>
                <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${currentSectionConfig.bgColor} rounded-2xl flex items-center justify-center border ${currentSectionConfig.borderColor}`}>
                  <currentSectionConfig.icon className="h-10 w-10 text-white" />
                </div>
                <Badge className={`mb-2 bg-gradient-to-r ${currentSectionConfig.bgColor} text-white border-0`}>
                  Section {sectionIndex + 1} of {SECTIONS.length}
                </Badge>
                <CardTitle className="text-3xl font-bold text-white mb-2">
                  {currentSectionConfig.title}
                </CardTitle>
                <p className="text-gray-300">{currentSectionConfig.koreanTitle} • {currentSectionConfig.duration}</p>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-gray-300 text-center">
                {currentSectionConfig?.description}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => goToSection(currentSection as TestSection)}
                className={`w-full bg-gradient-to-r ${currentSectionConfig?.bgColor} text-white text-lg font-semibold py-6 shadow-lg`}
                data-testid={`button-start-${currentSection}`}
              >
                <Play className="h-6 w-6 mr-2" />
                {t('fulltest.startSection').replace('{title}', currentSectionConfig?.title || '')}
              </Button>
              
              {/* For demo purposes, allow skipping to next section */}
              <Button 
                variant="ghost"
                onClick={() => completeSection(currentSection as TestSection, Math.random() * 2 + 4)}
                className="text-gray-400 hover:text-white"
                data-testid={`button-skip-${currentSection}`}
              >
                {t('fulltest.demoSkip')}
              </Button>
            </div>

            <div className="flex justify-center gap-2">
              {SECTIONS.map((section, idx) => {
                const isCompleted = completedSections.has(section.id);
                const isCurrent = section.id === currentSection;
                return (
                  <div 
                    key={section.id}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : isCurrent 
                          ? `bg-gradient-to-br ${section.bgColor} text-white ring-2 ring-white`
                          : 'bg-white/20 text-white/50'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
