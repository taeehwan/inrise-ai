import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  createSafariCompatibleMediaRecorder,
  getBlobMimeType,
  unlockAudioContext 
} from "@/lib/safariAudioCompat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Volume2, VolumeX, Mic, MicOff, Home, ChevronRight, ChevronLeft, User, HeadphonesIcon, Play, Pause, Download, Award, Clock, ArrowLeft, BookOpen, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFullscreen } from "@/hooks/useFullscreen";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { Link, useLocation } from "wouter";
import CopyToClipboardButton from "@/components/CopyToClipboardButton";

// Full Screen Button Component
function FullScreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  return (
    <Button
      size="sm"
      onClick={toggleFullscreen}
      className="bg-purple-600 hover:bg-purple-700 text-white font-bold border-0 flex items-center gap-2 px-4 py-2 rounded-lg"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {isFullscreen ? (
        <>
          <Minimize className="h-4 w-4" />
          <span>Exit Full Screen</span>
        </>
      ) : (
        <>
          <Maximize className="h-4 w-4" />
          <span>Full Screen</span>
        </>
      )}
    </Button>
  );
}

type Phase = 'topics' | 'question' | 'reading' | 'listening' | 'preparation' | 'speaking' | 'review' | 'feedback';
type TestType = 'independent' | 'integrated' | 'full';

interface SpeakingQuestion {
  id: string;
  type: TestType;
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
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);
  
  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onCompleteRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  if (showInBox) {
    return (
      <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg">
        <div className="text-center">
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-lg font-semibold">00:{(timeLeft).toString().padStart(2, '0')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-semibold">00:{(timeLeft).toString().padStart(2, '0')}</div>
    </div>
  );
}

