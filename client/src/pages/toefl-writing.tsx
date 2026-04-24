import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { 
  Clock, ArrowLeft, Play, Pause, Volume2, VolumeX, 
  FileText, Users, Lightbulb, CheckCircle, 
  Timer, BookOpen, PenTool, MessageSquare,
  RotateCcw, Eye, EyeOff, Home, Award, Maximize, Minimize
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import { useFullscreen } from "@/hooks/useFullscreen";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext,
  createSafariCompatibleMediaRecorder,
  getSupportedMimeType
} from "@/lib/safariAudioCompat";
import classroomImage from "@assets/stock_images/university_classroom_3dad3784.jpg";
import type { WritingTest } from "@/components/toefl-writing/shared";

const DeferredToeflWritingSelectView = lazy(() => import("@/components/toefl-writing/ToeflWritingSelectView"));
const DeferredToeflWritingCompleteView = lazy(() => import("@/components/toefl-writing/ToeflWritingCompleteView"));

// Full Screen Button Component
function FullScreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  
  return (
    <Button
      size="sm"
      onClick={toggleFullscreen}
      className="bg-blue-700 hover:bg-blue-800 text-white font-bold border-0 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg"
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

interface TimerComponentProps {
  timeLeft: number;
  totalTime: number;
  isActive: boolean;
  onTimeUp: () => void;
}

function TimerComponent({ timeLeft, totalTime, isActive, onTimeUp }: TimerComponentProps) {
  const timeUpRef = useRef(false);

  // NO AUTO-SUBMIT: Timer does NOT automatically call onTimeUp when time expires
  // User must manually proceed after time runs out
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalTime > 0 ? Math.min(100, Math.max(0, ((totalTime - timeLeft) / totalTime) * 100)) : 0;
  const isTimeExpired = timeLeft <= 0;

  return (
    <div className={`flex items-center space-x-3 p-4 rounded-lg border ${isTimeExpired ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'}`}>
      <Timer className={`h-5 w-5 ${isTimeExpired ? 'text-red-600' : 'text-blue-primary'}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${isTimeExpired ? 'text-red-600' : 'text-gray-700'}`}>
            {isTimeExpired ? '⏰ 제한시간 종료' : 'Time Remaining'}
          </span>
          <span className={`font-mono text-lg font-bold ${timeLeft <= 60 ? 'text-red-500' : 'text-blue-primary'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
    </div>
  );
}

export default function ToeflWriting() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isPro, membershipTier } = useAuth();
  
  // State management
  const [currentTest, setCurrentTest] = useState<WritingTest | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'select' | 'reading' | 'listening' | 'writing' | 'complete'>('select');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [essayText, setEssayText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [listeningCompleted, setListeningCompleted] = useState(false);
  const [showListeningScript, setShowListeningScript] = useState(false);
  const [aiInterpretation, setAiInterpretation] = useState('');
  const [aiModelAnswer, setAiModelAnswer] = useState('');
  const [aiModelAnswerBeginner, setAiModelAnswerBeginner] = useState('');
  const [aiModelAnswerIntermediate, setAiModelAnswerIntermediate] = useState('');
  const [aiModelAnswerAdvanced, setAiModelAnswerAdvanced] = useState('');
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [showModelAnswerSection, setShowModelAnswerSection] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [improvedAnswer, setImprovedAnswer] = useState<string | null>(null);
  const [comprehensiveFeedback, setComprehensiveFeedback] = useState<any | null>(null);
  const [isComprehensiveFeedbackLoading, setIsComprehensiveFeedbackLoading] = useState(false);
  const [lectureAudioUrl, setLectureAudioUrl] = useState<string | null>(null);
  const [audioSegments, setAudioSegments] = useState<Array<{text: string; startTime: number; endTime: number}>>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number>(-1);

  const timerRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Query for tests
  // Fetch actual AI-generated TOEFL Writing tests from backend
  const { data: tests = [], isLoading: isLoadingTests, error: testsError } = useQuery<WritingTest[]>({
    queryKey: ["/api/tests", { examType: "toefl", section: "writing" }],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/tests?examType=toefl&section=writing");
      if (!response.ok) throw new Error("Failed to fetch tests");
      const data = await response.json();
      
      // Transform AI tests into WritingTest format
      return data.map((test: any) => {
        try {
          const questions = test.questions || [];
          
          // Find the first valid writing question by iterating through all questions
          // and validating each candidate before accepting it
          let validWritingTest = null;
          
          for (const q of questions) {
            // Must be a writing question (support both "writing" and "insertion" questionType)
            if (!q.writingType) {
              continue;
            }
            
            // Check if it's integrated or discussion type
            const isIntegrated = q.writingType === "integrated";
            
            if (isIntegrated) {
              // Validate integrated writing fields - both reading and listening are mandatory
              if (!q.readingPassage || !q.listeningScript) {
                console.warn(`Skipping invalid integrated question in test ${test.id}: missing required fields`);
                continue; // Try next question
              }
              
              validWritingTest = {
                id: test.id,
                title: test.title,
                type: "integrated" as const,
                readingPassage: q.readingPassage,
                listeningScript: q.listeningScript,
                timeLimit: q.writingTime || 1500,
                readingTime: q.readingTime || 180
              };
              break; // Found valid test
            } else {
              // Discussion type - validate required fields
              // Support both questionText (new) and professorQuestion (legacy)
              const discussionQuestion = q.questionText || q.professorQuestion;
              if (!discussionQuestion) {
                console.warn(`Skipping invalid discussion question in test ${test.id}: missing questionText/professorQuestion`);
                continue;
              }
              
              if (!q.studentResponses || !Array.isArray(q.studentResponses) || q.studentResponses.length === 0) {
                console.warn(`Skipping invalid discussion question in test ${test.id}: empty or invalid studentResponses`);
                continue;
              }
              
              // Validate each student response has required fields
              const validResponses = q.studentResponses.filter((s: any) => 
                s && typeof s.name === 'string' && s.name.trim() && 
                typeof s.response === 'string' && s.response.trim()
              );
              
              if (validResponses.length === 0) {
                console.warn(`Skipping invalid discussion question in test ${test.id}: no valid student responses`);
                continue;
              }
              
              validWritingTest = {
                id: test.id,
                title: test.title,
                type: "discussion" as const,
                discussionTopic: discussionQuestion,
                studentOpinions: validResponses.map((s: any) => ({
                  name: s.name,
                  opinion: s.response,
                  avatar: s.name[0].toUpperCase()
                })),
                timeLimit: q.writingTime || 600
              };
              break; // Found valid test
            }
          }
          
          if (!validWritingTest) {
            console.warn(`Skipping test ${test.id}: no valid writing question found after checking all questions`);
            return null;
          }
          
          return validWritingTest;
        } catch (error) {
          console.error(`Error transforming test ${test?.id}:`, error);
          return null;
        }
      }).filter(Boolean);
    }
  });

  // Show error toast if fetch fails or all tests are invalid
  useEffect(() => {
    if (testsError) {
      toast({
        title: "테스트 로드 실패",
        description: "Writing 테스트를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  }, [testsError, toast]);

  // Warn if tests were fetched but all were filtered out due to validation
  const [hasShownValidationWarning, setHasShownValidationWarning] = useState(false);
  useEffect(() => {
    // Only show warning once, after loading completes, if we have no tests but no fetch error
    if (!isLoadingTests && !testsError && tests.length === 0 && !hasShownValidationWarning) {
      // Check console for warnings - if there were validation issues, warn the user
      console.warn("All fetched writing tests were filtered out due to validation failures");
      toast({
        title: "테스트 검증 실패",
        description: "일부 테스트가 필수 데이터가 누락되어 표시할 수 없습니다. 관리자에게 문의하거나 새로운 테스트를 생성해주세요.",
        variant: "destructive"
      });
      setHasShownValidationWarning(true);
    }
  }, [isLoadingTests, testsError, tests.length, hasShownValidationWarning, toast]);

  // Mutation for AI interpretation
  const interpretationMutation = useMutation({
    mutationFn: async (data: { passage: string; script: string }) => {
      const response = await apiRequest("POST", "/api/writing/interpretation", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      setAiInterpretation(data.interpretation);
    }
  });

  // Mutation for AI model answer
  const modelAnswerMutation = useMutation({
    mutationFn: async (data: { testType: string; prompt: string; userEssay?: string }) => {
      const response = await apiRequest("POST", "/api/writing/model-answer", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log('Model answer response:', data);
      if (data && data.modelAnswer) {
        setAiModelAnswer(data.modelAnswer);
        setShowModelAnswerSection(true);
        if (data.score !== null && data.score !== undefined) setAiScore(data.score);
        if (data.feedback) setAiFeedback(data.feedback);
        
        // Set 3 levels for discussion type
        if (data.modelAnswerBeginner) setAiModelAnswerBeginner(data.modelAnswerBeginner);
        if (data.modelAnswerIntermediate) setAiModelAnswerIntermediate(data.modelAnswerIntermediate);
        if (data.modelAnswerAdvanced) setAiModelAnswerAdvanced(data.modelAnswerAdvanced);
        
        // Set improvedAnswer if available from server (both integrated and discussion)
        if (data.improvedAnswer) {
          setImprovedAnswer(data.improvedAnswer);
        } else if (essayText.trim().length > 0) {
          // Generate improved answer if not provided by server
          setTimeout(() => generateImprovedAnswer(), 500);
        }
      } else {
        console.error('Invalid response format:', data);
        toast({
          title: "Error",
          description: "Invalid response format from server.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error('Model answer error:', error);
      toast({
        title: "Error",
        description: "Failed to generate model answer. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for comprehensive AI feedback (ETS 2024 Rubric Based)
  const comprehensiveFeedbackMutation = useMutation({
    mutationFn: async (data: { 
      testType: 'integrated' | 'discussion';
      userEssay: string;
      readingPassage?: string;
      listeningScript?: string;
      discussionTopic?: string;
      studentOpinions?: { name: string; opinion: string }[];
      language?: string;
    }) => {
      const response = await apiRequest("POST", "/api/writing/comprehensive-feedback", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "피드백 생성 실패");
      }
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log('Comprehensive feedback response:', data);
      setIsComprehensiveFeedbackLoading(false);
      
      // Validate feedback data before showing - require non-empty modelAnswer for panel display
      const feedback = data.feedback;
      const hasValidModelAnswer = feedback?.modelAnswer && typeof feedback.modelAnswer === 'string' && feedback.modelAnswer.trim().length > 0;
      if (feedback && hasValidModelAnswer && (feedback.totalScore || feedback.etsScore || feedback.overallComment)) {
        setComprehensiveFeedback(feedback);
        
        // Also update legacy fields for backwards compatibility
        if (feedback.totalScore) {
          setAiScore(feedback.etsScore);
        }
        if (feedback.modelAnswer) {
          setAiModelAnswer(feedback.modelAnswer);
        }
        if (feedback.overallComment) {
          setAiFeedback(feedback.overallComment);
        }
        setShowModelAnswerSection(true);
      } else {
        console.error('Invalid feedback data:', feedback);
        toast({
          title: "피드백 오류",
          description: "피드백 데이터가 올바르지 않습니다. 다시 시도해주세요.",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error('Comprehensive feedback error:', error);
      setIsComprehensiveFeedbackLoading(false);
      toast({
        title: "피드백 생성 오류",
        description: error.message || "피드백 생성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    }
  });

  // Request comprehensive feedback
  const requestComprehensiveFeedback = () => {
    if (!currentTest || !essayText.trim()) return;
    
    setIsComprehensiveFeedbackLoading(true);
    
    if (currentTest.type === 'integrated') {
      comprehensiveFeedbackMutation.mutate({
        testType: 'integrated',
        userEssay: essayText,
        readingPassage: currentTest.readingPassage,
        listeningScript: currentTest.listeningScript,
        language: 'ko'
      });
    } else {
      comprehensiveFeedbackMutation.mutate({
        testType: 'discussion',
        userEssay: essayText,
        discussionTopic: currentTest.discussionTopic,
        studentOpinions: currentTest.studentOpinions,
        language: 'ko'
      });
    }
  };

  // Function to generate improved version of user's answer
  const generateImprovedAnswer = async () => {
    if (!currentTest || essayText.trim().length === 0) return;
    
    try {
      const prompt = currentTest.type === 'integrated' 
        ? `Reading: ${currentTest.readingPassage}\n\nListening: ${currentTest.listeningScript}`
        : `Topic: ${currentTest.discussionTopic}\n\nStudent Opinions: ${currentTest.studentOpinions?.map(op => `${op.name}: ${op.opinion}`).join('\n')}`;

      console.log('Generating improved answer...');
      const response = await apiRequest("POST", "/api/writing/improve-answer", {
        testType: currentTest.type,
        prompt,
        userEssay: essayText
      });
      const data = await response.json();
      
      console.log('Improved answer response:', data);
      if (data.improvedAnswer) {
        setImprovedAnswer(data.improvedAnswer);
        // Also store comparison feedback if available
        if (data.comparisonFeedback) {
          setAiFeedback(data.comparisonFeedback);
        }
      }
    } catch (error) {
      console.error('Error generating improved answer:', error);
      toast({
        title: "Error",
        description: "Failed to generate improved answer. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Timer management with auto progression
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1;
          
          // Auto progress when timer hits 0
          if (newTime === 0) {
            if (currentPhase === 'reading' && currentTest?.type === 'integrated') {
              // Auto move to listening after reading
              setTimeout(() => {
                setCurrentPhase('listening');
                setTimeLeft(180); // 3 minutes for listening
                setIsTimerActive(false); // Timer will start when user plays audio
              }, 100);
            } else if (currentPhase === 'listening' && currentTest?.type === 'integrated') {
              // Auto move to writing after listening
              setTimeout(() => {
                setIsAudioPlaying(false);
                setListeningCompleted(true);
                startWritingPhase();
              }, 100);
            }
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerActive, timeLeft, currentPhase, currentTest]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Auto-play audio when entering listening phase
  useEffect(() => {
    if (currentPhase === 'listening' && currentTest?.type === 'integrated' && lectureAudioUrl && audioRef.current) {
      // Small delay to ensure audio element is ready
      const autoPlayTimer = setTimeout(async () => {
        if (audioRef.current && !isAudioPlaying) {
          try {
            await unlockAudioContext();
            await playSafariCompatibleAudio(audioRef.current);
            setIsAudioPlaying(true);
            setIsTimerActive(true);
          } catch (error) {
            console.log('Auto-play failed, waiting for user interaction:', error);
          }
        }
      }, 500);
      return () => clearTimeout(autoPlayTimer);
    }
  }, [currentPhase, currentTest, lectureAudioUrl]);

  // Word count calculation
  useEffect(() => {
    const words = essayText.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [essayText]);

  const startTest = (test: WritingTest) => {
    setCurrentTest(test);
    setIsSubmitted(false);
    setComprehensiveFeedback(null);
    setShowModelAnswerSection(false);
    if (test.type === 'integrated') {
      setCurrentPhase('reading');
      setTimeLeft(test.readingTime || 180);
    } else {
      setCurrentPhase('writing');
      setTimeLeft(test.timeLimit);
    }
    setIsTimerActive(true);
    setEssayText('');
    setWordCount(0);
    setShowScript(false);
    setShowInterpretation(false);
    setShowModelAnswer(false);
    setListeningCompleted(false);
    setAiInterpretation('');
    setAiModelAnswer('');
    setAiScore(null);
    setAiFeedback('');
  };

  const handleTimeUp = () => {
    setIsTimerActive(false);
    // NO AUTO-SUBMIT: User must manually proceed after time expires
    // This function is now only called when timer naturally ends, but does NOT auto-advance
  };

  // Generate lecture audio when entering listening phase
  useEffect(() => {
    if (currentPhase === 'listening' && currentTest?.listeningScript && !lectureAudioUrl) {
      const generateAudio = async () => {
        try {
          const response = await apiRequest("POST", "/api/writing/listening-audio", {
            script: currentTest.listeningScript,
            type: "lecture"
          });
          const data = await response.json();
          setLectureAudioUrl(data.audioUrl);
          setAudioSegments(data.segments || []);
          console.log("Lecture audio generated:", data.audioUrl);
        } catch (error) {
          console.error("Failed to generate lecture audio:", error);
          toast({
            title: "Audio Generation Failed",
            description: "Could not generate lecture audio. Please try again.",
            variant: "destructive"
          });
        }
      };
      generateAudio();
    }
  }, [currentPhase, currentTest, lectureAudioUrl]);

  const playListeningAudio = async () => {
    if (!audioRef.current || !lectureAudioUrl) return;
    try {
      await unlockAudioContext();
      await playSafariCompatibleAudio(audioRef.current);
      setIsAudioPlaying(true);
      setIsTimerActive(true);
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  };

  const pauseListeningAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
      setIsTimerActive(false);
    }
  };

  const resumeListeningAudio = async () => {
    if (audioRef.current) {
      try {
        await unlockAudioContext();
        await playSafariCompatibleAudio(audioRef.current);
        setIsAudioPlaying(true);
        setIsTimerActive(true);
      } catch (error) {
        console.error('Audio resume failed:', error);
      }
    }
  };

  const stopListeningAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAudioPlaying(false);
      setIsTimerActive(false);
      setCurrentSegmentIndex(-1);
    }
  };

  // Track audio progress and highlight current segment
  const handleAudioTimeUpdate = () => {
    if (!audioRef.current || audioSegments.length === 0) return;
    
    const currentTime = audioRef.current.currentTime;
    
    // Find current segment
    const segmentIndex = audioSegments.findIndex(
      seg => currentTime >= seg.startTime && currentTime < seg.endTime
    );
    
    if (segmentIndex !== currentSegmentIndex) {
      setCurrentSegmentIndex(segmentIndex);
    }
  };

  const startWritingPhase = () => {
    if (!currentTest) return;
    
    setCurrentPhase('writing');
    setTimeLeft(currentTest.timeLimit);
    setIsTimerActive(true);

    // Generate AI interpretation for integrated tests
    if (currentTest.type === 'integrated' && currentTest.readingPassage && currentTest.listeningScript) {
      interpretationMutation.mutate({
        passage: currentTest.readingPassage,
        script: currentTest.listeningScript
      });
    }
  };

  const handleSubmitEssay = () => {
    if (!currentTest) return;

    // Generate AI model answer and score
    const prompt = currentTest.type === 'integrated' 
      ? `Reading: ${currentTest.readingPassage}\n\nListening: ${currentTest.listeningScript}`
      : `Topic: ${currentTest.discussionTopic}\n\nStudent Opinions: ${currentTest.studentOpinions?.map(op => `${op.name}: ${op.opinion}`).join('\n')}`;

    modelAnswerMutation.mutate({
      testType: currentTest.type,
      prompt,
      userEssay: essayText
    });
  };

  const resetTest = () => {
    setCurrentTest(null);
    setCurrentPhase('select');
    setTimeLeft(0);
    setIsTimerActive(false);
    setEssayText('');
    setWordCount(0);
    setIsSubmitted(false);
    setComprehensiveFeedback(null);
    setShowModelAnswerSection(false);
  };

  // Sub-selection state for writing type
  const [selectedWritingType, setSelectedWritingType] = useState<'integrated' | 'discussion' | null>(null);

  if (currentPhase === 'select') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Writing 화면을 불러오는 중...</div>}>
        <DeferredToeflWritingSelectView
          isLoadingTests={isLoadingTests}
          tests={tests}
          selectedWritingType={selectedWritingType}
          setSelectedWritingType={setSelectedWritingType}
          startTest={startTest}
        />
      </Suspense>
    );
  }

  if (!currentTest) return null;

  return (
    <SecurityWrapper 
      showUserWatermark={true}
      disableRightClick={true}
      disableKeyboardShortcuts={true}
      disableTextSelection={true}
      disableScreenshot={true}
      showSecurityNotice={true}
    >
      <FullscreenWrapper className="min-h-screen bg-white" hideButton={true}>
      {/* Header with Timer - Compact and Consistent */}
      <div className="sticky top-0 z-10 bg-blue-900 text-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetTest}
                className="text-white hover:bg-blue-800 h-10 px-4"
                style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit
              </Button>
              <div>
                <h1 className="text-lg font-bold" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>{currentTest.title}</h1>
                <p className="text-xs text-blue-200" style={{fontFamily: 'Arial, sans-serif'}}>
                  {currentPhase === 'reading' && 'Reading Phase'}
                  {currentPhase === 'listening' && 'Listening Phase'}
                  {currentPhase === 'writing' && 'Writing Phase'}
                  {currentPhase === 'complete' && 'Test Complete'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {currentPhase !== 'complete' && (
                <div className="w-72">
                  <TimerComponent
                    timeLeft={timeLeft}
                    totalTime={currentPhase === 'reading' ? (currentTest.readingTime || 180) : currentTest.timeLimit}
                    isActive={isTimerActive}
                    onTimeUp={handleTimeUp}
                  />
                </div>
              )}
              {currentPhase === 'reading' && currentTest.type === 'integrated' && (
                <Button
                  onClick={() => {
                    setCurrentPhase('listening');
                    setTimeLeft(180);
                    setIsTimerActive(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6 rounded-lg"
                  style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                >
                  Continue
                </Button>
              )}
              <FullScreenButton />
            </div>
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-72px)] overflow-hidden">
        {/* Reading Phase - Fixed height with internal scroll */}
        {currentPhase === 'reading' && currentTest.type === 'integrated' && (
          <div className="h-full p-4">
            <div className="grid grid-cols-2 gap-6 h-full max-w-7xl mx-auto">
              {/* Left Side - Reading Passage */}
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-300 flex flex-col h-full overflow-hidden">
                <div className="bg-blue-900 text-white px-5 py-3 rounded-t-lg flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>
                      <BookOpen className="h-5 w-5 mr-2" />
                      Reading Passage
                    </h2>
                    <Badge className="bg-white text-blue-900 border-white text-xs">
                      <span style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Step 1 of 3</span>
                    </Badge>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="prose prose-base max-w-none text-gray-900 leading-relaxed">
                    {currentTest.readingPassage?.split('\n').map((paragraph, index) => (
                      paragraph.trim() ? (
                        <p key={index} className="mb-4 text-base text-gray-900" style={{fontFamily: 'Arial, sans-serif', fontSize: '17px', lineHeight: '1.7', color: '#1a1a1a'}}>
                          {paragraph.trim()}
                        </p>
                      ) : null
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side - Instructions */}
              <div className="bg-blue-50 rounded-lg shadow-lg border-2 border-blue-200 flex flex-col h-full overflow-hidden">
                <div className="bg-blue-800 text-white px-5 py-3 rounded-t-lg flex-shrink-0">
                  <h3 className="text-lg font-bold" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Instructions</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="space-y-4 text-gray-900">
                    <p className="leading-relaxed" style={{fontFamily: 'Arial, sans-serif', fontSize: '17px', lineHeight: '1.7', color: '#1a1a1a'}}>
                      You have 3 minutes to read the passage. Take notes on the main points as you read.
                    </p>
                    <p className="leading-relaxed" style={{fontFamily: 'Arial, sans-serif', fontSize: '17px', lineHeight: '1.7', color: '#1a1a1a'}}>
                      After reading, you will listen to a lecture on the same topic. The lecture will challenge or support the points made in the reading.
                    </p>
                    <p className="leading-relaxed" style={{fontFamily: 'Arial, sans-serif', fontSize: '17px', lineHeight: '1.7', color: '#1a1a1a'}}>
                      Finally, you will have 20 minutes to write your response.
                    </p>
                    
                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mt-4">
                      <h4 className="font-bold text-gray-900 mb-2 text-base" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Tips:</h4>
                      <ul className="text-sm text-gray-800 space-y-2" style={{fontFamily: 'Arial, sans-serif'}}>
                        <li>• Focus on the main arguments and supporting details</li>
                        <li>• Take notes while reading - you can refer to them later</li>
                        <li>• Pay attention to how ideas are organized</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Next Button - Fixed at bottom */}
                <div className="flex-shrink-0 p-4 border-t border-blue-200 bg-blue-100">
                  <Button
                    onClick={() => {
                      setCurrentPhase('listening');
                      setTimeLeft(180);
                      setIsTimerActive(false);
                    }}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold h-12 text-lg rounded-lg"
                    style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Listening Phase */}
        {currentPhase === 'listening' && currentTest.type === 'integrated' && (
          <div className={`mx-auto ${showListeningScript ? 'max-w-[1400px]' : 'max-w-5xl'}`}>
            <div className="bg-white rounded-lg shadow-lg border-2 border-gray-300 overflow-hidden">
              {/* Header */}
              <div className="bg-blue-900 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>
                    <Volume2 className="h-6 w-6 mr-2" />
                    Now Listening to Lecture
                  </h2>
                  <div className="flex items-center gap-4">
                    <Button
                      size="sm"
                      onClick={() => setShowListeningScript(!showListeningScript)}
                      className="bg-white text-blue-900 hover:bg-blue-50 font-bold border-0 flex items-center gap-2 px-4 py-2 rounded-lg"
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      {showListeningScript ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span>{showListeningScript ? 'Hide' : 'Show'} Script</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.pause();
                        }
                        setIsAudioPlaying(false);
                        setListeningCompleted(true);
                        startWritingPhase();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold border-0 flex items-center gap-2 px-4 py-2 rounded-lg"
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      <span>Next →</span>
                    </Button>
                    <Badge className="bg-white text-blue-900 border-white">
                      <span style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Step 2 of 3</span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Professor Lecture Screen */}
              <div className="bg-gradient-to-b from-blue-50 to-blue-100 p-8">
                <div className={`${showListeningScript ? 'grid grid-cols-[1fr,500px] gap-6' : 'flex justify-center'}`}>
                  {/* Left Side - University Lecture Hall Image */}
                  <div className="flex flex-col items-center space-y-6">
                    <div className="relative w-[600px] h-[400px] rounded-lg border-4 border-gray-800 shadow-2xl overflow-hidden">
                      <img 
                        src={classroomImage}
                        alt="Biology lecture about cane toads" 
                        className="w-full h-full object-cover"
                      />
                      {/* Lecture Screen Overlay - Showing Topic */}
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-900/90 backdrop-blur-sm px-8 py-4 rounded-lg border-2 border-blue-400 shadow-xl">
                        <div className="text-white text-center">
                          <div className="text-sm font-medium mb-1">Biology Lecture</div>
                          <div className="text-2xl font-bold">Cane Toad Control Methods</div>
                          <div className="text-xs mt-1 text-blue-200">Professor Wilson • Biology Department</div>
                        </div>
                      </div>
                    </div>

                  {!listeningCompleted && (
                    <div className="space-y-4">
                      <p className="text-lg font-medium text-blue-900" style={{fontFamily: 'Arial, sans-serif'}}>
                        {isAudioPlaying ? '🎧 Lecture is playing...' : '🎧 Click to start the lecture'}
                      </p>
                      
                      <div className="flex justify-center space-x-4">
                        {!isAudioPlaying ? (
                          <Button 
                            onClick={playListeningAudio} 
                            className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 text-lg"
                            style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                            data-testid="button-play-lecture"
                          >
                            <Play className="h-6 w-6 mr-2" />
                            Play Lecture
                          </Button>
                        ) : (
                          <>
                            <Button 
                              onClick={pauseListeningAudio} 
                              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 text-lg"
                              style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                              data-testid="button-pause-lecture"
                            >
                              <Pause className="h-6 w-6 mr-2" />
                              Pause
                            </Button>
                            <Button 
                              onClick={stopListeningAudio} 
                              variant="outline"
                              className="border-2 border-red-600 text-red-600 hover:bg-red-50 px-8 py-4 text-lg"
                              style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                              data-testid="button-stop-lecture"
                            >
                              <VolumeX className="h-6 w-6 mr-2" />
                              Stop
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {isAudioPlaying && timeLeft > 0 && (
                        <div className="max-w-md mx-auto mt-4">
                          <Progress value={((180 - timeLeft) / 180) * 100} className="h-3" />
                          <p className="text-sm text-blue-700 mt-2 text-center" style={{fontFamily: 'Arial, sans-serif'}}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} remaining
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {listeningCompleted && (
                    <div className="space-y-4">
                      <p className="text-lg font-medium text-blue-800" style={{fontFamily: 'Arial, sans-serif'}}>✅ Listening completed!</p>
                      <div className="flex justify-center space-x-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowScript(!showScript)}
                          className="text-blue-700 border-2 border-blue-300 hover:bg-blue-50"
                          style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {showScript ? 'Hide' : 'Show'} Script
                        </Button>
                        <Button 
                          onClick={startWritingPhase} 
                          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2"
                          style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                        >
                          Start Writing
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>

                  {/* Right Side - Script Panel (Separate Column) */}
                  {showListeningScript && currentTest.listeningScript && (
                    <div className="bg-white rounded-lg border-4 border-blue-900 shadow-2xl overflow-hidden">
                      <div className="bg-blue-900 text-white px-6 py-4">
                        <h3 className="text-xl font-bold flex items-center" style={{fontFamily: 'Arial, sans-serif'}}>
                          <FileText className="h-5 w-5 mr-2" />
                          Lecture Script
                        </h3>
                      </div>
                      <div className="p-6 h-[520px] overflow-y-auto bg-gray-50">
                        {audioSegments.length > 0 ? (
                          <div className="space-y-2">
                            {audioSegments.map((segment, index) => (
                              <div 
                                key={index}
                                className={`p-2 rounded transition-colors ${
                                  index === currentSegmentIndex 
                                    ? 'bg-yellow-200 border-l-4 border-yellow-500' 
                                    : 'hover:bg-gray-100'
                                }`}
                                style={{fontFamily: 'Arial, sans-serif', fontSize: '0.95rem', lineHeight: '1.8'}}
                              >
                                {segment.text}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap" style={{fontFamily: 'Arial, sans-serif', fontSize: '0.95rem', lineHeight: '1.8'}}>
                            {currentTest.listeningScript}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden Audio Element */}
            {lectureAudioUrl && (
              <audio
                ref={audioRef}
                src={lectureAudioUrl}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={() => {
                  setIsAudioPlaying(false);
                  setListeningCompleted(true);
                  setIsTimerActive(false);
                  setCurrentSegmentIndex(-1);
                  toast({
                    title: "Listening Complete",
                    description: "You can now view the script and start writing.",
                  });
                }}
                onPlay={() => {
                  setIsAudioPlaying(true);
                  setIsTimerActive(true);
                }}
                onPause={() => {
                  setIsAudioPlaying(false);
                  setIsTimerActive(false);
                }}
                preload="auto"
                playsInline
                webkit-playsinline="true"
              />
            )}

            {/* Script and Interpretation */}
            {showScript && currentTest.listeningScript && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-900" style={{fontFamily: 'Arial, sans-serif'}}>
                    <FileText className="h-5 w-5 mr-2 text-blue-700" />
                    Lecture Script
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="script">
                    <TabsList>
                      <TabsTrigger value="script" className="text-blue-700" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Original Script</TabsTrigger>
                      <TabsTrigger value="interpretation" className="text-blue-700" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>AI Interpretation</TabsTrigger>
                    </TabsList>
                    <TabsContent value="script" className="mt-4">
                      <div className="prose max-w-none">
                        <div className="text-blue-900 leading-relaxed whitespace-pre-wrap" style={{fontFamily: 'Arial, sans-serif'}}>
                          {currentTest.listeningScript}
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="interpretation" className="mt-4">
                      {interpretationMutation.isPending ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full mr-3" />
                          <span style={{fontFamily: 'Arial, sans-serif'}}>Generating AI interpretation...</span>
                        </div>
                      ) : (
                        <div className="prose max-w-none">
                          <div className="text-gray-800 leading-relaxed">
                            {aiInterpretation || "Click 'Start Writing' to generate AI interpretation of the reading and listening passages."}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Writing Phase */}
        {currentPhase === 'writing' && (
          <div className="space-y-6">
            {currentTest.type === 'integrated' ? (
              // Integrated Writing Layout - 50:50 Split
              <div className="max-w-7xl mx-auto">
                <div className="border-2 border-gray-400 rounded-lg bg-white shadow-lg">
                  {/* Header */}
                  <div className="bg-blue-900 text-white px-8 py-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Integrated Writing Task</h2>
                      <div className="text-lg" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Step 3 of 3</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-0 min-h-[700px]">
                    {/* Left Side - Reading Passage */}
                    <div className="border-r-2 border-gray-300">
                      <div className="bg-blue-100 px-6 py-4 border-b-2 border-blue-300 h-[88px] flex flex-col justify-center">
                        <h4 className="text-lg font-bold text-blue-900" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Reading Passage</h4>
                        <p className="text-sm text-blue-700 mt-1" style={{fontFamily: 'Arial, sans-serif'}}>Review the reading material while writing</p>
                      </div>
                      <div className="p-6 h-[600px] overflow-y-auto">
                        <div className="text-base text-blue-900 leading-relaxed">
                          {currentTest.readingPassage?.split('\n').map((paragraph, index) => (
                            paragraph.trim() ? (
                              <p key={index} className="mb-4" style={{fontFamily: 'Arial, sans-serif'}}>
                                {paragraph.trim()}
                              </p>
                            ) : null
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side - Writing Area */}
                    <div>
                      <div className="bg-blue-100 px-6 py-4 border-b-2 border-blue-300 h-[88px] flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-blue-900 flex items-center" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>
                            <PenTool className="h-5 w-5 mr-2 text-blue-700" />
                            Writing
                          </h3>
                          <div className="text-base text-blue-800 font-medium" style={{fontFamily: 'Arial, sans-serif'}}>
                            <span>Word Count: <span className="font-bold text-blue-900">{wordCount}</span></span>
                          </div>
                        </div>
                        <p className="text-xs text-blue-700 mt-1 leading-snug" style={{fontFamily: 'Arial, sans-serif'}}>
                          Summarize the points made in the lecture, being sure to explain how they cast doubt on specific points made in the reading passage.
                        </p>
                      </div>
                      <Textarea
                        value={essayText}
                        onChange={(e) => setEssayText(e.target.value)}
                        placeholder="Start writing your response here..."
                        className="min-h-[500px] border-0 rounded-none resize-none focus:ring-0 leading-relaxed p-6"
                        style={{ fontSize: '120%', fontFamily: 'Arial, sans-serif' }}
                      />
                      
                      {/* Submit & Feedback Buttons */}
                      <div className="border-t-2 border-blue-300 p-3 bg-blue-50 flex gap-3">
                        <Button
                          onClick={() => {
                            if (essayText.trim().length === 0) {
                              toast({
                                title: "에세이를 작성해주세요",
                                description: "제출하기 전에 먼저 답변을 작성해주세요.",
                                variant: "destructive",
                              });
                              return;
                            }
                            setIsSubmitted(true);
                            toast({
                              title: "✅ 제출 완료",
                              description: "에세이가 제출되었습니다.",
                            });
                          }}
                          disabled={isSubmitted || essayText.trim().length === 0}
                          className={`flex-1 py-3 font-bold ${isSubmitted ? 'bg-green-600 text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'}`}
                          style={{fontFamily: 'Arial, sans-serif'}}
                          data-testid="button-submit-integrated"
                        >
                          <CheckCircle className="h-5 w-5 mr-2" />
                          {isSubmitted ? '제출됨' : '제출하기'}
                        </Button>
                        <Button
                          onClick={() => {
                            if (!isPro) {
                              toast({
                                title: "🔒 PRO 등급 필요",
                                description: "AI 종합 피드백 기능은 PRO 이상 회원만 이용 가능합니다.",
                                variant: "destructive",
                              });
                              return;
                            }
                            if (!isSubmitted) {
                              toast({
                                title: "먼저 제출해주세요",
                                description: "피드백을 받으려면 먼저 에세이를 제출해야 합니다.",
                                variant: "destructive",
                              });
                              return;
                            }
                            requestComprehensiveFeedback();
                          }}
                          disabled={isComprehensiveFeedbackLoading || comprehensiveFeedbackMutation.isPending}
                          className={`flex-1 py-3 font-bold ${isPro && isSubmitted ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-400 hover:bg-gray-500 text-gray-200'}`}
                          style={{fontFamily: 'Arial, sans-serif'}}
                          data-testid="button-request-feedback-integrated"
                        >
                          {isComprehensiveFeedbackLoading || comprehensiveFeedbackMutation.isPending ? (
                            <>
                              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                              생성 중...
                            </>
                          ) : (
                            <>
                              <Award className="h-5 w-5 mr-2" />
                              피드백 요청
                              {!isPro && <span className="ml-1 text-xs">🔒</span>}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Comprehensive Feedback Section (ETS 2024 Rubric Based) */}
                  {showModelAnswerSection && comprehensiveFeedback && (
                    <div className="border-t-4 border-blue-500 bg-gradient-to-br from-slate-50 to-blue-50 p-8 space-y-8" data-testid="comprehensive-feedback-section">
                      {/* Header with ETS Score */}
                      <div className="text-center space-y-4">
                        <h3 className="text-2xl font-bold text-gray-900">📊 ETS 공식 기준 종합 피드백</h3>
                        <div className="flex items-center justify-center gap-8">
                          <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-lg">
                            <div className="text-sm font-medium opacity-90">ETS 점수</div>
                            <div className="text-4xl font-bold">{comprehensiveFeedback.etsScore}/5</div>
                          </div>
                          <div className="bg-green-600 text-white rounded-2xl p-6 shadow-lg">
                            <div className="text-sm font-medium opacity-90">환산 점수</div>
                            <div className="text-4xl font-bold">{comprehensiveFeedback.totalScore}/30</div>
                          </div>
                        </div>
                        <p className="text-gray-700 text-lg max-w-3xl mx-auto">{comprehensiveFeedback.overallComment}</p>
                      </div>

                      {/* Detailed Scores */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {comprehensiveFeedback.contentAccuracy && (
                          <Card className="border-2 border-blue-200">
                            <CardHeader className="py-3 bg-blue-50">
                              <CardTitle className="text-sm text-blue-800">요약 정확도</CardTitle>
                            </CardHeader>
                            <CardContent className="py-3">
                              <div className="text-2xl font-bold text-blue-700 mb-1">{comprehensiveFeedback.contentAccuracy.score}/10</div>
                              <p className="text-xs text-gray-600">{comprehensiveFeedback.contentAccuracy.comment}</p>
                            </CardContent>
                          </Card>
                        )}
                        {comprehensiveFeedback.argumentation && (
                          <Card className="border-2 border-purple-200">
                            <CardHeader className="py-3 bg-purple-50">
                              <CardTitle className="text-sm text-purple-800">논리 전개</CardTitle>
                            </CardHeader>
                            <CardContent className="py-3">
                              <div className="text-2xl font-bold text-purple-700 mb-1">{comprehensiveFeedback.argumentation.score}/10</div>
                              <p className="text-xs text-gray-600">{comprehensiveFeedback.argumentation.comment}</p>
                            </CardContent>
                          </Card>
                        )}
                        {comprehensiveFeedback.organization && (
                          <Card className="border-2 border-green-200">
                            <CardHeader className="py-3 bg-green-50">
                              <CardTitle className="text-sm text-green-800">구성</CardTitle>
                            </CardHeader>
                            <CardContent className="py-3">
                              <div className="text-2xl font-bold text-green-700 mb-1">{comprehensiveFeedback.organization.score}/10</div>
                              <p className="text-xs text-gray-600">{comprehensiveFeedback.organization.comment}</p>
                            </CardContent>
                          </Card>
                        )}
                        {comprehensiveFeedback.development && (
                          <Card className="border-2 border-indigo-200">
                            <CardHeader className="py-3 bg-indigo-50">
                              <CardTitle className="text-sm text-indigo-800">발전성</CardTitle>
                            </CardHeader>
                            <CardContent className="py-3">
                              <div className="text-2xl font-bold text-indigo-700 mb-1">{comprehensiveFeedback.development.score}/10</div>
                              <p className="text-xs text-gray-600">{comprehensiveFeedback.development.comment}</p>
                            </CardContent>
                          </Card>
                        )}
                        <Card className="border-2 border-orange-200">
                          <CardHeader className="py-3 bg-orange-50">
                            <CardTitle className="text-sm text-orange-800">언어 사용</CardTitle>
                          </CardHeader>
                          <CardContent className="py-3">
                            <div className="text-2xl font-bold text-orange-700 mb-1">{comprehensiveFeedback.languageUse?.score}/10</div>
                            <p className="text-xs text-gray-600">{comprehensiveFeedback.languageUse?.comment}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-2 border-red-200">
                          <CardHeader className="py-3 bg-red-50">
                            <CardTitle className="text-sm text-red-800">문법</CardTitle>
                          </CardHeader>
                          <CardContent className="py-3">
                            <div className="text-2xl font-bold text-red-700 mb-1">{comprehensiveFeedback.grammar?.score}/10</div>
                            <p className="text-xs text-gray-600">{comprehensiveFeedback.grammar?.comment}</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Sentence-by-Sentence Feedback */}
                      {comprehensiveFeedback.sentenceFeedback && comprehensiveFeedback.sentenceFeedback.length > 0 && (
                        <Card className="border-2 border-gray-200">
                          <CardHeader className="bg-gray-50">
                            <CardTitle className="flex items-center text-gray-800">
                              <MessageSquare className="h-5 w-5 mr-2" />
                              문장별 피드백
                            </CardTitle>
                            <CardDescription>각 문장에 대한 상세 분석 및 수정 제안</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {comprehensiveFeedback.sentenceFeedback.map((sf: any, idx: number) => (
                                <div 
                                  key={idx} 
                                  className={`p-4 rounded-lg border ${sf.hasError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
                                >
                                  <div className="flex items-start gap-3">
                                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${sf.hasError ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                                      {idx + 1}
                                    </span>
                                    <div className="flex-1 space-y-2">
                                      <p className="text-sm text-gray-800"><span className="font-semibold">원문:</span> {sf.original}</p>
                                      {sf.hasError && sf.correction !== sf.original && (
                                        <p className="text-sm text-green-700"><span className="font-semibold">수정:</span> {sf.correction}</p>
                                      )}
                                      {sf.errorType && (
                                        <span className={`inline-block text-xs px-2 py-1 rounded ${
                                          sf.errorType === 'grammar' ? 'bg-red-100 text-red-700' :
                                          sf.errorType === 'vocabulary' ? 'bg-orange-100 text-orange-700' :
                                          sf.errorType === 'clarity' ? 'bg-yellow-100 text-yellow-700' :
                                          sf.errorType === 'logic' ? 'bg-purple-100 text-purple-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {sf.errorType === 'grammar' ? '문법' :
                                           sf.errorType === 'vocabulary' ? '어휘' :
                                           sf.errorType === 'clarity' ? '명확성' :
                                           sf.errorType === 'logic' ? '논리' : '스타일'}
                                        </span>
                                      )}
                                      <p className="text-sm text-gray-600">{sf.feedback}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Model Answer */}
                      {comprehensiveFeedback.modelAnswer && (
                        <Card className="border-2 border-blue-300">
                          <CardHeader className="bg-blue-50">
                            <CardTitle className="flex items-center text-blue-800">
                              <Award className="h-5 w-5 mr-2" />
                              모범답안
                            </CardTitle>
                            <CardDescription>ETS 기준 고득점 답안 예시</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="bg-white p-4 rounded-lg border border-blue-200">
                              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap" style={{fontSize: '17px', color: '#1a1a1a'}}>
                                {comprehensiveFeedback.modelAnswer}
                              </p>
                            </div>
                            <div className="mt-3 text-sm text-gray-500">
                              단어 수: {comprehensiveFeedback.modelAnswer.split(/\s+/).length}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Essential Expressions */}
                      {comprehensiveFeedback.essentialExpressions && comprehensiveFeedback.essentialExpressions.length > 0 && (
                        <Card className="border-2 border-amber-200">
                          <CardHeader className="bg-amber-50">
                            <CardTitle className="flex items-center text-amber-800">
                              <Lightbulb className="h-5 w-5 mr-2" />
                              필수 표현 5선
                            </CardTitle>
                            <CardDescription>모범답안에서 추출한 핵심 학술 표현</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {comprehensiveFeedback.essentialExpressions.map((expr: any, idx: number) => (
                                <div key={idx} className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                    <span className="font-bold text-amber-900">{expr.expression}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-2"><span className="font-medium">의미:</span> {expr.meaning}</p>
                                  <p className="text-sm text-gray-600 italic bg-amber-50 p-2 rounded"><span className="font-medium not-italic">예문:</span> {expr.exampleSentence}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Key Points Covered (for Integrated only) */}
                      {comprehensiveFeedback.keyPointsCovered && comprehensiveFeedback.keyPointsCovered.length > 0 && (
                        <Card className="border-2 border-teal-200">
                          <CardHeader className="bg-teal-50">
                            <CardTitle className="flex items-center text-teal-800">
                              <CheckCircle className="h-5 w-5 mr-2" />
                              주요 포인트 체크
                            </CardTitle>
                            <CardDescription>강의의 핵심 내용 반영 여부</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              {comprehensiveFeedback.keyPointsCovered.map((kp: any, idx: number) => (
                                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${kp.covered ? 'bg-green-50' : 'bg-red-50'}`}>
                                  <span className={`mt-0.5 ${kp.covered ? 'text-green-600' : 'text-red-600'}`}>
                                    {kp.covered ? '✅' : '❌'}
                                  </span>
                                  <div>
                                    <p className="font-medium text-gray-800">{kp.point}</p>
                                    <p className="text-sm text-gray-600">{kp.comment}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Legacy Enhanced Model Answer and Feedback Section for Integrated Writing */}
                  {showModelAnswerSection && !comprehensiveFeedback && currentTest.type === 'integrated' && (
                    <div className="border-t-4 border-green-500 bg-white p-8 space-y-6">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">✨ AI Analysis & Improvement</h3>
                        <p className="text-gray-600">Professional model answer and personalized feedback</p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Model Answer */}
                        <Card className="border-2 border-blue-200">
                          <CardHeader className="bg-blue-50">
                            <CardTitle className="flex items-center text-blue-800">
                              <Award className="h-6 w-6 mr-3" />
                              Model Answer
                            </CardTitle>
                            <CardDescription>
                              Professional-level response demonstrating excellent integration
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6">
                            {aiModelAnswer ? (
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                                  {aiModelAnswer}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="text-gray-500 text-center">
                                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                  Generating model answer...
                                </div>
                              </div>
                            )}
                            <div className="mt-4 text-sm text-gray-600">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                                Model: {aiModelAnswer ? aiModelAnswer.split(/\s+/).length : 0} words
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Improved User Answer (if user wrote something) */}
                        {essayText.trim().length > 0 && (
                          <Card className="border-2 border-green-200">
                            <CardHeader className="bg-green-50">
                              <CardTitle className="flex items-center text-green-800">
                                <Lightbulb className="h-6 w-6 mr-3" />
                                Your Improved Version
                              </CardTitle>
                              <CardDescription>
                                Enhanced version of your response with better structure and language
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                              {improvedAnswer ? (
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                                    {improvedAnswer}
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                  <div className="text-gray-500 text-center">
                                    <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                    Improving your response...
                                  </div>
                                </div>
                              )}
                              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                                <span>Your Original: {wordCount} words</span>
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                                  Improved: {improvedAnswer ? improvedAnswer.split(/\s+/).length : 0} words
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* AI Feedback Section */}
                      {(aiFeedback || essayText.trim().length > 0) && (
                        <Card className="border-2 border-gray-200">
                          <CardHeader className="bg-white dark:bg-gray-800">
                            <CardTitle className="flex items-center text-gray-800 dark:text-gray-200">
                              <MessageSquare className="h-6 w-6 mr-3" />
                              Detailed Feedback & Analysis
                            </CardTitle>
                            <CardDescription>
                              Professional evaluation and suggestions for improvement
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-6">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                              {aiFeedback ? (
                                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                                  {aiFeedback}
                                </div>
                              ) : essayText.trim().length > 0 ? (
                                <div className="text-gray-500 text-center">
                                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                  Generating AI feedback...
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-bold text-gray-900 mb-2">Integration Tips:</h4>
                                      <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• Clearly summarize lecture points that challenge reading</li>
                                        <li>• Use specific examples from both sources</li>
                                        <li>• Show explicit connections between materials</li>
                                      </ul>
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-900 mb-2">Writing Quality:</h4>
                                      <ul className="text-sm text-gray-700 space-y-1">
                                        <li>• Use clear topic sentences for each paragraph</li>
                                        <li>• Employ appropriate transitions between ideas</li>
                                        <li>• Maintain academic tone throughout</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Discussion Writing Layout - Exact Match to Sample Image
              <div className="max-w-7xl mx-auto">
                <div className="border-2 border-gray-400 rounded-lg bg-white shadow-lg">
                  {/* Header - 60% reduced height */}
                  <div className="bg-blue-900 text-white px-6 py-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Discussion Task</h2>
                      <div className="text-sm" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Section 1 of 1</div>
                    </div>
                  </div>

                  {/* Main Content Grid - adjusted height for better fit */}
                  <div className="grid grid-cols-10 min-h-[450px] max-h-[calc(100vh-200px)]">
                    {/* Left Side - Directions & Topic */}
                    <div className="col-span-4 border-r-2 border-gray-400 p-6">
                      <div className="mb-8">
                        {/* Directions */}
                        <div className="mb-7">
                          <h3 className="text-lg font-bold text-blue-900 mb-3" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Directions</h3>
                          <p className="text-base text-blue-800 leading-relaxed" style={{fontFamily: 'Arial, sans-serif'}}>
                            You have 10 minutes to plan, write, and revise your response to the discussion topic below. Your response will be scored on the quality and clarity of your writing and on how well your response presents the points in the discussion and contributes to the conversation.
                          </p>
                          <p className="text-base mt-3 leading-relaxed text-blue-800" style={{fontFamily: 'Arial, sans-serif'}}>
                            Typically, an effective response will contain 100 to 150 words.
                          </p>
                        </div>

                        {/* Professor Section - Centered Layout */}
                        <div className="flex flex-col items-center text-center space-y-4">
                          {/* Professor Photo */}
                          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300">
                            <img 
                              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face"
                              alt="Professor Johnson" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Professor Name */}
                          <h4 className="text-lg font-bold text-blue-900" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>PROFESSOR JOHNSON</h4>
                          
                          {/* Prompt */}
                          <div className="bg-blue-100 border-2 border-blue-400 p-4 rounded-lg w-full">
                            <p className="text-base text-blue-900 leading-relaxed text-left" style={{fontFamily: 'Arial, sans-serif'}}>
                              {currentTest.discussionTopic}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Student Opinions & Writing */}
                    <div className="col-span-6 p-6">
                      {/* Student Opinions */}
                      <div className="space-y-5 mb-7">
                        {currentTest.studentOpinions?.map((opinion, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border-2 border-blue-300">
                            {/* Student Photos */}
                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-blue-400">
                              <img 
                                src={opinion.name === 'Claire' 
                                  ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
                                  : "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
                                }
                                alt={opinion.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-blue-900 mb-2" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>{opinion.name}</h4>
                              <p className="text-base text-blue-800 leading-relaxed" style={{fontFamily: 'Arial, sans-serif'}}>{opinion.opinion}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Writing Area */}
                      <div className="border-2 border-blue-400 rounded-lg flex flex-col">
                        <div className="bg-blue-100 px-4 py-1.5 border-b-2 border-blue-400 flex items-center justify-between">
                          <div className="flex space-x-2">
                            <button className="px-2 py-0.5 text-xs bg-blue-300 text-blue-900 rounded font-medium" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Cut</button>
                            <button className="px-2 py-0.5 text-xs bg-blue-300 text-blue-900 rounded font-medium" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Copy</button>
                            <button className="px-2 py-0.5 text-xs bg-blue-300 text-blue-900 rounded font-medium" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Paste</button>
                          </div>
                          <div className="text-sm text-blue-900 font-bold" style={{fontFamily: 'Arial, sans-serif'}}>
                            Word Count: <span className="text-blue-700">{wordCount}</span>
                          </div>
                        </div>
                        <Textarea
                          value={essayText}
                          onChange={(e) => setEssayText(e.target.value)}
                          placeholder="In your response, you should do the following:
• Express and support your opinion on the topic.
• Make a contribution to the discussion in your own words."
                          className="min-h-[160px] max-h-[200px] border-0 rounded-none resize-none focus:ring-0 leading-relaxed p-4 flex-1"
                          style={{ fontSize: '110%', fontFamily: 'Arial, sans-serif' }}
                        />
                        {/* Submit & Feedback Buttons */}
                        <div className="bg-blue-100 px-4 py-2 border-t-2 border-blue-400 flex gap-3">
                          <Button
                            onClick={() => {
                              if (essayText.trim().length === 0) {
                                toast({
                                  title: "에세이를 작성해주세요",
                                  description: "제출하기 전에 먼저 답변을 작성해주세요.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setIsSubmitted(true);
                              toast({
                                title: "✅ 제출 완료",
                                description: "에세이가 제출되었습니다.",
                              });
                            }}
                            disabled={isSubmitted || essayText.trim().length === 0}
                            className={`flex-1 py-2 font-bold ${isSubmitted ? 'bg-green-600 text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'}`}
                            style={{fontFamily: 'Arial, sans-serif'}}
                            data-testid="button-submit-discussion"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {isSubmitted ? '제출됨' : '제출하기'}
                          </Button>
                          <Button
                            onClick={() => {
                              if (!isPro) {
                                toast({
                                  title: "🔒 PRO 등급 필요",
                                  description: "AI 종합 피드백 기능은 PRO 이상 회원만 이용 가능합니다.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              if (!isSubmitted) {
                                toast({
                                  title: "먼저 제출해주세요",
                                  description: "피드백을 받으려면 먼저 에세이를 제출해야 합니다.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              requestComprehensiveFeedback();
                            }}
                            disabled={isComprehensiveFeedbackLoading || comprehensiveFeedbackMutation.isPending}
                            className={`flex-1 py-2 font-bold ${isPro && isSubmitted ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-400 hover:bg-gray-500 text-gray-200'}`}
                            style={{fontFamily: 'Arial, sans-serif'}}
                            data-testid="button-request-feedback-discussion"
                          >
                            {isComprehensiveFeedbackLoading || comprehensiveFeedbackMutation.isPending ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                생성 중...
                              </>
                            ) : (
                              <>
                                <Award className="h-4 w-4 mr-2" />
                                피드백 요청
                                {!isPro && <span className="ml-1 text-xs">🔒</span>}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comprehensive Feedback Section for Discussion Writing */}
                  {showModelAnswerSection && comprehensiveFeedback && currentTest.type === 'discussion' && (
                    <div className="border-t-2 border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 p-6 space-y-6" data-testid="discussion-feedback-section">
                      {/* Header with ETS Score */}
                      <div className="text-center space-y-3">
                        <h3 className="text-xl font-bold text-gray-900">📊 ETS 공식 기준 종합 피드백</h3>
                        <div className="flex items-center justify-center gap-6">
                          <div className="bg-purple-600 text-white rounded-xl p-4 shadow-lg">
                            <div className="text-xs font-medium opacity-90">ETS 점수</div>
                            <div className="text-3xl font-bold">{comprehensiveFeedback.etsScore}/5</div>
                          </div>
                          <div className="bg-green-600 text-white rounded-xl p-4 shadow-lg">
                            <div className="text-xs font-medium opacity-90">환산 점수</div>
                            <div className="text-3xl font-bold">{comprehensiveFeedback.totalScore}/30</div>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm max-w-2xl mx-auto">{comprehensiveFeedback.overallComment}</p>
                      </div>

                      {/* Detailed Scores Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {comprehensiveFeedback.argumentation && (
                          <div className="bg-white p-3 rounded-lg border border-purple-200 text-center">
                            <div className="text-xs text-purple-700 font-medium">논리 전개</div>
                            <div className="text-xl font-bold text-purple-800">{comprehensiveFeedback.argumentation.score}/10</div>
                          </div>
                        )}
                        {comprehensiveFeedback.development && (
                          <div className="bg-white p-3 rounded-lg border border-indigo-200 text-center">
                            <div className="text-xs text-indigo-700 font-medium">발전성</div>
                            <div className="text-xl font-bold text-indigo-800">{comprehensiveFeedback.development.score}/10</div>
                          </div>
                        )}
                        <div className="bg-white p-3 rounded-lg border border-orange-200 text-center">
                          <div className="text-xs text-orange-700 font-medium">언어 사용</div>
                          <div className="text-xl font-bold text-orange-800">{comprehensiveFeedback.languageUse?.score}/10</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-red-200 text-center">
                          <div className="text-xs text-red-700 font-medium">문법</div>
                          <div className="text-xl font-bold text-red-800">{comprehensiveFeedback.grammar?.score}/10</div>
                        </div>
                      </div>

                      {/* Sentence Feedback & Model Answer in columns */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Sentence-by-Sentence Feedback */}
                        {comprehensiveFeedback.sentenceFeedback && comprehensiveFeedback.sentenceFeedback.length > 0 && (
                          <div className="bg-white rounded-lg border border-gray-200 p-4">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center text-sm">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              문장별 피드백
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {comprehensiveFeedback.sentenceFeedback.slice(0, 5).map((sf: any, idx: number) => (
                                <div key={idx} className={`p-2 rounded text-xs ${sf.hasError ? 'bg-red-50 border-l-2 border-red-400' : 'bg-green-50 border-l-2 border-green-400'}`}>
                                  <p className="text-gray-700">{sf.original}</p>
                                  {sf.hasError && sf.correction && (
                                    <p className="text-green-700 mt-1">→ {sf.correction}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Model Answer */}
                        {comprehensiveFeedback.modelAnswer && (
                          <div className="bg-white rounded-lg border border-blue-200 p-4">
                            <h4 className="font-bold text-blue-800 mb-3 flex items-center text-sm">
                              <Award className="h-4 w-4 mr-2" />
                              모범답안
                            </h4>
                            <p className="text-gray-800 text-xs leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                              {comprehensiveFeedback.modelAnswer}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Essential Expressions */}
                      {comprehensiveFeedback.essentialExpressions && comprehensiveFeedback.essentialExpressions.length > 0 && (
                        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                          <h4 className="font-bold text-amber-800 mb-3 flex items-center text-sm">
                            <Lightbulb className="h-4 w-4 mr-2" />
                            필수 표현 5선
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {comprehensiveFeedback.essentialExpressions.map((expr: any, idx: number) => (
                              <div key={idx} className="bg-white p-2 rounded border border-amber-200 text-xs">
                                <span className="font-bold text-amber-900">{idx + 1}. {expr.expression}</span>
                                <p className="text-gray-600 mt-1">{expr.meaning}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons - Below Writing Area */}
            <div className="flex justify-center space-x-8 pt-10">
              <div className="relative group">
                <Button
                  onClick={() => {
                    if (!isPro) {
                      toast({
                        title: "🔒 PRO 등급 필요",
                        description: "AI 모범답안 기능은 PRO 이상 회원만 이용 가능합니다. 업그레이드하여 더 많은 AI 학습 기능을 이용하세요!",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if (!currentTest) return;
                    
                    console.log('모범답안 clicked');
                    console.log('Current test type:', currentTest.type);
                    console.log('Essay text length:', essayText.trim().length);
                    
                    const prompt = currentTest.type === 'integrated' 
                      ? `Reading: ${currentTest.readingPassage}\n\nListening: ${currentTest.listeningScript}`
                      : `Topic: ${currentTest.discussionTopic}\n\nStudent Opinions: ${currentTest.studentOpinions?.map(op => `${op.name}: ${op.opinion}`).join('\n')}`;

                    console.log('Prompt:', prompt.substring(0, 200));
                    
                    modelAnswerMutation.mutate({
                      testType: currentTest.type,
                      prompt,
                      userEssay: essayText.trim().length > 0 ? essayText.trim() : undefined
                    });
                  }}
                  variant="outline"
                  disabled={modelAnswerMutation.isPending}
                  className={`px-12 py-4 text-xl font-bold border-2 ${isPro ? 'border-blue-700 text-blue-800 hover:bg-blue-50' : 'border-gray-400 text-gray-500 bg-gray-100 cursor-not-allowed'}`}
                  style={{fontFamily: 'Arial, sans-serif'}}
                >
                  <Lightbulb className="h-6 w-6 mr-3" />
                  {modelAnswerMutation.isPending ? '생성 중...' : '모범답안'}
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
              <div className="relative group">
                <Button
                  onClick={() => {
                    if (!isPro) {
                      toast({
                        title: "🔒 PRO 등급 필요",
                        description: "인라이즈 피드백 기능은 PRO 이상 회원만 이용 가능합니다. 업그레이드하여 상세한 AI 평가를 받아보세요!",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    setCurrentPhase('complete');
                    handleSubmitEssay();
                  }}
                  className={`px-12 py-4 text-xl font-bold border-2 ${isPro ? 'bg-blue-700 hover:bg-blue-800 text-white border-blue-700' : 'bg-gray-400 text-gray-100 border-gray-400 cursor-not-allowed'}`}
                  style={{fontFamily: 'Arial, sans-serif'}}
                  disabled={essayText.trim().length === 0}
                >
                  <CheckCircle className="h-6 w-6 mr-3" />
                  제출 후 피드백
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
            </div>
            
            {/* Upgrade Notice for Free Users */}
            {!isPro && (
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <Award className="h-7 w-7 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Arial, sans-serif'}}>
                  PRO 회원 혜택으로 인라이즈 피드백을 받아보세요!
                </h3>
                <p className="text-blue-700 mb-4" style={{fontFamily: 'Arial, sans-serif'}}>
                  • AI 모범답안 3단계 (초급/중급/고급) 제공<br/>
                  • 상세한 인라이즈 피드백 및 점수 분석<br/>
                  • 무제한 AI 해설 및 학습 자료
                </p>
                <p className="text-sm text-blue-600 mb-4">현재 등급: <span className="font-bold uppercase">{membershipTier}</span></p>
                <Button 
                  onClick={() => setLocation('/subscription')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-bold"
                  style={{fontFamily: 'Arial, sans-serif'}}
                >
                  PRO로 업그레이드 →
                </Button>
              </div>
            )}

            {/* Model Answer Section */}
            {showModelAnswerSection && (
              <div className="mt-10 space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}>Model Answer & Analysis</h2>
                  <p className="text-blue-700" style={{fontFamily: 'Arial, sans-serif'}}>Compare your response with expert-level answers and feedback</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Standard Model Answer */}
                  <Card className="border-2 border-blue-200">
                    <CardHeader className="bg-blue-50">
                      <CardTitle className="flex items-center text-blue-800">
                        <Award className="h-6 w-6 mr-3" />
                        Standard Model Answer
                      </CardTitle>
                      <CardDescription>
                        High-scoring response that demonstrates TOEFL writing excellence
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {aiModelAnswer ? (
                        <>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                              {aiModelAnswer}
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                            <span>Word Count: {aiModelAnswer.split(/\s+/).length}</span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">Score: 4-5/5</span>
                          </div>
                        </>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="text-gray-500 text-center">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            Generating model answer...
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Improved User Answer */}
                  {essayText.trim().length > 0 && (
                    <Card className="border-2 border-green-200">
                      <CardHeader className="bg-green-50">
                        <CardTitle className="flex items-center text-green-800">
                          <PenTool className="h-6 w-6 mr-3" />
                          Your Answer Improved
                        </CardTitle>
                        <CardDescription>
                          Enhanced version of your response with corrections and improvements
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        {improvedAnswer ? (
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                              {improvedAnswer}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="text-gray-500 text-center">
                              <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                              Generating improved version...
                            </div>
                          </div>
                        )}
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                          <span>Your Original: {wordCount} words</span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                            Improved: {improvedAnswer ? improvedAnswer.split(/\s+/).length : 0} words
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* AI Feedback Section */}
                {(aiFeedback || essayText.trim().length > 0) && (
                  <Card className="border-2 border-gray-200">
                    <CardHeader className="bg-white dark:bg-gray-800">
                      <CardTitle className="flex items-center text-gray-800 dark:text-gray-200">
                        <MessageSquare className="h-6 w-6 mr-3" />
                        Detailed Feedback & Analysis
                      </CardTitle>
                      <CardDescription>
                        Professional evaluation and suggestions for improvement
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        {aiFeedback ? (
                          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">
                            {aiFeedback}
                          </div>
                        ) : essayText.trim().length > 0 ? (
                          <div className="text-gray-500 text-center">
                            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            Generating AI feedback...
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-bold text-gray-900 mb-2">Basic Feedback:</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  <li>• Write your response first to get detailed AI feedback</li>
                                  <li>• Target 100-150 words for optimal scoring</li>
                                  <li>• Address the discussion prompt clearly</li>
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 mb-2">Writing Tips:</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  <li>• Take a clear position on the topic</li>
                                  <li>• Use specific examples to support your points</li>
                                  <li>• Engage with both student perspectives</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Complete Phase */}
        {currentPhase === 'complete' && (
          <Suspense fallback={<div className="max-w-6xl mx-auto py-12 text-center text-blue-900">결과를 불러오는 중...</div>}>
            <DeferredToeflWritingCompleteView
              currentTest={currentTest}
              wordCount={wordCount}
              aiScore={aiScore}
              essayText={essayText}
              aiModelAnswer={aiModelAnswer}
              aiModelAnswerBeginner={aiModelAnswerBeginner}
              aiModelAnswerIntermediate={aiModelAnswerIntermediate}
              aiModelAnswerAdvanced={aiModelAnswerAdvanced}
              aiFeedback={aiFeedback}
              isModelAnswerPending={modelAnswerMutation.isPending}
              onRetry={() => {
                resetTest();
                setAiFeedback('');
                setAiScore(null);
                setAiModelAnswer('');
                setShowModelAnswer(false);
              }}
              onGoHome={() => setLocation('/')}
            />
          </Suspense>
        )}
      </div>
    </FullscreenWrapper>
    </SecurityWrapper>
  );
}
