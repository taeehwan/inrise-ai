import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearch, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Clock, Mic, FileText, Play, Pause, RotateCcw, Sparkles, Volume2, Square, CheckCircle, MessageSquare, AlertCircle, Download, MessageCircle, Eye, EyeOff } from "lucide-react";
import { NewToefl2026SpeakingFeedbackPanel, NewToefl2026ListenRepeatFeedbackPanel } from "@/components/NewToeflFeedbackPanel";
import { NewToeflLayout, NewToeflLoadingState } from "@/components/NewToeflLayout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import { apiRequest } from "@/lib/queryClient";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/components/theme-provider";
import { 
  createSafariCompatibleAudio, 
  playSafariCompatibleAudio, 
  createSafariCompatibleMediaRecorder,
  getBlobMimeType,
  unlockAudioContext,
  isAppleDevice 
} from "@/lib/safariAudioCompat";

type TaskType = "listen-repeat" | "interview";

interface ListenRepeatItem {
  id: number;
  sentence: string;
  koreanHint: string;
  duration: number;
}

interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
}

const listenRepeatItems: ListenRepeatItem[] = [
  {
    id: 1,
    sentence: "The professor emphasized that the research methodology must be thoroughly documented.",
    koreanHint: "연구 방법론은 철저히 문서화되어야 한다고 교수가 강조했습니다.",
    duration: 5
  },
  {
    id: 2,
    sentence: "Climate change has significantly impacted global agricultural patterns over the past decade.",
    koreanHint: "지난 10년간 기후 변화가 전 세계 농업 패턴에 상당한 영향을 미쳤습니다.",
    duration: 6
  },
  {
    id: 3,
    sentence: "The university library provides access to numerous academic databases and journals.",
    koreanHint: "대학 도서관은 수많은 학술 데이터베이스와 저널에 대한 접근을 제공합니다.",
    duration: 5
  },
  {
    id: 4,
    sentence: "Students are encouraged to participate actively in classroom discussions and group projects.",
    koreanHint: "학생들은 수업 토론과 그룹 프로젝트에 적극적으로 참여하도록 권장됩니다.",
    duration: 6
  },
  {
    id: 5,
    sentence: "The economic implications of artificial intelligence are still being studied by researchers.",
    koreanHint: "인공지능의 경제적 영향은 아직 연구자들에 의해 연구되고 있습니다.",
    duration: 5
  },
  {
    id: 6,
    sentence: "Effective communication skills are essential for success in today's interconnected world.",
    koreanHint: "효과적인 의사소통 능력은 오늘날 상호 연결된 세계에서 성공에 필수적입니다.",
    duration: 5
  },
  {
    id: 7,
    sentence: "The laboratory experiment demonstrated the principles of thermodynamics quite effectively.",
    koreanHint: "실험실 실험은 열역학의 원리를 매우 효과적으로 보여주었습니다.",
    duration: 5
  }
];

const interviewQuestions: InterviewQuestion[] = [
  {
    id: 1,
    question: "What do you think is the most important quality for a successful student? Explain why you think this quality is important.",
    category: "Education"
  },
  {
    id: 2,
    question: "Describe a time when you had to work with others to accomplish a goal. What was the goal and how did you contribute?",
    category: "Teamwork"
  },
  {
    id: 3,
    question: "Some people prefer to study alone, while others prefer to study in groups. Which do you prefer and why?",
    category: "Study Habits"
  },
  {
    id: 4,
    question: "If you could change one thing about your university or school, what would it be and why?",
    category: "Opinion"
  }
];

const DeferredNewToeflSpeakingIntroView = lazy(
  () => import("@/components/new-toefl-speaking/NewToeflSpeakingIntroView"),
);
const DeferredNewToeflSpeakingResultsView = lazy(
  () => import("@/components/new-toefl-speaking/NewToeflSpeakingResultsView"),
);

