import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Play, Clock, BookOpen, Volume2, PenTool, MessageSquare, Target, FileText, Users, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext,
  createSafariCompatibleAudio
} from "@/lib/safariAudioCompat";

interface Task {
  taskNumber: number;
  type: 'integrated' | 'discussion';
  id: string;
  title: string;
  readingPassage?: string;
  readingTime?: number;
  listeningScript?: string;
  listeningAudioUrl?: string;
  discussionTopic?: string;
  student1Opinion?: string;
  student2Opinion?: string;
  questionText: string;
  writingTime: number;
  wordLimit?: number;
}

interface FullTest {
  id: string;
  title: string;
  tasks: Task[];
  totalTasks: number;
  estimatedTime: number;
}

interface TestProgress {
  currentTaskIndex: number;
  currentPhase: 'intro' | 'reading' | 'listening' | 'writing' | 'transition' | 'finished';
  timeRemaining: number;
  isActive: boolean;
}

export default function TOEFLWritingFull() {
  const { toast } = useToast();
  const [testProgress, setTestProgress] = useState<TestProgress>({
    currentTaskIndex: 0,
    currentPhase: "intro",
    timeRemaining: 0,
    isActive: false
  });
  const [essays, setEssays] = useState<{ [key: number]: string }>({});
  const [wordCounts, setWordCounts] = useState<{ [key: number]: number }>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);

  const { data: fullTest, isLoading, error } = useQuery<FullTest>({
    queryKey: ["/api/writing/full-test"],
  });

  useEffect(() => {
    beepAudioRef.current = createSafariCompatibleAudio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DosmAaAjmN0u8=");
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const getCurrentTask = (): Task | null => {
    if (!fullTest || !fullTest.tasks) return null;
    return fullTest.tasks[testProgress.currentTaskIndex] || null;
  };

  const playBeep = async () => {
    if (beepAudioRef.current) {
      beepAudioRef.current.currentTime = 0;
      try {
        await unlockAudioContext();
        await playSafariCompatibleAudio(beepAudioRef.current);
      } catch (error) {
        // Silently fail for beep sounds
      }
    }
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (duration: number, onComplete: () => void) => {
    clearTimer();
    setTestProgress(prev => ({
      ...prev,
      timeRemaining: duration,
      isActive: true
    }));

    timerRef.current = setInterval(() => {
      setTestProgress(prev => {
        if (prev.timeRemaining <= 1) {
          clearTimer();
          onComplete();
          return { ...prev, timeRemaining: 0, isActive: false };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
  };

  const startTask = () => {
    const currentTask = getCurrentTask();
    if (!currentTask) return;

    playBeep();

    if (currentTask.type === 'integrated') {
      // Integrated: reading -> listening -> writing
      setTestProgress(prev => ({ ...prev, currentPhase: 'reading' }));
      startTimer(currentTask.readingTime || 180, () => {
        playBeep();
        setTestProgress(prev => ({ ...prev, currentPhase: 'listening' }));
        // Simulated listening time - 120 seconds
        startTimer(120, () => {
          playBeep();
          setTestProgress(prev => ({ ...prev, currentPhase: 'writing' }));
          startTimer(currentTask.writingTime || 1200, handleTaskComplete);
        });
      });
    } else {
      // Discussion: directly to writing
      setTestProgress(prev => ({ ...prev, currentPhase: 'writing' }));
      startTimer(currentTask.writingTime || 600, handleTaskComplete);
    }
  };

  const handleTaskComplete = () => {
    playBeep();

    // Check if there are more tasks
    if (testProgress.currentTaskIndex < (fullTest?.tasks.length || 0) - 1) {
      setTestProgress(prev => ({
        ...prev,
        currentTaskIndex: prev.currentTaskIndex + 1,
        currentPhase: 'intro',
        isActive: false,
        timeRemaining: 0
      }));
    } else {
      // All tasks complete
      setTestProgress(prev => ({
        ...prev,
        currentPhase: 'finished',
        isActive: false,
        timeRemaining: 0
      }));
      toast({
        title: "전체 테스트 완료!",
        description: "모든 Writing 문제를 완료했습니다.",
      });
    }
  };

  const skipToNextPhase = () => {
    clearTimer();
    const currentTask = getCurrentTask();
    if (!currentTask) return;

    playBeep();

    switch (testProgress.currentPhase) {
      case 'reading':
        setTestProgress(prev => ({ ...prev, currentPhase: 'listening', isActive: false }));
        startTimer(120, () => {
          playBeep();
          setTestProgress(prev => ({ ...prev, currentPhase: 'writing' }));
          startTimer(currentTask.writingTime || 1200, handleTaskComplete);
        });
        break;
      case 'listening':
        setTestProgress(prev => ({ ...prev, currentPhase: 'writing', isActive: false }));
        startTimer(currentTask.writingTime || 1200, handleTaskComplete);
        break;
      case 'writing':
        handleTaskComplete();
        break;
    }
  };

  const handleEssayChange = (text: string) => {
    const taskNumber = getCurrentTask()?.taskNumber || 0;
    setEssays(prev => ({ ...prev, [taskNumber]: text }));
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    setWordCounts(prev => ({ ...prev, [taskNumber]: words }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseTitle = () => {
    switch (testProgress.currentPhase) {
      case "intro": return "시작 대기";
      case "reading": return "읽기 지문";
      case "listening": return "듣기";
      case "writing": return "작성";
      case "finished": return "테스트 완료";
      default: return "";
    }
  };

  const getTaskIcon = (type: string) => {
    return type === 'integrated' ? <FileText className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
  };

  const getTaskColor = (taskNum: number, isCurrent: boolean, isCompleted: boolean) => {
    if (isCompleted) return 'bg-green-600/30 border-green-500';
    if (isCurrent) return 'bg-indigo-500/30 border-indigo-400 ring-2 ring-indigo-400/50';
    return 'bg-gray-700/50 border-gray-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>전체 테스트를 구성하는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !fullTest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">테스트를 불러오는데 실패했습니다.</p>
          <Link href="/toefl-writing">
            <Button variant="outline">돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentTask = getCurrentTask();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-indigo-700/50 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/toefl-writing">
              <Button variant="ghost" size="sm" className="text-indigo-200 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로가기
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-xl flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">TOEFL Writing Full Test</h1>
                <p className="text-indigo-300 text-xs">총 2개 태스크 | 약 30분 소요</p>
              </div>
            </div>
          </div>
          <Badge className="bg-indigo-500 text-white font-semibold px-3 py-1">
            FULL TEST
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Progress Overview - 2 Tasks */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {fullTest.tasks.map((task, index) => {
            const isCurrent = testProgress.currentTaskIndex === index;
            const isCompleted = testProgress.currentTaskIndex > index || 
              (testProgress.currentTaskIndex === index && testProgress.currentPhase === 'finished');
            
            return (
              <Card 
                key={task.taskNumber} 
                className={`border-2 transition-all ${getTaskColor(task.taskNumber, isCurrent, isCompleted)}`}
              >
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-center text-sm flex items-center justify-center gap-2">
                    {getTaskIcon(task.type)}
                    <span>Task #{task.taskNumber}</span>
                    {essays[task.taskNumber] && (
                      <Badge className="ml-1 bg-green-600 text-white text-xs px-1.5 py-0">완료</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-center text-xs text-gray-300 px-4 pb-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full mb-1 ${
                    task.type === 'integrated' ? 'bg-indigo-500/30 text-indigo-200' : 'bg-purple-500/30 text-purple-200'
                  }`}>
                    {task.type === 'integrated' ? 'Integrated Writing' : 'Academic Discussion'}
                  </span>
                  <br />
                  {task.type === 'integrated' 
                    ? `읽기 3분 + 듣기 + 작성 ${Math.floor(task.writingTime / 60)}분`
                    : `토론 작성 ${Math.floor(task.writingTime / 60)}분`
                  }
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Current Test Interface */}
        {testProgress.currentPhase !== "finished" && currentTask && (
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    currentTask.type === 'integrated' 
                      ? 'bg-gradient-to-br from-indigo-400 to-blue-400' 
                      : 'bg-gradient-to-br from-purple-400 to-pink-400'
                  }`}>
                    {getTaskIcon(currentTask.type)}
                  </div>
                  <div>
                    <span className="text-white">Task #{currentTask.taskNumber}</span>
                    <Badge className="ml-2 bg-indigo-500/30 text-indigo-200">
                      {getPhaseTitle()}
                    </Badge>
                  </div>
                </CardTitle>
                {testProgress.isActive && (
                  <div className="flex items-center space-x-2 text-indigo-300">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-lg font-bold">
                      {formatTime(testProgress.timeRemaining)}
                    </span>
                  </div>
                )}
              </div>
              {testProgress.isActive && (
                <Progress 
                  value={(testProgress.timeRemaining / 
                    (testProgress.currentPhase === "reading" ? (currentTask.readingTime || 180) : 
                     testProgress.currentPhase === "listening" ? 120 :
                     currentTask.writingTime)) * 100} 
                  className="w-full mt-2"
                />
              )}
            </CardHeader>
            <CardContent>
              {/* Intro Phase - Start Button */}
              {testProgress.currentPhase === "intro" && (
                <div className="text-center space-y-6 py-8">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto ${
                    currentTask.type === 'integrated' 
                      ? 'bg-gradient-to-br from-indigo-400 to-blue-400' 
                      : 'bg-gradient-to-br from-purple-400 to-pink-400'
                  }`}>
                    {currentTask.type === 'integrated' ? <FileText className="w-10 h-10 text-white" /> : <MessageSquare className="w-10 h-10 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {currentTask.title || `Task #${currentTask.taskNumber}`}
                    </h3>
                    <p className="text-indigo-200 mb-4">
                      {currentTask.type === 'integrated' 
                        ? '읽기 지문을 읽고, 강의를 듣고, 에세이를 작성하세요' 
                        : '토론 주제에 대해 의견을 작성하세요'}
                    </p>
                    <div className="flex justify-center gap-4 text-sm text-indigo-300">
                      {currentTask.type === 'integrated' && (
                        <>
                          <span>읽기: {Math.floor((currentTask.readingTime || 180) / 60)}분</span>
                          <span>듣기: 2분</span>
                        </>
                      )}
                      <span>작성: {Math.floor(currentTask.writingTime / 60)}분</span>
                    </div>
                  </div>
                  <Button 
                    onClick={startTask} 
                    size="lg"
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-8"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    시작하기
                  </Button>
                </div>
              )}

              {/* Reading Phase (Integrated only) */}
              {testProgress.currentPhase === "reading" && currentTask.readingPassage && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-indigo-300">
                      <BookOpen className="w-5 h-5" />
                      <span className="font-semibold">읽기 지문</span>
                    </div>
                    <Button 
                      onClick={skipToNextPhase} 
                      variant="outline" 
                      size="sm"
                      className="text-indigo-200 border-indigo-400 hover:bg-indigo-500/20"
                    >
                      다음 →
                    </Button>
                  </div>
                  <div className="bg-white/10 p-5 rounded-xl text-gray-100 leading-relaxed text-[17px] max-h-96 overflow-y-auto" style={{ fontFamily: 'Georgia, serif' }}>
                    {currentTask.readingPassage}
                  </div>
                </div>
              )}

              {/* Listening Phase (Integrated only) */}
              {testProgress.currentPhase === "listening" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-purple-300">
                      <Volume2 className="w-5 h-5" />
                      <span className="font-semibold">듣기</span>
                    </div>
                    <Button 
                      onClick={skipToNextPhase} 
                      variant="outline" 
                      size="sm"
                      className="text-indigo-200 border-indigo-400 hover:bg-indigo-500/20"
                    >
                      다음 →
                    </Button>
                  </div>
                  {currentTask.listeningScript ? (
                    <div className="bg-white/10 p-5 rounded-xl text-gray-100 leading-relaxed text-[17px] max-h-96 overflow-y-auto" style={{ fontFamily: 'Georgia, serif' }}>
                      {currentTask.listeningScript}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Volume2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-indigo-200">강의 내용을 듣고 있습니다...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Writing Phase */}
              {testProgress.currentPhase === "writing" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-green-300">
                      <PenTool className="w-5 h-5" />
                      <span className="font-semibold">에세이 작성</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-indigo-300">
                        단어 수: {wordCounts[currentTask.taskNumber] || 0}
                      </span>
                      <Button 
                        onClick={skipToNextPhase} 
                        variant="outline" 
                        size="sm"
                        className="text-indigo-200 border-indigo-400 hover:bg-indigo-500/20"
                      >
                        제출 →
                      </Button>
                    </div>
                  </div>

                  {/* Question prompt */}
                  <div className="bg-indigo-500/20 p-4 rounded-xl border border-indigo-400/30">
                    <p className="text-indigo-100">{currentTask.questionText}</p>
                  </div>

                  {/* Discussion opinions (for discussion type) */}
                  {currentTask.type === 'discussion' && (currentTask.student1Opinion || currentTask.student2Opinion) && (
                    <div className="space-y-3">
                      {currentTask.student1Opinion && (
                        <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-400/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-purple-300" />
                            <span className="text-purple-200 font-semibold">Student 1</span>
                          </div>
                          <p className="text-gray-300 text-sm">{currentTask.student1Opinion}</p>
                        </div>
                      )}
                      {currentTask.student2Opinion && (
                        <div className="bg-pink-500/10 p-4 rounded-xl border border-pink-400/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-pink-300" />
                            <span className="text-pink-200 font-semibold">Student 2</span>
                          </div>
                          <p className="text-gray-300 text-sm">{currentTask.student2Opinion}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Essay textarea */}
                  <Textarea 
                    value={essays[currentTask.taskNumber] || ''}
                    onChange={(e) => handleEssayChange(e.target.value)}
                    placeholder="에세이를 작성하세요..."
                    className="min-h-[300px] bg-white/10 border-white/20 text-white placeholder:text-gray-400 text-[17px]"
                    style={{ fontFamily: 'Georgia, serif' }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Test Complete */}
        {testProgress.currentPhase === "finished" && (
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10 text-center">
            <CardContent className="py-10">
              <div className="w-20 h-20 bg-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-400 mb-4">
                전체 테스트 완료!
              </div>
              <div className="text-indigo-200 mb-8">
                Integrated Writing과 Academic Discussion을 모두 완료했습니다.
              </div>
              
              {/* Essay summaries */}
              {Object.keys(essays).length > 0 && (
                <div className="space-y-4 mb-8 max-w-2xl mx-auto text-left">
                  <h3 className="text-white font-semibold text-center mb-4">작성한 에세이</h3>
                  {Object.entries(essays).map(([taskNum, essay]) => (
                    <div key={taskNum} className="bg-white/10 p-4 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-indigo-200 font-semibold">Task #{taskNum}</span>
                        <span className="text-sm text-indigo-300">{wordCounts[parseInt(taskNum)] || 0} 단어</span>
                      </div>
                      <p className="text-gray-300 text-sm line-clamp-3">{essay}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <Link href="/toefl-writing">
                  <Button variant="outline" className="border-indigo-400 text-indigo-200 hover:bg-indigo-500/20">
                    다른 테스트 선택
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white">
                    대시보드로 이동
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
