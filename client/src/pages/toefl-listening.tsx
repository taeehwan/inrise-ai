import { lazy, Suspense, useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext,
  isAppleDevice 
} from "@/lib/safariAudioCompat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { useQuery } from "@tanstack/react-query";
import { 
  Play, 
  Pause, 
  Volume2, 
  FileText, 
  BarChart3, 
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Check,
  Lock,
  SkipBack,
  SkipForward,
  Lightbulb,
  Loader2,
  Maximize,
  Users,
  GraduationCap,
  Headphones,
  GripVertical,
  Table
} from "lucide-react";
import libraryConversationImg from '@assets/stock_images/university_library_s_841830e0.jpg';
import { FeedbackDialog } from "@/components/ToeflFeedbackPanel";

const DeferredLoginModal = lazy(() => import("@/components/LoginModal"));

// Mock listening test data
const mockListeningTest = {
  id: "listening-test-1",
  title: "TOEFL Listening Practice Test 1",
  type: "conversation", // "conversation" or "lecture"
  audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
  duration: 480, // 8 minutes
  script: [
    { start: 0, end: 15, text: "Professor: Today we'll discuss the impact of climate change on marine ecosystems." },
    { start: 15, end: 30, text: "Student: Professor, could you explain how ocean acidification affects coral reefs?" },
    { start: 30, end: 45, text: "Professor: Excellent question. Ocean acidification is caused by increased CO2 absorption." },
    { start: 45, end: 60, text: "This makes it harder for corals to build their calcium carbonate skeletons." },
    { start: 60, end: 75, text: "Student: So this is why coral bleaching is becoming more common?" },
    { start: 75, end: 90, text: "Professor: Exactly. The stress from acidification weakens coral immune systems." }
  ],
  // Dynamic images based on type
  getImage: function() {
    return this.type === "conversation" 
      ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&crop=face" // Professor and student conversation
      : "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop"; // Professor lecturing
  }
};

const mockListeningQuestions = [
  {
    id: "q1",
    questionType: "multiple-choice" as const,
    questionText: "What is the main topic of the professor's lecture?",
    options: [
      "Ocean acidification and coral reefs",
      "Climate change effects on forests",
      "Marine pollution solutions",
      "Coral breeding techniques"
    ],
    correctAnswer: "Ocean acidification and coral reefs",
    points: 1,
    explanation: "The professor specifically discusses how climate change affects marine ecosystems, focusing on ocean acidification and its impact on coral reefs."
  },
  {
    id: "q2",
    questionType: "multiple-select" as const,
    questionText: "According to the professor, which TWO effects does ocean acidification have on coral reefs?",
    options: [
      "Makes it harder to build calcium carbonate skeletons",
      "Increases coral reproduction rates",
      "Weakens coral immune systems",
      "Improves coral coloration"
    ],
    correctAnswer: "Makes it harder to build calcium carbonate skeletons,Weakens coral immune systems",
    points: 2,
    explanation: "The professor mentions both effects: difficulty in building calcium carbonate skeletons and weakened immune systems due to stress."
  },
  {
    id: "q3",
    questionType: "listen-again" as const,
    questionText: "What does the registrar imply when she says this?",
    replayText: "Listen again to part of the conversation. Then answer the question.",
    options: [
      "She is uncertain about the reliability of the computer",
      "She will approve the man's form despite her doubts about it",
      "She needs more information about the man's credits",
      "She needs to call someone to help her fix computer errors"
    ],
    correctAnswer: "She is uncertain about the reliability of the computer",
    points: 1,
    replaySegment: { start: 60, end: 75 },
    explanation: "The registrar's statement implies uncertainty about whether the computer system is accurately displaying the information."
  },
  {
    id: "q4",
    questionType: "yes-no-table" as const,
    questionText: "Based on the conversation, indicate whether each of the following is offered by health clubs.",
    tableInstruction: "Click in the correct box for each phrase. This item is worth 2 points.",
    tableItems: [
      "Low membership fees",
      "High-quality facilities",
      "Exercise classes",
      "Positive self-image",
      "Special presentations"
    ],
    tableCategories: ["Yes", "No"],
    correctAnswer: {
      "Low membership fees": "No",
      "High-quality facilities": "Yes",
      "Exercise classes": "Yes",
      "Positive self-image": "No",
      "Special presentations": "Yes"
    },
    points: 2,
    explanation: "Health clubs typically offer high-quality facilities, exercise classes, and special presentations, but not necessarily low fees or psychological benefits like positive self-image."
  },
  {
    id: "q5",
    questionType: "category-table" as const,
    questionText: "The professor states that some continents are currently moving northward and some are moving westward. Indicate the direction in which the continents are currently moving.",
    tableInstruction: "Click in the correct box for each phrase. This item is worth 2 points.",
    tableItems: [
      "Africa",
      "Americas",
      "Australia"
    ],
    tableCategories: ["Northward", "Westward"],
    correctAnswer: {
      "Africa": "Northward",
      "Americas": "Westward",
      "Australia": "Northward"
    },
    points: 2,
    explanation: "According to plate tectonics, Africa and Australia are moving northward, while the Americas are moving westward."
  },
  {
    id: "q6",
    questionType: "order-sequence" as const,
    questionText: "Put the events in the order that they happened. Click on a sentence. Then drag it to the space where it belongs.",
    orderInstruction: "This question is worth 3 points.",
    orderItems: [
      "Inexpensive eyeglasses became available",
      "The first eyeglasses were made",
      "The number of people interested in reading increased",
      "The printing press was invented"
    ],
    correctOrder: [
      "The first eyeglasses were made",
      "The printing press was invented",
      "Inexpensive eyeglasses became available",
      "The number of people interested in reading increased"
    ],
    points: 3,
    explanation: "The historical order is: eyeglasses invented (13th century), printing press invented (15th century), affordable eyeglasses became available, and then literacy increased."
  },
  {
    id: "q7",
    questionType: "replay" as const,
    questionText: "Listen again to part of the conversation. What does the student mean when asking this question?",
    options: [
      "The student wants clarification about coral bleaching",
      "The student is challenging the professor's explanation",
      "The student is making a connection between concepts",
      "The student is changing the subject"
    ],
    correctAnswer: "The student is making a connection between concepts",
    points: 1,
    replaySegment: { start: 60, end: 75 },
    explanation: "The student is connecting ocean acidification to the observable phenomenon of coral bleaching."
  }
];

type QuestionType = "multiple-choice" | "multiple-select" | "replay" | "listen-again" | "yes-no-table" | "category-table" | "order-sequence";
type ViewMode = "audio" | "question" | "listen-again-audio";

