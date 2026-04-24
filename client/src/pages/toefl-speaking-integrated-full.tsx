import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Pause, Square, Download, Volume2, BookOpen, Clock, Mic, Users, Headphones, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext,
  createSafariCompatibleMediaRecorder,
  getSupportedMimeType,
  createSafariCompatibleAudio
} from "@/lib/safariAudioCompat";

interface Task {
  taskNumber: number;
  type: 'independent' | 'integrated';
  id: string;
  title: string;
  questionType?: string;
  readingPassage?: string;
  readingPassageTitle?: string;
  readingTime?: number;
  listeningScript?: string;
  listeningAudioUrl?: string;
  questionText: string;
  preparationTime: number;
  responseTime: number;
  topic?: string;
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
  currentPhase: 'intro' | 'reading' | 'listening' | 'preparation' | 'speaking' | 'transition' | 'finished';
  timeRemaining: number;
  isActive: boolean;
}

export default function TOEFLSpeakingIntegratedFull() {
  const { toast } = useToast();
  const [testProgress, setTestProgress] = useState<TestProgress>({
    currentTaskIndex: 0,
    currentPhase: "intro",
    timeRemaining: 0,
    isActive: false
  });
  const [recordings, setRecordings] = useState<{ [key: number]: string }>({});
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);

  const { data: fullTest, isLoading, error } = useQuery<FullTest>({
    queryKey: ["/api/speaking/full-test"],
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
        // Ignore playback errors
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

    if (currentTask.type === 'independent') {
      // Independent: preparation -> speaking
      setTestProgress(prev => ({ ...prev, currentPhase: 'preparation' }));
      startTimer(currentTask.preparationTime || 15, () => {
        playBeep();
        setTestProgress(prev => ({ ...prev, currentPhase: 'speaking' }));
        startTimer(currentTask.responseTime || 45, handleTaskComplete);
      });
    } else {
      // Integrated: reading (if available) -> listening (if available) -> preparation -> speaking
      const hasReading = currentTask.readingPassage && currentTask.readingPassage.trim().length > 0;
      const hasListening = currentTask.listeningScript && currentTask.listeningScript.trim().length > 0;
      
      if (hasReading) {
        // Start with reading phase
        setTestProgress(prev => ({ ...prev, currentPhase: 'reading' }));
        startTimer(currentTask.readingTime || 45, () => {
          playBeep();
          if (hasListening) {
            setTestProgress(prev => ({ ...prev, currentPhase: 'listening' }));
            startTimer(60, () => {
              playBeep();
              setTestProgress(prev => ({ ...prev, currentPhase: 'preparation' }));
              startTimer(currentTask.preparationTime || 30, () => {
                playBeep();
                setTestProgress(prev => ({ ...prev, currentPhase: 'speaking' }));
                startTimer(currentTask.responseTime || 60, handleTaskComplete);
              });
            });
          } else {
            // No listening, go directly to preparation
            setTestProgress(prev => ({ ...prev, currentPhase: 'preparation' }));
            startTimer(currentTask.preparationTime || 30, () => {
              playBeep();
              setTestProgress(prev => ({ ...prev, currentPhase: 'speaking' }));
              startTimer(currentTask.responseTime || 60, handleTaskComplete);
            });
          }
        });
      } else if (hasListening) {
        // No reading but has listening - start with listening
        setTestProgress(prev => ({ ...prev, currentPhase: 'listening' }));
        startTimer(60, () => {
          playBeep();
          setTestProgress(prev => ({ ...prev, currentPhase: 'preparation' }));
          startTimer(currentTask.preparationTime || 30, () => {
            playBeep();
            setTestProgress(prev => ({ ...prev, currentPhase: 'speaking' }));
            startTimer(currentTask.responseTime || 60, handleTaskComplete);
          });
        });
      } else {
        // No reading or listening - go directly to preparation
        setTestProgress(prev => ({ ...prev, currentPhase: 'preparation' }));
        startTimer(currentTask.preparationTime || 30, () => {
          playBeep();
          setTestProgress(prev => ({ ...prev, currentPhase: 'speaking' }));
          startTimer(currentTask.responseTime || 60, handleTaskComplete);
        });
      }
    }
  };

  const handleTaskComplete = () => {
    const currentTask = getCurrentTask();
    if (!currentTask) return;

    // Stop recording if still recording
    if (isRecording) {
      stopRecording();
    }

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
        description: "모든 Speaking 문제를 완료했습니다.",
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
        startTimer(60, () => {
          playBeep();
          setTestProgress(prev => ({ ...prev, currentPhase: 'preparation' }));
          startTimer(currentTask.preparationTime, () => {
            playBeep();
            setTestProgress(prev => ({ ...prev, currentPhase: 'speaking' }));
            startTimer(currentTask.responseTime, handleTaskComplete);
          });
        });
        break;
      case 'listening':
        setTestProgress(prev => ({ ...prev, currentPhase: 'preparation', isActive: false }));
        startTimer(currentTask.preparationTime, () => {
          playBeep();
          setTestProgress(prev => ({ ...prev, currentPhase: 'speaking' }));
          startTimer(currentTask.responseTime, handleTaskComplete);
        });
        break;
      case 'preparation':
        setTestProgress(prev => ({ ...prev, currentPhase: 'speaking', isActive: false }));
        startTimer(currentTask.responseTime, handleTaskComplete);
        break;
      case 'speaking':
        handleTaskComplete();
        break;
    }
  };

  const startRecording = async () => {
    try {
      await unlockAudioContext();
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const recorder = createSafariCompatibleMediaRecorder(stream);
      const chunks: BlobPart[] = [];
      const currentTaskNumber = getCurrentTask()?.taskNumber || 0;
      const mimeType = getSupportedMimeType();

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blobType = mimeType.includes('mp4') ? 'audio/mp4' : 
                         mimeType.includes('ogg') ? 'audio/ogg' : 
                         mimeType.includes('wav') ? 'audio/wav' : 'audio/webm';
        const blob = new Blob(chunks, { type: blobType });
        const url = URL.createObjectURL(blob);
        setRecordings(prev => ({
          ...prev,
          [currentTaskNumber]: url
        }));
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error: any) {
      let message = "마이크 접근 권한을 확인해주세요.";
      if (error.message === 'MEDIARECORDER_NOT_SUPPORTED') {
        message = "이 브라우저에서는 음성 녹음을 지원하지 않습니다. Chrome 또는 Firefox를 사용해주세요.";
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        message = "마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.";
      } else if (error.name === 'NotFoundError') {
        message = "마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.";
      }
      toast({
        title: "녹음 오류",
        description: message,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
    }
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
      case "preparation": return "답변 준비";
      case "speaking": return "답변 녹음";
      case "finished": return "테스트 완료";
      default: return "";
    }
  };

  const getTaskIcon = (type: string) => {
    return type === 'independent' ? <Users className="w-4 h-4" /> : <Headphones className="w-4 h-4" />;
  };

  const getTaskColor = (taskNum: number, isCurrent: boolean, isCompleted: boolean) => {
    if (isCompleted) return 'bg-green-600/30 border-green-500';
    if (isCurrent) return 'bg-cyan-500/30 border-cyan-400 ring-2 ring-cyan-400/50';
    return 'bg-gray-700/50 border-gray-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-700 via-teal-800 to-teal-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>전체 테스트를 구성하는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !fullTest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-700 via-teal-800 to-teal-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">테스트를 불러오는데 실패했습니다.</p>
          <Link href="/toefl-speaking">
            <Button variant="outline">돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentTask = getCurrentTask();

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-700 via-teal-800 to-teal-900 text-white">
      {/* Header */}
      <div className="bg-teal-900/80 backdrop-blur-sm border-b border-teal-600/50 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/toefl-speaking">
              <Button variant="ghost" size="sm" className="text-teal-100 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로가기
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-400 rounded-xl flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">TOEFL Speaking Full Test</h1>
                <p className="text-teal-200 text-xs">총 4개 태스크 | 약 17분 소요</p>
              </div>
            </div>
          </div>
          <Badge className="bg-cyan-500 text-white font-semibold px-3 py-1">
            FULL TEST
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Progress Overview - All 4 Tasks */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {fullTest.tasks.map((task, index) => {
            const isCurrent = testProgress.currentTaskIndex === index;
            const isCompleted = testProgress.currentTaskIndex > index || 
              (testProgress.currentTaskIndex === index && testProgress.currentPhase === 'finished');
            
            return (
              <Card 
                key={task.taskNumber} 
                className={`border-2 transition-all ${getTaskColor(task.taskNumber, isCurrent, isCompleted)}`}
              >
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-center text-sm flex items-center justify-center gap-2">
                    {getTaskIcon(task.type)}
                    <span>Task #{task.taskNumber}</span>
                    {recordings[task.taskNumber] && (
                      <Badge className="ml-1 bg-green-600 text-white text-xs px-1.5 py-0">완료</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-center text-xs text-gray-300 px-3 pb-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full mb-1 ${
                    task.type === 'independent' ? 'bg-teal-500/30 text-teal-200' : 'bg-emerald-500/30 text-emerald-200'
                  }`}>
                    {task.type === 'independent' ? 'Independent' : 'Integrated'}
                  </span>
                  <br />
                  {task.preparationTime}초 준비 + {task.responseTime}초 답변
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
                    currentTask.type === 'independent' 
                      ? 'bg-gradient-to-br from-teal-400 to-cyan-400' 
                      : 'bg-gradient-to-br from-emerald-400 to-green-400'
                  }`}>
                    {getTaskIcon(currentTask.type)}
                  </div>
                  <div>
                    <span className="text-white">Task #{currentTask.taskNumber}</span>
                    <Badge className="ml-2 bg-cyan-500/30 text-cyan-200">
                      {getPhaseTitle()}
                    </Badge>
                  </div>
                </CardTitle>
                {testProgress.isActive && (
                  <div className="flex items-center space-x-2 text-cyan-300">
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
                    (testProgress.currentPhase === "reading" ? (currentTask.readingTime || 45) : 
                     testProgress.currentPhase === "listening" ? 60 :
                     testProgress.currentPhase === "preparation" ? currentTask.preparationTime :
                     currentTask.responseTime)) * 100} 
                  className="w-full mt-2"
                />
              )}
            </CardHeader>
            <CardContent>
              {/* Intro Phase - Start Button */}
              {testProgress.currentPhase === "intro" && (
                <div className="text-center space-y-6 py-8">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto ${
                    currentTask.type === 'independent' 
                      ? 'bg-gradient-to-br from-teal-400 to-cyan-400' 
                      : 'bg-gradient-to-br from-emerald-400 to-green-400'
                  }`}>
                    {currentTask.type === 'independent' ? <Users className="w-10 h-10 text-white" /> : <Headphones className="w-10 h-10 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {currentTask.title || `Task #${currentTask.taskNumber}`}
                    </h3>
                    <p className="text-teal-200 mb-4">
                      {currentTask.type === 'independent' 
                        ? '주제에 대한 의견을 말하세요' 
                        : currentTask.taskNumber === 4 
                          ? 'Listening 후 요약하기'
                          : 'Reading + Listening 후 요약하기'}
                    </p>
                    <div className="flex justify-center gap-4 text-sm text-teal-300">
                      <span>준비: {currentTask.preparationTime}초</span>
                      <span>답변: {currentTask.responseTime}초</span>
                    </div>
                  </div>
                  <Button 
                    onClick={startTask} 
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white px-8"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    시작하기
                  </Button>
                </div>
              )}

              {/* Reading Phase */}
              {testProgress.currentPhase === "reading" && currentTask.readingPassage && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-cyan-300">
                      <BookOpen className="w-5 h-5" />
                      <span className="font-semibold">읽기 지문</span>
                    </div>
                    <Button 
                      onClick={skipToNextPhase} 
                      variant="outline" 
                      size="sm"
                      className="text-teal-200 border-teal-400 hover:bg-teal-500/20"
                    >
                      다음 →
                    </Button>
                  </div>
                  {currentTask.readingPassageTitle && (
                    <h4 className="text-lg font-semibold text-white">{currentTask.readingPassageTitle}</h4>
                  )}
                  <div className="bg-white/10 p-5 rounded-xl text-gray-100 leading-relaxed text-[17px]" style={{ fontFamily: 'Georgia, serif' }}>
                    {currentTask.readingPassage}
                  </div>
                </div>
              )}

              {/* Listening Phase */}
              {testProgress.currentPhase === "listening" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-300">
                      <Volume2 className="w-5 h-5" />
                      <span className="font-semibold">듣기</span>
                    </div>
                    <Button 
                      onClick={skipToNextPhase} 
                      variant="outline" 
                      size="sm"
                      className="text-teal-200 border-teal-400 hover:bg-teal-500/20"
                    >
                      다음 →
                    </Button>
                  </div>
                  {currentTask.listeningScript && (
                    <div className="bg-white/10 p-5 rounded-xl text-gray-100 leading-relaxed text-[17px]" style={{ fontFamily: 'Georgia, serif' }}>
                      {currentTask.listeningScript}
                    </div>
                  )}
                  {!currentTask.listeningScript && (
                    <div className="text-center py-10">
                      <Volume2 className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-teal-200">듣기 내용을 재생 중입니다...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Preparation Phase */}
              {testProgress.currentPhase === "preparation" && (
                <div className="text-center space-y-6 py-6">
                  <div className="w-16 h-16 bg-yellow-500/30 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-300">
                    답변을 준비하세요
                  </div>
                  <div className="bg-white/10 p-5 rounded-xl text-gray-100 text-lg max-w-2xl mx-auto">
                    {currentTask.questionText}
                  </div>
                  <p className="text-sm text-teal-300">
                    준비 시간이 끝나면 자동으로 답변 시간이 시작됩니다.
                  </p>
                  <Button 
                    onClick={skipToNextPhase} 
                    variant="outline"
                    className="text-teal-200 border-teal-400 hover:bg-teal-500/20"
                  >
                    준비 완료 - 바로 시작 →
                  </Button>
                </div>
              )}

              {/* Speaking Phase */}
              {testProgress.currentPhase === "speaking" && (
                <div className="text-center space-y-6 py-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                    isRecording ? 'bg-red-500 animate-pulse' : 'bg-red-500/30'
                  }`}>
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-red-300">
                    지금 답변하세요
                  </div>
                  <div className="bg-white/10 p-5 rounded-xl text-gray-100 text-lg max-w-2xl mx-auto">
                    {currentTask.questionText}
                  </div>
                  <div className="flex justify-center space-x-4">
                    {!isRecording ? (
                      <Button 
                        onClick={startRecording}
                        className="bg-red-600 hover:bg-red-700 text-white px-6"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        녹음 시작
                      </Button>
                    ) : (
                      <Button 
                        onClick={stopRecording}
                        variant="outline"
                        className="border-red-400 text-red-300 hover:bg-red-500/20 px-6"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        녹음 중지
                      </Button>
                    )}
                  </div>
                  {isRecording && (
                    <div className="flex items-center justify-center space-x-2 text-red-400">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span>녹음 중...</span>
                    </div>
                  )}
                  <Button 
                    onClick={skipToNextPhase} 
                    variant="ghost"
                    className="text-teal-300 hover:text-white hover:bg-white/10"
                  >
                    답변 완료 - 다음 태스크로 →
                  </Button>
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
                <Target className="w-10 h-10 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-400 mb-4">
                전체 테스트 완료!
              </div>
              <div className="text-teal-200 mb-8">
                Task #1, #2, #3, #4를 모두 완료했습니다.
              </div>
              
              {/* Recordings */}
              {Object.keys(recordings).length > 0 && (
                <div className="space-y-3 mb-8 max-w-xl mx-auto">
                  <h3 className="text-white font-semibold mb-4">녹음 파일</h3>
                  {Object.entries(recordings).map(([taskNum, url]) => (
                    <div key={taskNum} className="flex items-center justify-between bg-white/10 p-3 rounded-xl">
                      <span className="text-teal-200">Task #{taskNum} 녹음</span>
                      <div className="flex items-center space-x-2">
                        <audio controls src={url} className="h-8" playsInline webkit-playsinline="true"></audio>
                        <Button size="sm" variant="outline" className="border-teal-400" asChild>
                          <a href={url} download={`toefl-speaking-task-${taskNum}.wav`}>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-center space-x-4">
                <Link href="/toefl-speaking">
                  <Button variant="outline" className="border-teal-400 text-teal-200 hover:bg-teal-500/20">
                    다른 테스트 선택
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white">
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