export default function TOEFLSpeaking() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isPro, membershipTier } = useAuth();
  
  // Fetch speaking topics from API
  const { data: allSpeakingTopics = [], isLoading: topicsLoading } = useQuery<any[]>({
    queryKey: ["/api/speaking/tests"],
    retry: false,
  });

  // Transform API data to match expected format
  const transformedTopics: SpeakingQuestion[] = allSpeakingTopics.map((topic: any) => ({
    id: topic.id,
    type: topic.type,
    title: topic.title,
    questionText: topic.questionText,
    readingPassage: topic.readingPassage,
    listeningText: topic.listeningScript,
    preparationTime: topic.preparationTime,
    responseTime: topic.responseTime,
    readingTime: topic.readingTime
  }));

  // Filter topics by type
  const independentQuestions = transformedTopics.filter(q => q.type === 'independent');
  const integratedQuestions = transformedTopics.filter(q => q.type === 'integrated');

  // States
  const [selectedSpeakingType, setSelectedSpeakingType] = useState<TestType | null>(null);
  const [selectedQuestionType, setSelectedQuestionType] = useState<TestType>('independent');
  const [availableQuestions, setAvailableQuestions] = useState<SpeakingQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<SpeakingQuestion | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase>('topics');
  
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
  const [currentAudioText, setCurrentAudioText] = useState("");
  
  // AI feedback states
  const [transcript, setTranscript] = useState("");
  const [overallAssessment, setOverallAssessment] = useState("");
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [modelAnswerScript, setModelAnswerScript] = useState("");
  const [modelAnswerAnalysis, setModelAnswerAnalysis] = useState("");
  const [scores, setScores] = useState<{
    coherence: number;
    clarity: number;
    logicalStructure: number;
    languageUse: number;
    pronunciation: number;
    overall: number;
    predictedToeflScore: number;
  } | null>(null);
  
  // Workflow states
  const [showPrepButton, setShowPrepButton] = useState(false);
  const [audioHasPlayed, setAudioHasPlayed] = useState(false);

  // Effects
  useEffect(() => {
    if (selectedQuestionType === 'independent') {
      setAvailableQuestions(independentQuestions);
    } else {
      setAvailableQuestions(integratedQuestions);
    }
  }, [selectedQuestionType, independentQuestions, integratedQuestions]);

  // Handlers
  const handleStartQuestion = (question: SpeakingQuestion) => {
    setSelectedQuestion(question);
    setShowPrepButton(false);
    setAudioHasPlayed(false);
    if (question.type === 'integrated') {
      setCurrentPhase('reading');
      setCurrentTimer(question.readingTime || 45);
      setIsTimerActive(true);
    } else {
      setCurrentPhase('question');
      // AI 음성으로 질문 읽기
      speakText(question.questionText, () => {
        setShowPrepButton(true);
        setAudioHasPlayed(true);
      });
    }
  };

  const goToNextPhase = () => {
    if (!selectedQuestion) return;
    
    switch (currentPhase) {
      case 'reading':
        setCurrentPhase('listening');
        setIsTimerActive(false);
        playListeningAudio();
        break;
      case 'listening':
        setCurrentPhase('preparation');
        setCurrentTimer(selectedQuestion.preparationTime);
        setIsTimerActive(true);
        break;
      case 'question':
        setCurrentPhase('preparation');
        setCurrentTimer(selectedQuestion.preparationTime);
        setIsTimerActive(true);
        break;
      case 'preparation':
        startSpeakingPhase();
        break;
      case 'speaking':
        stopRecording();
        setCurrentPhase('review');
        setIsTimerActive(false);
        // 자동으로 텍스트 변환 시작
        setTimeout(() => {
          if (recordingBlob) {
            speechToTextMutation.mutate(recordingBlob);
          }
        }, 1000);
        break;
      case 'review':
        setCurrentPhase('feedback');
        generateAIFeedback();
        break;
    }
  };

  const handlePhaseComplete = () => {
    // NO AUTO-ADVANCE: Timer expired but user must manually proceed
    // Do not automatically advance to next phase
  };

  const resetTest = () => {
    setCurrentPhase('topics');
    setSelectedQuestion(null);
    setIsTimerActive(false);
    setIsRecording(false);
    setRecordingBlob(null);
    setTranscript("");
    setOverallAssessment("");
    setStrengths("");
    setAreasForImprovement("");
    setModelAnswerScript("");
    setModelAnswerAnalysis("");
    setScores(null);
  };

  // AI 음성 및 beep 사운드 기능 (미국 원어민 발음)
  const speakText = (text: string, onComplete?: () => void) => {
    if (isMuted) {
      onComplete?.();
      return;
    }
    
    setIsAudioPlaying(true);
    setCurrentAudioText(text);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = volume[0] / 100;
    utterance.lang = 'en-US';
    
    // 미국 원어민 음성 우선 선택
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const americanVoices = voices.filter(voice => 
        voice.lang === 'en-US' && 
        (voice.name.includes('Microsoft Zira') || 
         voice.name.includes('Google US English') ||
         voice.name.includes('Alex') ||
         voice.name.includes('Samantha') ||
         voice.name.includes('David') ||
         voice.name.includes('Microsoft David') ||
         voice.name.includes('Karen') ||
         voice.localService === true)
      );
      
      const preferredVoice = americanVoices[0] || voices.find(voice => voice.lang === 'en-US');
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onend = () => {
        setIsAudioPlaying(false);
        setCurrentAudioText("");
        onComplete?.();
      };
      
      speechSynthesis.speak(utterance);
    };
    
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      loadVoices();
    }
  };

  const playBeepSound = async () => {
    if (isMuted) return;
    
    await unlockAudioContext();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // beep 주파수
    gainNode.gain.setValueAtTime(volume[0] / 100 * 0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const handlePrepButtonClick = () => {
    setShowPrepButton(false);
    speakText("Begin to prepare for your response after the beep.", () => {
      playBeepSound();
      setTimeout(() => {
        setCurrentPhase('preparation');
        setCurrentTimer(selectedQuestion?.preparationTime || 15);
        setIsTimerActive(true);
      }, 600); // beep 후 잠깐 대기
    });
  };

  const startSpeakingPhase = () => {
    speakText("Begin speaking after the beep.", () => {
      playBeepSound();
      setTimeout(() => {
        setCurrentPhase('speaking');
        setCurrentTimer(selectedQuestion?.responseTime || 45);
        setIsTimerActive(true);
        startRecording(); // 자동 녹음 시작
      }, 600);
    });
  };

  const playListeningAudio = () => {
    setIsAudioPlaying(true);
    // Simulate audio playback for 30 seconds
    setTimeout(() => {
      setIsAudioPlaying(false);
      goToNextPhase();
    }, 30000);
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

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blobType = getBlobMimeType();
        const blob = new Blob(chunks, { type: blobType });
        setRecordingBlob(blob);
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
        title: "Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  // State for speech metrics from audio analysis
  const [speechMetrics, setSpeechMetrics] = useState<any>(null);
  
  // AI Functions - 실제 OpenAI 구현 (Enhanced with audio analysis)
  const speechToTextMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('questionId', selectedQuestion?.id || '');
      formData.append('questionText', selectedQuestion?.questionText || '');
      formData.append('testType', selectedQuestion?.type || 'independent');
      
      // Use enhanced speech-to-text with audio analysis for pronunciation/speed/fluency metrics
      const response = await fetch('/api/speech-to-text-enhanced', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Speech to text conversion failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setTranscript(data.transcript || "음성 인식에 실패했습니다.");
      // Store speech metrics for feedback generation
      if (data.speechMetrics) {
        setSpeechMetrics(data.speechMetrics);
        console.log("🎤 Audio analysis complete:", data.speechMetrics);
      }
    },
    onError: (error) => {
      console.error('Speech to text error:', error);
      toast({
        title: "음성 변환 실패",
        description: "음성을 텍스트로 변환하는데 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/speaking-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: selectedQuestion?.id || '',
          questionText: selectedQuestion?.questionText || '',
          transcript: transcript,
          testType: selectedQuestion?.type || 'independent',
          speechMetrics: speechMetrics // Include audio analysis for accurate Delivery scoring
        })
      });
      
      if (!response.ok) {
        throw new Error('Feedback generation failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // New feedback structure from backend
      setOverallAssessment(data.overallAssessment || "종합 평가를 생성할 수 없습니다.");
      setStrengths(data.strengths || "강점 분석을 생성할 수 없습니다.");
      setAreasForImprovement(data.areasForImprovement || "개선 영역을 생성할 수 없습니다.");
      setModelAnswerScript(data.modelAnswerScript || "모범 답안을 생성할 수 없습니다.");
      setModelAnswerAnalysis(data.modelAnswerAnalysis || "모범 답안 분석을 생성할 수 없습니다.");
      
      // Scores are already adjusted on the backend (+1.0 for coherence/logicalStructure/languageUse, +1.5 for pronunciation)
      // Just use them directly without additional frontend adjustments
      if (data.scores) {
        setScores({
          coherence: data.scores.coherence,
          clarity: data.scores.clarity,
          logicalStructure: data.scores.logicalStructure,
          languageUse: data.scores.languageUse,
          pronunciation: data.scores.pronunciation,
          overall: data.scores.overall,
          predictedToeflScore: data.scores.predictedToeflScore
        });
      } else {
        setScores(null);
      }
    },
    onError: (error) => {
      console.error('Feedback error:', error);
      toast({
        title: "피드백 생성 실패",
        description: "인라이즈 피드백 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  // Convert speech to text only
  const convertSpeechToText = () => {
    if (recordingBlob) {
      speechToTextMutation.mutate(recordingBlob);
    }
  };

  // Generate AI feedback with TOEFL scoring
  const generateAIFeedback = () => {
    if (transcript) {
      feedbackMutation.mutate();
      // Keep current phase - don't switch to feedback view
    }
  };

  // 녹음 파일 MP3로 다운로드 기능
  const downloadRecording = async () => {
    if (!recordingBlob) return;
    
    try {
      // Convert WebM to MP3 using server
      const formData = new FormData();
      formData.append('audio', recordingBlob, 'recording.webm');
      
      const response = await fetch('/api/convert-audio-mp3', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const mp3Blob = await response.blob();
        const url = URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `toefl-speaking-${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Conversion failed');
      }
    } catch (error) {
      // Fallback to original format if conversion fails
      const url = URL.createObjectURL(recordingBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `toefl-speaking-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Topic Selection Screen - Two-step card-based navigation (matching Writing style)
  if (currentPhase === 'topics') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-800 via-purple-900 to-indigo-950">
        {/* Header */}
        <div className="bg-purple-950/80 backdrop-blur-sm border-b border-purple-700/50 text-white p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-xl tracking-wide">TOEFL Speaking</span>
                <p className="text-purple-300 text-xs">Practice your speaking skills</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <FullScreenButton />
              <Button variant="ghost" size="sm" className="text-purple-200 hover:text-white hover:bg-white/10 text-sm" asChild>
                <Link href="/tests">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Tests
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Loading State */}
          {topicsLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-6" />
              <p className="text-purple-200 text-lg">Loading speaking topics...</p>
            </div>
          )}

          {/* Main Type Selection - Show when no type selected */}
          {!topicsLoading && transformedTopics.length > 0 && !selectedSpeakingType && (
            <div className="py-12">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">유형을 선택하세요</h2>
                <p className="text-purple-200 text-lg">원하는 Speaking 유형을 클릭하여 문제 목록을 확인하세요</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* Full Test Card */}
                <div 
                  onClick={() => setSelectedSpeakingType('full' as TestType)}
                  className="group cursor-pointer"
                  data-testid="card-speaking-full-test"
                >
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-purple-400/30 hover:border-purple-400 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.02] h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <Mic className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white text-center mb-2">Full Test</h3>
                    <p className="text-purple-200 text-center text-sm mb-4">
                      실제 시험처럼<br />전체 문제를 순서대로 풀기
                    </p>
                    <div className="flex flex-col items-center gap-2 text-purple-300 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        전체 소요: 약 17분
                      </span>
                      <span className="bg-purple-400/30 px-3 py-1 rounded-full">
                        {transformedTopics.length}개 문제
                      </span>
                    </div>
                  </div>
                </div>

                {/* Independent Speaking Card */}
                <div 
                  onClick={() => setSelectedSpeakingType('independent')}
                  className="group cursor-pointer"
                  data-testid="card-speaking-independent"
                >
                  <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-teal-400/30 hover:border-teal-400 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/20 hover:scale-[1.02] h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white text-center mb-2">Independent Task</h3>
                    <p className="text-teal-200 text-center text-sm mb-4">
                      주어진 주제에 대해<br />자신의 의견을 말하는 문제
                    </p>
                    <div className="flex flex-col items-center gap-2 text-teal-300 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        15초 준비 / 45초 답변
                      </span>
                      <span className="bg-teal-400/30 px-3 py-1 rounded-full">
                        {independentQuestions.length}개 문제
                      </span>
                    </div>
                  </div>
                </div>

                {/* Integrated Speaking Card */}
                <div 
                  onClick={() => setSelectedSpeakingType('integrated')}
                  className="group cursor-pointer"
                  data-testid="card-speaking-integrated"
                >
                  <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-emerald-400/30 hover:border-emerald-400 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 hover:scale-[1.02] h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <HeadphonesIcon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white text-center mb-2">Integrated Task</h3>
                    <p className="text-emerald-200 text-center text-sm mb-4">
                      Reading + Listening 후<br />내용을 요약하여 말하는 문제
                    </p>
                    <div className="flex flex-col items-center gap-2 text-emerald-300 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        30초 준비 / 60초 답변
                      </span>
                      <span className="bg-emerald-400/30 px-3 py-1 rounded-full">
                        {integratedQuestions.length}개 문제
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Test List - Show when type is selected */}
          {!topicsLoading && transformedTopics.length > 0 && selectedSpeakingType && (
            <div className="py-8">
              {/* Back Button */}
              <Button 
                onClick={() => setSelectedSpeakingType(null)}
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
                data-testid="button-back-to-categories"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                유형 선택으로 돌아가기
              </Button>

              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  selectedSpeakingType === 'full' 
                    ? 'bg-gradient-to-br from-purple-400 to-pink-400'
                    : selectedSpeakingType === 'independent' 
                      ? 'bg-gradient-to-br from-teal-400 to-cyan-400' 
                      : 'bg-gradient-to-br from-emerald-400 to-green-400'
                }`}>
                  {selectedSpeakingType === 'full' 
                    ? <Mic className="h-7 w-7 text-white" />
                    : selectedSpeakingType === 'independent' 
                      ? <User className="h-7 w-7 text-white" />
                      : <HeadphonesIcon className="h-7 w-7 text-white" />
                  }
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    {selectedSpeakingType === 'full' 
                      ? '전체 테스트' 
                      : selectedSpeakingType === 'independent' 
                        ? '독립형 문제' 
                        : '통합형 문제'}
                  </h2>
                  <p className="text-purple-200">
                    {selectedSpeakingType === 'full'
                      ? '실제 시험처럼 전체 문제를 순서대로 풀기'
                      : selectedSpeakingType === 'independent' 
                        ? '주제에 대한 의견 말하기 (15초 준비 / 45초 답변)' 
                        : 'Reading + Listening 후 요약 말하기 (30초 준비 / 60초 답변)'}
                  </p>
                </div>
              </div>

              {/* Test List */}
              <div className="space-y-4">
                {(selectedSpeakingType === 'full' 
                  ? transformedTopics 
                  : selectedSpeakingType === 'independent' 
                    ? independentQuestions 
                    : integratedQuestions
                ).map((question, index) => (
                  <div 
                    key={question.id}
                    onClick={() => handleStartQuestion(question)}
                    className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group ${
                      selectedSpeakingType === 'full'
                        ? 'hover:shadow-purple-500/10'
                        : selectedSpeakingType === 'independent' 
                          ? 'hover:shadow-teal-500/10' 
                          : 'hover:shadow-emerald-500/10'
                    } hover:shadow-xl`}
                    data-testid={`card-speaking-test-${question.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                          selectedSpeakingType === 'full'
                            ? 'bg-purple-500/30 text-purple-300'
                            : selectedSpeakingType === 'independent' 
                              ? 'bg-teal-500/30 text-teal-300' 
                              : 'bg-emerald-500/30 text-emerald-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold text-lg group-hover:text-white/90">
                              {question.title}
                            </h3>
                            {selectedSpeakingType === 'full' && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                question.type === 'independent' 
                                  ? 'bg-teal-500/30 text-teal-300' 
                                  : 'bg-emerald-500/30 text-emerald-300'
                              }`}>
                                {question.type === 'independent' ? 'Independent' : 'Integrated'}
                              </span>
                            )}
                          </div>
                          <p className="text-purple-300 text-sm mt-1 line-clamp-2">
                            {question.questionText}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-purple-400">
                            <span>준비: {question.preparationTime}초</span>
                            <span>답변: {question.responseTime}초</span>
                            {question.readingTime && <span>읽기: {question.readingTime}초</span>}
                          </div>
                        </div>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedSpeakingType === 'full'
                          ? 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white'
                          : selectedSpeakingType === 'independent'
                            ? 'bg-teal-500/20 text-teal-400 group-hover:bg-teal-500 group-hover:text-white'
                            : 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                      } transition-all`}>
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {(selectedSpeakingType === 'full' 
                ? transformedTopics 
                : selectedSpeakingType === 'independent' 
                  ? independentQuestions 
                  : integratedQuestions
              ).length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mic className="h-10 w-10 text-purple-400" />
                  </div>
                  <p className="text-purple-300 text-lg">
                    {selectedSpeakingType === 'full' 
                      ? '전체 테스트' 
                      : selectedSpeakingType === 'independent' 
                        ? '독립형' 
                        : '통합형'} 문제가 아직 없습니다
                  </p>
                  <p className="text-purple-400 text-sm mt-2">관리자에게 문의하세요</p>
                </div>
              )}
            </div>
          )}

          {/* No Tests Available */}
          {!topicsLoading && transformedTopics.length === 0 && (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <Mic className="h-12 w-12 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">문제가 없습니다</h3>
              <p className="text-purple-300 mb-8">관리자에게 Speaking 문제 추가를 요청하세요</p>
              <Button asChild variant="outline" className="border-purple-400 text-purple-300 hover:bg-purple-500/20">
                <Link href="/tests">돌아가기</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Test Interface - Authentic TOEFL Design
  return (
    <FullscreenWrapper className="min-h-screen bg-gradient-to-b from-purple-700 via-purple-800 to-purple-900">
      {/* Header with Volume and Navigation Controls */}
      <div className="bg-purple-900 text-white p-3" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-white font-semibold text-lg">TOEFL Speaking</span>
            
            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/10 p-1"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <div className="w-20">
                <Slider
                  value={isMuted ? [0] : volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="w-full [&_[role=slider]]:border-purple-300 [&_[role=slider]]:bg-purple-600 [&>span]:bg-purple-300/30 [&>span>span]:bg-purple-300"
                />
              </div>
            </div>
          </div>
          
          {/* Navigation Buttons - 우측 상단 */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/10 text-sm px-3 py-1"
              onClick={resetTest}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/10 text-sm px-3 py-1"
              onClick={goToNextPhase}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-white min-h-[500px]" style={{ fontFamily: 'Arial, sans-serif' }}>
          <CardContent className="p-8">
            
            {/* Question Phase */}
            {currentPhase === 'question' && selectedQuestion?.type === 'independent' && (
              <div className="text-center space-y-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="flex justify-center mb-8">
                  <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-16 w-16 text-blue-600" />
                  </div>
                </div>
                
                <div className="space-y-6">
                  <p className="text-lg leading-relaxed px-8" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {selectedQuestion.questionText}
                  </p>
                  
                  {/* 음성 재생 상태 표시 */}
                  {isAudioPlaying && (
                    <div className="flex justify-center">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center space-x-2" style={{ fontFamily: 'Arial, sans-serif' }}>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>AI 음성 재생 중...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Prep 버튼 */}
                  {showPrepButton && audioHasPlayed && (
                    <div className="flex justify-center">
                      <Button
                        onClick={handlePrepButtonClick}
                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                      >
                        Prep
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reading Phase */}
            {currentPhase === 'reading' && (
              <div className="space-y-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold" style={{ fontFamily: 'Arial, sans-serif' }}>Reading Time</h2>
                  <Timer
                    seconds={currentTimer}
                    isActive={isTimerActive}
                    onComplete={handlePhaseComplete}
                    label="Time Remaining"
                    showInBox={true}
                  />
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
                  <h3 className="font-bold text-lg mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>University Should Pave Running Trails</h3>
                  <div className="text-sm leading-relaxed whitespace-pre-line" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {selectedQuestion?.readingPassage}
                  </div>
                </div>
              </div>
            )}

            {/* Listening Phase */}
            {currentPhase === 'listening' && (
              <div className="text-center space-y-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="flex justify-center mb-8">
                  <img 
                    src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM2MzY2RjEiIHJ4PSI4Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTA1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0Ij5UYWxraW5nIFN0dWRlbnRzPC90ZXh0Pgo8L3N2Zz4K"
                    alt="Students talking" 
                    className="rounded-lg shadow-lg w-64 h-40"
                  />
                </div>
                
                <div className="space-y-4">
                  {isAudioPlaying && (
                    <div className="flex justify-center">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center space-x-2" style={{ fontFamily: 'Arial, sans-serif' }}>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <span>Audio Playing</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preparation Phase */}
            {currentPhase === 'preparation' && (
              <div className="text-center space-y-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>Prepare your response</h2>
                
                <div className="flex justify-center mb-6">
                  <Timer
                    seconds={currentTimer}
                    isActive={isTimerActive}
                    onComplete={handlePhaseComplete}
                    label="Preparation time"
                    showInBox={true}
                  />
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
                  <p className="text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {selectedQuestion?.questionText}
                  </p>
                </div>
              </div>
            )}

            {/* Speaking Phase */}
            {currentPhase === 'speaking' && (
              <div className="text-center space-y-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>Recording</h2>
                
                <div className="flex justify-center mb-6">
                  <Timer
                    seconds={currentTimer}
                    isActive={isTimerActive}
                    onComplete={handlePhaseComplete}
                    label="Recording time"
                    showInBox={true}
                  />
                </div>
                
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                      isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100'
                    }`}>
                      <Mic className={`h-12 w-12 ${isRecording ? 'text-red-600' : 'text-gray-600'}`} />
                    </div>
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={startRecording}
                      disabled={isRecording}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      {isRecording ? 'Recording...' : 'Start Recording'}
                    </Button>
                    
                    <Button
                      onClick={stopRecording}
                      disabled={!isRecording}
                      variant="outline"
                    >
                      <MicOff className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  </div>
                  
                  {isRecording && (
                    <p className="text-sm text-gray-600" style={{ fontFamily: 'Arial, sans-serif' }}>
                      Recording will automatically stop when time expires
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Review Phase */}
            {currentPhase === 'review' && (
              <div className="space-y-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                <h2 className="text-xl font-semibold text-center mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>Response Complete</h2>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Your Response:</h3>
                    {recordingBlob && (
                      <Button
                        onClick={downloadRecording}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </Button>
                    )}
                  </div>
                  
                  {recordingBlob && (
                    <audio controls className="w-full mb-4" playsInline webkit-playsinline="true">
                      <source src={URL.createObjectURL(recordingBlob)} type="audio/wav" />
                    </audio>
                  )}
                  
                  {speechToTextMutation.isPending && (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">음성을 텍스트로 변환 중...</p>
                    </div>
                  )}
                  
                  {transcript && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">음성 텍스트 변환:</h4>
                        <CopyToClipboardButton
                          text={transcript}
                          label="Copy"
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white border-none"
                          dataTestId="button-copy-transcript-legacy"
                        />
                      </div>
                      <p className="text-sm bg-white p-3 rounded border">{transcript}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center space-x-4">
                  <Button 
                    onClick={convertSpeechToText} 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!recordingBlob || speechToTextMutation.isPending}
                  >
                    {speechToTextMutation.isPending ? 'Script 변환 중...' : 'Script 변환'}
                  </Button>
                  <div className="relative group">
                    <Button 
                      onClick={() => {
                        if (!isPro) {
                          toast({
                            title: "🔒 PRO 등급 필요",
                            description: "인라이즈 피드백 기능은 PRO 이상 회원만 이용 가능합니다.",
                            variant: "destructive",
                          });
                          return;
                        }
                        generateAIFeedback();
                      }}
                      className={`${isPro ? 'bg-slate-800 hover:bg-slate-900 text-yellow-400 hover:text-yellow-300' : 'bg-gray-400 text-gray-100 cursor-not-allowed'}`}
                      disabled={!transcript || feedbackMutation.isPending}
                    >
                      {feedbackMutation.isPending ? '피드백 생성 중...' : '피드백 받기'}
                      {!isPro && <span className="ml-2 text-xs">🔒 PRO</span>}
                    </Button>
                    {!isPro && (
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap">
                          PRO 등급 이상 필요
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button onClick={resetTest} variant="outline">
                    다시 시작
                  </Button>
                </div>
                
                {/* Upgrade Notice for Free Users */}
                {!isPro && transcript && (
                  <div className="mt-6 bg-gradient-to-r from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl p-6 text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
                        <Award className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-teal-900 mb-2">
                      PRO 회원 혜택으로 인라이즈 피드백을 받아보세요!
                    </h3>
                    <p className="text-teal-700 mb-4">
                      • AI 상세 피드백 및 점수 분석<br/>
                      • 모범답안 스크립트 제공<br/>
                      • 무제한 AI 음성 변환
                    </p>
                    <p className="text-sm text-teal-600 mb-4">현재 등급: <span className="font-bold uppercase">{membershipTier}</span></p>
                    <Button 
                      onClick={() => setLocation('/subscription')}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-lg font-bold"
                    >
                      PRO로 업그레이드 →
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Phase */}
            {currentPhase === 'feedback' && (
              <div className="space-y-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                <h2 className="text-xl font-semibold text-center mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>인라이즈 피드백</h2>
                
                {feedbackMutation.isPending && (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">피드백 생성 중...</p>
                  </div>
                )}
                
                {overallAssessment && (
                  <div className="space-y-4">
                    {/* Score Card */}
                    {scores && (
                      <div className="bg-slate-50 p-6 rounded-lg border-2 border-slate-200">
                        <h3 className="font-semibold mb-4 text-slate-800" style={{ fontFamily: 'Arial, sans-serif' }}>📊 TOEFL 공식 채점표 결과</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">개연성 (Coherence)</span>
                              <span className="font-bold text-blue-600">{scores.coherence.toFixed(1)}/5</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">명확성 (Clarity)</span>
                              <span className="font-bold text-blue-600">{scores.clarity.toFixed(1)}/5</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">논리구조 (Logical Structure)</span>
                              <span className="font-bold text-blue-600">{scores.logicalStructure.toFixed(1)}/5</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">언어구사 (Language Use)</span>
                              <span className="font-bold text-blue-600">{scores.languageUse.toFixed(1)}/5</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">발음 (Pronunciation)</span>
                              <span className="font-bold text-blue-600">{scores.pronunciation.toFixed(1)}/5</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="font-semibold">전체 점수 (Overall)</span>
                              <span className="font-bold text-green-600 text-lg">{scores.overall.toFixed(1)}/5</span>
                            </div>
                            <div className="flex justify-between bg-teal-50 -mx-6 -mb-6 mt-4 p-4 rounded-b-lg border-t-2 border-teal-300">
                              <span className="font-bold text-teal-900">예상 TOEFL Speaking 점수</span>
                              <span className="font-bold text-teal-700 text-xl">{scores.predictedToeflScore}/30</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 1. Overall Assessment (종합 평가) */}
                    <div className="bg-indigo-50 p-6 rounded-lg border-2 border-indigo-200">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-indigo-800" style={{ fontFamily: 'Arial, sans-serif' }}>📊 종합 평가 (Overall Assessment)</h3>
                        <CopyToClipboardButton text={overallAssessment} />
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-line" style={{ fontFamily: 'Arial, sans-serif' }}>{overallAssessment}</div>
                    </div>
                    
                    {/* 2. Strengths (강점) */}
                    <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-green-800" style={{ fontFamily: 'Arial, sans-serif' }}>✅ 강점 (Strengths in the Response)</h3>
                        <CopyToClipboardButton text={strengths} />
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-line" style={{ fontFamily: 'Arial, sans-serif' }}>{strengths}</div>
                    </div>
                    
                    {/* 3. Areas for Improvement (개선 영역) */}
                    <div className="bg-amber-50 p-6 rounded-lg border-2 border-amber-200">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-amber-800" style={{ fontFamily: 'Arial, sans-serif' }}>💡 개선 영역 (Areas for Improvement)</h3>
                        <CopyToClipboardButton text={areasForImprovement} />
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-line" style={{ fontFamily: 'Arial, sans-serif' }}>{areasForImprovement}</div>
                    </div>
                    
                    {/* 4. Model Answer Script (모범 답안 스크립트) */}
                    {modelAnswerScript && (
                      <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-blue-800" style={{ fontFamily: 'Arial, sans-serif' }}>✨ 모범 답안 (Model Answer Script)</h3>
                          <CopyToClipboardButton text={modelAnswerScript} />
                        </div>
                        <div className="text-sm leading-relaxed whitespace-pre-line bg-white p-4 rounded border border-blue-300" style={{ fontFamily: 'Arial, sans-serif' }}>{modelAnswerScript}</div>
                      </div>
                    )}
                    
                    {/* 5. Model Answer Analysis (모범 답안 분석) */}
                    {modelAnswerAnalysis && (
                      <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-purple-800" style={{ fontFamily: 'Arial, sans-serif' }}>🔍 모범 답안 분석 (Model Answer Analysis)</h3>
                          <CopyToClipboardButton text={modelAnswerAnalysis} />
                        </div>
                        <div className="text-sm leading-relaxed whitespace-pre-line" style={{ fontFamily: 'Arial, sans-serif' }}>{modelAnswerAnalysis}</div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-center space-x-4">
                  <Button onClick={resetTest} className="bg-blue-600 hover:bg-blue-700 text-white">
                    다른 문제 풀기
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">진행 상황 보기</Link>
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </FullscreenWrapper>
  );
}
