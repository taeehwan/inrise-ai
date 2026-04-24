import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Volume2, VolumeX, Mic, MicOff, Home, ChevronRight, ChevronLeft, User, HeadphonesIcon, Play, Pause, Download, BookOpen, Headphones, FileText, Eye, EyeOff, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext,
  createSafariCompatibleMediaRecorder,
  getSupportedMimeType
} from "@/lib/safariAudioCompat";
import CopyToClipboardButton from "@/components/CopyToClipboardButton";
import femaleProfessorImg from "@assets/stock_images/female_professor_tea_ae4ed8b9.jpg";
import maleProfessorImg from "@assets/stock_images/male_professor_teach_6d74296f.jpg";

type Phase = 'reading' | 'listening' | 'question' | 'preparation' | 'speaking' | 'review' | 'feedback';

interface SpeakingQuestion {
  id: string;
  type: "integrated";
  title: string;
  questionText: string;
  readingPassage?: string;
  listeningText?: string;
  preparationTime: number;
  responseTime: number;
  readingTime?: number;
}

interface TimerProps {
  seconds: number;
  isActive: boolean;
  onComplete: () => void;
  label: string;
  showInBox?: boolean;
}

function Timer({ seconds, isActive, onComplete, label, showInBox = false }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const onCompleteRef = useRef(onComplete);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);
  
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!isActive || timeLeft <= 0) return;
    
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setTimeout(() => onCompleteRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, timeLeft]);

  if (showInBox) {
    return (
      <div className="inline-block bg-white/95 px-4 py-2 rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-sm text-teal-700 font-medium">{label}</div>
          <div className="text-xl font-bold text-teal-900">00:{(timeLeft).toString().padStart(2, '0')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-sm text-teal-200 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">00:{(timeLeft).toString().padStart(2, '0')}</div>
    </div>
  );
}

export default function TOEFLSpeakingIntegrated() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  // Fetch test data
  const { data: testData, isLoading } = useQuery<any>({
    queryKey: [`/api/speaking-tests/${id}`],
    retry: false,
  });

  // Transform API data to match expected format
  const question: SpeakingQuestion | null = useMemo(() => {
    if (!testData) return null;
    return {
      id: testData.id,
      type: "integrated",
      title: testData.title,
      questionText: testData.questionText,
      readingPassage: testData.readingPassage,
      listeningText: testData.listeningScript,
      preparationTime: testData.preparationTime || 30,
      responseTime: testData.responseTime || 60,
      readingTime: testData.readingTime || 45
    };
  }, [testData]);

  // States
  const [currentPhase, setCurrentPhase] = useState<Phase>('reading');
  
  // Timer states
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [currentTimer, setCurrentTimer] = useState(0);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Audio states
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  // AI feedback states
  const [transcript, setTranscript] = useState("");
  const [overallAssessment, setOverallAssessment] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [modelAnswerScript, setModelAnswerScript] = useState("");
  const [modelAnswerAnalysis, setModelAnswerAnalysis] = useState("");
  const [scores, setScores] = useState<{
    delivery: number;
    languageUse: number;
    topicDevelopment: number;
    overall: number;
    predictedToeflScore: number;
  } | null>(null);
  
  // Workflow states
  const [showNextButton, setShowNextButton] = useState(false);
  const [showListeningScript, setShowListeningScript] = useState(false);
  
  // Audio playback states
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  
  // Audio refs for HTML audio elements
  const listeningAudioRef = useRef<HTMLAudioElement | null>(null);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const beepAudioRef = useRef<HTMLAudioElement | null>(null);

  // Start timer for reading phase
  useEffect(() => {
    if (question && currentPhase === 'reading') {
      setCurrentTimer(question.readingTime || 45);
      setIsTimerActive(true);
    }
  }, [question, currentPhase]);

  // Set audio sources when testData is loaded
  useEffect(() => {
    if (testData) {
      if (testData.listeningAudioUrl && listeningAudioRef.current) {
        listeningAudioRef.current.src = testData.listeningAudioUrl;
        listeningAudioRef.current.load();
      }
      if (testData.questionAudioUrl && questionAudioRef.current) {
        questionAudioRef.current.src = testData.questionAudioUrl;
        questionAudioRef.current.load();
      }
    }
  }, [testData]);

  // Track audio progress for listening audio
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
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  // Update audio volume and mute
  useEffect(() => {
    const audioVolume = isMuted ? 0 : volume[0] / 100;
    if (listeningAudioRef.current) {
      listeningAudioRef.current.volume = audioVolume;
    }
    if (questionAudioRef.current) {
      questionAudioRef.current.volume = audioVolume;
    }
  }, [volume, isMuted]);

  // Play audio helper function (Safari compatible)
  const playAudio = async (
    audioRef: React.RefObject<HTMLAudioElement>,
    options: {
      onEnded?: () => void;
      onError?: () => void;
    } = {}
  ) => {
    const audio = audioRef.current;
    if (!audio) {
      console.error("Audio element not found");
      options.onError?.();
      return;
    }

    setIsAudioPlaying(true);

    const handleEnded = () => {
      setIsAudioPlaying(false);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      options.onEnded?.();
    };

    const handleError = (e: Event) => {
      console.error("Audio playback error:", e);
      setIsAudioPlaying(false);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      
      toast({
        title: "Audio Error",
        description: "Failed to play audio. Please click Continue to proceed manually.",
        variant: "destructive",
      });
      
      setShowNextButton(true);
      options.onError?.();
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    try {
      await unlockAudioContext();
      await playSafariCompatibleAudio(audio);
    } catch (error: any) {
      console.error("Audio play failed:", error);
      setIsAudioPlaying(false);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      
      toast({
        title: "Autoplay Blocked",
        description: "Please click the Continue button to play audio.",
        variant: "default",
      });
      
      setShowNextButton(true);
      options.onError?.();
    }
  };

  // Format time in MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle play/pause for listening audio (Safari compatible)
  const toggleListeningAudio = async () => {
    const audio = listeningAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await unlockAudioContext();
        await playSafariCompatibleAudio(audio);
      } catch (error) {
        console.error("Failed to play audio:", error);
        toast({
          title: "Playback Error",
          description: "Could not play audio. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      audio.pause();
    }
  };

  // Play beep sound
  const playBeep = (onComplete?: () => void) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(isMuted ? 0 : volume[0] / 100 * 0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    setTimeout(() => {
      onComplete?.();
    }, 500);
  };

  // Phase transition handlers
  const handleReadingComplete = () => {
    setIsTimerActive(false);
    setCurrentPhase('listening');
    setShowNextButton(false);
    
    // Auto-play listening audio when entering listening phase
    setTimeout(() => {
      playAudio(listeningAudioRef, {
        onEnded: () => {
          setShowNextButton(true);
          setIsAudioPlaying(false);
        },
        onError: () => {
          setShowNextButton(true);
          setIsAudioPlaying(false);
          toast({
            title: "Audio Error",
            description: "Failed to play listening audio. You can still continue.",
            variant: "destructive",
          });
        }
      });
    }, 500);
  };

  const handleListeningComplete = () => {
    setShowNextButton(false);
    
    // Stop listening audio before moving to next phase
    if (listeningAudioRef.current) {
      listeningAudioRef.current.pause();
      listeningAudioRef.current.currentTime = 0;
      setIsAudioPlaying(false);
    }
    
    setCurrentPhase('question');
    
    // Play question audio
    playAudio(questionAudioRef, {
      onEnded: () => {
        // Play beep and start preparation timer
        playBeep(() => {
          setCurrentPhase('preparation');
          setCurrentTimer(question?.preparationTime || 30);
          setIsTimerActive(true);
        });
      },
      onError: () => {
        // If question audio fails, still proceed to preparation
        playBeep(() => {
          setCurrentPhase('preparation');
          setCurrentTimer(question?.preparationTime || 30);
          setIsTimerActive(true);
        });
      }
    });
  };

  const handlePreparationComplete = () => {
    setIsTimerActive(false);
    
    // Play beep and start speaking phase
    playBeep(() => {
      setCurrentPhase('speaking');
      setCurrentTimer(question?.responseTime || 60);
      setIsTimerActive(true);
      startRecording();
    });
  };

  const handleSpeakingComplete = () => {
    setIsTimerActive(false);
    stopRecording();
    setCurrentPhase('review');
  };

  // Recording functions (Safari compatible)
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

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = getSupportedMimeType();
        const blob = new Blob(chunks, { type: blobType });
        setRecordingBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      // Start recording duration timer
      let duration = 0;
      const durationInterval = setInterval(() => {
        duration += 1;
        setRecordingDuration(duration);
        if (!isRecording) {
          clearInterval(durationInterval);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Error starting recording:', error);
      let message = "Could not start recording. Please check microphone permissions.";
      if (error.message === 'MEDIARECORDER_NOT_SUPPORTED') {
        message = "이 브라우저에서는 음성 녹음을 지원하지 않습니다. Chrome 또는 Firefox를 사용해주세요.";
      } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        message = "마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.";
      } else if (error.name === 'NotFoundError') {
        message = "마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.";
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Download recording
  const downloadRecording = () => {
    if (recordingBlob) {
      const url = URL.createObjectURL(recordingBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `speaking-response-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Speech-to-text conversion
  const convertSpeechToText = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Speech-to-text conversion failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setTranscript(data.transcript);
      toast({
        title: "Success",
        description: "Speech converted to text successfully!",
      });
    },
    onError: (error) => {
      console.error('Speech-to-text error:', error);
      toast({
        title: "Error",
        description: "Failed to convert speech to text. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI feedback generation
  const generateFeedback = useMutation({
    mutationFn: async ({ transcript, question }: { transcript: string; question: SpeakingQuestion }) => {
      return apiRequest("POST", "/api/ai/speaking-feedback", {
        transcript,
        questionText: question.questionText,
        readingPassage: question.readingPassage,
        listeningText: question.listeningText,
        type: "integrated"
      }) as Promise<any>;
    },
    onSuccess: (data) => {
      // New detailed feedback structure from backend
      setOverallAssessment(data.overallAssessment || "종합 평가를 생성할 수 없습니다.");
      setStrengths(data.strengths || "강점 분석을 생성할 수 없습니다.");
      setAreasForImprovement(data.areasForImprovement || "개선 영역을 생성할 수 없습니다.");
      setModelAnswerScript(data.modelAnswerScript || "모범 답안을 생성할 수 없습니다.");
      setModelAnswerAnalysis(data.modelAnswerAnalysis || "모범 답안 분석을 생성할 수 없습니다.");
      
      // Scores are already adjusted on the backend - use them directly
      if (data.scores) {
        setScores({
          delivery: data.scores.delivery,
          languageUse: data.scores.languageUse,
          topicDevelopment: data.scores.topicDevelopment,
          overall: data.scores.overall,
          predictedToeflScore: data.scores.predictedToeflScore
        });
      } else {
        setScores(null);
      }
      
      setCurrentPhase('feedback');
      toast({
        title: "성공",
        description: "인라이즈 피드백이 생성되었습니다!",
      });
    },
    onError: (error) => {
      console.error('AI feedback error:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Question Not Found</h2>
          <Link href="/toefl-speaking">
            <Button variant="outline" className="text-slate-800">
              <Home className="mr-2 h-4 w-4" />
              Back to Speaking Tests
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getPhaseTitle = () => {
    switch (currentPhase) {
      case 'reading': return 'Step 1: Reading Passage';
      case 'listening': return 'Step 2: Listening';
      case 'question': return 'Step 3: Question';
      case 'preparation': return 'Step 4: Preparation';
      case 'speaking': return 'Step 5: Recording';
      case 'review': return 'Step 6: Review';
      case 'feedback': return 'AI Feedback';
      default: return '';
    }
  };

  const getPhaseProgress = () => {
    const phases = ['reading', 'listening', 'question', 'preparation', 'speaking', 'review', 'feedback'];
    return ((phases.indexOf(currentPhase) + 1) / phases.length) * 100;
  };

  const getPhaseColor = () => {
    // Unified teal theme for all phases
    return { bg: 'bg-teal-700', header: 'bg-teal-700', accent: 'teal', border: 'border-teal-400' };
  };

  const phaseColors = getPhaseColor();

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-700 via-teal-800 to-teal-900 text-white">
      {/* Hidden audio elements for server-generated TTS */}
      <audio ref={listeningAudioRef} data-testid="audio-listening" preload="auto" playsInline webkit-playsinline="true" />
      <audio ref={questionAudioRef} data-testid="audio-question" preload="auto" playsInline webkit-playsinline="true" />
      
      {/* Header with dynamic phase colors */}
      <div className={`${phaseColors.header} border-b border-white/20 p-4 transition-colors duration-500`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/toefl-speaking">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-wide text-white">TOEFL SPEAKING</h1>
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium">
                Integrated Task
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="w-20 [&_[role=slider]]:border-white/50 [&_[role=slider]]:bg-white [&>span]:bg-white/30 [&>span>span]:bg-white"
              />
              <span className="text-sm text-white w-8">{volume[0]}</span>
            </div>
          </div>
        </div>
        
        {/* Phase Progress */}
        <div className="max-w-4xl mx-auto mt-4">
          <div className="flex justify-between text-sm text-white mb-2">
            <span className="font-semibold">{getPhaseTitle()}</span>
            <span className="text-white/80">{Math.round(getPhaseProgress())}% Complete</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div 
              className="bg-white h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${getPhaseProgress()}%` }}
            />
          </div>
          {/* Phase Indicators */}
          <div className="flex justify-between mt-2">
            {['reading', 'listening', 'question', 'preparation', 'speaking', 'review'].map((phase, index) => {
              const phases = ['reading', 'listening', 'question', 'preparation', 'speaking', 'review'];
              const currentIndex = phases.indexOf(currentPhase);
              const isComplete = index < currentIndex;
              const isCurrent = phase === currentPhase;
              return (
                <div key={phase} className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    isComplete ? 'bg-white' : isCurrent ? 'bg-white ring-2 ring-white/50' : 'bg-white/30'
                  }`} />
                  <span className={`text-xs mt-1 ${isCurrent ? 'text-white font-medium' : 'text-white/60'}`}>
                    {index + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Reading Phase */}
        {currentPhase === 'reading' && (
          <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-teal-500/40">
                    <BookOpen className="h-6 w-6 text-teal-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Reading Passage</h2>
                    <p className="text-sm text-teal-200">Read the following passage carefully</p>
                  </div>
                </div>
                <Timer
                  seconds={currentTimer}
                  isActive={isTimerActive}
                  onComplete={handleReadingComplete}
                  label="Time Remaining"
                  showInBox
                />
              </div>
              
              <ScrollArea className="h-96 w-full border-2 border-teal-400/40 rounded-xl p-6 bg-teal-800/60">
                {question?.title && (
                  <h3 className="text-xl font-bold text-teal-200 mb-4 text-center border-b-2 pb-3 border-teal-400/40">
                    {question.title}
                  </h3>
                )}
                <div className="text-white leading-relaxed text-lg whitespace-pre-wrap">
                  {question?.readingPassage}
                </div>
              </ScrollArea>
              
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  className="border-teal-400/60 text-teal-200 hover:bg-teal-800/60 bg-teal-800/40"
                  disabled
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleReadingComplete}
                  className="bg-teal-500 hover:bg-teal-400 text-white px-8 py-3 font-semibold shadow-lg"
                  data-testid="button-continue-listening"
                >
                  Continue to Listening
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listening Phase */}
        {currentPhase === 'listening' && (
          <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-teal-500/40">
                    <Headphones className="h-6 w-6 text-teal-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Listening</h2>
                    <p className="text-sm text-teal-200">Listen to the lecture carefully</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowListeningScript(!showListeningScript)}
                  className="border-teal-400 text-white hover:bg-teal-700 bg-teal-600"
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
              <div className="mb-6 rounded-xl overflow-hidden border-4 border-teal-400/50 shadow-xl">
                <img 
                  src={femaleProfessorImg} 
                  alt="Professor giving lecture"
                  className="w-full h-72 object-cover"
                />
              </div>

              {/* Audio Player Controls */}
              <div className="mb-6 bg-teal-800/60 border-2 border-teal-400/40 rounded-xl p-6">
                {/* Play/Pause Button */}
                <div className="flex items-center justify-center mb-4">
                  <Button
                    onClick={toggleListeningAudio}
                    size="lg"
                    className="bg-teal-500 hover:bg-teal-400 text-white w-24 h-24 rounded-full shadow-xl"
                    data-testid="button-play-pause"
                  >
                    {isAudioPaused || !isAudioPlaying ? (
                      <Play className="h-12 w-12" />
                    ) : (
                      <Pause className="h-12 w-12" />
                    )}
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-teal-200">
                      {Math.round(audioProgress)}%
                    </span>
                  </div>
                  
                  <div className="relative w-full h-3 bg-teal-900/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-300 ease-linear"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-sm text-teal-200">
                    <span className="font-medium">{formatTime(audioCurrentTime)}</span>
                    <span className={`font-medium px-3 py-1 rounded-full ${isAudioPlaying && !isAudioPaused ? 'bg-green-500/40 text-green-200' : 'bg-teal-600/60 text-teal-200'}`}>
                      {isAudioPlaying && !isAudioPaused ? "▶ Playing" : "⏸ Paused"}
                    </span>
                    <span className="font-medium">{formatTime(audioDuration)}</span>
                  </div>
                </div>
              </div>

              {/* Script Display */}
              {showListeningScript && question?.listeningText && (
                <div className="mb-6">
                  <ScrollArea className="h-64 w-full border-2 border-teal-400/40 rounded-xl p-4 bg-teal-800/60">
                    <div className="text-white leading-relaxed whitespace-pre-wrap">
                      {question.listeningText}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  className="border-teal-400/60 text-teal-200 hover:bg-teal-800/60 bg-teal-800/40"
                  disabled
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                
                <Button
                  onClick={handleListeningComplete}
                  className="bg-teal-500 hover:bg-teal-400 text-white px-8 py-3 font-semibold shadow-lg"
                  data-testid="button-continue-question"
                >
                  Continue to Question
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question Phase */}
        {currentPhase === 'question' && (
          <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl bg-teal-500/40">
                    <Volume2 className="h-8 w-8 text-teal-200" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Question</h2>
                <p className="text-teal-200 mb-6">Listen to the question carefully</p>
                
                <div className="bg-teal-800/60 border-2 border-teal-400/40 rounded-xl p-8 mb-6">
                  <p className="text-xl text-white leading-relaxed">{question?.questionText}</p>
                </div>
                
                {isAudioPlaying && (
                  <div className="flex items-center justify-center space-x-3 py-4">
                    <div className="animate-pulse flex items-center space-x-2">
                      <div className="w-2 h-6 bg-teal-300 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]"></div>
                      <div className="w-2 h-8 bg-teal-400 rounded-full animate-[pulse_0.5s_ease-in-out_0.1s_infinite]"></div>
                      <div className="w-2 h-5 bg-teal-300 rounded-full animate-[pulse_0.5s_ease-in-out_0.2s_infinite]"></div>
                      <div className="w-2 h-7 bg-teal-400 rounded-full animate-[pulse_0.5s_ease-in-out_0.3s_infinite]"></div>
                      <div className="w-2 h-4 bg-teal-300 rounded-full animate-[pulse_0.5s_ease-in-out_0.4s_infinite]"></div>
                    </div>
                    <span className="text-teal-200 font-medium ml-3">Reading question...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preparation Phase */}
        {currentPhase === 'preparation' && (
          <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl bg-teal-500/40">
                    <Clock className="h-8 w-8 text-teal-200" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Preparation Time</h2>
                <p className="text-teal-200 mb-6">Organize your thoughts for your response</p>
                
                <div className="mb-8">
                  <Timer
                    seconds={currentTimer}
                    isActive={isTimerActive}
                    onComplete={handlePreparationComplete}
                    label="Time Remaining"
                    showInBox
                  />
                </div>
                
                <div className="bg-teal-800/60 border-2 border-teal-400/40 rounded-xl p-6">
                  <p className="text-lg text-white mb-3">
                    <strong>Question:</strong> {question?.questionText}
                  </p>
                  <div className="text-sm text-teal-100 bg-teal-700/60 rounded-lg p-3 mt-4">
                    <p className="font-medium text-white">Tips:</p>
                    <ul className="list-disc list-inside text-left mt-2 space-y-1">
                      <li>Summarize the main points from the reading</li>
                      <li>Connect them with the lecture content</li>
                      <li>Structure your response clearly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Speaking Phase */}
        {currentPhase === 'speaking' && (
          <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className={`p-3 rounded-xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-teal-500/40'}`}>
                    <Mic className={`h-8 w-8 ${isRecording ? 'text-white' : 'text-teal-200'}`} />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Recording</h2>
                <p className="text-teal-200 mb-6">Speak your response clearly</p>
                
                <div className="mb-8">
                  <Timer
                    seconds={currentTimer}
                    isActive={isTimerActive}
                    onComplete={handleSpeakingComplete}
                    label="Time Remaining"
                    showInBox
                  />
                </div>
                
                <div className="flex items-center justify-center mb-6">
                  <div className={`p-6 rounded-full shadow-lg transition-all duration-300 ${isRecording ? 'bg-red-600 ring-4 ring-red-400 ring-opacity-50' : 'bg-teal-600'}`}>
                    <Mic className="h-12 w-12 text-white" />
                  </div>
                </div>
                
                {isRecording && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <p className="text-white font-semibold">Recording in progress...</p>
                    </div>
                    <p className="text-lg font-medium text-white">
                      {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                )}
                
                <div className="mt-6 bg-teal-800/60 border border-teal-400/40 rounded-lg p-4">
                  <p className="text-teal-100 text-sm">
                    Speak clearly and at a natural pace. Your response is being recorded.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Phase */}
        {currentPhase === 'review' && (
          <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-teal-500/40">
                  <CheckCircle className="h-6 w-6 text-teal-200" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Review Your Response</h2>
                  <p className="text-sm text-teal-200">Listen to your recording and get AI feedback</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {recordingBlob && (
                  <div className="bg-teal-800/60 border-2 border-teal-400/40 rounded-xl p-4">
                    <h3 className="font-semibold text-teal-200 mb-3">Your Recording</h3>
                    <div className="flex items-center space-x-4">
                      <audio controls className="flex-1" playsInline webkit-playsinline="true">
                        <source src={URL.createObjectURL(recordingBlob)} type="audio/wav" />
                        Your browser does not support the audio element.
                      </audio>
                      <Button
                        onClick={downloadRecording}
                        variant="outline"
                        size="sm"
                        className="border-teal-400 text-white hover:bg-teal-700 bg-teal-600"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-4">
                  <Button
                    onClick={() => recordingBlob && convertSpeechToText.mutate(recordingBlob)}
                    disabled={!recordingBlob || convertSpeechToText.isPending}
                    className="bg-teal-500 hover:bg-teal-400 text-white font-semibold"
                  >
                    {convertSpeechToText.isPending ? "Converting..." : "Convert to Text"}
                  </Button>
                  
                  <Button
                    onClick={() => {
                      if (transcript && question) {
                        generateFeedback.mutate({ transcript, question });
                      } else {
                        toast({
                          title: "Error",
                          description: "Please convert speech to text first.",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={!transcript || generateFeedback.isPending}
                    className="bg-teal-500 hover:bg-teal-400 text-white font-semibold"
                  >
                    {generateFeedback.isPending ? "피드백 생성 중..." : "인라이즈 피드백 받기"}
                  </Button>
                </div>
                
                {transcript && (
                  <div className="bg-teal-800/60 border-2 border-teal-400/40 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-teal-200">Transcript</h3>
                      <CopyToClipboardButton
                        text={transcript}
                        label="Copy"
                        className="border-teal-400 text-white hover:bg-teal-700 bg-teal-600"
                        dataTestId="button-copy-transcript-integrated"
                      />
                    </div>
                    <p className="text-white leading-relaxed">{transcript}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Phase */}
        {currentPhase === 'feedback' && (
          <div className="space-y-6">
            {/* Overall Assessment */}
            {overallAssessment && (
              <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-teal-200 mb-4">종합 평가</h2>
                  <div className="text-white leading-relaxed whitespace-pre-wrap">{overallAssessment}</div>
                </CardContent>
              </Card>
            )}

            {/* Scores Card */}
            {scores && (
              <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">AI 평가 점수 (TOEFL 통합형 스피킹 기준)</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-teal-800/60 border border-teal-400/40 rounded-lg">
                      <div className="text-3xl font-bold text-teal-200">{scores.delivery}/5</div>
                      <div className="text-sm text-teal-200 font-medium mt-2">Delivery (발음/유창성)</div>
                      <div className="text-xs text-teal-300/70 mt-1">발음, 억양, 속도</div>
                    </div>
                    <div className="text-center p-4 bg-teal-800/60 border border-teal-400/40 rounded-lg">
                      <div className="text-3xl font-bold text-green-300">{scores.languageUse}/5</div>
                      <div className="text-sm text-teal-200 font-medium mt-2">Language Use (언어 구사력)</div>
                      <div className="text-xs text-teal-300/70 mt-1">문법, 어휘</div>
                    </div>
                    <div className="text-center p-4 bg-teal-800/60 border border-teal-400/40 rounded-lg">
                      <div className="text-3xl font-bold text-pink-300">{scores.topicDevelopment}/5</div>
                      <div className="text-sm text-teal-200 font-medium mt-2">Topic Development (내용 전달)</div>
                      <div className="text-xs text-teal-300/70 mt-1">리딩/리스닝 정보 통합</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-teal-600 to-teal-500 -mx-6 -mb-6 p-6 rounded-b-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-semibold text-lg">예상 TOEFL Speaking 점수</div>
                        <div className="text-teal-100 text-sm mt-1">종합 점수: {scores.overall}/5</div>
                      </div>
                      <span className="font-bold text-white text-3xl">{scores.predictedToeflScore}/30</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Strengths */}
            {strengths && (
              <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-emerald-300 mb-4 flex items-center">
                    <span className="bg-emerald-500 text-white rounded-full p-2 mr-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    강점 (Strengths)
                  </h3>
                  <div className="text-white leading-relaxed whitespace-pre-wrap">{strengths}</div>
                </CardContent>
              </Card>
            )}

            {/* Areas for Improvement */}
            {areasForImprovement && (
              <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-amber-300 mb-4 flex items-center">
                    <span className="bg-amber-500 text-white rounded-full p-2 mr-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </span>
                    개선 영역 (Areas for Improvement)
                  </h3>
                  <div className="text-white leading-relaxed whitespace-pre-wrap">{areasForImprovement}</div>
                </CardContent>
              </Card>
            )}

            {/* Model Answer */}
            {modelAnswerScript && (
              <Card className="bg-teal-900/80 border-2 border-teal-500/40 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-teal-200 mb-4 flex items-center justify-between">
                    <span className="flex items-center">
                      <span className="bg-teal-500 text-white rounded-full p-2 mr-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      모범 답안 (Model Answer)
                    </span>
                    <CopyToClipboardButton
                      text={modelAnswerScript}
                      label="복사"
                      className="bg-teal-500 border-teal-400 text-white hover:bg-teal-400 text-sm px-3 py-1"
                      dataTestId="button-copy-model-answer"
                    />
                  </h3>
                  <div className="bg-teal-800/60 p-4 rounded-lg border border-teal-400/40 mb-4">
                    <div className="text-white leading-relaxed whitespace-pre-wrap font-mono text-sm">{modelAnswerScript}</div>
                  </div>
                  {modelAnswerAnalysis && (
                    <div className="mt-4 pt-4 border-t border-teal-400/40">
                      <h4 className="font-semibold text-teal-200 mb-2">모범 답안 분석</h4>
                      <div className="text-teal-100 leading-relaxed whitespace-pre-wrap text-sm">{modelAnswerAnalysis}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <Link href="/toefl-speaking">
                <Button className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 text-lg font-semibold shadow-lg">
                  <Home className="h-5 w-5 mr-2" />
                  스피킹 테스트 목록으로 돌아가기
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}