import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  AlertTriangle,
  BookOpen,
  Volume2,
  Mic,
  Edit3,
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  VolumeX,
  Save,
  LogOut
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { TestSet, TestSetAttempt, Test } from "@shared/schema";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext,
  createSafariCompatibleMediaRecorder,
  getSupportedMimeType,
  createSafariCompatibleAudio
} from "@/lib/safariAudioCompat";

interface FullTestState {
  currentTestIndex: number;
  currentQuestionIndex: number;
  answers: Record<string, any>;
  timeRemaining: number;
  status: "not_started" | "in_progress" | "completed";
  attemptId: string | null;
  audioState: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
  };
}

export default function FullTestInterface() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const testSetId = params.id;
  const [testState, setTestState] = useState<FullTestState>({
    currentTestIndex: 0,
    currentQuestionIndex: 0,
    answers: {},
    timeRemaining: 0,
    status: "not_started",
    attemptId: null,
    audioState: {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7
    }
  });

  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const { data: testSet } = useQuery<TestSet>({
    queryKey: ["/api/test-sets", testSetId],
    enabled: !!testSetId
  });

  const { data: testComponents = [] } = useQuery<any[]>({
    queryKey: ["/api/test-set-components", testSetId],
    enabled: !!testSetId
  });

  const { data: currentTest } = useQuery<Test>({
    queryKey: ["/api/tests", testComponents[testState.currentTestIndex]?.testId],
    enabled: testComponents.length > 0 && testState.currentTestIndex < testComponents.length
  });

  // Check for existing in-progress attempt
  const { data: existingAttempt } = useQuery<TestSetAttempt | null>({
    queryKey: ["/api/test-set-attempts/active", testSetId],
    enabled: !!user?.id && !!testSetId && testState.status === "not_started"
  });

  const startTestMutation = useMutation({
    mutationFn: async (): Promise<TestSetAttempt> => {
      if (existingAttempt && existingAttempt.status === "in_progress") {
        return existingAttempt;
      }
      const response = await apiRequest("POST", "/api/full-test-attempts", {
        testSetId,
        status: "in_progress"
      });
      return response.json();
    },
    onSuccess: (attempt: TestSetAttempt) => {
      // Restore saved progress including answers and question index
      const savedAnswers = ((attempt as any).answers as Record<string, any>) || {};
      const savedQuestionIndex = (attempt as any).currentQuestionIndex || 0;
      const savedTestIndex = attempt.currentTestIndex || 0;
      
      setTestState(prev => ({
        ...prev,
        attemptId: attempt.id,
        status: "in_progress",
        currentTestIndex: savedTestIndex,
        currentQuestionIndex: savedQuestionIndex,
        answers: savedAnswers,
        timeRemaining: calculateRemainingTime(attempt)
      }));
      startTimer();
      
      // Notify user if resuming
      if (Object.keys(savedAnswers).length > 0) {
        toast({
          title: "진행상황 복원됨",
          description: `섹션 ${savedTestIndex + 1}, 문제 ${savedQuestionIndex + 1}부터 이어서 진행합니다.`,
        });
      }
    },
    onError: () => {
      toast({
        title: "오류",
        description: "테스트 시작에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const saveProgressMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/full-test-attempts/${testState.attemptId}`, data);
    }
  });

  const saveAndExitMutation = useMutation({
    mutationFn: async () => {
      if (!testState.attemptId) {
        throw new Error("No active test attempt");
      }
      return apiRequest("PATCH", `/api/full-test-attempts/${testState.attemptId}`, {
        currentTestIndex: testState.currentTestIndex,
        currentQuestionIndex: testState.currentQuestionIndex,
        answers: testState.answers,
        status: "in_progress"
      });
    },
    onSuccess: () => {
      toast({
        title: "진행상황 저장됨",
        description: "나중에 돌아와서 이어서 풀 수 있습니다.",
      });
      setLocation("/test-sets");
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "진행상황 저장에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  });

  const completeTestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/full-test-attempts/${testState.attemptId}`, {
        status: "completed",
        completedAt: new Date(),
        totalScore: calculateTotalScore(),
        sectionScores: calculateSectionScores()
      });
    },
    onSuccess: async (result) => {
      const payload = result instanceof Response ? await result.json() : result;
      toast({
        title: "테스트 완료",
        description: "풀테스트가 완료되었습니다. 결과를 확인해보세요.",
      });
      setLocation(`/full-test-results/${payload.id}`);
    }
  });

  // Audio control functions
  const initializeAudio = (audioUrl: string) => {
    if (audioRef) {
      audioRef.pause();
    }

    const audio = createSafariCompatibleAudio(audioUrl);
    audio.preload = 'metadata';
    
    audio.addEventListener('loadedmetadata', () => {
      setTestState(prev => ({
        ...prev,
        audioState: {
          ...prev.audioState,
          duration: audio.duration,
          currentTime: 0
        }
      }));
    });

    audio.addEventListener('timeupdate', () => {
      setTestState(prev => ({
        ...prev,
        audioState: {
          ...prev.audioState,
          currentTime: audio.currentTime
        }
      }));
    });

    audio.addEventListener('ended', () => {
      setTestState(prev => ({
        ...prev,
        audioState: {
          ...prev.audioState,
          isPlaying: false,
          currentTime: 0
        }
      }));
    });

    audio.volume = testState.audioState.volume;
    setAudioRef(audio);
  };

  const togglePlayPause = async () => {
    if (!audioRef) return;

    if (testState.audioState.isPlaying) {
      audioRef.pause();
      setTestState(prev => ({
        ...prev,
        audioState: { ...prev.audioState, isPlaying: false }
      }));
    } else {
      try {
        await unlockAudioContext();
        await playSafariCompatibleAudio(audioRef);
        setTestState(prev => ({
          ...prev,
          audioState: { ...prev.audioState, isPlaying: true }
        }));
      } catch (error) {
        console.error('Audio playback failed:', error);
      }
    }
  };

  const seekAudio = (time: number) => {
    if (!audioRef) return;
    audioRef.currentTime = time;
    setTestState(prev => ({
      ...prev,
      audioState: { ...prev.audioState, currentTime: time }
    }));
  };

  const changeVolume = (volume: number) => {
    if (!audioRef) return;
    audioRef.volume = volume;
    setTestState(prev => ({
      ...prev,
      audioState: { ...prev.audioState, volume }
    }));
  };

  // Audio Player Component
  const AudioPlayer = ({ audioUrl, scriptContent }: { audioUrl?: string; scriptContent?: string }) => {
    useEffect(() => {
      if (audioUrl) {
        initializeAudio(audioUrl);
      }
      return () => {
        if (audioRef) {
          audioRef.pause();
          audioRef.currentTime = 0;
        }
      };
    }, [audioUrl]);

    if (!audioUrl) {
      return (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <Volume2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>음성 파일이 없습니다</p>
              {scriptContent && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                  <p className="font-medium mb-2">스크립트:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{scriptContent}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercentage = testState.audioState.duration > 0 
      ? (testState.audioState.currentTime / testState.audioState.duration) * 100 
      : 0;

    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Audio Controls */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => seekAudio(Math.max(0, testState.audioState.currentTime - 10))}
                disabled={!audioRef}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button
                variant="default"
                size="lg"
                onClick={togglePlayPause}
                disabled={!audioRef}
                className="w-16 h-16 rounded-full"
              >
                {testState.audioState.isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => seekAudio(Math.min(testState.audioState.duration, testState.audioState.currentTime + 10))}
                disabled={!audioRef}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div 
                className="w-full bg-gray-200 rounded-full h-2 cursor-pointer"
                onClick={(e) => {
                  if (!audioRef || testState.audioState.duration === 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percentage = clickX / rect.width;
                  const newTime = percentage * testState.audioState.duration;
                  seekAudio(newTime);
                }}
              >
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{formatTime(testState.audioState.currentTime)}</span>
                <span>{formatTime(testState.audioState.duration)}</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <VolumeX className="w-4 h-4" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={testState.audioState.volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="flex-1"
              />
              <Volume2 className="w-4 h-4" />
              <span className="text-sm text-gray-500 min-w-[3ch]">
                {Math.round(testState.audioState.volume * 100)}%
              </span>
            </div>

            {/* Script Display (Optional) */}
            {scriptContent && (
              <details className="mt-4">
                <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                  스크립트 보기
                </summary>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {scriptContent}
                  </p>
                </div>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };



  const startTimer = () => {
    const timer = setInterval(() => {
      setTestState(prev => {
        if (prev.timeRemaining <= 1) {
          clearInterval(timer);
          handleNextTest();
          return prev;
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
  };

  const calculateRemainingTime = (attempt: TestSetAttempt): number => {
    if (!currentTest) return 0;
    const elapsed = Date.now() - new Date(attempt.startedAt).getTime();
    return Math.max(0, (currentTest.duration * 60) - Math.floor(elapsed / 1000));
  };

  const calculateTotalScore = (): number => {
    // Simple scoring logic - would be more complex in real implementation
    const totalQuestions = Object.keys(testState.answers).length;
    const correctAnswers = Object.values(testState.answers).filter(Boolean).length;
    return Math.round((correctAnswers / totalQuestions) * 120); // TOEFL scale
  };

  const calculateSectionScores = (): Record<string, number> => {
    // Calculate scores per section
    return testComponents.reduce((acc, component, index) => {
      const sectionAnswers = Object.entries(testState.answers)
        .filter(([key]) => key.startsWith(`test_${index}_`));
      const correct = sectionAnswers.filter(([, answer]) => answer).length;
      const total = sectionAnswers.length || 1;
      acc[component.section || 'section'] = Math.round((correct / total) * 30);
      return acc;
    }, {} as Record<string, number>);
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setTestState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [`test_${prev.currentTestIndex}_question_${questionId}`]: answer
      }
    }));

    // Auto-save progress
    if (testState.attemptId) {
      saveProgressMutation.mutate({
        currentTestIndex: testState.currentTestIndex,
        currentQuestionIndex: testState.currentQuestionIndex,
        answers: {
          ...testState.answers,
          [`test_${testState.currentTestIndex}_question_${questionId}`]: answer
        }
      });
    }
  };

  const handleNextTest = () => {
    if (testState.currentTestIndex < testComponents.length - 1) {
      setTestState(prev => ({
        ...prev,
        currentTestIndex: prev.currentTestIndex + 1,
        currentQuestionIndex: 0,
        timeRemaining: testComponents[prev.currentTestIndex + 1]?.duration * 60 || 0
      }));
    } else {
      // Complete the full test
      completeTestMutation.mutate();
    }
  };

  const handlePreviousTest = () => {
    if (testState.currentTestIndex > 0) {
      setTestState(prev => ({
        ...prev,
        currentTestIndex: prev.currentTestIndex - 1,
        currentQuestionIndex: 0
      }));
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case "reading": return <BookOpen className="h-4 w-4" />;
      case "listening": return <Volume2 className="h-4 w-4" />;
      case "speaking": return <Mic className="h-4 w-4" />;
      case "writing": return <Edit3 className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getSectionName = (section: string): string => {
    const names = {
      reading: "리딩",
      listening: "리스닝",
      speaking: "스피킹",
      writing: "라이팅",
      verbal: "언어추론",
      quantitative: "수리추론",
      analytical: "분석적 글쓰기"
    };
    return names[section as keyof typeof names] || section;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            풀테스트를 응시하려면 로그인이 필요합니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!testSet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Test not started - show introduction
  if (testState.status === "not_started") {
    return (
      <FullscreenWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {testSet.title}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {testSet.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="font-semibold text-gray-900">총 소요시간</div>
                  <div className="text-sm text-gray-600">
                    약 {Math.floor(testSet.totalDuration / 60)}시간 {testSet.totalDuration % 60}분
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="font-semibold text-gray-900">섹션 수</div>
                  <div className="text-sm text-gray-600">
                    {testComponents.length}개 섹션
                  </div>
                </div>
              </div>

              {/* Test Components */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">테스트 구성</h3>
                <div className="space-y-2">
                  {testComponents.map((component, index) => (
                    <div key={component.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-primary text-white rounded-full flex items-center justify-center text-sm">
                          {index + 1}
                        </div>
                        {getSectionIcon(component.section)}
                        <span className="font-medium">{getSectionName(component.section)}</span>
                      </div>
                      <Badge variant="secondary">
                        {component.duration}분
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>주의사항:</strong> 풀테스트는 한번 시작하면 중간에 멈출 수 없습니다. 
                  각 섹션은 정해진 시간 내에 완료해야 하며, 모든 섹션을 마친 후에만 결과를 확인할 수 있습니다.
                  브라우저를 닫거나 페이지를 나가더라도 다시 접속하면 이어서 풀 수 있습니다.
                </AlertDescription>
              </Alert>

              {/* Resume or Start */}
              {existingAttempt && existingAttempt.status === "in_progress" && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    진행 중인 테스트가 있습니다. 중단한 지점부터 이어서 진행할 수 있습니다.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/")}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button 
                  onClick={() => startTestMutation.mutate()}
                  disabled={startTestMutation.isPending}
                  className="flex-1"
                >
                  {startTestMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : existingAttempt?.status === "in_progress" ? (
                    <Play className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  {existingAttempt?.status === "in_progress" ? "이어서 풀기" : "테스트 시작"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </FullscreenWrapper>
    );
  }

  // Test in progress - show current test
  const currentComponent = testComponents[testState.currentTestIndex];
  const progressPercentage = ((testState.currentTestIndex + 1) / testComponents.length) * 100;

  return (
    <FullscreenWrapper>
      <div className="min-h-screen bg-gray-50">
        {/* Fixed Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-gray-900">{testSet.title}</h1>
                <Badge variant="outline">
                  섹션 {testState.currentTestIndex + 1}/{testComponents.length}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-lg font-mono">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span className={testState.timeRemaining < 300 ? "text-red-600" : "text-gray-900"}>
                    {formatTime(testState.timeRemaining)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveAndExitMutation.mutate()}
                  disabled={saveAndExitMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {saveAndExitMutation.isPending ? (
                    <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  저장 후 나가기
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>전체 진행률</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>
        </div>

        {/* Test Content */}
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center gap-3 mb-2">
                {getSectionIcon(currentComponent?.section)}
                <h2 className="text-xl font-semibold text-gray-900">
                  {getSectionName(currentComponent?.section)} 섹션
                </h2>
              </div>
              <p className="text-gray-600">
                이 섹션은 {currentComponent?.duration}분 동안 진행됩니다.
              </p>
            </div>
            
            {/* Test Questions/Content Area */}
            <div className="p-6 min-h-[600px]">
              {currentTest ? (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <div className="text-lg font-medium text-gray-900 mb-2">
                      {currentTest.title}
                    </div>
                    <p className="text-gray-600 mb-6">
                      {currentTest.description}
                    </p>
                    
                    {/* Placeholder for actual test interface */}
                    <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          테스트 인터페이스
                        </h3>
                        <p className="text-gray-600 mb-6">
                          실제 테스트 문제와 인터페이스가 여기에 표시됩니다.
                        </p>
                        
                        {/* Mock test completion button */}
                        <Button 
                          onClick={handleNextTest}
                          className="min-w-[200px]"
                        >
                          {testState.currentTestIndex < testComponents.length - 1 ? (
                            <>다음 섹션으로 <ChevronRight className="h-4 w-4 ml-2" /></>
                          ) : (
                            <>테스트 완료 <CheckCircle className="h-4 w-4 ml-2" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-primary border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FullscreenWrapper>
  );
}
