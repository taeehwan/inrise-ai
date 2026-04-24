import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowLeft, ArrowRight, Flag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Test, Question, TestAttempt } from "@shared/schema";

// Helper function to parse questions from passage content - improved for TOEFL Reading format
function parseQuestionsFromText(questionsText: string): any[] {
  const questions: any[] = [];
  
  // Split by question patterns - look for lines ending with ?
  const lines = questionsText.split('\n').filter(line => line.trim());
  
  let currentQuestion: any = null;
  let currentOptions: string[] = [];
  let questionIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if this line is a question (ends with ?)
    if (line.endsWith('?')) {
      // Save previous question if exists
      if (currentQuestion && currentOptions.length > 0) {
        questions.push({
          id: `q${questionIndex}`,
          questionText: currentQuestion,
          options: [...currentOptions],
          correctAnswer: currentOptions[0], // Default to first option
          points: 1,
          questionType: "multiple-choice"
        });
        questionIndex++;
      }
      
      // Start new question
      currentQuestion = line;
      currentOptions = [];
    }
    // Check if this line is an option (starts with ○)
    else if (line.startsWith('○ ')) {
      currentOptions.push(line.substring(2).trim());
    }
    // Handle directions and special question types
    else if (line.startsWith('Directions:') && currentQuestion) {
      currentQuestion = line + ' ' + currentQuestion;
    }
  }
  
  // Don't forget the last question
  if (currentQuestion && currentOptions.length > 0) {
    questions.push({
      id: `q${questionIndex}`,
      questionText: currentQuestion,
      options: [...currentOptions],
      correctAnswer: currentOptions[0],
      points: 1,
      questionType: "multiple-choice"
    });
  }
  
  return questions;
}