export default function NewTOEFLSpeaking() {
  const [, setLocation] = useLocation();
  const params = useParams<{ testId?: string }>();
  const searchString = useSearch();
  const testId = params.testId || new URLSearchParams(searchString).get('testId');
  const _spSearchParams = new URLSearchParams(searchString);
  const isFullTestMode = _spSearchParams.get('fullTest') === 'true';
  const fullTestAttemptId = _spSearchParams.get('attemptId') || null;
  
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [isStarted, setIsStarted] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskType>("listen-repeat");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [maxRecordingTime] = useState(10);
  const [interviewTimeRemaining, setInterviewTimeRemaining] = useState(45);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [completedListenRepeat, setCompletedListenRepeat] = useState<Set<number>>(new Set());
  const [completedInterview, setCompletedInterview] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [loadedQuestions, setLoadedQuestions] = useState<any[]>([]);
  
  const [isPlayingInterviewQuestion, setIsPlayingInterviewQuestion] = useState(false);
  const [hasPlayedInterviewQuestion, setHasPlayedInterviewQuestion] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [interviewAudioUrl, setInterviewAudioUrl] = useState<string | null>(null);
  const [isGeneratingInterviewAudio, setIsGeneratingInterviewAudio] = useState(false);
  const [listenRepeatAudioUrl, setListenRepeatAudioUrl] = useState<string | null>(null);
  const [isGeneratingListenRepeatAudio, setIsGeneratingListenRepeatAudio] = useState(false);
  
  // Question visibility states (hidden until audio finishes playing)
  const [showListenRepeatSentence, setShowListenRepeatSentence] = useState(false);
  const [showInterviewQuestion, setShowInterviewQuestion] = useState(false);
  
  const { data: testData, isLoading: isLoadingTest } = useQuery<{ questions?: any[]; title?: string }>({
    queryKey: ['/api/tests', testId],
    enabled: !!testId,
  });
  
  const { user } = useAuth();
  const { canGetAIFeedback } = useSubscription();
  const { logTestStart, logAIUsage } = useActivityTracker();
  const { t } = useLanguage();
  const testStartTimeRef = useRef<number>(0);
  const [submissionSaved, setSubmissionSaved] = useState(false);
  
  useEffect(() => {
    if (testData && testData.questions) {
      setLoadedQuestions(testData.questions);
    }
  }, [testData]);

  useEffect(() => {
    if (isStarted && !testStartTimeRef.current) {
      testStartTimeRef.current = Date.now();
      logTestStart('toefl_speaking', testId || 'unknown');
    }
  }, [isStarted, testId]);
  
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const interviewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const interviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const listenRepeatAudioRef = useRef<HTMLAudioElement | null>(null);

  const isTestLoading = testId && !testData;
  const hasLoadedTest = Boolean(testId && testData);
  
  const activeListenRepeatItems: ListenRepeatItem[] = (() => {
    if (hasLoadedTest && testData?.questions) {
      const lrQuestions = testData.questions.filter((q: any) => 
        q.type === 'listen-repeat' || q.questionType === 'listen-repeat'
      );
      return lrQuestions.map((q: any, idx: number) => ({
        id: idx + 1,
        sentence: q.sentence || q.questionText || q.text || q.question || '',
        koreanHint: q.koreanHint || q.hint || q.translation || '',
        duration: q.duration || 5
      }));
    }
    if (!testId) {
      return listenRepeatItems;
    }
    return [];
  })();

  const activeInterviewQuestions: InterviewQuestion[] = (() => {
    if (hasLoadedTest && testData?.questions) {
      const ivQuestions = testData.questions.filter((q: any) => 
        q.type === 'interview' || q.questionType === 'interview'
      );
      return ivQuestions.map((q: any, idx: number) => ({
        id: idx + 1,
        question: q.questionText || q.question || q.text || '',
        category: q.category || q.topic || 'General'
      }));
    }
    if (!testId) {
      return interviewQuestions;
    }
    return [];
  })();
  
  const totalQuestions = activeListenRepeatItems.length + activeInterviewQuestions.length;
  const hasListenRepeat = activeListenRepeatItems.length > 0;
  const hasInterview = activeInterviewQuestions.length > 0;

  const currentListenRepeatItem = hasListenRepeat ? activeListenRepeatItems[currentItemIndex] : null;
  const currentInterviewQuestion = hasInterview ? activeInterviewQuestions[currentItemIndex] : null;

  useEffect(() => {
    if (isStarted && hasLoadedTest) {
      if (!hasListenRepeat && hasInterview) {
        setCurrentTask("interview");
        setCurrentItemIndex(0);
      } else if (hasListenRepeat && !hasInterview) {
        setCurrentTask("listen-repeat");
        setCurrentItemIndex(0);
      }
    }
  }, [isStarted, hasLoadedTest, hasListenRepeat, hasInterview]);

  const saveTestSubmission = async () => {
    if (!user?.id || !testId || submissionSaved) return;
    try {
      const timeSpentMinutes = Math.round((Date.now() - testStartTimeRef.current) / 60000) || 1;
      const score = totalQuestions > 0 ? Math.round(((completedListenRepeat.size + completedInterview.size) / totalQuestions) * 100) : 0;
      await apiRequest("POST", "/api/test-attempts", {
        userId: user.id,
        testId: testId,
        totalScore: score,
        sectionScores: {
          section: "speaking",
          examType: "new-toefl",
          listenRepeatCompleted: completedListenRepeat.size,
          interviewCompleted: completedInterview.size,
          totalQuestions: totalQuestions
        },
        timeSpent: timeSpentMinutes,
        status: "completed"
      });
      setSubmissionSaved(true);
    } catch (error) {
      console.error("Failed to save test submission:", error);
    }
  };

  useEffect(() => {
    if (showResults && !submissionSaved) {
      saveTestSubmission();
    }
  }, [showResults]);

  useEffect(() => {
    return () => {
      if (user?.id && testId && !submissionSaved && (completedListenRepeat.size > 0 || completedInterview.size > 0)) {
        const timeSpent = Math.round((Date.now() - testStartTimeRef.current) / 60000);
        fetch('/api/test-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: user.id,
            testId: testId,
            sectionScores: { section: "speaking", examType: "new-toefl", listenRepeatCompleted: completedListenRepeat.size, interviewCompleted: completedInterview.size, partial: true },
            timeSpent: timeSpent || 1,
            status: "completed"
          })
        }).catch(() => {});
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayAudio = async () => {
    if (!currentListenRepeatItem) return;
    
    if (isPlaying) {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
      if (listenRepeatAudioRef.current) {
        listenRepeatAudioRef.current.pause();
      }
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    
    setIsPlaying(true);
    setAudioProgress(0);
    
    // Try to use ElevenLabs TTS for natural voice with leading pause
    if (!listenRepeatAudioUrl) {
      setIsGeneratingListenRepeatAudio(true);
      try {
        const response = await fetch('/api/ai/generate-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: currentListenRepeatItem.sentence,
            voiceType: 'narrator'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setListenRepeatAudioUrl(data.audioUrl);
          setIsGeneratingListenRepeatAudio(false);
          
          // Create audio element if needed
          if (!listenRepeatAudioRef.current) {
            listenRepeatAudioRef.current = createSafariCompatibleAudio();
          }
          
          listenRepeatAudioRef.current.src = data.audioUrl;
          listenRepeatAudioRef.current.playbackRate = 0.95;
          
          // Set up event handlers
          listenRepeatAudioRef.current.onended = () => {
            setAudioProgress(100);
            setIsPlaying(false);
            setHasPlayedAudio(true);
          };
          
          listenRepeatAudioRef.current.ontimeupdate = () => {
            if (listenRepeatAudioRef.current) {
              const progress = (listenRepeatAudioRef.current.currentTime / listenRepeatAudioRef.current.duration) * 100;
              setAudioProgress(isNaN(progress) ? 0 : progress);
            }
          };
          
          listenRepeatAudioRef.current.onerror = () => {
            setIsPlaying(false);
            fallbackToSpeechSynthesis();
          };
          
          await unlockAudioContext();
          await playSafariCompatibleAudio(listenRepeatAudioRef.current);
          return;
        }
      } catch (error) {
        console.error('TTS generation error:', error);
      }
      setIsGeneratingListenRepeatAudio(false);
      fallbackToSpeechSynthesis();
    } else {
      // Use cached audio
      if (!listenRepeatAudioRef.current) {
        listenRepeatAudioRef.current = createSafariCompatibleAudio();
      }
      
      listenRepeatAudioRef.current.src = listenRepeatAudioUrl;
      listenRepeatAudioRef.current.currentTime = 0;
      listenRepeatAudioRef.current.playbackRate = 0.95;
      
      listenRepeatAudioRef.current.onended = () => {
        setAudioProgress(100);
        setIsPlaying(false);
        setHasPlayedAudio(true);
      };
      
      listenRepeatAudioRef.current.ontimeupdate = () => {
        if (listenRepeatAudioRef.current) {
          const progress = (listenRepeatAudioRef.current.currentTime / listenRepeatAudioRef.current.duration) * 100;
          setAudioProgress(isNaN(progress) ? 0 : progress);
        }
      };
      
      listenRepeatAudioRef.current.onerror = () => {
        setIsPlaying(false);
        fallbackToSpeechSynthesis();
      };
      
      await unlockAudioContext();
      await playSafariCompatibleAudio(listenRepeatAudioRef.current);
    }
  };
  
  const fallbackToSpeechSynthesis = () => {
    if (!currentListenRepeatItem) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentListenRepeatItem.sentence);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    speechSynthRef.current = utterance;
    
    const estimatedDuration = currentListenRepeatItem.duration * 1000;
    const intervalTime = 50;
    const increment = (100 / (estimatedDuration / intervalTime));
    
    audioIntervalRef.current = setInterval(() => {
      setAudioProgress(prev => {
        if (prev >= 100) {
          clearInterval(audioIntervalRef.current!);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);
    
    utterance.onend = () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
      setAudioProgress(100);
      setIsPlaying(false);
      setHasPlayedAudio(true);
    };
    
    utterance.onerror = () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
      setIsPlaying(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const handleStartRecording = () => {
    if (!hasPlayedAudio) return;
    setIsRecording(true);
    setRecordingTime(0);
    setTranscribedText("");
    setIsTranscribing(true);
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      
      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscribedText(fullTranscript.trim());
      };
      
      recognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
        setIsTranscribing(false);
      };
      
      recognition.onend = () => {
        setIsTranscribing(false);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
    }
    
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= maxRecordingTime) {
          handleStopRecording();
          return maxRecordingTime;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsTranscribing(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (currentTask === "listen-repeat" && recordingTime >= 2) {
      setCompletedListenRepeat(prev => new Set(prev).add(currentItemIndex));
    }
  };

  const handleNextListenRepeat = () => {
    if (currentItemIndex < activeListenRepeatItems.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
      resetAudioState();
    } else {
      if (hasInterview) {
        setCurrentTask("interview");
        setCurrentItemIndex(0);
        resetAudioState();
      } else {
        setShowResults(true);
      }
    }
  };

  const handlePlayInterviewQuestion = async () => {
    if (!currentInterviewQuestion || isPlayingInterviewQuestion || isGeneratingInterviewAudio) return;
    
    // Stop any existing audio
    if (interviewAudioRef.current) {
      interviewAudioRef.current.pause();
      interviewAudioRef.current.currentTime = 0;
    }
    window.speechSynthesis.cancel();
    
    setIsPlayingInterviewQuestion(true);
    setIsGeneratingInterviewAudio(true);
    
    try {
      // Use ElevenLabs TTS for more natural sounding interview questions
      const response = await fetch('/api/ai/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          script: currentInterviewQuestion.question,
          voiceType: 'professor'
        })
      });
      
      if (!response.ok) {
        throw new Error('TTS generation failed');
      }
      
      const data = await response.json();
      if (data.audioUrl) {
        setInterviewAudioUrl(data.audioUrl);
        
        if (!interviewAudioRef.current) {
          interviewAudioRef.current = createSafariCompatibleAudio();
        }
        
        interviewAudioRef.current.src = data.audioUrl;
        interviewAudioRef.current.playbackRate = 0.95;
        
        interviewAudioRef.current.onended = () => {
          setIsPlayingInterviewQuestion(false);
          setHasPlayedInterviewQuestion(true);
        };
        
        interviewAudioRef.current.onerror = () => {
          setIsPlayingInterviewQuestion(false);
          setHasPlayedInterviewQuestion(true);
        };
        
        await unlockAudioContext();
        await playSafariCompatibleAudio(interviewAudioRef.current);
      }
    } catch (error) {
      console.error('Interview TTS error:', error);
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(currentInterviewQuestion.question);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      
      utterance.onend = () => {
        setIsPlayingInterviewQuestion(false);
        setHasPlayedInterviewQuestion(true);
      };
      
      utterance.onerror = () => {
        setIsPlayingInterviewQuestion(false);
        setHasPlayedInterviewQuestion(true);
      };
      
      window.speechSynthesis.speak(utterance);
    } finally {
      setIsGeneratingInterviewAudio(false);
    }
  };

  const handleStartInterviewResponse = async () => {
    setIsInterviewActive(true);
    setIsRecording(true);
    setInterviewTimeRemaining(45);
    setTranscribedText("");
    setIsTranscribing(true);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setShowFeedbackPanel(false);
    audioChunksRef.current = [];
    
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mediaRecorder = createSafariCompatibleMediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blobType = getBlobMimeType();
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(100);
    } catch (err: any) {
      console.log('MediaRecorder error:', err);
      if (err.message === 'MEDIARECORDER_NOT_SUPPORTED' || err.message === 'MEDIARECORDER_CREATION_FAILED') {
        alert(t('speaking.micNotSupported'));
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert(t('speaking.micPermission'));
      } else if (err.name === 'NotFoundError') {
        alert(t('speaking.micNotFound'));
      }
      setIsRecording(false);
      setIsInterviewActive(false);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      
      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscribedText(fullTranscript.trim());
      };
      
      recognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
        setIsTranscribing(false);
      };
      
      recognition.onend = () => {
        setIsTranscribing(false);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
    }
    
    interviewTimerRef.current = setInterval(() => {
      setInterviewTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interviewTimerRef.current!);
          setIsRecording(false);
          setIsInterviewActive(false);
          setIsTranscribing(false);
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          setCompletedInterview(p => new Set(p).add(currentItemIndex));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDownloadRecording = () => {
    if (!recordedAudioBlob) return;
    
    const url = URL.createObjectURL(recordedAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    const extension = getBlobMimeType().includes('mp4') ? 'mp4' : getBlobMimeType().includes('wav') ? 'wav' : 'webm';
    a.download = `interview-response-q${currentItemIndex + 1}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetInterviewState = () => {
    setHasPlayedInterviewQuestion(false);
    setIsPlayingInterviewQuestion(false);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setShowFeedbackPanel(false);
    setTranscribedText("");
    setInterviewTimeRemaining(45);
    setIsInterviewActive(false);
    setIsRecording(false);
    setInterviewAudioUrl(null);
    setIsGeneratingInterviewAudio(false);
    if (interviewAudioRef.current) {
      interviewAudioRef.current.pause();
      interviewAudioRef.current.currentTime = 0;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (interviewTimerRef.current) {
      clearInterval(interviewTimerRef.current);
    }
  };

  const handleFullTestSectionComplete = () => {
    const attemptParam = fullTestAttemptId ? `&attemptId=${fullTestAttemptId}` : '';
    setLocation(`/new-toefl/full-test?section=speaking&score=4.5${attemptParam}`);
  };

  const handleNextInterview = () => {
    if (interviewTimerRef.current) {
      clearInterval(interviewTimerRef.current);
    }
    setIsRecording(false);
    setIsInterviewActive(false);
    
    if (currentItemIndex < activeInterviewQuestions.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
      setInterviewTimeRemaining(45);
    } else {
      if (isFullTestMode) {
        handleFullTestSectionComplete();
      } else {
        setShowResults(true);
      }
    }
  };

  const resetAudioState = () => {
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (listenRepeatAudioRef.current) {
      listenRepeatAudioRef.current.pause();
      listenRepeatAudioRef.current.currentTime = 0;
    }
    setAudioProgress(0);
    setIsPlaying(false);
    setIsRecording(false);
    setRecordingTime(0);
    setHasPlayedAudio(false);
    setTranscribedText("");
    setIsTranscribing(false);
    setListenRepeatAudioUrl(null);
    setIsGeneratingListenRepeatAudio(false);
    // Reset question visibility states
    setShowListenRepeatSentence(false);
    setShowInterviewQuestion(false);
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (interviewTimerRef.current) clearInterval(interviewTimerRef.current);
    };
  }, []);

  if (isLoadingTest) {
    return <NewToeflLoadingState section="speaking" />;
  }

  const activeQuestions = loadedQuestions.length > 0 ? loadedQuestions : null;
  const testTitle = testData?.title || "New TOEFL Speaking";

  if (!isStarted) {
    const introStats = [
      { icon: <Clock className="h-5 w-5 mx-auto mb-1" style={{ color: "#5EEAD4" }} />, label: t("speaking.approxTime"), sub: t("reading.estTime") },
      { icon: <FileText className="h-5 w-5 mx-auto mb-1" style={{ color: "#5EEAD4" }} />, label: t("speaking.totalItems").replace("{n}", String(totalQuestions)), sub: t("speaking.totalLabel") },
      { icon: <Sparkles className="h-5 w-5 mx-auto mb-1" style={{ color: "#5EEAD4" }} />, label: "No Prep", sub: t("speaking.noPrepTime") },
    ];
    const introCards = [
      {
        key: "listen-repeat",
        icon: <Volume2 className="h-4 w-4" style={{ color: "#08130F" }} />,
        title: "Listen & Repeat",
        count: `${activeListenRepeatItems.length}문장`,
        description: t("speaking.listenRepeatDesc"),
      },
      {
        key: "interview",
        icon: <MessageSquare className="h-4 w-4" style={{ color: "#08130F" }} />,
        title: "Interview",
        count: `${activeInterviewQuestions.length}질문`,
        description: t("speaking.interviewDesc"),
      },
    ];

    return (
      <Suspense fallback={<NewToeflLoadingState section="speaking" />}>
        <DeferredNewToeflSpeakingIntroView
          title={testTitle}
          subtitle={activeQuestions ? t("speaking.totalItems").replace("{n}", String(activeQuestions.length)) : "2026 완전 개편된 형식"}
          stats={introStats}
          cards={introCards}
          onStart={() => setIsStarted(true)}
          startLabel={t("speaking.startExam")}
          guideTitle={t("speaking.typeGuide")}
          guideDescription={t("speaking.typeGuideDesc")}
          oldFormatTitle={t("speaking.oldFormat")}
          oldFormatDescription={t("speaking.oldFormatDesc")}
        />
      </Suspense>
    );
  }

  if (showResults) {
    const donePct = totalQuestions > 0 ? Math.round(((completedListenRepeat.size + completedInterview.size) / totalQuestions) * 100) : 0;
    return (
      <Suspense fallback={<NewToeflLoadingState section="speaking" />}>
        <DeferredNewToeflSpeakingResultsView
          totalQuestions={totalQuestions}
          activeListenRepeatCount={activeListenRepeatItems.length}
          activeInterviewCount={activeInterviewQuestions.length}
          completedListenRepeatSize={completedListenRepeat.size}
          completedInterviewSize={completedInterview.size}
          donePct={donePct}
          t={t}
        />
      </Suspense>
    );
  }

  const currentTaskLabel = currentTask === "listen-repeat" 
    ? hasListenRepeat ? `Listen & Repeat ${currentItemIndex + 1}/${activeListenRepeatItems.length}` : "Listen & Repeat 없음"
    : hasInterview ? `Interview ${currentItemIndex + 1}/${activeInterviewQuestions.length}` : "Interview 없음";

  return (
    <NewToeflLayout 
      section="speaking" 
      isTestMode 
      showReformBadge
      darkNav
      progress={totalQuestions > 0 ? ((completedListenRepeat.size + completedInterview.size) / totalQuestions) * 100 : 0}
      currentTaskLabel={currentTaskLabel}
      rightContent={
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg" style={{background:'rgba(8,19,15,0.7)',border:'1px solid rgba(94,234,212,0.10)'}}>
          <span className="font-mono text-sm font-medium" style={{color:'#5EEAD4'}} data-testid="text-progress-count">
            {completedListenRepeat.size + completedInterview.size} / {totalQuestions}
          </span>
          <span style={{color:'rgba(153,246,228,0.4)',fontSize:10}}>{t('speaking.done')}</span>
        </div>
      }
    >
      <div className="sp-single">
        {/* stabs: sticky subtab bar */}
        <div className="stabs">
          <button
            onClick={() => {
              setCurrentTask("listen-repeat");
              setCurrentItemIndex(0);
              resetAudioState();
            }}
            className={`st${currentTask === "listen-repeat" ? " on" : ""}`}
            data-testid="button-tab-listen-repeat"
          >
            <Volume2 className="h-3.5 w-3.5 shrink-0" />
            <span>Listen &amp; Repeat</span>
            <span style={{fontSize:9,opacity:0.6,fontFamily:'monospace'}}>
              {completedListenRepeat.size}/{activeListenRepeatItems.length}
            </span>
          </button>
          <button
            onClick={() => {
              setCurrentTask("interview");
              setCurrentItemIndex(0);
              resetAudioState();
              setInterviewTimeRemaining(45);
              setIsInterviewActive(false);
            }}
            className={`st${currentTask === "interview" ? " on" : ""}`}
            data-testid="button-tab-interview"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span>Interview</span>
            <span style={{fontSize:9,opacity:0.6,fontFamily:'monospace'}}>
              {completedInterview.size}/{activeInterviewQuestions.length}
            </span>
          </button>
        </div>

        {/* ── Listen & Repeat: 빈 상태 ── */}
        {currentTask === "listen-repeat" && !hasListenRepeat && (
        <div className="sp-s-body">
          <div className="sp-card p-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{color:'#5EEAD4'}} />
            <p className="text-white font-semibold mb-1">Listen &amp; Repeat 문제가 없습니다</p>
            <p className="text-slate-400 text-sm">이 테스트에는 Listen &amp; Repeat 유형이 포함되어 있지 않습니다.</p>
            {hasInterview && (
              <button
                onClick={() => { setCurrentTask("interview"); setCurrentItemIndex(0); }}
                className="btn-act amber mt-4" style={{ width:'auto', padding:'10px 24px' }}
              >
                Interview로 이동
              </button>
            )}
          </div>
        </div>
        )}

        {/* ── Listen & Repeat: 2-column 분할 ── */}
        {currentTask === "listen-repeat" && currentListenRepeatItem && (
        <div className="sp-split">
          <div className="sp-orb-1" />
          <div className="sp-orb-2" />

          {/* LEFT: 문장 + 오디오 */}
          <div className="sp-pL">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="sp-section-label mb-0.5">Listen &amp; Repeat</p>
                <p className="sp-q-num">{t('speaking.sentence').replace('{n}', String(currentItemIndex + 1))}</p>
                <p className="text-slate-400 text-xs mt-1">{t('speaking.sentenceDesc')}</p>
              </div>
              {completedListenRepeat.has(currentItemIndex) && (
                <span className="sp-score-badge" style={{ color:'#6EE7B7', borderColor:'rgba(110,231,183,0.3)', background:'rgba(110,231,183,0.08)' }}>
                  <CheckCircle className="h-3 w-3 mr-1" />{t('speaking.done')}
                </span>
              )}
            </div>

            {/* Sentence display */}
            <div className={`rounded-xl border p-5 transition-all duration-500`} style={!hasPlayedAudio ? {opacity:0.6,borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.08)',background: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.03)'} : {borderColor: isLight ? 'rgba(94,234,212,0.3)' : 'rgba(94,234,212,0.18)',background: isLight ? 'rgba(45,212,191,0.06)' : 'rgba(45,212,191,0.04)'}}>
              {showListenRepeatSentence ? (
                <>
                  <p className="text-white text-base leading-relaxed mb-3 font-medium">
                    &ldquo;{currentListenRepeatItem.sentence}&rdquo;
                  </p>
                  <p className="text-slate-400 text-sm italic">{currentListenRepeatItem.koreanHint}</p>
                </>
              ) : (
                <div className="flex flex-col items-center py-3">
                  {(isPlaying || isGeneratingListenRepeatAudio) ? (
                    <div className="sp-audio-vis mb-2">
                      <div className="vis-dot" /><div className="vis-dot" /><div className="vis-dot" />
                    </div>
                  ) : (
                    <Volume2 className="h-7 w-7 mb-2" style={{color:'rgba(94,234,212,0.5)'}} />
                  )}
                  <p className="text-slate-400 text-sm text-center">
                    {isPlaying || isGeneratingListenRepeatAudio
                      ? "문장을 집중해서 들어보세요..."
                      : hasPlayedAudio
                        ? "스크립트 보기 버튼으로 문장을 확인하세요"
                        : "먼저 문장을 끝까지 들어보세요"}
                  </p>
                  {!hasPlayedAudio && (
                    <p className="text-slate-600 text-xs mt-1">실전처럼 텍스트 없이 듣고 따라 말해보세요</p>
                  )}
                </div>
              )}
            </div>

            {/* Script toggle */}
            {hasPlayedAudio && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowListenRepeatSentence(prev => !prev)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-white/15 rounded-lg px-3 py-1.5 bg-white/4 hover:bg-white/8 transition-all"
                >
                  {showListenRepeatSentence
                    ? <><EyeOff className="w-3.5 h-3.5" /> 스크립트 숨기기</>
                    : <><Eye className="w-3.5 h-3.5" /> 스크립트 보기</>}
                </button>
              </div>
            )}

            {/* Step 1 + Play */}
            <div className="space-y-3">
              <div className="speak-step step-blue">
                <Volume2 className="h-4 w-4 shrink-0" />
                <span>Step 1: 먼저 문장을 끝까지 들으세요</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePlayAudio}
                  disabled={isRecording}
                  className={`btn-act flex-1 ${isPlaying ? 'red' : 'amber'}`}
                  data-testid="button-play-audio"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {isPlaying ? "일시정지" : hasPlayedAudio ? "다시 듣기" : "문장 듣기"}
                </button>
                <button
                  onClick={() => {
                    setAudioProgress(0);
                    setIsPlaying(false);
                    setHasPlayedAudio(false);
                    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
                  }}
                  disabled={isRecording}
                  className="btn-act gray" style={{ width:'auto', padding:'0 16px', minWidth:'48px' }}
                  data-testid="button-restart-audio"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
              </div>
              {(isPlaying || audioProgress > 0) && (
                <div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mb-1">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{ width:`${audioProgress}%`, background:'linear-gradient(90deg,#2DD4BF,#99F6E4)' }} />
                  </div>
                  <p className="text-center text-slate-400 text-xs">
                    {audioProgress >= 100 ? t('speaking.playingComplete') : t('speaking.playing')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: 녹음 + 피드백 */}
          <div className="sp-pR">
            <div className={`speak-step ${hasPlayedAudio ? 'step-green' : 'step-gray'}`}>
              {hasPlayedAudio
                ? <><CheckCircle className="h-4 w-4 shrink-0" /><span>{t('speaking.step2')}</span></>
                : <><AlertCircle className="h-4 w-4 shrink-0" /><span>{t('speaking.listenWaiting')}</span></>}
            </div>

            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                disabled={isPlaying || !hasPlayedAudio}
                className={`btn-act ${hasPlayedAudio ? 'red' : 'gray'}`}
                data-testid="button-start-recording"
              >
                <Mic className="h-5 w-5" />
                {hasPlayedAudio ? t('speaking.recordStart') : t('speaking.listenFirst2')}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="rec-bar">
                  <div className="rec-dot" />
                  <span className="text-red-300 font-semibold text-sm">{t('speaking.recording')}</span>
                  <span className="text-white font-mono text-sm">{formatTime(recordingTime)} / {formatTime(maxRecordingTime)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width:`${(recordingTime / maxRecordingTime) * 100}%`, background:'linear-gradient(90deg,#EF4444,#DC2626)' }} />
                </div>
                <button
                  onClick={handleStopRecording}
                  disabled={recordingTime < 2}
                  className="btn-act gray"
                  data-testid="button-stop-recording"
                >
                  <Square className="h-5 w-5" />
                  {recordingTime < 2 ? t('speaking.recordMore').replace('{n}', String(2 - recordingTime)) : t('speaking.recordDone')}
                </button>
              </div>
            )}

            {(transcribedText || isTranscribing) && (
              <div className="sp-transcript-box">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-3.5 w-3.5" style={{color:'#5EEAD4'}} />
                  <span className="text-xs font-medium" style={{color:'#99F6E4'}}>
                    {isTranscribing ? "음성 인식 중..." : "내가 말한 내용"}
                  </span>
                  {isTranscribing && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#2DD4BF'}} />}
                </div>
                <p className="text-white text-sm leading-relaxed" data-testid="text-transcribed">
                  {transcribedText || "..."}
                </p>
              </div>
            )}

            {transcribedText && !isTranscribing && !isRecording && (
              <NewToefl2026ListenRepeatFeedbackPanel
                originalSentence={currentListenRepeatItem.sentence}
                userSpeech={transcribedText}
              />
            )}
          </div>
        </div>
        )}

        {/* ── Interview: 빈 상태 ── */}
        {currentTask === "interview" && !hasInterview && (
        <div className="sp-s-body">
          <div className="sp-card p-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3" style={{color:'#5EEAD4'}} />
            <p className="text-white font-semibold mb-1">Interview 문제가 없습니다</p>
            <p className="text-slate-400 text-sm">이 테스트에는 Interview 유형이 포함되어 있지 않습니다.</p>
            {hasListenRepeat && (
              <button
                onClick={() => { setCurrentTask("listen-repeat"); setCurrentItemIndex(0); }}
                className="btn-act amber mt-4" style={{ width:'auto', padding:'10px 24px' }}
              >
                Listen &amp; Repeat로 이동
              </button>
            )}
          </div>
        </div>
        )}

        {/* ── Interview: 2-column 분할 ── */}
        {currentTask === "interview" && currentInterviewQuestion && (
        <div className="sp-split">
          <div className="sp-orb-1" />
          <div className="sp-orb-2" />

          {/* LEFT: 질문 + 오디오 */}
          <div className="sp-pL">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="sp-score-badge">{currentInterviewQuestion.category}</span>
                </div>
                <p className="sp-section-label mb-0.5">Interview</p>
                <p className="sp-q-num">질문 {currentItemIndex + 1}</p>
                <p className="text-slate-400 text-xs mt-1">{t('speaking.interviewDesc')}</p>
              </div>
              {completedInterview.has(currentItemIndex) && (
                <span className="sp-score-badge" style={{ color:'#6EE7B7', borderColor:'rgba(110,231,183,0.3)', background:'rgba(110,231,183,0.08)' }}>
                  <CheckCircle className="h-3 w-3 mr-1" />{t('speaking.done')}
                </span>
              )}
            </div>

            {/* Question display */}
            <div className={`rounded-xl border p-5 transition-all duration-500`} style={!hasPlayedInterviewQuestion ? {opacity:0.6,borderColor: isLight ? '#E5E7EB' : 'rgba(255,255,255,0.08)',background: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.03)'} : {borderColor: isLight ? 'rgba(94,234,212,0.3)' : 'rgba(94,234,212,0.18)',background: isLight ? 'rgba(45,212,191,0.06)' : 'rgba(45,212,191,0.04)'}}>
              {showInterviewQuestion ? (
                <p className="text-white text-base leading-relaxed font-medium">
                  {currentInterviewQuestion.question}
                </p>
              ) : (
                <div className="flex flex-col items-center py-3">
                  {(isPlayingInterviewQuestion || isGeneratingInterviewAudio) ? (
                    <div className="sp-audio-vis mb-2">
                      <div className="vis-dot" /><div className="vis-dot" /><div className="vis-dot" />
                    </div>
                  ) : (
                    <MessageSquare className="h-7 w-7 mb-2" style={{color:'rgba(94,234,212,0.5)'}} />
                  )}
                  <p className="text-slate-400 text-sm text-center">
                    {isPlayingInterviewQuestion || isGeneratingInterviewAudio
                      ? t('speaking.listenFocus').replace('문장', '질문')
                      : hasPlayedInterviewQuestion
                        ? t('speaking.checkScript').replace('문장', '질문')
                        : t('speaking.listenFirst').replace('문장', '질문')}
                  </p>
                  {!hasPlayedInterviewQuestion && (
                    <p className="text-slate-600 text-xs mt-1">{t('speaking.noTextMode').replace('말해보세요', '답변을 준비하세요')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Script toggle */}
            {hasPlayedInterviewQuestion && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowInterviewQuestion(prev => !prev)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-white/15 rounded-lg px-3 py-1.5 bg-white/4 hover:bg-white/8 transition-all"
                >
                  {showInterviewQuestion
                    ? <><EyeOff className="w-3.5 h-3.5" /> {t('speaking.hideScript')}</>
                    : <><Eye className="w-3.5 h-3.5" /> {t('speaking.showScript')}</>}
                </button>
              </div>
            )}

            {/* Step 1: Play */}
            {!isInterviewActive && !completedInterview.has(currentItemIndex) && (
              <div className="space-y-3">
                <div className="speak-step step-blue">
                  <Volume2 className="h-4 w-4 shrink-0" />
                  <span>Step 1: {t('speaking.step1').replace('문장', '질문').replace('Step 1: ', '')}</span>
                </div>
                <button
                  onClick={handlePlayInterviewQuestion}
                  disabled={isPlayingInterviewQuestion || isGeneratingInterviewAudio}
                  className={`btn-act ${isPlayingInterviewQuestion || isGeneratingInterviewAudio ? 'blue' : hasPlayedInterviewQuestion ? 'gray' : 'blue'}`}
                  data-testid="button-play-interview-question"
                >
                  {isGeneratingInterviewAudio ? (
                    <><Volume2 className="h-5 w-5 animate-spin" />{t('speaking.playBtn')}</>
                  ) : isPlayingInterviewQuestion ? (
                    <><Volume2 className="h-5 w-5 animate-pulse" />{t('speaking.playing')}</>
                  ) : hasPlayedInterviewQuestion ? (
                    <><CheckCircle className="h-5 w-5" />{t('speaking.playAgain')}</>
                  ) : (
                    <><Volume2 className="h-5 w-5" />{t('speaking.playBtn')}</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: 타이머 + 녹음 + 피드백 */}
          <div className="sp-pR">
            {/* speak-ring */}
            <div className="flex items-center justify-center py-2">
              <div className={`speak-ring${isInterviewActive ? (interviewTimeRemaining <= 10 ? ' urgent' : ' active') : isPlayingInterviewQuestion ? ' listening' : ''}`}>
                {isPlayingInterviewQuestion ? (
                  <>
                    <Volume2 className="h-6 w-6 animate-pulse" style={{color:'#5EEAD4'}} />
                    <span className="text-xs mt-1 font-medium" style={{color:'#5EEAD4'}}>재생 중</span>
                  </>
                ) : (
                  <>
                    <span
                      className="speak-ring-num"
                      data-testid="text-interview-timer"
                      style={{ color: isInterviewActive ? (interviewTimeRemaining <= 10 ? '#EF4444' : '#2DD4BF') : '#64748B' }}
                    >
                      {interviewTimeRemaining}
                    </span>
                    <span className="speak-ring-unit">초</span>
                  </>
                )}
              </div>
            </div>

            {/* State-based controls */}
            {!isInterviewActive && !completedInterview.has(currentItemIndex) ? (
              <div className="space-y-3">
                {hasPlayedInterviewQuestion && (
                  <>
                    <div className="speak-step step-amber">
                      <Mic className="h-4 w-4 shrink-0" />
                      <span>Step 2: {t('speaking.step2').replace('Step 2: ', '')}</span>
                    </div>
                    <button
                      onClick={handleStartInterviewResponse}
                      className="btn-act amber"
                      data-testid="button-start-interview-response"
                    >
                      <Mic className="h-5 w-5" />
                      답변 시작 (45초)
                    </button>
                  </>
                )}
              </div>
            ) : isInterviewActive ? (
              <div className="space-y-3">
                <div className="rec-bar">
                  <div className="rec-dot" />
                  <span className="font-semibold text-sm" style={{color:'#99F6E4'}}>{t('speaking.recording')}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width:`${((45 - interviewTimeRemaining) / 45) * 100}%`, background:'linear-gradient(90deg,#2DD4BF,#99F6E4)' }} />
                </div>
                {transcribedText && (
                  <div className="sp-transcript-box">
                    <p className="text-slate-500 text-xs mb-1">실시간 음성 인식:</p>
                    <p className="text-slate-300 text-sm">{transcribedText}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="speak-step step-green">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{t('speaking.recordDone')}</span>
                </div>
                {transcribedText && (
                  <div className="sp-transcript-box">
                    <p className="text-slate-500 text-xs mb-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      음성 변환 텍스트 (Transcript)
                    </p>
                    <p className="text-white text-sm leading-relaxed">{transcribedText}</p>
                  </div>
                )}
                {recordedAudioUrl && (
                  <div className="sp-transcript-box space-y-3">
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <Mic className="h-3 w-3" />
                      {t('speaking.myWords')}
                    </p>
                    <audio controls src={recordedAudioUrl} className="w-full" playsInline webkit-playsinline="true" />
                    <button
                      onClick={handleDownloadRecording}
                      className="btn-act gray"
                      data-testid="button-download-recording"
                    >
                      <Download className="h-4 w-4" />
                      {t('speaking.recordMore').replace('{n}초 더 ', '')}
                    </button>
                  </div>
                )}
                {transcribedText && !isFullTestMode && (
                  <div className="space-y-3">
                    {!canGetAIFeedback ? (
                      <SubscriptionGuard
                        requiredTier="light"
                        feature="AI 스피킹 피드백"
                        description="인라이즈 AI 피드백은 라이트 이상 구독 회원에게 제공됩니다."
                        variant="inline"
                      >
                        <></>
                      </SubscriptionGuard>
                    ) : !showFeedbackPanel ? (
                      <button
                        onClick={() => setShowFeedbackPanel(true)}
                        className="btn-act amber"
                        data-testid="button-request-feedback"
                      >
                        <MessageCircle className="h-5 w-5" />
                        인라이즈 피드백 받기
                      </button>
                    ) : (
                      <NewToefl2026SpeakingFeedbackPanel
                        question={currentInterviewQuestion.question}
                        userAnswer={transcribedText}
                        recordingBlob={recordedAudioBlob}
                        questionNumber={currentItemIndex + 1}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* sp-s-bottom: sticky bottom navigation */}
        <div className="sp-s-bottom">
          {currentTask === "listen-repeat" && currentListenRepeatItem && (
            <>
              <button
                onClick={() => {
                  if (currentItemIndex > 0) {
                    setCurrentItemIndex(prev => prev - 1);
                    resetAudioState();
                  }
                }}
                disabled={currentItemIndex === 0 || isRecording || isPlaying}
                className="sp-nav-btn back"
                style={{flex:1}}
                data-testid="button-prev-sentence"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('speaking.prev')}
              </button>
              <button
                onClick={handleNextListenRepeat}
                disabled={isRecording || isPlaying}
                className="sp-nav-btn"
                style={{flex:1}}
                data-testid="button-next-sentence"
              >
                {currentItemIndex === activeListenRepeatItems.length - 1
                  ? (hasInterview ? t('speaking.interviewGo') : t('speaking.viewResult'))
                  : t('speaking.next')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
          {currentTask === "interview" && currentInterviewQuestion && (
            <>
              <button
                onClick={() => {
                  if (currentItemIndex > 0) {
                    setCurrentItemIndex(prev => prev - 1);
                    resetInterviewState();
                  }
                }}
                disabled={currentItemIndex === 0 || isInterviewActive || isPlayingInterviewQuestion}
                className="sp-nav-btn back"
                style={{flex:1}}
                data-testid="button-prev-question"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('speaking.prev')}
              </button>
              <button
                onClick={() => {
                  resetInterviewState();
                  handleNextInterview();
                }}
                disabled={isInterviewActive || isPlayingInterviewQuestion}
                className="sp-nav-btn"
                style={{flex:1}}
                data-testid="button-next-question"
              >
                {currentItemIndex === activeInterviewQuestions.length - 1 ? t('speaking.viewResult') : t('speaking.next')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>{/* /sp-s-bottom */}

      </div>{/* /sp-single */}
    </NewToeflLayout>
  );
}
