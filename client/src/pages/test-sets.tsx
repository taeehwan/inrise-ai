import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
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
  PlayCircle,
  Clock,
  Target,
  RotateCcw,
  Award
} from "lucide-react";
import logoPath from "@assets/KakaoTalk_20250809_050703119_1755024467864.png";

interface TestSet {
  id: string;
  title: string;
  examType: "toefl" | "gre";
  description: string;
  totalDuration: number;
  components: {
    id: string;
    test: {
      id: string;
      title: string;
      section: string;
      duration: number;
      questionCount: number;
    };
    orderIndex: number;
    isRequired: boolean;
  }[];
  isActive: boolean;
  createdAt: string;
}

interface TestSetAttempt {
  id: string;
  testSetId: string;
  userId: string;
  status: "in_progress" | "completed" | "abandoned";
  totalScore?: number;
  sectionScores?: Record<string, number>;
  currentTestIndex: number;
  startedAt: string;
  completedAt?: string;
}

export default function TestSets() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedExamType, setSelectedExamType] = useState<"toefl" | "gre">("toefl");

  const { data: testSets = [], isLoading: testSetsLoading } = useQuery<TestSet[]>({
    queryKey: ["/api/test-sets"],
    enabled: true
  });

  const { data: userAttempts = [], isLoading: attemptsLoading } = useQuery<TestSetAttempt[]>({
    queryKey: ["/api/test-set-attempts"],
    enabled: isAuthenticated
  });

  const isLoading = testSetsLoading || attemptsLoading;

  const getAttemptForTestSet = (testSetId: string): TestSetAttempt | undefined => {
    return userAttempts.find((attempt) => attempt.testSetId === testSetId);
  };

  const startTestSet = async (testSetId: string) => {
    try {
      const response = await fetch("/api/test-set-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testSetId })
      });
      
      if (response.ok) {
        const attempt = await response.json() as TestSetAttempt;
        const testSet = testSets.find((set) => set.id === testSetId);
        if (testSet && testSet.components.length > 0) {
          const firstTest = testSet.components[0].test;
          setLocation(getTestUrl(firstTest.section, firstTest.id, attempt.id));
        }
      }
    } catch (error) {
      console.error("Error starting test set:", error);
    }
  };

  const resumeTestSet = async (testSetId: string) => {
    try {
      const attempt = getAttemptForTestSet(testSetId);
      if (attempt) {
        const testSet = testSets.find((set) => set.id === testSetId);
        if (testSet && testSet.components.length > attempt.currentTestIndex) {
          const currentTest = testSet.components[attempt.currentTestIndex].test;
          setLocation(getTestUrl(currentTest.section, currentTest.id, attempt.id));
        }
      }
    } catch (error) {
      console.error("Error resuming test set:", error);
    }
  };

  const getTestUrl = (section: string, testId: string, attemptId?: string) => {
    const params = attemptId ? `?attemptId=${attemptId}` : "";
    switch (section) {
      case "reading": return `/toefl-reading/${testId}${params}`;
      case "listening": return `/toefl-listening/${testId}${params}`;
      case "speaking": return `/toefl-speaking/${testId}${params}`;
      case "writing": return `/toefl-writing/${testId}${params}`;
      case "verbal": return `/gre-verbal-reasoning/${testId}${params}`;
      case "quantitative": return `/gre-quantitative-reasoning/${testId}${params}`;
      case "analytical": return `/gre-analytical-writing/${testId}${params}`;
      default: return `/`;
    }
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case "reading": return <BookOpen className="w-5 h-5" />;
      case "listening": return <PlayCircle className="w-5 h-5" />;
      case "speaking": return <Target className="w-5 h-5" />;
      case "writing": return <BookOpen className="w-5 h-5" />;
      case "verbal": return <BookOpen className="w-5 h-5" />;
      case "quantitative": return <Target className="w-5 h-5" />;
      case "analytical": return <BookOpen className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };

  const getSectionName = (section: string) => {
    switch (section) {
      case "reading": return "리딩";
      case "listening": return "리스닝";
      case "speaking": return "스피킹";
      case "writing": return "라이팅";
      case "verbal": return "언어추론";
      case "quantitative": return "수리추론";
      case "analytical": return "분석적 글쓰기";
      default: return section;
    }
  };

  const getProgressPercentage = (attempt: TestSetAttempt, testSet: TestSet) => {
    if (attempt.status === "completed") return 100;
    const totalTests = testSet.components.length;
    const currentIndex = attempt.currentTestIndex || 0;
    return Math.round((currentIndex / totalTests) * 100);
  };

  const getTOEFLSections = () => [
    { name: "리딩", duration: 54, color: "text-purple-600" },
    { name: "리스닝", duration: 41, color: "text-pink-600" },
    { name: "스피킹", duration: 17, color: "text-teal-600" },
    { name: "라이팅", duration: 50, color: "text-blue-600" }
  ];

  const getGRESections = () => [
    { name: "언어추론 1", duration: 30, color: "text-green-600" },
    { name: "수리추론 1", duration: 35, color: "text-blue-600" },
    { name: "언어추론 2", duration: 30, color: "text-green-600" },
    { name: "수리추론 2", duration: 35, color: "text-blue-600" },
    { name: "분석적 글쓰기", duration: 30, color: "text-purple-600" }
  ];

  const renderTestSetCard = (testSet: TestSet) => {
    const attempt = getAttemptForTestSet(testSet.id);

    return (
      <Card key={testSet.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-white via-purple-50 to-pink-50 border border-purple-200 hover:border-purple-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                {testSet.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                {testSet.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                  {testSet.examType.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="border-purple-200 text-purple-600">
                  {Math.floor(testSet.totalDuration / 60)}시간 {testSet.totalDuration % 60}분
                </Badge>
                <Badge variant="outline" className="border-purple-200 text-purple-600">
                  {testSet.components.length}개 섹션
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">포함된 테스트:</h4>
            {testSet.components.map((component, index) => (
              <div key={component.id} className="flex items-center gap-3 p-2 bg-white/60 rounded-lg border border-purple-100">
                <div className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold">
                  {index + 1}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  {component.test && getSectionIcon(component.test.section)}
                  <span className="text-sm font-medium text-gray-700">
                    {component.test ? getSectionName(component.test.section) : "테스트"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {component.test ? `${component.test.duration}분` : "-"}
                </div>
              </div>
            ))}
          </div>

          {attempt && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">진행률</span>
                <span className="text-sm text-blue-600">{getProgressPercentage(attempt, testSet)}%</span>
              </div>
              <Progress value={getProgressPercentage(attempt, testSet)} className="h-2" />
              <div className="mt-2 text-xs text-blue-600">
                {attempt.status === "completed" 
                  ? `완료됨 (점수: ${attempt.totalScore || "채점 중"})`
                  : `${attempt.currentTestIndex + 1}/${testSet.components.length} 섹션 진행 중`
                }
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {attempt ? (
              attempt.status === "completed" ? (
                <Button 
                  onClick={() => startTestSet(testSet.id)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  data-testid={`button-retake-test-set-${testSet.id}`}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  다시 도전하기
                </Button>
              ) : (
                <Button 
                  onClick={() => resumeTestSet(testSet.id)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  data-testid={`button-resume-test-set-${testSet.id}`}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  이어서 하기
                </Button>
              )
            ) : (
              <Button 
                onClick={() => startTestSet(testSet.id)}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                data-testid={`button-start-test-set-${testSet.id}`}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                풀세트 시작하기
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
              data-testid={`button-view-details-${testSet.id}`}
            >
              상세보기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <FullscreenWrapper>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      </FullscreenWrapper>
    );
  }

  return (
    <FullscreenWrapper>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <img 
              src={logoPath} 
              alt="iNRISE Logo" 
              className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg"
              loading="lazy"
            />
            <h1 className="text-4xl font-bold text-gray-900 mb-2">풀세트 모의고사</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              실제 시험과 동일한 구성의 완전한 모의고사를 경험해보세요
            </p>
          </div>

          <Tabs value={selectedExamType} onValueChange={(value) => setSelectedExamType(value as "toefl" | "gre")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="toefl" className="text-lg font-semibold">TOEFL 풀세트</TabsTrigger>
              <TabsTrigger value="gre" className="text-lg font-semibold">GRE 풀세트</TabsTrigger>
            </TabsList>

            <TabsContent value="toefl" className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">TOEFL 풀세트 모의고사</h3>
                <p className="text-purple-700 mb-4">
                  실제 TOEFL 시험과 동일한 4개 섹션(리딩, 리스닝, 스피킹, 라이팅)을 연속으로 응시합니다.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {getTOEFLSections().map((section, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-purple-200">
                      <div className={`text-center ${section.color} font-medium`}>
                        {section.name}
                      </div>
                      <div className="text-center text-sm text-gray-600 mt-1">
                        {section.duration}분
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testSets.filter((set) => set.examType === "toefl").map(renderTestSetCard)}
              </div>
            </TabsContent>

            <TabsContent value="gre" className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-green-900 mb-2">GRE 풀세트 모의고사</h3>
                <p className="text-green-700 mb-4">
                  실제 GRE 시험과 동일한 5개 섹션(Verbal 2개, Quantitative 2개, Analytical Writing 1개)을 연속으로 응시합니다.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {getGRESections().map((section, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
                      <div className={`text-center ${section.color} font-medium text-sm`}>
                        {section.name}
                      </div>
                      <div className="text-center text-sm text-gray-600 mt-1">
                        {section.duration}분
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testSets.filter((set) => set.examType === "gre").map(renderTestSetCard)}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </FullscreenWrapper>
  );
}
