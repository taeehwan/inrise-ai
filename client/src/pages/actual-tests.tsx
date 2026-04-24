import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Headphones,
  Mic,
  Edit3,
  PlayCircle,
  Clock,
  Target,
  Award,
  ChevronRight,
  CheckCircle,
  Lock
} from "lucide-react";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import { Link } from "wouter";
import { UserProfileHeader } from "@/components/UserProfileHeader";

interface TestSet {
  id: string;
  title: string;
  examType: "toefl" | "gre";
  testType: "toefl" | "newToefl" | "gre";
  description: string;
  totalDuration: number;
  sectionOrder: string[];
  isActive: boolean;
}

interface TestSetAttempt {
  id: string;
  testSetId: string;
  status: "in_progress" | "completed" | "paused" | "abandoned";
  totalScore?: number;
  sectionScores?: Record<string, number>;
  currentTestIndex: number;
}

export default function ActualTests() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTestType, setSelectedTestType] = useState<"toefl" | "newToefl" | "gre">("toefl");

  const { data: testSets = [], isLoading: testSetsLoading } = useQuery<TestSet[]>({
    queryKey: ["/api/test-sets"],
  });

  const { data: userAttempts = [], isLoading: attemptsLoading } = useQuery<TestSetAttempt[]>({
    queryKey: ["/api/test-set-attempts/my"],
    enabled: isAuthenticated,
  });

  const isLoading = testSetsLoading || attemptsLoading;

  const filteredTestSets = testSets.filter((set) => {
    if (selectedTestType === "gre") {
      return set.examType === "gre" && set.isActive;
    }
    return set.examType === "toefl" && (set.testType || "toefl") === selectedTestType && set.isActive;
  });

  const getAttemptForTestSet = (testSetId: string): TestSetAttempt | undefined => {
    return userAttempts.find((attempt) => attempt.testSetId === testSetId);
  };

  const handleStartTest = (testSetId: string) => {
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    setLocation(`/actual-test/${testSetId}`);
  };

  const sectionInfo = {
    toefl: {
      title: "TOEFL iBT",
      subtitle: "2023년 7월 ~ 2026년 1월",
      duration: "약 2시간",
      sections: [
        { name: "Reading", time: "35분", icon: BookOpen, color: "text-purple-400" },
        { name: "Listening", time: "36분", icon: Headphones, color: "text-pink-400" },
        { name: "Speaking", time: "16분", icon: Mic, color: "text-teal-400" },
        { name: "Writing", time: "29분", icon: Edit3, color: "text-blue-400" },
      ],
    },
    newToefl: {
      title: "New TOEFL",
      subtitle: "2026년 1월 21일 ~",
      duration: "67-85분",
      sections: [
        { name: "Reading", time: "~27분", icon: BookOpen, color: "text-purple-400" },
        { name: "Listening", time: "~27분", icon: Headphones, color: "text-pink-400" },
        { name: "Writing", time: "~12분", icon: Edit3, color: "text-blue-400" },
        { name: "Speaking", time: "~8분", icon: Mic, color: "text-teal-400" },
      ],
    },
    gre: {
      title: "GRE General Test",
      subtitle: "2023년 9월 업데이트 형식",
      duration: "약 118분",
      sections: [
        { name: "Analytical Writing", time: "30분", icon: Edit3, color: "text-amber-400" },
        { name: "Verbal 1", time: "18분", icon: BookOpen, color: "text-indigo-400" },
        { name: "Verbal 2", time: "23분", icon: BookOpen, color: "text-violet-400" },
        { name: "Quantitative 1", time: "21분", icon: Target, color: "text-emerald-400" },
        { name: "Quantitative 2", time: "26분", icon: Target, color: "text-green-400" },
      ],
    },
  };

  const currentInfo = sectionInfo[selectedTestType];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <img src={logoPath} alt="iNRISE" className="h-10 cursor-pointer" />
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" className="text-slate-300 hover:text-white" data-testid="link-dashboard">
                  Dashboard
                </Button>
              </Link>
              <UserProfileHeader variant="dark" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">Actual Tests</h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            실제 시험과 동일한 환경에서 모든 섹션을 순서대로 풀 테스트로 경험하세요.
            TOEFL과 GRE 중 원하는 시험을 선택하세요.
          </p>
        </div>

        <Tabs value={selectedTestType} onValueChange={(v) => setSelectedTestType(v as "toefl" | "newToefl" | "gre")} className="mb-8">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-slate-800">
            <TabsTrigger 
              value="toefl" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500"
              data-testid="tab-toefl"
            >
              TOEFL iBT
            </TabsTrigger>
            <TabsTrigger 
              value="newToefl"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500"
              data-testid="tab-new-toefl"
            >
              New TOEFL 2026
            </TabsTrigger>
            <TabsTrigger 
              value="gre"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500"
              data-testid="tab-gre"
            >
              GRE General
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTestType} className="mt-8">
            <Card className="bg-slate-800/50 border-slate-700 mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white">{currentInfo.title}</CardTitle>
                    <CardDescription className="text-slate-400">{currentInfo.subtitle}</CardDescription>
                  </div>
                  <Badge className="bg-slate-700 text-white px-4 py-2">
                    <Clock className="h-4 w-4 mr-2" />
                    {currentInfo.duration}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {currentInfo.sections.map((section, index) => (
                    <div key={section.name} className="flex items-center gap-3 bg-slate-700/50 p-4 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 bg-slate-600 rounded-full text-white text-sm font-medium">
                        {index + 1}
                      </div>
                      <section.icon className={`h-5 w-5 ${section.color}`} />
                      <div>
                        <p className="text-white font-medium">{section.name}</p>
                        <p className="text-slate-400 text-sm">{section.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredTestSets.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700 p-12 text-center">
                <Target className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl text-white mb-2">테스트 준비 중</h3>
                <p className="text-slate-400">
                  {selectedTestType === "toefl" ? "TOEFL iBT" : "New TOEFL 2026"} Actual Test가 곧 추가됩니다.
                </p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTestSets.map((testSet, index) => {
                  const attempt = getAttemptForTestSet(testSet.id);
                  const isCompleted = attempt?.status === "completed";
                  const isInProgress = attempt?.status === "in_progress";
                  const isPaused = attempt?.status === "paused";
                  const canResume = isInProgress || isPaused;

                  return (
                    <Card 
                      key={testSet.id} 
                      className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-all duration-300"
                      data-testid={`card-actual-test-${index + 1}`}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl text-white">{testSet.title}</CardTitle>
                          {isCompleted && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              완료
                            </Badge>
                          )}
                          {isInProgress && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                              진행중
                            </Badge>
                          )}
                          {isPaused && (
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                              일시정지
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-slate-400">
                          {testSet.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {testSet.totalDuration}분
                          </span>
                          <span className="text-slate-400">
                            4 Sections
                          </span>
                        </div>

                        {isCompleted && attempt?.totalScore && (
                          <div className="bg-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-300">Total Score</span>
                              <span className="text-2xl font-bold text-emerald-400">
                                {attempt.totalScore}/120
                              </span>
                            </div>
                            <Progress 
                              value={(attempt.totalScore / 120) * 100} 
                              className="h-2 bg-slate-600"
                            />
                          </div>
                        )}

                        {canResume && attempt && (
                          <div className="bg-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-300">
                                {isPaused ? "일시정지됨" : "진행중"}
                              </span>
                              <span className={isPaused ? "text-orange-400" : "text-amber-400"}>
                                {attempt.currentTestIndex + 1}/4 섹션
                              </span>
                            </div>
                            <Progress 
                              value={((attempt.currentTestIndex + 1) / 4) * 100} 
                              className="h-2 bg-slate-600"
                            />
                          </div>
                        )}

                        <Button
                          onClick={() => handleStartTest(testSet.id)}
                          className={`w-full ${
                            isCompleted 
                              ? "bg-slate-600 hover:bg-slate-500" 
                              : isPaused
                                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90"
                                : isInProgress
                                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90"
                                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90"
                          }`}
                          data-testid={`button-start-test-${index + 1}`}
                        >
                          {isCompleted ? (
                            <>다시 풀기</>
                          ) : isPaused ? (
                            <>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              이어서 풀기
                              <ChevronRight className="ml-2 h-4 w-4" />
                            </>
                          ) : isInProgress ? (
                            <>
                              이어서 풀기
                              <ChevronRight className="ml-2 h-4 w-4" />
                            </>
                          ) : (
                            <>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              시작하기
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Card className="bg-slate-800/50 border-slate-700 mt-12">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">실전과 동일한 환경</h3>
                <p className="text-slate-400 text-sm">
                  실제 TOEFL 시험과 동일한 섹션 순서와 시간 제한으로 진행됩니다.
                </p>
              </div>
              <div>
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">자동 채점</h3>
                <p className="text-slate-400 text-sm">
                  테스트 완료 후 즉시 120점 만점 기준으로 섹션별 점수를 확인하세요.
                </p>
              </div>
              <div>
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">상세 피드백</h3>
                <p className="text-slate-400 text-sm">
                  완료 후 섹션별 상세 분석과 학습 추천을 받아보세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
