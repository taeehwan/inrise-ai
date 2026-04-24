import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Volume2, VolumeX, Mic, MicOff, Home, ChevronRight, ChevronLeft, User, HeadphonesIcon, Play, Pause, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useRoute } from "wouter";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import CopyToClipboardButton from "@/components/CopyToClipboardButton";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext,
  createSafariCompatibleMediaRecorder,
  getSupportedMimeType
} from "@/lib/safariAudioCompat";

type Phase = 'topics' | 'question' | 'reading' | 'listening' | 'preparation' | 'speaking' | 'review' | 'feedback';
type TestType = 'independent' | 'integrated';

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

export default function TOEFLSpeakingNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get test ID from URL
  const [, params] = useRoute("/toefl-speaking-new/:id");
  const testId = params?.id;
  
  // Fetch speaking topics from API
  const { data: allSpeakingTopics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ["/api/speaking/tests"],
    retry: false,
  });

  // Transform API data to match expected format
  const transformedTopics: SpeakingQuestion[] = (allSpeakingTopics as any[]).map((topic: any) => ({
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
  const [selectedQuestionType, setSelectedQuestionType] = useState<TestType>('independent');
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
  
  // AI feedback states - Updated to use official ETS TOEFL Speaking criteria
  const [transcript, setTranscript] = useState("");
  const [overallAssessment, setOverallAssessment] = useState("");
  const [deliveryFeedback, setDeliveryFeedback] = useState<{ score: number; feedback: string } | null>(null);
  const [languageUseFeedback, setLanguageUseFeedback] = useState<{ score: number; feedback: string } | null>(null);
  const [topicDevelopmentFeedback, setTopicDevelopmentFeedback] = useState<{ score: number; feedback: string } | null>(null);
  const [sentenceBysentenceFeedback, setSentenceBysentenceFeedback] = useState<Array<{ original: string; corrected: string; explanation: string }>>([]);
  const [improvedModelAnswer, setImprovedModelAnswer] = useState("");
  const [scores, setScores] = useState<{
    delivery: number;
    languageUse: number;
    topicDevelopment: number;
    overall: number;
    predictedToeflScore: number;
  } | null>(null);
  
  // Workflow states
  const [showPrepButton, setShowPrepButton] = useState(false);
  const [audioHasPlayed, setAudioHasPlayed] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // Auto-start test when ID is in URL and data is loaded
  useEffect(() => {
    if (testId && transformedTopics.length > 0 && !hasAutoStarted && !topicsLoading) {
      const targetQuestion = transformedTopics.find(q => q.id === testId);
      if (targetQuestion) {
        setHasAutoStarted(true);
        setSelectedQuestion(targetQuestion);
        setShowPrepButton(false);
        setAudioHasPlayed(false);
        if (targetQuestion.type === 'integrated') {
          setCurrentPhase('reading');
          setCurrentTimer(targetQuestion.readingTime || 45);
          setIsTimerActive(true);
        } else {
          setCurrentPhase('question');
        }
      }
    }
  }, [testId, transformedTopics, hasAutoStarted, topicsLoading]);

  // Update available questions when question type changes
  const availableQuestions = useMemo(() => {
    if (selectedQuestionType === 'independent') {
      return independentQuestions;
    } else {
      return integratedQuestions;
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
    goToNextPhase();
  };

  const resetTest = () => {
    setCurrentPhase('topics');
    setSelectedQuestion(null);
    setIsTimerActive(false);
    setIsRecording(false);
    setRecordingBlob(null);
    setTranscript("");
    setOverallAssessment("");
    setDeliveryFeedback(null);
    setLanguageUseFeedback(null);
    setTopicDevelopmentFeedback(null);
    setSentenceBysentenceFeedback([]);
    setImprovedModelAnswer("");
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

  // Play audio when auto-started for independent questions
  useEffect(() => {
    if (hasAutoStarted && currentPhase === 'question' && selectedQuestion && selectedQuestion.type === 'independent' && !audioHasPlayed) {
      speakText(selectedQuestion.questionText, () => {
        setShowPrepButton(true);
        setAudioHasPlayed(true);
      });
    }
  }, [hasAutoStarted, currentPhase, selectedQuestion, audioHasPlayed]);

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

  // Recording functions
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
      const mimeType = getSupportedMimeType();

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blobType = mimeType.includes('mp4') ? 'audio/mp4' : 
                         mimeType.includes('ogg') ? 'audio/ogg' : 
                         mimeType.includes('wav') ? 'audio/wav' : 'audio/webm';
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

  // AI Functions - 실제 OpenAI 구현
  const speechToTextMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('questionId', selectedQuestion?.id || '');
      formData.append('questionText', selectedQuestion?.questionText || '');
      formData.append('testType', selectedQuestion?.type || 'independent');
      
      const response = await fetch('/api/speech-to-text', {
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
      const response = await fetch('/api/speaking/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: selectedQuestion?.id || '',
          questionText: selectedQuestion?.questionText || '',
          transcript: transcript,
          testType: selectedQuestion?.type || 'independent'
        })
      });
      
      if (!response.ok) {
        throw new Error('Feedback generation failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Set overall assessment with fallback
      setOverallAssessment(data.overallAssessment || "종합 평가를 생성할 수 없습니다.");
      
      // Set criterion-specific feedback (ETS official 3 criteria) with safe defaults
      setDeliveryFeedback({
        score: data.delivery?.score ?? 2,
        feedback: data.delivery?.feedback || "피드백을 생성할 수 없습니다."
      });
      setLanguageUseFeedback({
        score: data.languageUse?.score ?? 2,
        feedback: data.languageUse?.feedback || "피드백을 생성할 수 없습니다."
      });
      setTopicDevelopmentFeedback({
        score: data.topicDevelopment?.score ?? 2,
        feedback: data.topicDevelopment?.feedback || "피드백을 생성할 수 없습니다."
      });
      
      // Set sentence-by-sentence feedback (safely filter valid entries)
      const validSentences = Array.isArray(data.sentenceBysentenceFeedback) 
        ? data.sentenceBysentenceFeedback.filter((item: any) => item?.original && item?.corrected)
        : [];
      setSentenceBysentenceFeedback(validSentences);
      
      // Set improved model answer with fallback
      setImprovedModelAnswer(data.improvedModelAnswer || "모범 답안을 생성할 수 없습니다. 다시 시도해주세요.");
      
      // Set scores (0-4 scale based on ETS rubric) with safe defaults
      const deliveryScore = data.scores?.delivery ?? data.delivery?.score ?? 2;
      const languageUseScore = data.scores?.languageUse ?? data.languageUse?.score ?? 2;
      const topicDevelopmentScore = data.scores?.topicDevelopment ?? data.topicDevelopment?.score ?? 2;
      const overallScore = data.scores?.overall ?? ((deliveryScore + languageUseScore + topicDevelopmentScore) / 3);
      const predictedScore = data.scores?.predictedToeflScore ?? Math.round(overallScore * 7.5);
      
      setScores({
        delivery: deliveryScore,
        languageUse: languageUseScore,
        topicDevelopment: topicDevelopmentScore,
        overall: Math.round(overallScore * 10) / 10,
        predictedToeflScore: predictedScore
      });
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

  // Topic Selection Screen
  if (currentPhase === 'topics') {
    return (
      <SecurityWrapper 
        watermark="iNRISE TOEFL SPEAKING TEST"
        disableRightClick={true}
        disableKeyboardShortcuts={true}
        disableTextSelection={true}
        disableScreenshot={true}
        showSecurityNotice={true}
      >
        <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-teal-500 text-white p-3" style={{ fontFamily: 'Arial, sans-serif' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-white font-bold text-xl tracking-wider" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>TOEFL SPEAKING</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-teal-600 text-sm" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Help</Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-teal-600 text-sm" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}} asChild>
                <Link href="/tests">Back</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto p-6">
          <Card className="bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <h1 className="text-3xl font-bold text-navy-900 mb-4" style={{fontFamily: 'Arial, sans-serif'}}>어떤 스피킹 문제를 연습하시겠어요?</h1>
                <p className="text-navy-700 text-lg mb-8" style={{fontFamily: 'Arial, sans-serif'}}>연습하고 싶은 스피킹 문제 유형을 선택해주세요</p>
                
                <div className="flex justify-center space-x-8">
                  <Button
                    variant={selectedQuestionType === 'independent' ? 'default' : 'outline'}
                    onClick={() => setSelectedQuestionType('independent')}
                    className="px-12 py-6 text-lg font-semibold min-w-[200px] h-16 bg-teal-500 hover:bg-teal-600 text-white border-teal-300"
                    style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                  >
                    독립형 스피킹 (Independent)
                  </Button>
                  <Button
                    variant={selectedQuestionType === 'integrated' ? 'default' : 'outline'}
                    onClick={() => setSelectedQuestionType('integrated')}
                    className="px-12 py-6 text-lg font-semibold min-w-[200px] h-16 bg-white hover:bg-teal-50 text-teal-600 border-teal-300"
                    style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                  >
                    통합형 스피킹 (Integrated)
                  </Button>
                </div>

                <div className="space-y-4 mt-8">
                  {topicsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
                      <p className="text-navy-600" style={{fontFamily: 'Arial, sans-serif'}}>Loading speaking topics...</p>
                    </div>
                  ) : availableQuestions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-navy-600" style={{fontFamily: 'Arial, sans-serif'}}>{selectedQuestionType === 'independent' ? '독립형' : '통합형'} 스피킹 문제가 없습니다. 관리자에게 문의해서 토픽을 추가해주세요.</p>
                      <p className="text-sm text-navy-500 mt-2" style={{fontFamily: 'Arial, sans-serif'}}>admin@inrise.com으로 로그인하여 Speaking 관리 메뉴에서 토픽을 추가할 수 있습니다.</p>
                      {selectedQuestionType === 'integrated' && (
                        <div className="mt-4">
                          <Button 
                            onClick={() => setLocation('/toefl-speaking-integrated-demo')}
                            className="bg-teal-500 hover:bg-teal-600 text-white"
                            style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                          >
                            통합형 스피킹 데모 테스트
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    availableQuestions.map((question, index) => (
                      <Card key={question.id} className="p-6 hover:bg-teal-50 cursor-pointer transition-colors border-teal-200"
                            onClick={() => {
                              if (question.type === 'integrated') {
                                setLocation(`/toefl-speaking-integrated/${question.id}`);
                              } else {
                                handleStartQuestion(question);
                              }
                            }}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 text-left">
                            <h3 className="font-semibold text-lg mb-2 text-teal-700" style={{fontFamily: 'Arial, sans-serif'}}>Question {index + 1}: {question.title}</h3>
                            <p className="text-navy-600 text-sm mb-3" style={{fontFamily: 'Arial, sans-serif'}}>{question.questionText}</p>
                            <div className="flex items-center space-x-4 text-sm text-navy-500" style={{fontFamily: 'Arial, sans-serif'}}>
                              <span>Prep: {question.preparationTime}s</span>
                              <span>Response: {question.responseTime}s</span>
                              {question.readingTime && <span>Reading: {question.readingTime}s</span>}
                            </div>
                          </div>
                        <div className="flex items-center">
                          {question.type === 'independent' ? (
                            <User className="h-8 w-8 text-blue-600" />
                          ) : (
                            <HeadphonesIcon className="h-8 w-8 text-green-600" />
                          )}
                        </div>
                      </div>
                    </Card>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </SecurityWrapper>
    );
  }

  // Main Test Interface - Authentic TOEFL Design
  return (
    <SecurityWrapper 
      watermark="iNRISE TOEFL SPEAKING TEST"
      disableRightClick={true}
      disableKeyboardShortcuts={true}
      disableTextSelection={true}
      disableScreenshot={true}
      showSecurityNotice={true}
    >
      <div className="min-h-screen bg-white">
      {/* Header with Volume and Navigation Controls */}
      <div className="bg-teal-500 text-white p-3" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-white font-bold text-xl tracking-wider" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>TOEFL SPEAKING</span>
            
            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-teal-600 p-1"
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
                  className="w-full [&_[role=slider]]:border-white [&_[role=slider]]:bg-teal-600 [&>span]:bg-white/30 [&>span>span]:bg-white"
                />
              </div>
            </div>
          </div>
          
          {/* Navigation Buttons - 우측 상단 */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-teal-600 text-sm px-3 py-1"
              onClick={resetTest}
              style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-teal-600 text-sm px-3 py-1"
              onClick={goToNextPhase}
              style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
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
                  <div className="w-32 h-32 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="h-16 w-16 text-teal-600" />
                  </div>
                </div>
                
                <div className="space-y-6">
                  <p className="text-lg leading-relaxed px-8" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {selectedQuestion.questionText}
                  </p>
                  
                  {/* 음성 재생 상태 표시 */}
                  {isAudioPlaying && (
                    <div className="flex justify-center">
                      <div className="bg-teal-600 text-white px-4 py-2 rounded-full flex items-center space-x-2" style={{ fontFamily: 'Arial, sans-serif' }}>
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
                        className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-lg"
                        style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
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
                
                {/* Question text display - stays visible during recording */}
                <div className="bg-gray-50 p-6 rounded-lg mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>
                  <p className="text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {selectedQuestion?.questionText}
                  </p>
                </div>
                
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
                          dataTestId="button-copy-transcript-new"
                        />
                      </div>
                      <p className="text-sm bg-white p-3 rounded border">{transcript}</p>
                    </div>
                  )}

                  {/* 인라이즈 피드백 로딩 */}
                  {feedbackMutation.isPending && (
                    <div className="text-center py-6 mt-4">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600">피드백 생성 중...</p>
                    </div>
                  )}
                  
                  {/* 인라이즈 피드백 결과 - ETS 공식 기준 (Delivery, Language Use, Topic Development) */}
                  {scores && (
                    <div className="space-y-4 mt-6">
                      {/* 점수 요약 */}
                      <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 rounded-lg text-white">
                        <h3 className="font-bold text-lg mb-4">📊 TOEFL Speaking 점수 (ETS 공식 기준)</h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center bg-white/10 p-3 rounded-lg">
                            <div className="text-2xl font-bold">{scores.delivery}/4</div>
                            <div className="text-sm opacity-90">Delivery (발화)</div>
                          </div>
                          <div className="text-center bg-white/10 p-3 rounded-lg">
                            <div className="text-2xl font-bold">{scores.languageUse}/4</div>
                            <div className="text-sm opacity-90">Language Use (언어)</div>
                          </div>
                          <div className="text-center bg-white/10 p-3 rounded-lg">
                            <div className="text-2xl font-bold">{scores.topicDevelopment}/4</div>
                            <div className="text-sm opacity-90">Topic Dev. (내용)</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-white/20 p-4 rounded-lg">
                          <span className="font-semibold">예상 TOEFL Speaking 점수</span>
                          <span className="text-3xl font-bold">{scores.predictedToeflScore}/30</span>
                        </div>
                      </div>

                      {/* 종합 평가 */}
                      {overallAssessment && (
                        <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
                          <h3 className="font-semibold mb-3 text-blue-800">📋 종합 평가</h3>
                          <p className="text-sm leading-relaxed text-blue-900">{overallAssessment}</p>
                        </div>
                      )}

                      {/* 기준별 상세 피드백 */}
                      <div className="space-y-3">
                        {deliveryFeedback && (
                          <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-purple-800">🎤 Delivery (발화)</h4>
                              <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">{deliveryFeedback.score}/4</span>
                            </div>
                            <p className="text-sm text-purple-900 leading-relaxed">{deliveryFeedback.feedback}</p>
                          </div>
                        )}
                        
                        {languageUseFeedback && (
                          <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-indigo-800">📝 Language Use (언어 사용)</h4>
                              <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">{languageUseFeedback.score}/4</span>
                            </div>
                            <p className="text-sm text-indigo-900 leading-relaxed">{languageUseFeedback.feedback}</p>
                          </div>
                        )}
                        
                        {topicDevelopmentFeedback && (
                          <div className="bg-cyan-50 p-5 rounded-lg border border-cyan-200">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-cyan-800">💡 Topic Development (내용 전개)</h4>
                              <span className="bg-cyan-600 text-white px-3 py-1 rounded-full text-sm font-bold">{topicDevelopmentFeedback.score}/4</span>
                            </div>
                            <p className="text-sm text-cyan-900 leading-relaxed">{topicDevelopmentFeedback.feedback}</p>
                          </div>
                        )}
                      </div>

                      {/* 문장별 피드백 */}
                      {sentenceBysentenceFeedback.length > 0 && (
                        <div className="bg-amber-50 p-5 rounded-lg border border-amber-200">
                          <h3 className="font-semibold mb-4 text-amber-800">✏️ 문장별 교정 피드백</h3>
                          <div className="space-y-4">
                            {sentenceBysentenceFeedback.map((item, index) => (
                              <div key={index} className="bg-white p-4 rounded-lg border border-amber-100">
                                <div className="mb-2">
                                  <span className="text-xs font-semibold text-red-600 uppercase">원래 문장:</span>
                                  <p className="text-sm text-red-800 line-through mt-1">{item.original}</p>
                                </div>
                                <div className="mb-2">
                                  <span className="text-xs font-semibold text-green-600 uppercase">교정된 문장:</span>
                                  <p className="text-sm text-green-800 font-medium mt-1">{item.corrected}</p>
                                </div>
                                <div className="bg-amber-50 p-2 rounded">
                                  <span className="text-xs font-semibold text-amber-700">💡 설명:</span>
                                  <p className="text-xs text-amber-800 mt-1">{item.explanation}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 개선된 모범 답안 */}
                      {improvedModelAnswer && (
                        <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                          <h3 className="font-semibold mb-3 text-green-800">✨ 개선된 모범 답안</h3>
                          <p className="text-sm leading-relaxed text-green-900 bg-white p-4 rounded border border-green-100">{improvedModelAnswer}</p>
                          <p className="text-xs text-green-700 mt-2">💡 학생의 아이디어를 유지하면서 문법, 어휘, 구조를 개선한 답안입니다.</p>
                        </div>
                      )}
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
                  {!scores && (
                    <Button 
                      onClick={generateAIFeedback} 
                      className="bg-slate-800 hover:bg-slate-900 text-yellow-400 hover:text-yellow-300"
                      disabled={!transcript || feedbackMutation.isPending}
                    >
                      {feedbackMutation.isPending ? '피드백 생성 중...' : '피드백 받기'}
                    </Button>
                  )}
                  <Button onClick={resetTest} variant="outline">
                    다시 시작
                  </Button>
                </div>
              </div>
            )}

            {/* Feedback Phase - Updated with ETS criteria */}
            {currentPhase === 'feedback' && (
              <div className="space-y-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                <h2 className="text-xl font-semibold text-center mb-4">TOEFL Speaking 피드백 (ETS 공식 기준)</h2>
                
                {feedbackMutation.isPending && (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">ETS 공식 기준으로 피드백 생성 중...</p>
                  </div>
                )}
                
                {scores && (
                  <div className="space-y-4">
                    {/* 점수 요약 */}
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 rounded-lg text-white">
                      <h3 className="font-bold text-lg mb-4">📊 TOEFL Speaking 점수 (ETS 공식 기준)</h3>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center bg-white/10 p-3 rounded-lg">
                          <div className="text-2xl font-bold">{scores.delivery}/4</div>
                          <div className="text-sm opacity-90">Delivery (발화)</div>
                        </div>
                        <div className="text-center bg-white/10 p-3 rounded-lg">
                          <div className="text-2xl font-bold">{scores.languageUse}/4</div>
                          <div className="text-sm opacity-90">Language Use (언어)</div>
                        </div>
                        <div className="text-center bg-white/10 p-3 rounded-lg">
                          <div className="text-2xl font-bold">{scores.topicDevelopment}/4</div>
                          <div className="text-sm opacity-90">Topic Dev. (내용)</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-white/20 p-4 rounded-lg">
                        <span className="font-semibold">예상 TOEFL Speaking 점수</span>
                        <span className="text-3xl font-bold">{scores.predictedToeflScore}/30</span>
                      </div>
                    </div>

                    {/* 종합 평가 */}
                    {overallAssessment && (
                      <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
                        <h3 className="font-semibold mb-3 text-blue-800">📋 종합 평가</h3>
                        <p className="text-sm leading-relaxed text-blue-900">{overallAssessment}</p>
                      </div>
                    )}

                    {/* 기준별 상세 피드백 */}
                    <div className="space-y-3">
                      {deliveryFeedback && (
                        <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-purple-800">🎤 Delivery (발화)</h4>
                            <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">{deliveryFeedback.score}/4</span>
                          </div>
                          <p className="text-sm text-purple-900 leading-relaxed">{deliveryFeedback.feedback}</p>
                        </div>
                      )}
                      
                      {languageUseFeedback && (
                        <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-indigo-800">📝 Language Use (언어 사용)</h4>
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">{languageUseFeedback.score}/4</span>
                          </div>
                          <p className="text-sm text-indigo-900 leading-relaxed">{languageUseFeedback.feedback}</p>
                        </div>
                      )}
                      
                      {topicDevelopmentFeedback && (
                        <div className="bg-cyan-50 p-5 rounded-lg border border-cyan-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-cyan-800">💡 Topic Development (내용 전개)</h4>
                            <span className="bg-cyan-600 text-white px-3 py-1 rounded-full text-sm font-bold">{topicDevelopmentFeedback.score}/4</span>
                          </div>
                          <p className="text-sm text-cyan-900 leading-relaxed">{topicDevelopmentFeedback.feedback}</p>
                        </div>
                      )}
                    </div>

                    {/* 문장별 피드백 */}
                    {sentenceBysentenceFeedback.length > 0 && (
                      <div className="bg-amber-50 p-5 rounded-lg border border-amber-200">
                        <h3 className="font-semibold mb-4 text-amber-800">✏️ 문장별 교정 피드백</h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {sentenceBysentenceFeedback.map((item, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg border border-amber-100">
                              <div className="mb-2">
                                <span className="text-xs font-semibold text-red-600 uppercase">원래 문장:</span>
                                <p className="text-sm text-red-800 line-through mt-1">{item.original}</p>
                              </div>
                              <div className="mb-2">
                                <span className="text-xs font-semibold text-green-600 uppercase">교정된 문장:</span>
                                <p className="text-sm text-green-800 font-medium mt-1">{item.corrected}</p>
                              </div>
                              <div className="bg-amber-50 p-2 rounded">
                                <span className="text-xs font-semibold text-amber-700">💡 설명:</span>
                                <p className="text-xs text-amber-800 mt-1">{item.explanation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 개선된 모범 답안 */}
                    {improvedModelAnswer && (
                      <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                        <h3 className="font-semibold mb-3 text-green-800">✨ 개선된 모범 답안</h3>
                        <p className="text-sm leading-relaxed text-green-900 bg-white p-4 rounded border border-green-100">{improvedModelAnswer}</p>
                        <p className="text-xs text-green-700 mt-2">💡 학생의 아이디어를 유지하면서 문법, 어휘, 구조를 개선한 답안입니다.</p>
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
      </div>
      </SecurityWrapper>
    );
  }
