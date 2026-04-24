import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import { useFullscreen } from "@/hooks/useFullscreen";
import type { ListeningQuestionItem, Passage, ScriptLine } from "@/components/toefl-listening-new/shared";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext
} from "@/lib/safariAudioCompat";
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Headphones,
  FileText,
  Maximize,
  Minimize
} from "lucide-react";

const DeferredLoginModal = lazy(() => import("@/components/LoginModal"));
const DeferredToeflListeningConversationView = lazy(
  () => import("@/components/toefl-listening-new/ToeflListeningConversationView"),
);
const DeferredToeflListeningQuestionsView = lazy(
  () => import("@/components/toefl-listening-new/ToeflListeningQuestionsView"),
);

interface ListeningTestApiResponse {
  id: string;
  type?: "conversation" | "lecture" | string | null;
  title?: string | null;
  script?: ScriptLine[] | string | null;
  passage?: {
    content?: string | null;
  } | string | null;
  audioUrl?: string | null;
  duration?: number | null;
  questions?: ListeningQuestionItem[] | null;
}

// TOEFL Listening Conversation Data
const conversationData = {
  id: "conversation-1",
  title: "Conversation 1",
  audioUrl: "/audio/toefl-conversation-1.mp3",
  duration: 180, // 3 minutes
  image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop", // Professional business conversation between colleagues
  script: [
    { start: 0, end: 5, speaker: "Student", text: "Hi, I'm here about my financial aid application." },
    { start: 5, end: 12, speaker: "Advisor", text: "Of course! What's your student ID number?" },
    { start: 12, end: 20, speaker: "Student", text: "It's 2024-7891. I submitted my FAFSA last month but haven't heard anything back." },
    { start: 20, end: 28, speaker: "Advisor", text: "Let me check your file... I see the issue. You're missing a document." },
    { start: 28, end: 35, speaker: "Student", text: "Really? I thought I submitted everything. What am I missing?" },
    { start: 35, end: 45, speaker: "Advisor", text: "We need your parent's tax return from last year. Without that, we can't process your application." },
    { start: 45, end: 52, speaker: "Student", text: "Oh no! How long do I have to submit it?" },
    { start: 52, end: 62, speaker: "Advisor", text: "The deadline is next Friday. But don't worry, you can submit it online through our portal." },
    { start: 62, end: 70, speaker: "Student", text: "That's a relief. Will I still be eligible for the Pell Grant?" },
    { start: 70, end: 80, speaker: "Advisor", text: "Yes, as long as you submit the document by the deadline, you'll still be considered." },
    { start: 80, end: 88, speaker: "Student", text: "Great! And what about work-study opportunities?" },
    { start: 88, end: 98, speaker: "Advisor", text: "Those are processed separately. You'll need to check the job board on our website." },
    { start: 98, end: 108, speaker: "Student", text: "Perfect. I'll get that tax return submitted today. Thank you so much for your help!" },
    { start: 108, end: 115, speaker: "Advisor", text: "You're welcome! Feel free to contact us if you have any other questions." }
  ] as ScriptLine[],
};

const questions: ListeningQuestionItem[] = [
  {
    id: "q1",
    questionText: "What is the main purpose of the student's visit to the financial aid office?",
    options: [
      "To apply for a work-study position",
      "To check on the status of their financial aid application", 
      "To submit their parent's tax return",
      "To ask about Pell Grant eligibility"
    ],
    correctAnswer: 1,
    explanation: "The student explicitly states they are there about their financial aid application status."
  },
  {
    id: "q2",
    questionText: "What document does the student need to submit?",
    options: [
      "Their own tax return",
      "FAFSA application",
      "Parent's tax return from last year",
      "Work-study application"
    ],
    correctAnswer: 2,
    explanation: "The advisor clearly states that the student needs to submit their parent's tax return from last year."
  },
  {
    id: "q3",
    questionText: "When is the deadline for submitting the missing document?",
    options: [
      "Today",
      "Next Monday", 
      "Next Friday",
      "Next month"
    ],
    correctAnswer: 2,
    explanation: "The advisor tells the student that the deadline is next Friday."
  },
  {
    id: "q4",
    questionText: "How can the student submit the required document?",
    options: [
      "By mail only",
      "In person at the office",
      "Online through the portal",
      "By email attachment"
    ],
    correctAnswer: 2,
    explanation: "The advisor mentions that the document can be submitted online through their portal."
  },
  {
    id: "q5",
    questionText: "What does the advisor say about work-study opportunities?",
    options: [
      "They are not available this semester",
      "They are processed with financial aid applications",
      "They are processed separately and listed on the website job board",
      "The student is not eligible for them"
    ],
    correctAnswer: 2,
    explanation: "The advisor explains that work-study opportunities are processed separately and can be found on the website job board."
  }
];