export default function TOEFLListening() {
  // Auth state
  const { isAuthenticated, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Get test ID from URL params
  const params = useParams();
  const testId = params.id;
  
  // Load actual test data
  const { data: testData, isLoading: isLoadingTest, error: testError } = useQuery({
    queryKey: ['/api/tests', testId],
    enabled: !!testId && isAuthenticated,
  });
  
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ['/api/tests', testId, 'questions'],
    enabled: !!testId && isAuthenticated,
  });

  // Audio states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);

  // Test states  
  const [viewMode, setViewMode] = useState<ViewMode>("audio");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedMultipleAnswers, setSelectedMultipleAnswers] = useState<string[]>([]);
  const [isAnswerConfirmed, setIsAnswerConfirmed] = useState(false);
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  
  // New question type states
  const [tableAnswers, setTableAnswers] = useState<Record<string, string>>({}); // For Yes/No and Category tables
  const [orderItems, setOrderItems] = useState<string[]>([]); // For order/sequence questions
  const [listenAgainCompleted, setListenAgainCompleted] = useState(false); // For listen-again questions
  const [isPlayingReplay, setIsPlayingReplay] = useState(false); // For replay audio state

  // UI states
  const [showScript, setShowScript] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [solutionExplanation, setSolutionExplanation] = useState<string>("");
  const [isLoadingSolution, setIsLoadingSolution] = useState(false);
  
  const { toast } = useToast();
  
  // Process test data with useMemo to avoid declaration issues
  const { listeningTest, listeningQuestions } = useMemo(() => {
    const rawTestData: any = testData || mockListeningTest;
    let processedTest: any = rawTestData;
    let processedQuestions: any[] = (Array.isArray(questionsData) ? questionsData : null) || mockListeningQuestions;
    
    console.log('📝 Raw test data:', rawTestData);
    console.log('📝 Questions data:', processedQuestions);
    
    // Check for direct script field (AI Test Creator format)
    if (rawTestData.script && typeof rawTestData.script === 'string' && rawTestData.script.trim().length > 0) {
      processedTest = {
        ...rawTestData,
        id: rawTestData.id,
        title: rawTestData.title || rawTestData.testTitle || "Listening Test",
        script: rawTestData.script,
        narration: rawTestData.narration,
        type: "conversation",
        duration: rawTestData.duration || 60  // Use server-calculated duration
      };
      
      if (rawTestData.questions && Array.isArray(rawTestData.questions) && rawTestData.questions.length > 0) {
        processedQuestions = rawTestData.questions.map((q: any) => ({
          id: q.id,
          questionType: q.type === 'multiple_choice' ? 'multiple-choice' : q.type,
          questionText: q.question || q.questionText,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          points: q.points || 1,
          explanation: q.explanation
        }));
      }
    }
    else if (rawTestData.scripts && Array.isArray(rawTestData.scripts) && rawTestData.scripts.length > 0) {
      const script = rawTestData.scripts[0];
      processedTest = {
        ...rawTestData,
        id: rawTestData.id,
        title: script.title || rawTestData.testTitle || rawTestData.title || "Listening Test",
        script: script.content || script.script || script.text || "",
        audioUrl: script.audioUrl || script.url,
        type: script.type || "conversation"
      };
      
      if (rawTestData.questions && Array.isArray(rawTestData.questions) && rawTestData.questions.length > 0) {
        processedQuestions = rawTestData.questions.map((q: any) => ({
          id: q.id,
          questionType: q.type === 'multiple_choice' ? 'multiple-choice' : q.type,
          questionText: q.question || q.questionText,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          points: q.points || 1,
          explanation: q.explanation
        }));
      }
    }
    else if (rawTestData.passages && rawTestData.passages.length > 0) {
      const passage = rawTestData.passages[0];
      let normalizedScript = passage.script;
      if (Array.isArray(passage.script)) {
        normalizedScript = passage.script
          .map((line: any) => `${line.speaker || line.role || 'Speaker'}: ${line.text}`)
          .join('\n');
      }
      
      processedTest = {
        ...rawTestData,
        id: rawTestData.id,
        title: passage.title || rawTestData.title || "Listening Test",
        script: normalizedScript,
        audioUrl: passage.audioUrl || rawTestData.audioUrl,
        type: passage.type || rawTestData.type || "conversation"
      };
      
      if (passage.questions && passage.questions.length > 0) {
        processedQuestions = passage.questions;
      }
    }
    
    return { listeningTest: processedTest, listeningQuestions: processedQuestions };
  }, [testData, questionsData]);
  
  // useFullscreen 훅이 정의되지 않았으므로 직접 구현
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      console.log('🖥️ Fullscreen state changed:', isNowFullscreen);
      setIsFullscreen(isNowFullscreen);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Check authentication on component mount
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated, isLoading]);

  // Set initial duration from test data
  useEffect(() => {
    if (listeningTest?.duration) {
      setDuration(listeningTest.duration);
      console.log(`⏱️ Initial duration set from test data: ${listeningTest.duration}s`);
    }
  }, [listeningTest]);

  // Timer effect
  useEffect(() => {
    if (!isTestCompleted && viewMode === "question") {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleFinishTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTestCompleted, viewMode]);

  // Auto-generate TTS when test loads
  useEffect(() => {
    console.log('🎙️ TTS Generation Check:', {
      hasTest: !!listeningTest,
      hasScript: !!listeningTest?.script,
      scriptPreview: listeningTest?.script?.substring?.(0, 100),
      hasTtsUrl: !!ttsAudioUrl,
      isGenerating: isGeneratingTTS
    });
    
    if (listeningTest && listeningTest.script && !ttsAudioUrl && !isGeneratingTTS) {
      const generateTTS = async () => {
        setIsGeneratingTTS(true);
        toast({
          title: "음성 생성 중",
          description: "역할별 목소리로 음성을 생성하고 있습니다...",
        });

        try {
          const script = Array.isArray(listeningTest.script)
            ? listeningTest.script.map((s: any) => s.text).join('\n')
            : listeningTest.script;

          console.log('🎙️ Generating TTS for script:', script.substring(0, 100) + '...');

          const response = await fetch('/api/ai/generate-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('TTS API error:', errorData);
            throw new Error('TTS generation failed');
          }

          const data = await response.json();
          console.log('🎙️ TTS generated successfully:', data.audioUrl);
          setTtsAudioUrl(data.audioUrl);
          
          toast({
            title: "음성 생성 완료",
            description: "재생 버튼을 눌러 음성을 들으세요.",
          });
        } catch (error) {
          console.error("TTS generation error:", error);
          toast({
            title: "음성 생성 오류",
            description: "음성 생성에 실패했습니다. 재생 버튼을 눌러 다시 시도하세요.",
            variant: "destructive",
          });
        } finally {
          setIsGeneratingTTS(false);
        }
      };

      generateTTS();
    }
  }, [listeningTest, ttsAudioUrl, isGeneratingTTS]);

  // Audio time update effect
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const updateTime = () => {
        setCurrentTime(audio.currentTime);
        
        // No need for image changing logic since we use contextual images based on type
      };
      
      const setAudioDuration = () => setDuration(audio.duration);
      
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', setAudioDuration);
      
      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', setAudioDuration);
      };
    }
  }, [isPlaying, currentImageIndex, duration]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('🎵 Play button clicked. Current state:', {
      isPlaying,
      hasTtsUrl: !!ttsAudioUrl,
      hasScript: !!listeningTest?.script,
      scriptPreview: listeningTest?.script?.substring?.(0, 100)
    });

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // If TTS audio hasn't been generated yet, generate it first
        if (!ttsAudioUrl && !isGeneratingTTS && listeningTest?.script) {
          setIsGeneratingTTS(true);
          toast({
            title: "음성 생성 중",
            description: "역할별 목소리로 음성을 생성하고 있습니다...",
          });

          try {
            // Get script from listening test
            const script = Array.isArray(listeningTest.script)
              ? listeningTest.script.map((s: any) => s.text).join('\n')
              : listeningTest.script;

            console.log('🎙️ Generating TTS for script (length:', script.length, ')');

            // Call TTS API
            const response = await fetch('/api/ai/generate-tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ script })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.error('TTS API error:', errorData);
              throw new Error('TTS generation failed');
            }

            const data = await response.json();
            console.log('🎙️ TTS generated successfully:', data.audioUrl);
            setTtsAudioUrl(data.audioUrl);
            
            // Update audio source and play with slower speed (Safari compatible)
            audio.src = data.audioUrl;
            audio.playbackRate = 0.9;
            await unlockAudioContext();
            await playSafariCompatibleAudio(audio);
            setIsPlaying(true);

            toast({
              title: "음성 생성 완료",
              description: "음성이 재생됩니다.",
            });
          } catch (error) {
            console.error("TTS generation error:", error);
            toast({
              title: "음성 생성 오류",
              description: "음성 생성에 실패했습니다. 다시 시도해주세요.",
              variant: "destructive",
            });
          } finally {
            setIsGeneratingTTS(false);
          }
        } else if (ttsAudioUrl) {
          // TTS audio already generated, just play it (Safari compatible)
          console.log('▶️ Playing existing TTS audio');
          if (audio.src !== ttsAudioUrl) {
            audio.src = ttsAudioUrl;
          }
          audio.playbackRate = 0.9;
          await unlockAudioContext();
          await playSafariCompatibleAudio(audio);
          setIsPlaying(true);
        } else {
          console.warn('⚠️ No script or TTS URL available');
          toast({
            title: "오디오 없음",
            description: "재생할 오디오가 없습니다.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Audio playback failed:", error);
      toast({
        title: "음성 재생 오류",
        description: "음성을 재생할 수 없습니다. 페이지를 새로고침하거나 브라우저 설정을 확인해주세요.",
        variant: "destructive",
      });
      setIsPlaying(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setViewMode("question");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    const currentQuestion = mockListeningQuestions[currentQuestionIndex];
    
    if (currentQuestion.questionType === "multiple-select") {
      setSelectedMultipleAnswers(prev => {
        if (prev.includes(value)) {
          return prev.filter(answer => answer !== value);
        } else if (prev.length < 2) {
          return [...prev, value];
        }
        return prev;
      });
    } else {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: value
      }));
    }
    setIsAnswerConfirmed(false);
  };

  const handleConfirmAnswer = () => {
    setIsAnswerConfirmed(true);
  };

  const handleNextQuestion = () => {
    const currentQuestion = listeningQuestions[currentQuestionIndex];
    
    // Save multiple select answers
    if (currentQuestion.questionType === "multiple-select") {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: selectedMultipleAnswers.join(',')
      }));
      setSelectedMultipleAnswers([]);
    }
    
    // Save table answers (Yes/No or Category)
    if (currentQuestion.questionType === "yes-no-table" || currentQuestion.questionType === "category-table") {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: JSON.stringify(tableAnswers)
      }));
      setTableAnswers({});
    }
    
    // Save order answers
    if (currentQuestion.questionType === "order-sequence") {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: orderItems.join('|||')
      }));
      setOrderItems([]);
    }
    
    // Reset listen-again state
    setListenAgainCompleted(false);
    setIsPlayingReplay(false);
    
    if (currentQuestionIndex < listeningQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsAnswerConfirmed(false);
      
      // Initialize next question's state if needed
      const nextQuestion = listeningQuestions[currentQuestionIndex + 1];
      if (nextQuestion?.questionType === "order-sequence" && nextQuestion.orderItems) {
        setOrderItems([...nextQuestion.orderItems]);
      }
      
      // For listen-again questions, show audio first
      if (nextQuestion?.questionType === "listen-again") {
        setViewMode("listen-again-audio");
      }
    } else {
      handleFinishTest();
    }
  };

  // Handler for table-based questions (Yes/No, Category)
  const handleTableAnswerChange = (item: string, category: string) => {
    setTableAnswers(prev => ({
      ...prev,
      [item]: category
    }));
    setIsAnswerConfirmed(false);
  };

  // Handler for order/sequence drag and drop
  const handleOrderDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleOrderDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex === dropIndex) return;
    
    const newItems = [...orderItems];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    setOrderItems(newItems);
    setIsAnswerConfirmed(false);
  };

  // Initialize order items when question changes
  useEffect(() => {
    const currentQ = listeningQuestions[currentQuestionIndex];
    if (currentQ?.questionType === "order-sequence" && currentQ.orderItems && orderItems.length === 0) {
      setOrderItems([...currentQ.orderItems]);
    }
    // For listen-again questions, show audio first
    if (currentQ?.questionType === "listen-again" && viewMode === "question" && !listenAgainCompleted) {
      setViewMode("listen-again-audio");
    }
  }, [currentQuestionIndex, listeningQuestions]);

  // Play listen-again audio segment (Safari compatible)
  const playListenAgainAudio = async () => {
    const audio = audioRef.current;
    const currentQ = listeningQuestions[currentQuestionIndex];
    
    if (audio && currentQ?.replaySegment) {
      const { start, end } = currentQ.replaySegment;
      setIsPlayingReplay(true);
      audio.currentTime = start;
      await unlockAudioContext();
      await playSafariCompatibleAudio(audio);
      
      const checkEnd = setInterval(() => {
        if (audio.currentTime >= end || audio.paused) {
          audio.pause();
          setIsPlayingReplay(false);
          setListenAgainCompleted(true);
          clearInterval(checkEnd);
          // Auto transition to question after audio ends
          setTimeout(() => {
            setViewMode("question");
          }, 500);
        }
      }, 100);
    } else {
      // If no audio, just go to question
      setListenAgainCompleted(true);
      setViewMode("question");
    }
  };

  const handleFinishTest = () => {
    setIsTestCompleted(true);
    setShowReport(true);
  };

  const calculateScore = () => {
    return listeningQuestions.reduce((total, question) => {
      const userAnswer = question.questionType === "multiple-select" 
        ? answers[question.id]?.split(',') || []
        : answers[question.id];
      
      if (question.questionType === "multiple-select") {
        const correctAnswers = question.correctAnswer.split(',');
        const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
        const isCorrect = userAnswerArray.length === correctAnswers.length && 
                          userAnswerArray.every((answer: string) => correctAnswers.includes(answer));
        return total + (isCorrect ? question.points : 0);
      } else {
        return total + (userAnswer === question.correctAnswer ? question.points : 0);
      }
    }, 0);
  };

  // Audio control functions
  const handleSeek = (newTime: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Fullscreen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const handleSkipBack = () => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = Math.max(0, currentTime - 10);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSkipForward = () => {
    const audio = audioRef.current;
    if (audio) {
      const newTime = Math.min(duration, currentTime + 10);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Replay question audio (Safari compatible)
  const playReplaySegment = async () => {
    const audio = audioRef.current;
    if (audio && currentQuestion.questionType === "replay" && currentQuestion.replaySegment) {
      const { start, end } = currentQuestion.replaySegment;
      audio.currentTime = start;
      audio.playbackRate = 0.9;
      await unlockAudioContext();
      await playSafariCompatibleAudio(audio);
      setIsPlaying(true);

      const stopAtEnd = () => {
        if (audio.currentTime >= end) {
          audio.pause();
          setIsPlaying(false);
          audio.removeEventListener('timeupdate', stopAtEnd);
        }
      };
      audio.addEventListener('timeupdate', stopAtEnd);
    }
  };

  // Generate AI solution explanation
  const generateSolution = async () => {
    if (!currentQuestion) return;
    
    setIsLoadingSolution(true);
    try {
      // Get script from currentQuestion first (AI generated), fallback to listeningTest.script
      const scriptSource = currentQuestion.conversationScript || listeningTest.script;
      const scriptText = Array.isArray(scriptSource) 
        ? scriptSource.map((segment: any) => segment.text).join(' ')
        : scriptSource || '';

      // Get user's selected answer - check both current state and persisted answers
      let userAnswer: any;
      if (currentQuestion.questionType === 'multiple-select') {
        // Check selectedMultipleAnswers first, then fall back to persisted answers
        if (selectedMultipleAnswers && selectedMultipleAnswers.length > 0) {
          userAnswer = selectedMultipleAnswers;
        } else if (answers[currentQuestion.id]) {
          // Parse persisted answer (comma-separated string)
          userAnswer = answers[currentQuestion.id].split(',').map((a: string) => a.trim());
        } else {
          userAnswer = [];
        }
      } else {
        userAnswer = answers[currentQuestion.id];
      }

      // Find correct answer index for server
      let correctAnswerIndex = 0;
      if (currentQuestion.questionType === 'multiple-select') {
        // For multiple-select, correctAnswer is comma-separated string
        const correctAnswers = currentQuestion.correctAnswer.split(',').map((a: string) => a.trim());
        // Use first correct answer for index
        correctAnswerIndex = currentQuestion.options?.indexOf(correctAnswers[0]) ?? 0;
      } else {
        correctAnswerIndex = currentQuestion.options?.indexOf(currentQuestion.correctAnswer) ?? 0;
      }
      
      // Find user's answer index
      let selectedAnswerIndex = 0;
      if (currentQuestion.questionType === 'multiple-select') {
        // Use first selected answer from array
        if (Array.isArray(userAnswer) && userAnswer.length > 0) {
          selectedAnswerIndex = currentQuestion.options?.indexOf(userAnswer[0]) ?? 0;
        }
      } else if (userAnswer) {
        selectedAnswerIndex = currentQuestion.options?.indexOf(userAnswer) ?? 0;
      }

      const response = await fetch('/api/listening/explanation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionText: currentQuestion.questionText,
          options: currentQuestion.options || [],
          correctAnswer: correctAnswerIndex,
          selectedAnswer: selectedAnswerIndex,
          conversation: scriptText
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate explanation');
      }

      const data = await response.json();
      setSolutionExplanation(data.explanation);
      setShowSolution(true);
    } catch (error) {
      console.error('Error generating explanation:', error);
      toast({
        title: "오류 발생",
        description: "AI 해설 생성 중 문제가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSolution(false);
    }
  };

  const currentQuestion = listeningQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + (isAnswerConfirmed ? 1 : 0)) / listeningQuestions.length) * 100;

  // Show login modal if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <div className="mb-6">
            <Lock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-600">TOEFL Listening 테스트를 시작하려면 로그인해주세요.</p>
          </div>
          <Button 
            onClick={() => setShowLoginModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            로그인 / 회원가입
          </Button>
        </Card>
        
        <Suspense fallback={null}>
          <DeferredLoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onSuccess={() => {
              setShowLoginModal(false);
              toast({
                title: "로그인 성공",
                description: "TOEFL Listening 테스트를 시작할 수 있습니다!",
              });
            }}
          />
        </Suspense>
      </div>
    );
  }

  if (viewMode === "audio") {
    return (
      <div style={{ 
        height: '100vh',
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }} className="bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header - Fixed */}
        <div className="bg-white shadow-lg border-b-4 border-blue-500">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">TOEFL Listening Test</h1>
                <p className="text-gray-600">{listeningTest.title}</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={toggleFullScreen}
                  variant="outline"
                  size="sm"
                >
                  <Maximize className="h-4 w-4 mr-2" />
                  Full Screen
                </Button>
                
                <Button
                  onClick={() => setShowScript(!showScript)}
                  variant="outline"
                  size="sm"
                  className="text-pink-600 border-pink-300 hover:bg-pink-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showScript ? "Hide Script" : "Show Script"}
                </Button>
                
                {isTestCompleted && (
                  <Button 
                    onClick={() => setShowReport(true)}
                    variant="outline"
                    size="sm"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Show Report
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - CSS GRID LAYOUT */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: showScript ? '1fr 1fr' : '1fr',
          flex: 1
        }}>
          {/* Audio Section - Left Panel with independent scroll */}
          <div style={{ 
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '2rem'
          }}>
            <div className={`w-full mx-auto ${isFullscreen ? 'max-w-full px-8' : 'max-w-4xl'}`}>
            {/* Contextual Image - Clean library conversation scene */}
            <div className="mb-8">
              <div className={`relative w-full rounded-xl shadow-lg overflow-hidden ${isFullscreen ? 'h-96' : 'h-80'}`}>
                <img 
                  src={libraryConversationImg}
                  alt="Students conversation in library" 
                  className="w-full h-full object-cover"
                />
                {/* Debug indicator */}
                <div className={`absolute top-2 right-2 px-3 py-1 rounded ${isFullscreen ? 'bg-green-500' : 'bg-red-500'} text-white text-xs`}>
                  {isFullscreen ? 'Fullscreen ON' : 'Fullscreen OFF'}
                </div>
              </div>
            </div>

            {/* Enhanced Audio Controls */}
            <Card className={isFullscreen ? "p-12" : "p-8"}>
              <div className={isFullscreen ? "space-y-8" : "space-y-6"}>
                {/* Progress bar with play button next to it */}
                <div className="space-y-2">
                  <div className={`flex justify-between ${isFullscreen ? 'text-xl' : 'text-sm'} text-gray-600`}>
                    <span>{formatTime(Math.floor(currentTime))}</span>
                    <span>{formatTime(Math.floor(duration))}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Play button next to progress bar */}
                    <Button
                      onClick={togglePlayPause}
                      size="lg"
                      className={`${isFullscreen ? 'h-16 w-16' : 'h-12 w-12'} rounded-full flex-shrink-0`}
                      disabled={isGeneratingTTS}
                      data-testid="button-play-audio"
                    >
                      {isGeneratingTTS ? (
                        <Loader2 className={`${isFullscreen ? 'h-8 w-8' : 'h-6 w-6'} animate-spin`} />
                      ) : isPlaying ? (
                        <Pause className={isFullscreen ? 'h-8 w-8' : 'h-6 w-6'} />
                      ) : (
                        <Play className={isFullscreen ? 'h-8 w-8' : 'h-6 w-6'} />
                      )}
                    </Button>
                    
                    {/* Interactive seek bar */}
                    <div className="relative flex-1">
                      <Progress 
                        value={duration ? (currentTime / duration) * 100 : 0} 
                        className="w-full h-3 cursor-pointer" 
                      />
                      <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={(e) => handleSeek(parseFloat(e.target.value))}
                        className="absolute top-0 left-0 w-full h-3 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Additional controls */}
                <div className={`flex items-center justify-center ${isFullscreen ? 'space-x-8' : 'space-x-6'}`}>
                  <Button
                    onClick={handleSkipBack}
                    variant="outline"
                    size="lg"
                    className={isFullscreen ? "h-14 w-14 rounded-full" : "h-12 w-12 rounded-full"}
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    onClick={handleSkipForward}
                    variant="outline"
                    size="lg"
                    className="h-12 w-12 rounded-full"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                  
                  <Volume2 className="h-6 w-6 text-gray-500" />
                </div>

                <div className="text-center">
                  <Button
                    onClick={() => setViewMode("question")}
                    variant="secondary"
                    disabled={currentTime === 0}
                  >
                    Continue to Questions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
            </div>
          </div>

          {/* Right Panel - Script (Grid Column 2) */}
          {showScript && (
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                borderLeft: '2px solid #e5e7eb'
              }}
            >
              <div className="p-4 border-b-2 border-gray-200 bg-gray-50" style={{ flexShrink: 0 }}>
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Audio Script
                </h3>
              </div>
              <div 
                className="p-4 space-y-3" 
                style={{ 
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  flex: 1
                }}
              >
                {(() => {
                  // Get script from first question's conversationScript if available, otherwise use listeningTest.script
                  const scriptSource = (listeningQuestions[0]?.conversationScript || listeningTest.script);
                  
                  if (!scriptSource) return null;
                  
                  // If script is array format (mock data)
                  if (Array.isArray(scriptSource)) {
                    return (
                    scriptSource.map((segment: any, index: number) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg ${
                          currentTime >= segment.start && currentTime <= segment.end
                            ? 'bg-pink-100 border-2 border-pink-300'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          {formatTime(segment.start)} - {formatTime(segment.end)}
                        </div>
                        <p className="text-sm">{segment.text}</p>
                      </div>
                    ))
                    );
                  }
                  
                  // If script is string format (actual AI generated data) - Parse dialogue format
                  const lines = scriptSource.split('\n').filter((line: string) => line.trim());
                      const speakers = new Set<string>();
                      const dialogues: { speaker: string; text: string }[] = [];
                      
                      let currentSpeaker = '';
                      let currentText = '';
                      
                      lines.forEach((line: string, idx: number) => {
                        // Format 1: "Speaker: Text"
                        const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
                        if (colonMatch) {
                          if (currentSpeaker && currentText) {
                            speakers.add(currentSpeaker);
                            dialogues.push({ speaker: currentSpeaker, text: currentText.trim() });
                          }
                          currentSpeaker = colonMatch[1].trim();
                          currentText = colonMatch[2].trim();
                          return;
                        }
                        
                        // Format 2: Speaker name on one line, text on next line(s)
                        const speakerPatterns = ['Narrator', 'Student', 'Professor', 'Librarian', 'Lecturer', 'Teacher', 'Assistant'];
                        const isSpeakerLine = speakerPatterns.some(pattern => 
                          line.trim().toLowerCase() === pattern.toLowerCase() || 
                          line.trim().toLowerCase().startsWith(pattern.toLowerCase())
                        );
                        
                        if (isSpeakerLine) {
                          if (currentSpeaker && currentText) {
                            speakers.add(currentSpeaker);
                            dialogues.push({ speaker: currentSpeaker, text: currentText.trim() });
                          }
                          currentSpeaker = line.trim();
                          currentText = '';
                        } else if (currentSpeaker) {
                          currentText += (currentText ? ' ' : '') + line.trim();
                        }
                      });
                      
                      // Add last dialogue
                      if (currentSpeaker && currentText) {
                        speakers.add(currentSpeaker);
                        dialogues.push({ speaker: currentSpeaker, text: currentText.trim() });
                      }
                      
                      const speakerArray = Array.from(speakers);
                      const speakerColors: Record<string, string> = {};
                      const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700'];
                      
                      speakerArray.forEach((speaker, idx) => {
                        // Narrator gets special gray color
                        if (speaker.toLowerCase() === 'narrator') {
                          speakerColors[speaker] = 'bg-gray-200 text-gray-700';
                        } else {
                          speakerColors[speaker] = colors[idx % colors.length];
                        }
                      });
                      
                      return dialogues.length > 0 ? (
                        dialogues.map((dialogue, index) => (
                          <div key={index} className={`${isFullscreen ? 'p-4' : 'p-3'} rounded-lg bg-gray-50 border border-gray-200`}>
                            <div className="flex items-start gap-3">
                              <Badge className={`${speakerColors[dialogue.speaker]} ${isFullscreen ? 'px-3 py-2 text-sm' : 'px-2 py-1 text-xs'} font-semibold shrink-0`}>
                                {dialogue.speaker}
                              </Badge>
                              <p className={`${isFullscreen ? 'text-base' : 'text-sm'} leading-relaxed flex-1`}>{dialogue.text}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={`${isFullscreen ? 'p-4' : 'p-3'} rounded-lg bg-gray-50`}>
                          <p className={`${isFullscreen ? 'text-base' : 'text-sm'} whitespace-pre-line`}>{scriptSource}</p>
                        </div>
                      );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={ttsAudioUrl || listeningTest.audioUrl}
          onEnded={handleAudioEnded}
          onLoadedMetadata={(e) => {
            const audio = e.currentTarget;
            if (audio.duration && audio.duration !== Infinity) {
              setDuration(audio.duration);
            }
          }}
          preload="auto"
          playsInline
          webkit-playsinline="true"
        />
      </div>
    );
  }

  // Listen Again Audio Screen - Shows before listen-again questions
  if (viewMode === "listen-again-audio") {
    return (
      <div style={{ 
        height: '100vh',
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }} className="bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Header */}
        <div className="bg-slate-800 shadow-lg border-b-4 border-blue-500">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">TOEFL iBT Listening</h1>
                <p className="text-blue-300">Question {currentQuestionIndex + 1} of {listeningQuestions.length}</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Listen Again Prompt */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-2xl w-full bg-white/95 shadow-2xl">
            <CardContent className="p-12 text-center">
              {/* Headphones Icon */}
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                  <Headphones className="w-12 h-12 text-blue-600" />
                </div>
              </div>

              {/* Listen Again Text */}
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Listen again to part of the conversation.
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Then answer the question.
              </p>

              {/* Progress Bar */}
              {isPlayingReplay && (
                <div className="mb-8">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 animate-pulse"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Playing audio segment...</p>
                </div>
              )}

              {/* Play Button */}
              <Button
                onClick={playListenAgainAudio}
                disabled={isPlayingReplay}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
              >
                {isPlayingReplay ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 mr-3" />
                    Play Audio
                  </>
                )}
              </Button>

              {/* Skip to Question (for testing) */}
              {listenAgainCompleted && (
                <div className="mt-6">
                  <Button
                    onClick={() => setViewMode("question")}
                    variant="outline"
                    className="text-gray-600"
                  >
                    Continue to Question
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={ttsAudioUrl || listeningTest.audioUrl}
          preload="auto"
          playsInline
          webkit-playsinline="true"
        />
      </div>
    );
  }

  // Question Screen - Full Screen
  return (
    <FullscreenWrapper style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }} className="bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header - Fixed */}
      <div className="bg-white shadow-lg border-b-4 border-blue-500">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">TOEFL Listening Test</h1>
              <p className="text-gray-600">
                Question {currentQuestionIndex + 1} of {listeningQuestions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">
                  {formatTime(timeRemaining)}
                </span>
              </div>

              <Button
                onClick={generateSolution}
                variant="outline"
                size="sm"
                disabled={isLoadingSolution}
              >
                {isLoadingSolution ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4 mr-2" />
                )}
                Solution
              </Button>

              <Button
                onClick={() => setShowScript(!showScript)}
                variant="outline"
                size="sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Script
              </Button>
              
              {isTestCompleted && (
                <Button 
                  onClick={() => setShowReport(!showReport)}
                  variant="outline"
                  size="sm"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Show Report
                </Button>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <Progress value={progress} className="w-full h-2 progress-bar-deep-pink" />
            <p className="text-xs text-gray-500 mt-1">
              Progress: {Math.round(progress)}%
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - CSS GRID LAYOUT */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: showScript || showReport ? '1fr 1fr' : '1fr',
        height: 'calc(100vh - 200px)',
        minHeight: '600px',
        overflow: 'hidden'
      }}>
        {/* Question Section - Left Panel with independent scroll */}
        <div 
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '2rem'
          }}
        >
          <Card className={`${isFullscreen ? 'max-w-full' : 'max-w-4xl'} w-full mx-auto ${isFullscreen ? 'p-12' : 'p-8'}`}>
              <div className={`${isFullscreen ? 'space-y-12' : 'space-y-6'}`}>
            {/* Question Header */}
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                Question {currentQuestionIndex + 1}
              </span>
              <Badge variant={
                currentQuestion.questionType === "multiple-select" ? "secondary" : 
                currentQuestion.questionType === "replay" || currentQuestion.questionType === "listen-again" ? "default" : 
                currentQuestion.questionType === "yes-no-table" || currentQuestion.questionType === "category-table" ? "secondary" :
                currentQuestion.questionType === "order-sequence" ? "outline" : "outline"
              }>
                {currentQuestion.questionType === "multiple-select" ? "Select TWO answers" : 
                 currentQuestion.questionType === "replay" || currentQuestion.questionType === "listen-again" ? "Replay Question" : 
                 currentQuestion.questionType === "yes-no-table" ? "Yes/No Table" :
                 currentQuestion.questionType === "category-table" ? "Category Table" :
                 currentQuestion.questionType === "order-sequence" ? "Order Events" : "Multiple Choice"}
              </Badge>
              <span className="text-sm text-gray-500">
                {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
              </span>
            </div>

            {/* Question Text */}
            <div className="mb-8">
              <p className="leading-relaxed text-xl text-gray-700" style={{ fontWeight: '500', lineHeight: '1.6' }}>
                {currentQuestion.questionText}
              </p>
              {/* Table/Order instruction */}
              {(currentQuestion.tableInstruction || currentQuestion.orderInstruction) && (
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  {currentQuestion.tableInstruction || currentQuestion.orderInstruction}
                </p>
              )}
            </div>

            {/* Answer Options - Based on Question Type */}
            <div className="space-y-4">
              {/* Multiple Select (TWO answers) */}
              {currentQuestion.questionType === "multiple-select" && (
                <div className="space-y-3">
                  {currentQuestion.options?.map((option: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 border transition-colors">
                      <Checkbox
                        id={`option-${index}`}
                        checked={selectedMultipleAnswers.includes(option)}
                        onCheckedChange={() => handleAnswerChange(option)}
                        disabled={!selectedMultipleAnswers.includes(option) && selectedMultipleAnswers.length >= 2}
                        className="w-6 h-6 mt-1"
                        style={{ borderColor: 'rgb(190, 24, 93)', borderWidth: '2px' }}
                      />
                      <Label htmlFor={`option-${index}`} className="text-lg leading-relaxed cursor-pointer flex-1">
                        {option}
                      </Label>
                    </div>
                  ))}
                  <p className="text-sm text-gray-500 mt-2">Selected: {selectedMultipleAnswers.length}/2</p>
                </div>
              )}

              {/* Yes/No Table */}
              {currentQuestion.questionType === "yes-no-table" && currentQuestion.tableItems && (
                <div className="overflow-hidden rounded-xl border border-gray-300">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="text-left p-4 font-semibold text-gray-700 border-b">Item</th>
                        {currentQuestion.tableCategories?.map((cat: string) => (
                          <th key={cat} className="text-center p-4 font-semibold text-gray-700 border-b w-24">{cat}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentQuestion.tableItems.map((item: string, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-4 text-gray-800 border-b">{item}</td>
                          {currentQuestion.tableCategories?.map((cat: string) => (
                            <td key={cat} className="text-center p-4 border-b">
                              <RadioGroupItem
                                value={cat}
                                checked={tableAnswers[item] === cat}
                                onClick={() => handleTableAnswerChange(item, cat)}
                                className="w-5 h-5"
                                style={{ borderColor: 'rgb(59, 130, 246)' }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Category Table (e.g., Northward/Westward) */}
              {currentQuestion.questionType === "category-table" && currentQuestion.tableItems && (
                <div className="overflow-hidden rounded-xl border border-gray-300">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                        <th className="text-left p-4 font-semibold text-gray-700 border-b">Item</th>
                        {currentQuestion.tableCategories?.map((cat: string) => (
                          <th key={cat} className="text-center p-4 font-semibold text-gray-700 border-b w-32">{cat}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentQuestion.tableItems.map((item: string, idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-4 text-gray-800 border-b font-medium">{item}</td>
                          {currentQuestion.tableCategories?.map((cat: string) => (
                            <td key={cat} className="text-center p-4 border-b">
                              <div 
                                onClick={() => handleTableAnswerChange(item, cat)}
                                className={`w-6 h-6 mx-auto rounded-full border-2 cursor-pointer transition-all ${
                                  tableAnswers[item] === cat 
                                    ? 'bg-blue-600 border-blue-600' 
                                    : 'border-gray-400 hover:border-blue-400'
                                }`}
                              >
                                {tableAnswers[item] === cat && (
                                  <Check className="w-4 h-4 text-white m-auto mt-0.5" />
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Order/Sequence - Drag and Drop */}
              {currentQuestion.questionType === "order-sequence" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <p className="text-blue-800 text-sm">
                      Drag and drop to arrange the events in the correct order. The first event should be at the top.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {orderItems.map((item, index) => (
                      <div
                        key={item}
                        draggable
                        onDragStart={(e) => handleOrderDragStart(e, index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleOrderDrop(e, index)}
                        className="flex items-center p-4 bg-white border-2 border-gray-200 rounded-lg cursor-move hover:border-blue-400 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-bold mr-4">
                          {index + 1}
                        </div>
                        <GripVertical className="w-5 h-5 text-gray-400 mr-3 group-hover:text-blue-500" />
                        <span className="flex-1 text-gray-800">{item}</span>
                        <div className="flex flex-col gap-1 ml-2">
                          {index > 0 && (
                            <button
                              onClick={() => {
                                const newItems = [...orderItems];
                                [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
                                setOrderItems(newItems);
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <ArrowUp className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                          {index < orderItems.length - 1 && (
                            <button
                              onClick={() => {
                                const newItems = [...orderItems];
                                [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
                                setOrderItems(newItems);
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <ArrowDown className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Standard Multiple Choice and Listen Again (both use radio buttons) */}
              {(currentQuestion.questionType === "multiple-choice" || 
                currentQuestion.questionType === "replay" || 
                currentQuestion.questionType === "listen-again") && currentQuestion.options && (
                <RadioGroup 
                  value={answers[currentQuestion.id] || ""} 
                  onValueChange={handleAnswerChange}
                >
                  {currentQuestion.options.map((option: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 border transition-colors">
                      <RadioGroupItem 
                        value={option} 
                        id={`option-${index}`} 
                        className="w-6 h-6 mt-1"
                        style={{ borderColor: 'rgb(190, 24, 93)', color: 'rgb(190, 24, 93)', borderWidth: '2px' }}
                      />
                      <Label htmlFor={`option-${index}`} className="text-lg leading-relaxed cursor-pointer flex-1">
                        {String.fromCharCode(97 + index)}) {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                onClick={() => setViewMode("audio")}
                variant="outline"
              >
                Back to Audio
              </Button>

              <div className="flex space-x-3">
                {!isAnswerConfirmed ? (
                  <Button
                    onClick={handleConfirmAnswer}
                    disabled={(() => {
                      if (currentQuestion.questionType === "multiple-select") {
                        return selectedMultipleAnswers.length !== 2;
                      }
                      if (currentQuestion.questionType === "yes-no-table" || currentQuestion.questionType === "category-table") {
                        const requiredItems = currentQuestion.tableItems?.length || 0;
                        return Object.keys(tableAnswers).length < requiredItems;
                      }
                      if (currentQuestion.questionType === "order-sequence") {
                        return orderItems.length === 0;
                      }
                      return !answers[currentQuestion.id];
                    })()}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    OK
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {currentQuestionIndex === listeningQuestions.length - 1 ? 'Finish Test' : 'Next Question'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>

            {/* Replay Audio Button for replay questions */}
            {currentQuestion.questionType === "replay" && (
              <div className="text-center mt-4">
                <Button onClick={playReplaySegment} variant="outline" className="mb-4">
                  <Play className="h-4 w-4 mr-2" />
                  Replay Audio Segment
                </Button>
              </div>
            )}
              </div>
            </Card>
        </div>

        {/* Right Panel - Script (Grid Column 2) */}
        {showScript && (
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
              borderLeft: '2px solid #e5e7eb',
              height: 'calc(100vh - 200px)',
              minHeight: '600px'
            }}
          >
            <div className="p-4 border-b-2 border-gray-200 bg-gray-50" style={{ flexShrink: 0 }}>
              <h3 className="font-semibold text-gray-800 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Audio Script
              </h3>
            </div>
            <div 
              className="p-4 space-y-3" 
              style={{ 
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: 1
              }}
            >
              {(currentQuestion.conversationScript || listeningTest.script) ? (
                (() => {
                  const scriptToDisplay = currentQuestion.conversationScript || listeningTest.script;
                  
                  // If script is array format (mock data)
                  if (Array.isArray(scriptToDisplay)) {
                    return scriptToDisplay.map((segment: any, index: number) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg ${
                          currentTime >= segment.start && currentTime <= segment.end
                            ? 'bg-pink-100 border-2 border-pink-300'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          {formatTime(segment.start)} - {formatTime(segment.end)}
                        </div>
                        <p className="text-sm">{segment.text}</p>
                      </div>
                    ));
                  }
                  
                  // If script is string format (actual AI generated data) - Parse dialogue format
                  const lines = scriptToDisplay.split('\n').filter((line: string) => line.trim());
                    const speakers = new Set<string>();
                    const dialogues: { speaker: string; text: string }[] = [];
                    
                    let currentSpeaker = '';
                    let currentText = '';
                    
                    lines.forEach((line: string, idx: number) => {
                      // Format 1: "Speaker: Text"
                      const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
                      if (colonMatch) {
                        if (currentSpeaker && currentText) {
                          speakers.add(currentSpeaker);
                          dialogues.push({ speaker: currentSpeaker, text: currentText.trim() });
                        }
                        currentSpeaker = colonMatch[1].trim();
                        currentText = colonMatch[2].trim();
                        return;
                      }
                      
                      // Format 2: Speaker name on one line, text on next line(s)
                      const speakerPatterns = ['Narrator', 'Student', 'Professor', 'Librarian', 'Lecturer', 'Teacher', 'Assistant'];
                      const isSpeakerLine = speakerPatterns.some(pattern => 
                        line.trim().toLowerCase() === pattern.toLowerCase() || 
                        line.trim().toLowerCase().startsWith(pattern.toLowerCase())
                      );
                      
                      if (isSpeakerLine) {
                        if (currentSpeaker && currentText) {
                          speakers.add(currentSpeaker);
                          dialogues.push({ speaker: currentSpeaker, text: currentText.trim() });
                        }
                        currentSpeaker = line.trim();
                        currentText = '';
                      } else if (currentSpeaker) {
                        currentText += (currentText ? ' ' : '') + line.trim();
                      }
                    });
                    
                    // Add last dialogue
                    if (currentSpeaker && currentText) {
                      speakers.add(currentSpeaker);
                      dialogues.push({ speaker: currentSpeaker, text: currentText.trim() });
                    }
                    
                    const speakerArray = Array.from(speakers);
                    const speakerColors: Record<string, string> = {};
                    const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700'];
                    
                    speakerArray.forEach((speaker, idx) => {
                      // Narrator gets special gray color
                      if (speaker.toLowerCase() === 'narrator') {
                        speakerColors[speaker] = 'bg-gray-200 text-gray-700';
                      } else {
                        speakerColors[speaker] = colors[idx % colors.length];
                      }
                    });
                    
                    return dialogues.length > 0 ? (
                      dialogues.map((dialogue, index) => (
                        <div key={index} className={`${isFullscreen ? 'p-4' : 'p-3'} rounded-lg bg-gray-50 border border-gray-200`}>
                          <div className="flex items-start gap-3">
                            <Badge className={`${speakerColors[dialogue.speaker]} ${isFullscreen ? 'px-3 py-2 text-sm' : 'px-2 py-1 text-xs'} font-semibold shrink-0`}>
                              {dialogue.speaker}
                            </Badge>
                            <p className={`${isFullscreen ? 'text-base' : 'text-sm'} leading-relaxed flex-1`}>{dialogue.text}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`${isFullscreen ? 'p-4' : 'p-3'} rounded-lg bg-gray-50`}>
                        <p className={`${isFullscreen ? 'text-base' : 'text-sm'} whitespace-pre-line`}>{scriptToDisplay}</p>
                      </div>
                    );
                })()
              ) : (
                <div className="p-3 rounded-lg bg-gray-100">
                  <p className="text-sm text-gray-500">스크립트를 불러오는 중...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Panel - Report (Grid Column 2) */}
        {showReport && !showScript && (
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
              borderLeft: '2px solid #e5e7eb',
              overflow: 'hidden'
            }}
          >
            <div className="p-4 border-b-2 border-gray-200 bg-gray-50" style={{ flexShrink: 0 }}>
              <h3 className="font-semibold text-gray-800 flex items-center justify-between">
                <span className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Test Report
                </span>
                <div className="text-lg font-bold text-blue-600">
                  {calculateScore()}/{listeningQuestions.reduce((sum, q) => sum + q.points, 0)}
                </div>
              </h3>
            </div>
            <div 
              className="p-4 space-y-4" 
              style={{ 
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: 1
              }}
            >
                {listeningQuestions.map((question, index) => {
                  const userAnswer = question.questionType === "multiple-select" 
                    ? answers[question.id]?.split(',') || []
                    : answers[question.id];
                  
                  const isCorrect = question.questionType === "multiple-select"
                    ? (() => {
                        const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
                        const correctAnswers = question.correctAnswer.split(',');
                        return userAnswerArray.length === correctAnswers.length && 
                               userAnswerArray.every((answer: string) => correctAnswers.includes(answer));
                      })()
                    : userAnswer === question.correctAnswer;

                  return (
                    <Card key={question.id} className={`border ${isCorrect ? 'border-pink-200 bg-pink-50' : 'border-red-200 bg-red-50'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            Q{index + 1}
                          </span>
                          <div className="flex items-center">
                            {isCorrect ? (
                              <span className="text-pink-600 text-xs font-medium flex items-center">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                +{question.points}
                              </span>
                            ) : (
                              <span className="text-red-600 text-xs font-medium flex items-center">
                                <XCircle className="h-3 w-3 mr-1" />
                                0
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-800 mb-2 line-clamp-2">{question.questionText}</p>

                        <div className="space-y-2">
                          <div className="text-xs">
                            <span className="text-gray-600">Your: </span>
                            <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                              {question.questionType === "multiple-select" 
                                ? (Array.isArray(userAnswer) ? userAnswer.join(', ') : "None")
                                : userAnswer || "None"}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div className="text-xs">
                              <span className="text-gray-600">Correct: </span>
                              <span className="text-green-600">{question.correctAnswer}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
        )}
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={ttsAudioUrl || listeningTest.audioUrl}
        onEnded={handleAudioEnded}
        onLoadedMetadata={(e) => {
          const audio = e.currentTarget;
          if (audio.duration && audio.duration !== Infinity) {
            setDuration(audio.duration);
          }
        }}
        preload="auto"
        playsInline
        webkit-playsinline="true"
      />

      {/* Solution Dialog - Using new ToeflFeedbackPanel */}
      <FeedbackDialog
        open={showSolution}
        onOpenChange={setShowSolution}
        section="listening"
        isLoading={isLoadingSolution}
        explanation={solutionExplanation || "AI 설명을 생성 중입니다..."}
        questionText={currentQuestion?.questionText}
        correctAnswer={currentQuestion?.correctAnswer}
        userAnswer={currentQuestion ? answers[currentQuestion.id] : undefined}
        isCorrect={currentQuestion ? answers[currentQuestion.id] === currentQuestion.correctAnswer : undefined}
      />

      <Suspense fallback={null}>
        <DeferredLoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            toast({
              title: "로그인 성공",
              description: "TOEFL Listening 테스트를 시작할 수 있습니다!",
            });
          }}
        />
      </Suspense>
    </FullscreenWrapper>
  );
}
