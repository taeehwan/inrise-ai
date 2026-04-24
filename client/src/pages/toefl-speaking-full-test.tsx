import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  BookOpen,
  Headphones,
  Mic,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Clock,
  User,
  Eye,
  EyeOff,
  VolumeX,
  Volume1,
  CheckCircle,
  Download
} from "lucide-react";
import femaleProfessorImg from "@assets/stock_images/female_professor_tea_ae4ed8b9.jpg";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { SpeakingTest } from "@shared/schema";
import { 
  createSafariCompatibleAudio, 
  playSafariCompatibleAudio, 
  createSafariCompatibleMediaRecorder,
  getBlobMimeType,
  unlockAudioContext,
  isAppleDevice 
} from "@/lib/safariAudioCompat";

type TaskType = "independent" | "integrated";
type Phase = "intro" | "question" | "reading" | "listening" | "preparation" | "speaking" | "review" | "complete";

interface Task {
  taskNumber: number;
  type: TaskType;
  data: SpeakingTest;
}

interface TestProgress {
  currentTaskNumber: number;
  currentPhase: Phase;
  completedTasks: number[];
  recordings: { [taskNumber: number]: Blob };
}

export default function TOEFLSpeakingFullTest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch speaking tests
  const { data: speakingTests = [], isLoading } = useQuery<SpeakingTest[]>({
    queryKey: ["/api/speaking/tests"],
  });

  // Test setup
  const [tasks, setTasks] = useState<Task[]>([]);
  const [testProgress, setTestProgress] = useState<TestProgress>({
    currentTaskNumber: 0,
    currentPhase: "intro",
    completedTasks: [],
    recordings: {}
  });

  // Timer states
  const [currentTimer, setCurrentTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Audio states
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [showListeningScript, setShowListeningScript] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);

  // Audio refs
  const listeningAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);

  // Setup tasks when data loads
  useEffect(() => {
    if (speakingTests.length > 0) {
      const independent = speakingTests.find((test) => test.type === "independent");
      const integrated = speakingTests.filter((test) => test.type === "integrated").slice(0, 3);

      const tasksList: Task[] = [];
      
      if (independent) {
        tasksList.push({
          taskNumber: 1,
          type: 'independent',
          data: independent
        });
      }

      integrated.forEach((test, idx) => {
        tasksList.push({
          taskNumber: idx + 2,
          type: 'integrated',
          data: test
        });
      });

      setTasks(tasksList);
    }
  }, [speakingTests]);

  // Current task helper
  const currentTask = tasks.find(t => t.taskNumber === testProgress.currentTaskNumber);

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start test
  const startTest = () => {
    if (tasks.length > 0) {
      setTestProgress({
        ...testProgress,
        currentTaskNumber: 1,
        currentPhase: tasks[0].type === 'independent' ? 'question' : 'reading'
      });
    }
  };

  // Timer effect
  useEffect(() => {
    if (!isTimerActive || currentTimer <= 0) return;

    const interval = setInterval(() => {
      setCurrentTimer(prev => {
        if (prev <= 1) {
          setIsTimerActive(false);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, currentTimer]);

  // Handle timer completion
  const handleTimerComplete = () => {
    if (testProgress.currentPhase === 'reading') {
      goToNextPhase();
    } else if (testProgress.currentPhase === 'preparation') {
      startSpeakingPhase();
    } else if (testProgress.currentPhase === 'speaking') {
      stopRecording();
      setTestProgress({ ...testProgress, currentPhase: 'review' });
    }
  };

  // Go to next phase
  const goToNextPhase = () => {
    const { currentPhase } = testProgress;
    
    if (currentPhase === 'question' && currentTask?.type === 'independent') {
      // Independent: question → preparation
      setTestProgress({ ...testProgress, currentPhase: 'preparation' });
      setCurrentTimer(currentTask.data.preparationTime || 15);
      setIsTimerActive(true);
    } else if (currentPhase === 'reading') {
      // Integrated: reading → listening
      setTestProgress({ ...testProgress, currentPhase: 'listening' });
      playListeningAudio();
    } else if (currentPhase === 'listening') {
      // Listening → question
      setTestProgress({ ...testProgress, currentPhase: 'preparation' });
      setCurrentTimer(currentTask?.data.preparationTime || 30);
      setIsTimerActive(true);
    }
  };

  // Play listening audio (Safari compatible)
  const playListeningAudio = async () => {
    if (!listeningAudioRef.current) return;
    
    setIsAudioPlaying(true);
    try {
      await unlockAudioContext();
      await playSafariCompatibleAudio(listeningAudioRef.current);
    } catch (err: any) {
      console.error("Audio play failed:", err);
      if (err.message === 'REQUIRES_USER_INTERACTION') {
        toast({
          title: "Audio Blocked",
          description: "Please tap the play button to start audio.",
          variant: "default"
        });
      } else {
        toast({
          title: "Audio Error",
          description: "Failed to play audio. You can continue to the next phase.",
          variant: "destructive"
        });
      }
      setIsAudioPlaying(false);
    }
  };

  // Toggle listening audio (Safari compatible)
  const toggleListeningAudio = async () => {
    const audio = listeningAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await unlockAudioContext();
        await playSafariCompatibleAudio(audio);
      } catch (error) {
        console.error("Failed to play audio:", error);
      }
    } else {
      audio.pause();
    }
  };

  // Start speaking phase
  const startSpeakingPhase = () => {
    setTestProgress({ ...testProgress, currentPhase: 'speaking' });
    setCurrentTimer(currentTask?.data.responseTime || 60);
    setIsTimerActive(true);
    startRecording();
  };

  // Recording functions (Safari compatible)
  const startRecording = async () => {
    try {
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

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = getBlobMimeType();
        const blob = new Blob(chunks, { type: blobType });
        setRecordingBlob(blob);
        setTestProgress(prev => ({
          ...prev,
          recordings: {
            ...prev.recordings,
            [prev.currentTaskNumber]: blob
          }
        }));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error: any) {
      let message = "Could not access microphone. Please check permissions.";
      if (error.message === 'MEDIARECORDER_NOT_SUPPORTED') {
        message = "이 브라우저에서는 음성 녹음을 지원하지 않습니다. Chrome 또는 Firefox를 사용해주세요.";
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        message = "마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.";
      } else if (error.name === 'NotFoundError') {
        message = "마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.";
      }
      toast({
        title: "Microphone Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Move to next task
  const moveToNextTask = () => {
    const nextTaskNumber = testProgress.currentTaskNumber + 1;
    const nextTask = tasks.find(t => t.taskNumber === nextTaskNumber);

    setTestProgress({
      ...testProgress,
      currentTaskNumber: nextTaskNumber,
      currentPhase: nextTask?.type === 'independent' ? 'question' : 'reading',
      completedTasks: [...testProgress.completedTasks, testProgress.currentTaskNumber]
    });
    
    setRecordingBlob(null);
  };

  // Skip to task
  const skipToTask = (taskNumber: number) => {
    const task = tasks.find(t => t.taskNumber === taskNumber);
    if (!task) return;

    setTestProgress({
      ...testProgress,
      currentTaskNumber: taskNumber,
      currentPhase: task.type === 'independent' ? 'question' : 'reading'
    });
  };

  // Audio progress tracking
  useEffect(() => {
    const audio = listeningAudioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const current = audio.currentTime;
      const duration = audio.duration;
      
      setAudioCurrentTime(current);
      setAudioDuration(duration);
      
      if (duration > 0) {
        setAudioProgress((current / duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsAudioPlaying(false);
      goToNextPhase();
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handlePause = () => {
      setIsAudioPaused(true);
    };

    const handlePlay = () => {
      setIsAudioPaused(false);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  // Set audio sources
  useEffect(() => {
    if (currentTask?.type === 'integrated' && currentTask.data.listeningAudioUrl) {
      if (listeningAudioRef.current) {
        listeningAudioRef.current.src = currentTask.data.listeningAudioUrl;
        listeningAudioRef.current.load();
      }
    }
  }, [currentTask]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-700">Loading tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100">
      {/* Audio elements */}
      <audio ref={listeningAudioRef} playsInline webkit-playsinline="true" />
      <audio ref={questionAudioRef} playsInline webkit-playsinline="true" />

      {/* Header */}
      <div className="bg-teal-600 text-white py-6 shadow-lg">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-2">TOEFL Speaking - Full Test</h1>
          <p className="text-teal-100">Complete all 4 tasks in sequence</p>
        </div>

        {/* Task Progress Bar */}
        {testProgress.currentPhase !== 'intro' && testProgress.currentPhase !== 'complete' && (
          <div className="max-w-6xl mx-auto px-6 mt-4">
            <div className="flex items-center justify-between mb-2">
              {tasks.map((task) => (
                <div
                  key={task.taskNumber}
                  className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg mx-1 cursor-pointer transition-all ${
                    task.taskNumber === testProgress.currentTaskNumber
                      ? 'bg-white text-teal-600 font-bold'
                      : testProgress.completedTasks.includes(task.taskNumber)
                      ? 'bg-teal-700 text-teal-100'
                      : 'bg-teal-500 text-teal-100'
                  }`}
                  onClick={() => skipToTask(task.taskNumber)}
                  data-testid={`task-${task.taskNumber}`}
                >
                  <span className="mr-2">Task {task.taskNumber}</span>
                  {testProgress.completedTasks.includes(task.taskNumber) && (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </div>
              ))}
            </div>
            <Progress
              value={(testProgress.completedTasks.length / tasks.length) * 100}
              className="h-2 bg-teal-400"
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Intro Page */}
        {testProgress.currentPhase === 'intro' && (
          <Card className="bg-white border-gray-300">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Welcome to TOEFL Speaking Full Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-lg text-gray-700">
                  This test contains 4 speaking tasks:
                </p>
                <ul className="text-left max-w-md mx-auto space-y-2">
                  <li className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-teal-500" />
                    <span><strong>Task 1:</strong> Independent Task (Personal Preference)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-teal-500" />
                    <span><strong>Task 2-4:</strong> Integrated Tasks (Reading + Listening)</span>
                  </li>
                </ul>
                <p className="text-gray-600">
                  Complete all tasks in sequence. You cannot skip or go back once you start a task.
                </p>
              </div>

              <div className="text-center">
                <Button
                  onClick={startTest}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-12 py-4 text-lg"
                  disabled={tasks.length === 0}
                  data-testid="button-start-test"
                >
                  Start Test
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Content */}
        {currentTask && testProgress.currentPhase !== 'intro' && testProgress.currentPhase !== 'complete' && (
          <Card className="bg-white border-gray-300">
            <CardHeader className="bg-teal-500 text-white">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">
                    Task {currentTask.taskNumber}: {currentTask.type === 'independent' ? 'Independent Task' : 'Integrated Task'}
                  </CardTitle>
                  <p className="text-teal-100">
                    {testProgress.currentPhase === 'question' && 'Read the question'}
                    {testProgress.currentPhase === 'reading' && 'Read the passage'}
                    {testProgress.currentPhase === 'listening' && 'Listen to the lecture'}
                    {testProgress.currentPhase === 'preparation' && 'Prepare your response'}
                    {testProgress.currentPhase === 'speaking' && 'Speaking'}
                    {testProgress.currentPhase === 'review' && 'Task completed'}
                  </p>
                </div>
                
                {isTimerActive && (
                  <div className="flex items-center space-x-2 bg-white text-teal-600 px-4 py-2 rounded-lg">
                    <Clock className="h-5 w-5" />
                    <span className="text-2xl font-mono font-bold">{formatTime(currentTimer)}</span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Independent Question Phase */}
              {currentTask.type === 'independent' && testProgress.currentPhase === 'question' && (
                <div className="text-center space-y-6 py-8">
                  <div className="flex justify-center mb-8">
                    <div className="w-32 h-32 bg-teal-100 rounded-full flex items-center justify-center">
                      <User className="h-16 w-16 text-teal-600" />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <p className="text-lg leading-relaxed px-8">
                      {currentTask.data.questionText}
                    </p>
                    
                    <Button
                      onClick={goToNextPhase}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3"
                      data-testid="button-continue-prep"
                    >
                      Continue to Preparation
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Integrated Reading Phase */}
              {currentTask.type === 'integrated' && testProgress.currentPhase === 'reading' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="h-6 w-6 text-teal-500" />
                      <h2 className="text-xl font-semibold text-gray-900">
                        {currentTask.data.readingPassageTitle || 'Reading Passage'}
                      </h2>
                    </div>
                    {isTimerActive && (
                      <div className="text-sm text-gray-600">
                        Time: {formatTime(currentTimer)}
                      </div>
                    )}
                  </div>
                  
                  <ScrollArea className="h-96 w-full border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="text-gray-900 leading-relaxed text-lg">
                      {currentTask.data.readingPassage}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex justify-end">
                    {!isTimerActive ? (
                      <Button
                        onClick={() => {
                          setCurrentTimer(currentTask.data.readingTime || 45);
                          setIsTimerActive(true);
                        }}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3"
                        data-testid="button-start-reading"
                      >
                        Start Reading Timer
                      </Button>
                    ) : (
                      <Button
                        onClick={goToNextPhase}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3"
                        data-testid="button-continue-listening"
                      >
                        Continue to Listening
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Integrated Listening Phase */}
              {currentTask.type === 'integrated' && testProgress.currentPhase === 'listening' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <Headphones className="h-6 w-6 text-teal-500" />
                      <h2 className="text-xl font-semibold text-gray-900">Listening - Lecture</h2>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowListeningScript(!showListeningScript)}
                      className="border-teal-400 text-teal-600 hover:bg-teal-50"
                      data-testid="button-toggle-script"
                    >
                      {showListeningScript ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Hide Script
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Show Script
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Lecture Image */}
                  <div className="mb-6 rounded-lg overflow-hidden border-4 border-teal-400 shadow-xl">
                    <img 
                      src={femaleProfessorImg} 
                      alt="Professor giving lecture"
                      className="w-full h-80 object-cover"
                    />
                  </div>

                  {/* Audio Player Controls */}
                  <div className="mb-6 bg-teal-50 border-2 border-teal-300 rounded-lg p-6">
                    <div className="flex items-center justify-center mb-4">
                      <Button
                        onClick={toggleListeningAudio}
                        size="lg"
                        className="bg-teal-500 hover:bg-teal-600 text-white w-32 h-32 rounded-full shadow-xl"
                        data-testid="button-play-pause"
                      >
                        {isAudioPaused || !isAudioPlaying ? (
                          <Play className="h-16 w-16" />
                        ) : (
                          <Pause className="h-16 w-16" />
                        )}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-teal-700">
                          {Math.round(audioProgress)}%
                        </span>
                      </div>
                      
                      <div className="relative w-full h-4 bg-teal-200 rounded-full overflow-hidden border-2 border-teal-300">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-300 ease-linear"
                          style={{ width: `${audioProgress}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-sm text-gray-700">
                        <span className="font-medium">{formatTime(audioCurrentTime)}</span>
                        <span className="font-medium">
                          {isAudioPlaying && !isAudioPaused ? "▶ Playing" : "⏸ Paused"}
                        </span>
                        <span className="font-medium">Total: {formatTime(audioDuration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Script Display */}
                  {showListeningScript && currentTask.data.listeningScript && (
                    <div className="mb-6">
                      <ScrollArea className="h-64 w-full border-2 border-teal-300 rounded-lg p-4 bg-teal-50">
                        <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                          {currentTask.data.listeningScript}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={goToNextPhase}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3"
                      data-testid="button-continue-prep"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Preparation Phase */}
              {testProgress.currentPhase === 'preparation' && (
                <div className="text-center py-16 space-y-6">
                  <h2 className="text-2xl font-semibold mb-6">Preparation Time</h2>
                  
                  <div className="mb-6 bg-gray-50 border border-gray-300 rounded-lg p-6">
                    <p className="text-lg text-gray-900">{currentTask.data.questionText}</p>
                  </div>

                  <div className="text-6xl font-mono font-bold text-teal-600">
                    {formatTime(currentTimer)}
                  </div>
                  
                  <p className="text-gray-600">Prepare your response to the question</p>
                  
                  {!isTimerActive && (
                    <Button
                      onClick={startSpeakingPhase}
                      className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3"
                      data-testid="button-start-speaking"
                    >
                      Start Speaking
                    </Button>
                  )}
                </div>
              )}

              {/* Speaking Phase */}
              {testProgress.currentPhase === 'speaking' && (
                <div className="text-center py-16 space-y-6">
                  <div className="flex justify-center mb-8">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                      isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100'
                    }`}>
                      <Mic className={`h-16 w-16 ${isRecording ? 'text-red-600' : 'text-gray-400'}`} />
                    </div>
                  </div>

                  <h2 className="text-2xl font-semibold">
                    {isRecording ? 'Recording...' : 'Speak Now'}
                  </h2>

                  <div className="text-6xl font-mono font-bold text-red-600">
                    {formatTime(currentTimer)}
                  </div>

                  <p className="text-gray-600">Answer the question now</p>
                </div>
              )}

              {/* Review Phase */}
              {testProgress.currentPhase === 'review' && (
                <div className="text-center py-8 space-y-6">
                  <div className="flex justify-center mb-6">
                    <CheckCircle className="h-24 w-24 text-green-500" />
                  </div>

                  <h2 className="text-2xl font-semibold">Task {currentTask.taskNumber} Completed!</h2>
                  
                  <p className="text-gray-600">Your response has been recorded.</p>

                  {recordingBlob && (
                    <div className="space-y-4">
                      <audio 
                        controls 
                        src={URL.createObjectURL(recordingBlob)}
                        className="mx-auto"
                        playsInline
                        webkit-playsinline="true"
                      />
                    </div>
                  )}

                  <div className="flex justify-center space-x-4">
                    {testProgress.currentTaskNumber < tasks.length ? (
                      <Button
                        onClick={moveToNextTask}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3"
                        data-testid="button-next-task"
                      >
                        Next Task
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setTestProgress({ ...testProgress, currentPhase: 'complete' })}
                        className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3"
                        data-testid="button-finish-test"
                      >
                        Finish Test
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Complete Page */}
        {testProgress.currentPhase === 'complete' && (
          <Card className="bg-white border-gray-300">
            <CardHeader className="bg-green-500 text-white">
              <CardTitle className="text-3xl text-center">Test Complete!</CardTitle>
            </CardHeader>
            <CardContent className="py-12 text-center space-y-6">
              <div className="flex justify-center mb-8">
                <CheckCircle className="h-32 w-32 text-green-500" />
              </div>

              <h2 className="text-2xl font-semibold">Congratulations!</h2>
              <p className="text-lg text-gray-700">
                You have completed all 4 speaking tasks.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-8">
                {tasks.map((task) => (
                  <div key={task.taskNumber} className="bg-teal-50 p-4 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold">Task {task.taskNumber}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {task.type === 'independent' ? 'Independent' : 'Integrated'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button
                  onClick={() => setLocation('/toefl-speaking-selection')}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-12 py-4 text-lg"
                  data-testid="button-back-to-selection"
                >
                  Back to Test Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Volume Control (bottom right) */}
      {testProgress.currentPhase !== 'intro' && testProgress.currentPhase !== 'complete' && (
        <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 w-64">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              className="flex-shrink-0"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume1 className="h-5 w-5" />}
            </Button>
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12 text-right">{volume[0]}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