type Phase = 'conversation' | 'questions';

export default function TOEFLListeningNew() {
  // Get test ID from URL params
  const params = useParams();
  const testId = params.testId;
  
  // Load actual test data
  const { data: testData, isLoading: isLoadingTest } = useQuery<ListeningTestApiResponse>({
    queryKey: ['/api/tests', testId],
    enabled: !!testId,
  });

  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<Phase>('conversation');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number}>({});
  const [showScript, setShowScript] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState<{[key: string]: boolean}>({});
  const [explanations, setExplanations] = useState<{[key: string]: string}>({});
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState<{[key: string]: boolean}>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Create passages array from test data or use mock data
  const createPassagesFromData = (): Passage[] => {
    if (testData) {
      const normalizedScript =
        testData.script ??
        (typeof testData.passage === "object" && testData.passage !== null ? testData.passage.content : testData.passage) ??
        "";

      // For AI generated tests, treat as single passage for now
      return [{
        id: testData.id,
        type: testData.type === "lecture" ? "lecture" : "conversation",
        title: testData.title || "AI Generated Listening Test",
        script: normalizedScript,
        audioUrl: testData.audioUrl || `/uploads/listening_${Date.now()}.mp3`,
        duration: testData.duration || 180,
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop&crop=face',
        questions: testData.questions || []
      }];
    }
    
    // Mock data with multiple passages
    return [
      {
        id: 'conversation-1',
        type: 'conversation' as const,
        title: 'Campus Conversation - Financial Aid',
        script: conversationData.script,
        audioUrl: conversationData.audioUrl,
        duration: conversationData.duration,
        image: conversationData.image,
        questions: questions
      },
      {
        id: 'lecture-1',
        type: 'lecture' as const,
        title: 'Biology Lecture - Ecosystem Dynamics',
        script: 'Professor: Today we will discuss the complex relationships within ecosystem dynamics...',
        audioUrl: '/audio/toefl-lecture-1.mp3',
        duration: 240,
        image: 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=400&h=300&fit=crop',
        questions: [
          {
            id: "lq1",
            questionText: "What is the main topic of the lecture?",
            options: [
              "Plant classification systems",
              "Ecosystem dynamics and relationships", 
              "Marine biology research",
              "Climate change effects"
            ],
            correctAnswer: 1,
            explanation: "The professor clearly states that the lecture will focus on ecosystem dynamics and complex relationships."
          },
          {
            id: "lq2",
            questionText: "According to the professor, what factors affect ecosystem balance?",
            options: [
              "Only predator-prey relationships",
              "Temperature and rainfall only",
              "Multiple interconnected factors",
              "Human activities exclusively"
            ],
            correctAnswer: 2,
            explanation: "The lecture emphasizes that ecosystem balance depends on multiple interconnected factors working together."
          }
        ]
      }
    ];
  };

  const passages = createPassagesFromData();
  const currentPassage = passages[currentPassageIndex];
  const actualData = currentPassage;
  const actualQuestions = currentPassage.questions;
  
  const displayData: Passage = actualData;

  // Audio controls and script tracking
  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.playbackRate = 0.9;
        await unlockAudioContext();
        await playSafariCompatibleAudio(audioRef.current);
        setIsPlaying(true);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update current script line based on audio time
  useEffect(() => {
    if (showScript && Array.isArray(actualData.script)) {
      const currentLine = actualData.script.findIndex((line) => 
        currentTime >= line.start && currentTime <= line.end
      );
      if (currentLine !== -1) {
        setCurrentScriptIndex(currentLine);
      }
    }
  }, [currentTime, showScript, actualData]);

  // AI Explanation functions
  const generateExplanation = async (questionId: string) => {
    if (explanations[questionId] || isGeneratingExplanation[questionId]) return;

    setIsGeneratingExplanation(prev => ({ ...prev, [questionId]: true }));

    try {
      const question = actualQuestions.find((q) => q.id === questionId);
      if (!question) return;

      const selectedAnswer = selectedAnswers[questionId];
      const conversation = Array.isArray(actualData.script) 
        ? actualData.script.map(line => `${line.speaker}: ${line.text}`).join('\n')
        : actualData.script || '';

      const response = await fetch('/api/listening/explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: question.questionText,
          selectedAnswer: selectedAnswer,
          correctAnswer: question.correctAnswer,
          options: question.options,
          conversation: conversation
        })
      });

      if (!response.ok) throw new Error('Failed to generate explanation');
      
      const data = await response.json();
      setExplanations(prev => ({ ...prev, [questionId]: data.explanation }));
    } catch (error) {
      console.error('Error generating explanation:', error);
      toast({
        title: "오류",
        description: "AI 해설 생성에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingExplanation(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const toggleExplanation = (questionId: string) => {
    if (!explanations[questionId] && !isGeneratingExplanation[questionId]) {
      generateExplanation(questionId);
    }
    setShowExplanation(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  // Navigation functions
  const goToQuestions = () => {
    setCurrentPhase('questions');
    setCurrentQuestionIndex(0);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < actualQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // 현재 passage의 마지막 문제라면 다음 passage로
      nextPassage();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      setCurrentPhase('conversation');
    }
  };

  const nextPassage = () => {
    if (currentPassageIndex < passages.length - 1) {
      setCurrentPassageIndex(currentPassageIndex + 1);
      setCurrentPhase('conversation');
      setCurrentQuestionIndex(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setShowScript(false);
      setCurrentScriptIndex(0);
      
      toast({
        title: `${passages[currentPassageIndex + 1].type === 'conversation' ? 'Conversation' : 'Lecture'} ${currentPassageIndex + 2}`,
        description: `${passages[currentPassageIndex + 1].title}`,
      });
    } else {
      // 모든 passage 완료
      setTestCompleted(true);
      toast({
        title: "테스트 완료!",
        description: "모든 지문을 완료했습니다.",
      });
    }
  };

  const prevPassage = () => {
    if (currentPassageIndex > 0) {
      setCurrentPassageIndex(currentPassageIndex - 1);
      setCurrentPhase('conversation');
      setCurrentQuestionIndex(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setShowScript(false);
      setCurrentScriptIndex(0);
    }
  };

  const submitTest = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    const answeredQuestions = Object.keys(selectedAnswers).length;
    if (answeredQuestions < actualQuestions.length) {
      toast({
        title: "모든 문제를 풀어주세요",
        description: `${actualQuestions.length}개 중 ${answeredQuestions}개 문제에만 답하셨습니다.`,
        variant: "destructive"
      });
      return;
    }
    
    setTestCompleted(true);
    toast({
      title: "테스트 완료!",
      description: "답안이 제출되었습니다.",
    });
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  if (isLoading || isLoadingTest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl">
            <Headphones className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-lg font-semibold text-slate-700 mt-4">테스트 불러오는 중...</p>
            <p className="text-sm text-slate-500">잠시만 기다려주세요</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SecurityWrapper 
      watermark="iNRISE TOEFL LISTENING TEST"
      disableRightClick={false}
      disableKeyboardShortcuts={false}
      disableTextSelection={false}
      disableScreenshot={false}
      showSecurityNotice={false}
    >
      <FullscreenWrapper className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" hideButton={true}>
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 shadow-xl border-b border-pink-800/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <div>
                  <Badge variant="secondary" className="bg-white/15 border-white/30 text-white backdrop-blur-sm mb-1">
                    TOEFL LISTENING
                  </Badge>
                  <h1 className="text-xl font-bold text-white" style={{fontFamily: 'Inter, sans-serif'}}>
                    {currentPhase === 'conversation' 
                      ? `${currentPassage.type === 'conversation' ? 'Conversation' : 'Lecture'} ${currentPassageIndex + 1} of ${passages.length}` 
                      : `Question ${currentQuestionIndex + 1} of ${actualQuestions.length}`
                    }
                  </h1>
                  <p className="text-white/80 text-sm">
                    {currentPassage.title}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Modern Navigation */}
            <div className="flex items-center space-x-4">
              {currentPhase === 'questions' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="flex items-center gap-2 text-white border border-white/20 hover:bg-white/10 backdrop-blur-sm transition-all"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    {isFullscreen ? 'Exit Full' : 'Full Screen'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowScript(!showScript)}
                    className={`flex items-center gap-2 text-white border border-white/20 hover:bg-white/10 backdrop-blur-sm transition-all ${showScript ? 'bg-white/10' : ''}`}
                  >
                    <FileText className="w-4 h-4" />
                    Script
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevQuestion}
                    className="flex items-center gap-2 text-white border border-white/20 hover:bg-white/10 backdrop-blur-sm transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  {currentQuestionIndex < actualQuestions.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={nextQuestion}
                      className="flex items-center gap-2 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30 transition-all"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : currentPassageIndex < passages.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={nextPassage}
                      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all transform hover:scale-105"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Next {passages[currentPassageIndex + 1].type === 'conversation' ? 'Conversation' : 'Lecture'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={submitTest}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all transform hover:scale-105"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Submit Test
                    </Button>
                  )}
                </>
              )}
              
              {currentPhase === 'conversation' && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFullscreen}
                    className="flex items-center gap-2 text-white border border-white/20 hover:bg-white/10 backdrop-blur-sm transition-all"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    {isFullscreen ? 'Exit Full' : 'Full Screen'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowScript(!showScript)}
                    className={`flex items-center gap-2 text-white border border-white/20 hover:bg-white/10 backdrop-blur-sm transition-all ${showScript ? 'bg-white/10' : ''}`}
                  >
                    <FileText className="w-4 h-4" />
                    {showScript ? 'Hide Script' : 'Show Script'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={goToQuestions}
                    className="flex items-center gap-2 bg-white text-pink-600 hover:bg-gray-100 shadow-lg transition-all transform hover:scale-105"
                  >
                    Begin Questions
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPhase === "conversation" ? (
          <Suspense fallback={null}>
            <DeferredToeflListeningConversationView
              currentPassage={currentPassage}
              currentPassageIndex={currentPassageIndex}
              passagesLength={passages.length}
              showScript={showScript}
              isPlaying={isPlaying}
              currentTime={currentTime}
              formatTime={formatTime}
              togglePlayPause={togglePlayPause}
              goToQuestions={goToQuestions}
              currentScriptIndex={currentScriptIndex}
            />
          </Suspense>
        ) : (
          <Suspense fallback={null}>
            <DeferredToeflListeningQuestionsView
              currentQuestionIndex={currentQuestionIndex}
              actualQuestions={actualQuestions}
              selectedAnswers={selectedAnswers}
              handleAnswerSelect={handleAnswerSelect}
              toggleExplanation={toggleExplanation}
              isGeneratingExplanation={isGeneratingExplanation}
              showExplanation={showExplanation}
              explanations={explanations}
              setCurrentQuestionIndex={setCurrentQuestionIndex}
              prevQuestion={prevQuestion}
              nextQuestion={nextQuestion}
              currentPassageIndex={currentPassageIndex}
              passagesLength={passages.length}
              showScript={showScript}
              testDataScript={testData?.script}
              displayScript={displayData.script}
            />
          </Suspense>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={displayData.audioUrl}
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
        webkit-playsinline="true"
      />

      {/* Login Modal */}
      <Suspense fallback={null}>
        <DeferredLoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </Suspense>
    </FullscreenWrapper>
    </SecurityWrapper>
  );
}
