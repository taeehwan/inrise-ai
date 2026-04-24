import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Target, 
  Clock, 
  Calendar as CalendarIcon, 
  BookOpen, 
  TrendingUp, 
  CheckCircle,
  Home,
  HelpCircle,
  MessageCircle,
  Play,
  Edit,
  Trash2,
  BarChart3,
  Medal,
  Star,
  User,
  Sparkles,
  Trophy,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import type { UserStudyPlan, StudyScheduleItem, StudyProgress, Test } from "@shared/schema";
import { UserProfileHeader } from "@/components/UserProfileHeader";
import {
  AIGeneratedPlanResult,
  AIWeeklyPlan,
  sectionLabels,
} from "@/components/study-plan/shared";

const DeferredStudyPlanCreateDialog = lazy(() => import("@/components/study-plan/StudyPlanCreateDialog"));

export default function StudyPlan() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<AIGeneratedPlanResult | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  // Fetch study plans
  const { data: studyPlans = [], isLoading } = useQuery<UserStudyPlan[]>({
    queryKey: ["/api/study-plans/user"],
    enabled: !!isAuthenticated
  });

  // Fetch test data
  const { data: availableTests = [] } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
    enabled: !!isAuthenticated
  });

  const selectedPlan = studyPlans.find((plan: UserStudyPlan) => plan.id === selectedPlanId);
  const selectedPlanWeeklyPlan = Array.isArray(selectedPlan?.aiGeneratedPlan)
    ? (selectedPlan.aiGeneratedPlan as AIWeeklyPlan[])
    : [];
  const selectedPlanSummary = typeof selectedPlan?.aiPlanSummary === "string"
    ? selectedPlan.aiPlanSummary
    : null;

  // Fetch progress data for selected plan
  const { data: progress = [] } = useQuery({
    queryKey: ["/api/study-progress", selectedPlanId],
    enabled: !!selectedPlanId
  });

  // Complete schedule item mutation
  const completeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("PATCH", `/api/study-schedule/${itemId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-progress", selectedPlanId] });
      toast({
        title: "완료했습니다!",
        description: "학습 진도가 업데이트되었습니다."
      });
    }
  });

  // Complete AI plan task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ planId, week, day, isCompleted }: { planId: string; week: number; day: number; isCompleted: boolean }) => {
      const response = await apiRequest("PATCH", `/api/study-plans/${planId}/task/${week}/${day}/complete`, { isCompleted });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/study-plans/user"] });
      // Update local state
      if (data.completedTaskKeys) {
        setCompletedTasks(new Set(data.completedTaskKeys));
      }
    }
  });

  // Load completed tasks when plan changes
  useEffect(() => {
    if (selectedPlan && (selectedPlan as any).completedTaskKeys) {
      setCompletedTasks(new Set((selectedPlan as any).completedTaskKeys));
    } else {
      setCompletedTasks(new Set());
    }
  }, [selectedPlanId, selectedPlan]);

  // Handle task completion toggle
  const handleTaskToggle = (week: number, day: number) => {
    if (!selectedPlanId) return;
    
    const taskKey = `${week}-${day}`;
    const isCurrentlyCompleted = completedTasks.has(taskKey);
    
    // Optimistically update UI
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (isCurrentlyCompleted) {
        next.delete(taskKey);
      } else {
        next.add(taskKey);
      }
      return next;
    });
    
    // Send to server
    completeTaskMutation.mutate({
      planId: selectedPlanId,
      week,
      day,
      isCompleted: !isCurrentlyCompleted
    });
  };

  // Calculate progress stats based on completed tasks in AI plan
  const getProgressStats = () => {
    if (!selectedPlan) return { completion: 0, improvement: 0 };
    
    // Use completedTasks from the AI plan tracking
    const completedCount = completedTasks.size;
    const totalTasks = selectedPlan.totalTasks || 0;
    const completion = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
    
    const improvement = selectedPlan.currentScore && selectedPlan.targetScore 
      ? ((selectedPlan.targetScore - selectedPlan.currentScore) / selectedPlan.targetScore) 
      : 0;
    
    return { completion: Math.round(completion), improvement: Math.round(improvement * 100) };
  };

  // Get recommended tests
  const getRecommendedTests = () => {
    if (!selectedPlan || !availableTests.length) return [];

    const focusAreas = selectedPlan.focusAreas ?? [];
    
    return availableTests
      .filter((test: Test) => 
        test.examType === selectedPlan.examType && 
        focusAreas.some((area: string) => test.section.includes(area))
      )
      .slice(0, 3);
  };

  const { completion, improvement } = getProgressStats();
  const recommendedTests = getRecommendedTests();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#312e81]">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">{t('studyPlan.loginRequired')}</h1>
          <p className="text-gray-300 mb-6">{t('studyPlan.loginRequiredDesc')}</p>
          <Link href="/login">
            <Button className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white">{t('studyPlan.doLogin')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#312e81]">
      {/* Modern Navigation - White backdrop like new-toefl */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <div className="flex items-center">
                <img 
                  src={logoPath} 
                  alt="INRISE" 
                  className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                />
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" className="text-gray-700 hover:text-purple-600">
                  <Home className="mr-2 h-4 w-4" />
                  {t('newToefl.home')}
                </Button>
              </Link>
              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 px-3 py-1">
                <Target className="h-3 w-3 mr-1" />
                {t('studyPlan.fastTrackBadge')}
              </Badge>
              <UserProfileHeader variant="light" />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Feature Highlight Section */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-purple-500/20 mb-12">
          <h3 className="text-2xl font-bold text-white mb-4">{t('studyPlan.benefitsTitle')}</h3>
          <div className="grid md:grid-cols-3 gap-6 text-gray-300">
            <div>
              <h4 className="text-purple-400 font-semibold mb-2">🎯 {t('studyPlan.personalizedCurriculum')}</h4>
              <p>{t('studyPlan.personalizedCurriculumDesc')} <strong className="text-white">{t('studyPlan.personalizedRoadmap')}</strong> {t('studyPlan.personalizedCurriculumEnd')}</p>
            </div>
            <div>
              <h4 className="text-purple-400 font-semibold mb-2">📊 {t('studyPlan.progressTracking')}</h4>
              <p><strong className="text-white">{t('studyPlan.realtimeRate')}</strong> {t('studyPlan.progressTrackingEnd')}</p>
            </div>
            <div>
              <h4 className="text-purple-400 font-semibold mb-2">🏆 {t('studyPlan.achievementBadges')}</h4>
              <p>{t('studyPlan.achievementBadgesDesc')} <strong className="text-white">{t('studyPlan.badgeEarn')}</strong></p>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <div className="text-center mb-12">
          <Badge className="mb-6 bg-gradient-to-r from-purple-500 to-blue-600 text-white border-0 px-6 py-2 text-sm font-medium shadow-lg">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            SMART PLANNER
          </Badge>
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            {t('studyPlan.heroTitle')}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent block mt-2">
              {t('studyPlan.heroTitle2')}
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto">
            {t('studyPlan.heroDesc')}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl hover:shadow-purple-500/20 transition-all duration-500">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Target className="h-7 w-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-purple-400 mb-2">{t('studyPlan.optimized')}</div>
              <div className="text-gray-300 font-medium">{t('studyPlan.planLabel')}</div>
              <div className="text-sm text-gray-500 mt-1">{t('studyPlan.personalizedDesign')}</div>
            </CardContent>
          </Card>
          
          <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <div className="text-4xl font-bold text-emerald-400 mb-2">+30점</div>
              <div className="text-gray-300 font-medium">{t('studyPlan.maxImprovement')}</div>
              <div className="text-sm text-gray-500 mt-1">{t('studyPlan.achievable')}</div>
            </CardContent>
          </Card>
          
          <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl hover:shadow-blue-500/20 transition-all duration-500">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <div className="text-4xl font-bold text-blue-400 mb-2">12{t('mypage.recommend.weekSuffix')}</div>
              <div className="text-gray-300 font-medium">{t('studyPlan.goalLabel')}</div>
              <div className="text-sm text-gray-500 mt-1">{t('studyPlan.intensiveStudy')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar */}
        <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="h-6 w-6 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">{t('studyPlan.manageTitle')}</h2>
                </div>
                <p className="text-gray-400">
                  {t('studyPlan.manageDesc')}
                </p>
              </div>
            
              <div className="flex items-center gap-4">
                {studyPlans.length > 0 && (
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger className="w-64 bg-white">
                      <SelectValue placeholder="학습 계획 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {studyPlans.map((plan: UserStudyPlan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} ({plan.examType.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  새 계획 만들기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Suspense fallback={null}>
          {isCreateDialogOpen ? (
            <DeferredStudyPlanCreateDialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
              onGenerated={(planId, plan) => {
                setGeneratedPlan(plan);
                setSelectedPlanId(planId);
              }}
            />
          ) : null}
        </Suspense>

        {/* Main Content */}
        {selectedPlan ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Plan Overview & Progress */}
            <div className="lg:col-span-2 space-y-6">
              {/* Plan Overview */}
              <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Target className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-white">
                          {selectedPlan.name}
                        </CardTitle>
                        <CardDescription className="text-base text-gray-400">
                          {selectedPlan.examType.toUpperCase()} • {selectedPlan.duration}주 맞춤 학습 로드맵
                        </CardDescription>
                      </div>
                    </div>
                    <Badge 
                      className={selectedPlan.status === "active" 
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-4 py-2" 
                        : "bg-gray-500/20 text-gray-300 border border-gray-400/30 px-4 py-2"
                      }
                    >
                      {selectedPlan.status === "active" ? "🚀 진행중" : selectedPlan.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-500/10 border border-blue-400/20 rounded-xl">
                      <div className="text-3xl font-bold text-blue-400">
                        {selectedPlan.currentScore || "?"}
                      </div>
                      <div className="text-sm text-blue-300/80 font-medium">현재 점수</div>
                    </div>
                    <div className="text-center p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-xl">
                      <div className="text-3xl font-bold text-emerald-400">
                        {selectedPlan.targetScore}
                      </div>
                      <div className="text-sm text-emerald-300/80 font-medium">목표 점수</div>
                    </div>
                    <div className="text-center p-4 bg-orange-500/10 border border-orange-400/20 rounded-xl">
                      <div className="text-3xl font-bold text-orange-400">
                        {selectedPlan.weeklyHours}h
                      </div>
                      <div className="text-sm text-orange-300/80 font-medium">주간 학습</div>
                    </div>
                    <div className="text-center p-4 bg-purple-500/10 border border-purple-400/20 rounded-xl">
                      <div className="text-3xl font-bold text-purple-400">
                        {completion}%
                      </div>
                      <div className="text-sm text-purple-300/80 font-medium">완료율</div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-semibold text-white">학습 진도</span>
                      <span className="text-lg font-bold text-purple-400">{completion}%</span>
                    </div>
                    <Progress value={completion} className="h-3" />
                    <div className="flex justify-between text-sm text-gray-400 mt-2">
                      <span>시작</span>
                      <span>목표 달성까지 {100-completion}% 남음</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Generated Weekly Plan */}
              {selectedPlanWeeklyPlan.length > 0 && (
                <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-white mb-2">
                          <CalendarIcon className="h-5 w-5 text-purple-400" />
                          주별 학습 커리큘럼
                        </CardTitle>
                        {selectedPlanSummary && (
                          <p className="text-sm text-gray-400 leading-relaxed">
                            {selectedPlanSummary}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Week Navigation */}
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
                        disabled={selectedWeek === 1}
                        className="border-white/20 text-gray-300 hover:bg-white/10"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex gap-1 overflow-x-auto flex-1 px-2">
                        {selectedPlanWeeklyPlan.map((week) => (
                          <Button
                            key={week.week}
                            variant={selectedWeek === week.week ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedWeek(week.week)}
                            className={selectedWeek === week.week 
                              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 min-w-[60px]" 
                              : "border-white/20 text-gray-300 hover:bg-white/10 min-w-[60px]"
                            }
                          >
                            {week.week}주차
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWeek(Math.min(selectedPlanWeeklyPlan.length, selectedWeek + 1))}
                        disabled={selectedWeek === selectedPlanWeeklyPlan.length}
                        className="border-white/20 text-gray-300 hover:bg-white/10"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selected Week Content */}
                    {(() => {
                      const currentWeek = selectedPlanWeeklyPlan.find(w => w.week === selectedWeek);
                      if (!currentWeek) return null;
                      
                      return (
                        <div className="space-y-4">
                          {/* Week Theme & Goals */}
                          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/20 rounded-xl p-4">
                            <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-yellow-400" />
                              {currentWeek.theme}
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {currentWeek.goals?.map((goal, i) => (
                                <Badge key={i} className="bg-white/10 text-gray-200 border border-white/20 text-xs">
                                  ✓ {goal}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-amber-400">
                              <Medal className="h-4 w-4" />
                              <span className="font-medium">마일스톤:</span>
                              <span className="text-gray-300">{currentWeek.milestone}</span>
                            </div>
                          </div>

                          {/* Daily Tasks */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">일별 학습 과제</h5>
                              <span className="text-xs text-gray-500">
                                {currentWeek.dailyTasks?.filter((_, i) => completedTasks.has(`${currentWeek.week}-${i + 1}`)).length || 0}/{currentWeek.dailyTasks?.length || 0} 완료
                              </span>
                            </div>
                            <div className="grid gap-3">
                              {currentWeek.dailyTasks?.map((task, i) => {
                                const taskKey = `${currentWeek.week}-${task.day}`;
                                const isTaskCompleted = completedTasks.has(taskKey);
                                
                                return (
                                  <div 
                                    key={i} 
                                    className={`bg-white/5 border rounded-lg p-4 transition-all cursor-pointer ${
                                      isTaskCompleted 
                                        ? 'border-emerald-400/40 bg-emerald-500/10' 
                                        : 'border-white/10 hover:bg-white/10'
                                    }`}
                                    onClick={() => handleTaskToggle(currentWeek.week, task.day)}
                                    data-testid={`task-item-${currentWeek.week}-${task.day}`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center">
                                          <Checkbox 
                                            checked={isTaskCompleted}
                                            onCheckedChange={() => handleTaskToggle(currentWeek.week, task.day)}
                                            className={`mr-3 h-5 w-5 ${isTaskCompleted ? 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500' : 'border-white/40'}`}
                                            onClick={(e) => e.stopPropagation()}
                                            data-testid={`task-checkbox-${currentWeek.week}-${task.day}`}
                                          />
                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                                            isTaskCompleted ? 'opacity-60' : ''
                                          } ${task.section === 'reading' ? 'bg-gradient-to-br from-purple-600 to-purple-700' :
                                              task.section === 'listening' ? 'bg-gradient-to-br from-pink-600 to-pink-700' :
                                              task.section === 'speaking' ? 'bg-gradient-to-br from-teal-600 to-teal-700' :
                                              task.section === 'writing' ? 'bg-gradient-to-br from-blue-600 to-blue-700' :
                                              task.section === 'verbal' ? 'bg-gradient-to-br from-indigo-600 to-indigo-700' :
                                              task.section === 'quantitative' ? 'bg-gradient-to-br from-green-600 to-green-700' :
                                              'bg-gradient-to-br from-orange-600 to-orange-700'
                                            }`}
                                          >
                                            {isTaskCompleted ? <CheckCircle className="h-5 w-5" /> : `D${task.day}`}
                                          </div>
                                        </div>
                                        <div className={isTaskCompleted ? 'opacity-60' : ''}>
                                          <h6 className={`font-semibold text-sm capitalize ${isTaskCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>
                                            {sectionLabels[task.section as keyof typeof sectionLabels] || task.section}
                                          </h6>
                                          <p className="text-gray-400 text-xs">{task.activity?.replace(/_/g, ' ')}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isTaskCompleted && (
                                          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs">
                                            완료
                                          </Badge>
                                        )}
                                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs shrink-0">
                                          {task.duration}분
                                        </Badge>
                                      </div>
                                    </div>
                                    <p className={`mt-3 text-sm leading-relaxed pl-[72px] ${isTaskCompleted ? 'text-gray-500' : 'text-gray-300'}`}>
                                      {task.description}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Fallback if no AI plan */}
              {selectedPlanWeeklyPlan.length === 0 && (
                <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <CalendarIcon className="h-5 w-5 text-purple-400" />
                      이번 주 학습 일정
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-400">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-400/50" />
                      <p className="text-lg">아직 상세 학습 계획이 생성되지 않았습니다.</p>
                      <p className="text-sm mt-2">새로운 학습 계획을 생성하여 맞춤형 커리큘럼을 받아보세요.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Recommended Tests */}
            <div className="space-y-6">
              <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Play className="h-5 w-5 text-emerald-400" />
                    추천 모의고사
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    현재 학습 계획에 맞는 맞춤형 테스트
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendedTests.map((test) => (
                      <div key={test.id} className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-400/20 rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-white">{test.title}</h4>
                          <Badge className="bg-white/10 text-gray-300 border border-white/20 text-xs">
                            {test.duration}분
                          </Badge>
                        </div>
                        <Link href={`/test-taking/${test.id}`}>
                          <Button size="sm" className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white">
                            <Play className="h-4 w-4 mr-2" />
                            테스트 시작
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : studyPlans.length > 0 ? (
          /* Plan exists but not selected */
          <div className="text-center py-20">
            <div className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm rounded-3xl p-12 max-w-2xl mx-auto shadow-2xl">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BookOpen className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                학습 계획을 선택해주세요
              </h3>
              <p className="text-xl text-gray-300 leading-relaxed">
                위의 드롭다운에서 <span className="font-semibold text-purple-400">진행할 학습 계획</span>을 선택하여 
                상세 정보와 진도를 확인하세요
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