export default function TestTaking() {
  const { testId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Redirect TestSet IDs to the proper Full Test interface
  useEffect(() => {
    if (testId && testId.startsWith('testset-')) {
      // Keep the full testset ID as the backend expects it
      setLocation(`/actual-test/${testId}`);
    }
  }, [testId, setLocation]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);

  const { data: test, isLoading: testLoading, error: testError } = useQuery<Test>({
    queryKey: ["/api/tests", testId],
    queryFn: async () => {
      const response = await fetch(`/api/tests/${testId}`);
      if (!response.ok) {
        throw new Error("Failed to load test");
      }
      return response.json();
    }
  });

  // Use questions from test data directly for AI tests (fallback to empty array)  
  let questions: any[] = [];
  
  // Debug: Log test data structure
  console.log("Debug: Test data structure:", test);
  console.log("Debug: Available questions sources:", {
    directQuestions: (test as any)?.questions,
    sectionDataQuestions: (test as any)?.sectionData?.questions
  });
  
  // Safely get questions - check multiple locations
  if (test) {
    // Try direct questions first
    if ((test as any).questions && Array.isArray((test as any).questions)) {
      questions = (test as any).questions;
      console.log("Debug: Questions loaded from direct field:", questions.length, questions[0]);
    }
    // Try sectionData.questions (AI generated tests)
    else if ((test as any).sectionData?.questions && Array.isArray((test as any).sectionData.questions)) {
      questions = (test as any).sectionData.questions;
      console.log("Debug: Questions loaded from sectionData:", questions.length, questions[0]);
    }
  }
  
  // Parse questions from passage content if template questions exist or if we have AI-generated content
  // Check multiple scenarios for AI-generated tests
  let shouldParseFromContent = false;
  let contentToCheck: string | null = null;
  
  // Scenario 1: Template questions (old format)
  if (questions.length > 0 && questions[0]?.question === "이 지문의 주요 내용은 무엇입니까?") {
    shouldParseFromContent = true;
  }
  
  // Scenario 2: AI generated test with passage in questions (new format) - with null safety
  if (questions.length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (question && 
          typeof question === 'object' && 
          question !== null && 
          question !== undefined &&
          'passage' in question && 
          question.passage &&
          typeof question.passage === 'string') {
        shouldParseFromContent = true;
        console.log("Debug: Found passage in question", i, question);
        break;
      }
    }
  }
  
  if (shouldParseFromContent) {
    // Check passages array first (safe null checking)
    const passages = (test as any)?.passages;
    if (passages && Array.isArray(passages) && passages.length > 0 && passages[0]?.content) {
      contentToCheck = passages[0].content;
    }
    
    // If no passages, check if questions have passage property (AI generated tests)
    if (!contentToCheck && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        if (question && 
            typeof question === 'object' && 
            question !== null && 
            question !== undefined &&
            'passage' in question && 
            question.passage && 
            typeof question.passage === 'string') {
          contentToCheck = question.passage;
          console.log("Debug: Using passage from question", i, question.passage.substring(0, 100));
          break;
        }
      }
    }
    
    // Try to find Questions section in content
    if (contentToCheck && typeof contentToCheck === 'string') {
      const questionsMatch = contentToCheck.match(/Questions\s*\n([\s\S]*?)$/m);  
      
      if (questionsMatch && questionsMatch[1]) {
        const questionsText = questionsMatch[1];
        const parsedQuestions = parseQuestionsFromText(questionsText);
        
        if (parsedQuestions.length > 0) {
          questions = parsedQuestions;
        }
      }
    }
  }
  
  // Generate demo questions if none available (moved up before currentQuestion calculation)
  if (test && questions.length === 0) {
    questions = [
      {
        id: 'demo1',
        questionText: 'This is a demo question. What is the main topic of the passage?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0,
        questionType: 'multiple_choice',
        points: 1
      },
      {
        id: 'demo2', 
        questionText: 'According to the passage, which statement is true?',
        options: ['Statement 1', 'Statement 2', 'Statement 3', 'Statement 4'],
        correctAnswer: 1,
        questionType: 'multiple_choice',
        points: 1
      }
    ];
  }
  
  // Safe current question selection with bounds checking
  const currentQuestion = (questions && 
                           Array.isArray(questions) && 
                           questions.length > 0 && 
                           currentQuestionIndex < questions.length &&
                           questions[currentQuestionIndex]) ? 
                           questions[currentQuestionIndex] : null;
  
  console.log("Debug: Current question index:", currentQuestionIndex, "Total questions:", questions.length, "Current question:", currentQuestion);

  // Create test attempt when component mounts.
  // Server-side binds the attempt to req.user.id; we no longer send a body.userId.
  const createAttemptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/test-attempts", {
        testId,
        status: "in_progress",
      });
      return response.json();
    },
    onSuccess: (attempt: any) => {
      setAttemptId(attempt.id);
      if (test) {
        setTimeRemaining(test.duration * 60); // Convert minutes to seconds
      }
    },
    onError: () => {
      toast({
        title: "Test start failed",
        description: "Could not start the test. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      const question = questions.find((q: any) => q && typeof q === 'object' && q.id === questionId);
      const isCorrect = question?.correctAnswer === answer;
      
      return apiRequest("POST", "/api/answers", {
        attemptId,
        questionId,
        userAnswer: answer,
        isCorrect,
        pointsEarned: isCorrect ? (question?.points || 1) : 0,
        timeSpent: 60 // Simplified - in real app would track actual time
      });
    },
  });

  // Complete test mutation
  const completeTestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/score-test", {
        attemptId
      });
      return response;
    },
    onSuccess: (result) => {
      toast({
        title: "Test Completed!",
        description: `Your score: ${(result as any).totalScore}`,
      });
      setLocation(`/results/${attemptId}`);
    },
  });

  // Initialize test attempt only after the user context is available. If the
  // route mounted without auth, bail out — the ProtectedRoute wrapper should
  // have redirected but this is a defensive guard.
  useEffect(() => {
    if (test && !attemptId && user?.id && !createAttemptMutation.isPending) {
      createAttemptMutation.mutate();
    }
  }, [test, attemptId, user?.id]);

  // Timer countdown - NO AUTO-SUBMIT for practice mode
  // User controls when to submit, timer expiration only shows an alert
  useEffect(() => {
    if (timeRemaining > 0 && !timeExpired) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setTimeExpired(true);
            toast({
              title: "시간이 종료되었습니다",
              description: "원하실 때 '제출' 버튼을 눌러 답안을 제출해주세요.",
              variant: "default",
              duration: 10000,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [timeRemaining, timeExpired, toast]);

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (answer: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
    // Guard against double-submit races: don't fire while a previous POST /answers
    // is still in flight for this question.
    if (submitAnswerMutation.isPending) return;
    submitAnswerMutation.mutate({
      questionId: currentQuestion.id,
      answer,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleCompleteTest = () => {
    if (attemptId) {
      completeTestMutation.mutate();
    }
  };

  // Enhanced loading and error states
  if (testLoading || !test) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-cool-gray">Loading test...</p>
        </div>
      </div>
    );
  }

  if (testError) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">테스트를 불러올 수 없습니다.</p>
          <Button onClick={() => setLocation('/tests')}>테스트 목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  // Check if we have questions, if not show error
  if (test && (!questions || questions.length === 0)) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">테스트 문제를 불러올 수 없습니다.</p>
          <p className="text-sm text-gray-600 mb-4">AI 생성된 테스트의 문제 데이터가 누락되었습니다.</p>
          <Button onClick={() => setLocation('/tests')}>테스트 목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge className={test.examType === "toefl" ? "bg-blue-primary" : "bg-green-success"}>
                {test.examType.toUpperCase()}
              </Badge>
              <h1 className="text-xl font-semibold text-charcoal">{test.title}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className="flex items-center space-x-2 text-sm"
                role="timer"
                aria-live="off"
                aria-label={timeExpired ? "Time expired" : `Time remaining ${formatTime(timeRemaining)}`}
              >
                <Clock
                  className={`h-4 w-4 ${timeExpired ? 'text-red-500 animate-pulse' : ''}`}
                  aria-hidden="true"
                />
                <span
                  className={`font-mono ${
                    timeExpired
                      ? 'text-red-500 font-bold'
                      : timeRemaining < 300
                      ? 'text-red-500'
                      : 'text-cool-gray'
                  }`}
                >
                  {timeExpired ? '시간 종료!' : formatTime(timeRemaining)}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCompleteTest}
                disabled={completeTestMutation.isPending}
              >
                <Flag className="h-4 w-4 mr-2" />
                Finish Test
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-cool-gray mb-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">
              Question {currentQuestionIndex + 1}
            </CardTitle>
            {currentQuestion.passage && (
              <CardDescription>
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <h4 className="font-semibold mb-2">Reading Passage:</h4>
                  <p className="text-sm leading-relaxed">{currentQuestion.passage}</p>
                </div>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-charcoal font-medium mb-4">{currentQuestion.questionText}</p>
              
              {currentQuestion.questionType === "multiple_choice" && currentQuestion.options && (
                <RadioGroup 
                  value={answers[currentQuestion.id] || ""} 
                  onValueChange={handleAnswerChange}
                >
                  {(currentQuestion.options as string[]).map((option, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label 
                        htmlFor={`option-${index}`} 
                        className="cursor-pointer flex-1 text-sm"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="text-sm text-cool-gray">
            {Object.keys(answers).length} of {questions.length} answered
          </div>
          
          {currentQuestionIndex === questions.length - 1 ? (
            <Button 
              onClick={handleCompleteTest}
              disabled={completeTestMutation.isPending}
              className={test.examType === "toefl" ? "bg-blue-primary hover:bg-blue-primary/90" : "bg-green-success hover:bg-green-success/90"}
            >
              {completeTestMutation.isPending ? "Submitting..." : "Complete Test"}
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
