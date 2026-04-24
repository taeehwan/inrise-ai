import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext 
} from "@/lib/safariAudioCompat";
import { 
  Play, 
  Pause, 
  Volume2, 
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle,
  Circle,
  Loader2
} from "lucide-react";
import { useLocation } from "wouter";

interface Script {
  id: string;
  title: string;
  content: string;
  type: string;
  duration: number;
  instructions: string;
  audioUrl?: string;
  audioPath?: string;
}

interface Question {
  id: string;
  type: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  scriptIndex: number;
  points: number;
}

interface ListeningTestData {
  testTitle: string;
  scripts: Script[];
  questions: Question[];
  totalQuestions: number;
  totalDuration: number;
}

type Phase = 'conversation' | 'questions';

export default function AIListeningTest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // URL에서 테스트 ID 가져오기
  const testId = new URLSearchParams(window.location.search).get('testId');
  
  // 테스트 데이터 가져오기
  const { data: testData, isLoading: isTestLoading, error } = useQuery<ListeningTestData>({
    queryKey: ['ai-listening-test', testId],
    queryFn: async () => {
      if (!testId) throw new Error('Test ID is required');
      
      const response = await fetch(`/api/ai-tests/${testId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load test data');
      }
      
      return response.json();
    },
    enabled: !!testId,
  });

  // 상태 관리
  const [currentPhase, setCurrentPhase] = useState<Phase>('conversation');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: string]: number}>({});
  const [testCompleted, setTestCompleted] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [volume, setVolume] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // 오디오 이벤트 핸들러
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // 오디오 컨트롤 (Safari compatible)
  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.playbackRate = 0.9;
      await unlockAudioContext();
      await playSafariCompatibleAudio(audio);
    }
    setIsPlaying(!isPlaying);
  };

  // 질문 단계로 이동
  const goToQuestions = () => {
    setCurrentPhase('questions');
    setCurrentQuestionIndex(0);
  };

  // 이전/다음 질문
  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      setCurrentPhase('conversation');
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (testData?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // 답안 선택
  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  // 테스트 제출
  const submitTest = () => {
    const answeredQuestions = Object.keys(selectedAnswers).length;
    const totalQuestions = testData?.questions.length || 0;
    
    if (answeredQuestions < totalQuestions) {
      toast({
        title: "모든 문제를 풀어주세요",
        description: `${totalQuestions}개 중 ${answeredQuestions}개 문제에만 답하셨습니다.`,
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

  if (isTestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !testData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">테스트를 불러올 수 없습니다</h2>
          <p className="text-gray-600 mb-4">테스트 ID를 확인해주세요.</p>
          <Button onClick={() => setLocation('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  if (testCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">테스트 완료!</h2>
            <p className="text-gray-600 mb-6">
              답안이 성공적으로 제출되었습니다.
            </p>
            <Button onClick={() => setLocation('/')} className="w-full">
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = testData.questions[currentQuestionIndex];
  const currentScript = testData.scripts[0]; // AI 테스트는 보통 하나의 스크립트

  return (
    <SecurityWrapper 
      watermark="iNRISE AI LISTENING TEST"
      disableRightClick={false}
      disableKeyboardShortcuts={false}
      disableTextSelection={false}
      disableScreenshot={false}
      showSecurityNotice={false}
    >
      <FullscreenWrapper className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-pink-700 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="bg-pink-50 border-pink-200 text-pink-800">
                  AI LISTENING TEST
                </Badge>
                <h1 className="text-xl font-bold text-white uppercase" style={{fontFamily: 'Arial, sans-serif'}}>
                  {currentPhase === 'conversation' ? testData.testTitle : `QUESTION ${currentQuestionIndex + 1} OF ${testData.questions.length}`}
                </h1>
              </div>
              
              {/* Navigation Buttons */}
              <div className="flex items-center space-x-3">
                {currentPhase === 'questions' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScript(!showScript)}
                      className="flex items-center gap-2 border-white text-white hover:bg-white hover:text-pink-700"
                      style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                    >
                      SCRIPT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevQuestion}
                      className="flex items-center gap-2 border-white text-white hover:bg-white hover:text-pink-700"
                      style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      BACK
                    </Button>
                    
                    {currentQuestionIndex < testData.questions.length - 1 ? (
                      <Button
                        size="sm"
                        onClick={nextQuestion}
                        className="flex items-center gap-2 bg-pink-600 text-white hover:bg-pink-700"
                        style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                      >
                        NEXT
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={submitTest}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                        style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                      >
                        <CheckCircle className="w-4 h-4" />
                        SUBMIT
                      </Button>
                    )}
                  </>
                )}
                
                {currentPhase === 'conversation' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScript(!showScript)}
                      className="flex items-center gap-2 border-white text-white hover:bg-white hover:text-pink-700"
                      style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                    >
                      SCRIPT
                    </Button>
                    <Button
                      size="sm"
                      onClick={goToQuestions}
                      className="flex items-center gap-2 bg-white text-pink-700 hover:bg-gray-100"
                      style={{fontFamily: 'Arial, sans-serif', textTransform: 'uppercase'}}
                    >
                      START QUESTIONS
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentPhase === 'conversation' ? (
            /* Conversation Phase */
            <div className="space-y-6">
              {showScript ? (
                /* Split Layout: Audio Left, Script Right */
                <div className="grid grid-cols-2 gap-6 h-[calc(100vh-200px)]">
                  {/* Left Section - Audio Player */}
                  <Card className="border-gray-300 bg-white">
                    <CardContent className="p-8 h-full flex flex-col justify-center">
                      <div className="text-center space-y-6">
                        {/* AI Test Image */}
                        <div className="relative mx-auto w-80 h-48 rounded-lg overflow-hidden shadow-lg">
                          <img 
                            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=face"
                            alt="AI Listening Test"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        </div>

                        {/* Audio Controls */}
                        <div className="space-y-4">
                          <Button
                            onClick={togglePlayPause}
                            size="lg"
                            className="w-24 h-24 rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-lg"
                          >
                            {isPlaying ? (
                              <Pause className="w-8 h-8" />
                            ) : (
                              <Play className="w-8 h-8 ml-1" />
                            )}
                          </Button>
                          
                          <div className="flex items-center justify-center space-x-4 text-sm text-navy-700">
                            <Clock className="w-4 h-4" />
                            <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor((testData?.totalDuration || 45) / 60)}:{String((testData?.totalDuration || 45) % 60).padStart(2, '0')}</span>
                          </div>
                          
                          <Progress 
                            value={duration ? (currentTime / duration) * 100 : 0} 
                            className="w-64 mx-auto"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right Section - Script */}
                  <Card className="border-gray-300 bg-white">
                    <CardContent className="p-6 h-full">
                      <h4 className="font-bold mb-4 text-navy-900 text-lg uppercase" style={{fontFamily: 'Arial, sans-serif'}}>
                        LISTENING SCRIPT
                      </h4>
                      <div className="space-y-3 h-full overflow-y-auto pr-2">
                        <div className="p-3 rounded-lg bg-pink-100 border-l-4 border-pink-600 shadow-md">
                          <div className="flex space-x-3">
                            <span className="font-bold min-w-0 flex-shrink-0 text-pink-700" style={{fontFamily: 'Arial, sans-serif'}}>
                              AI TEST:
                            </span>
                            <span className="text-pink-900 font-medium" style={{fontFamily: 'Arial, sans-serif'}}>
                              {currentScript?.content}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Full Width Audio Player */
                <Card className="border-gray-300 bg-white">
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      {/* AI Test Image */}
                      <div className="relative mx-auto w-96 h-64 rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=400&fit=crop&crop=face"
                          alt="AI Listening Test"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      </div>

                      {/* Audio Controls */}
                      <div className="space-y-4">
                        <Button
                          onClick={togglePlayPause}
                          size="lg"
                          className="w-32 h-32 rounded-full bg-pink-600 hover:bg-pink-700 text-white shadow-lg"
                        >
                          {isPlaying ? (
                            <Pause className="w-12 h-12" />
                          ) : (
                            <Play className="w-12 h-12 ml-1" />
                          )}
                        </Button>
                        
                        <div className="flex items-center justify-center space-x-4 text-sm text-navy-700">
                          <Clock className="w-4 h-4" />
                          <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')} / {Math.floor((testData?.totalDuration || 45) / 60)}:{String((testData?.totalDuration || 45) % 60).padStart(2, '0')}</span>
                        </div>
                        
                        <Progress 
                          value={duration ? (currentTime / duration) * 100 : 0} 
                          className="w-80 mx-auto"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Hidden Audio Element */}
              <audio ref={audioRef} src={currentScript?.audioUrl || undefined} playsInline webkit-playsinline="true" />
            </div>
          ) : (
            /* Questions Phase */
            <div className="space-y-6">
              {/* Progress Bar */}
              <Card className="border-pink-200 bg-pink-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-pink-900 uppercase" style={{fontFamily: 'Arial, sans-serif'}}>
                      QUESTION {currentQuestionIndex + 1} OF {testData.questions.length}
                    </span>
                    <span className="text-sm text-pink-700 font-medium uppercase" style={{fontFamily: 'Arial, sans-serif'}}>
                      {Object.keys(selectedAnswers).length} ANSWERED
                    </span>
                  </div>
                  <Progress 
                    value={((currentQuestionIndex + 1) / testData.questions.length) * 100} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              {showScript ? (
                /* Split Layout: Question Left, Script Right */
                <div className="grid grid-cols-3 gap-6">
                  {/* Left Section - Questions (2/3 width) */}
                  <div className="col-span-2 space-y-6">
                    {/* Current Question */}
                    <Card className="border-gray-300 bg-white">
                      <CardContent className="p-8">
                        <div className="space-y-6">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-pink-600" style={{fontFamily: 'Arial, sans-serif'}}>
                                {currentQuestionIndex + 1}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-navy-900 mb-6" style={{fontFamily: 'Arial, sans-serif'}}>
                                {currentQuestion?.question}
                              </h3>
                              
                              <RadioGroup
                                value={selectedAnswers[currentQuestion?.id]?.toString() || ""}
                                onValueChange={(value) => handleAnswerSelect(currentQuestion?.id, parseInt(value))}
                                className="space-y-4"
                              >
                                {currentQuestion?.options.map((option, index) => (
                                  <div key={index} className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-pink-50 hover:border-pink-200 transition-colors">
                                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-navy-800" style={{fontFamily: 'Arial, sans-serif'}}>
                                      {option}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Question Navigation */}
                    <Card className="border-gray-300 bg-white">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-navy-700 font-medium uppercase" style={{fontFamily: 'Arial, sans-serif'}}>
                            QUESTION NAVIGATION
                          </span>
                          <div className="flex space-x-2">
                            {testData.questions.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentQuestionIndex(index)}
                                className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                                  index === currentQuestionIndex
                                    ? 'bg-pink-600 text-white'
                                    : selectedAnswers[testData.questions[index].id] !== undefined
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                                }`}
                                style={{fontFamily: 'Arial, sans-serif'}}
                              >
                                {selectedAnswers[testData.questions[index].id] !== undefined ? (
                                  <CheckCircle className="w-4 h-4 mx-auto" />
                                ) : (
                                  index + 1
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Section - Script (1/3 width) */}
                  <div className="space-y-6">
                    <Card className="border-gray-300 bg-white h-full">
                      <CardContent className="p-6">
                        <h4 className="font-bold mb-4 text-navy-900 text-lg uppercase" style={{fontFamily: 'Arial, sans-serif'}}>
                          LISTENING SCRIPT
                        </h4>
                        <div className="space-y-3 overflow-y-auto">
                          <div className="p-3 rounded-lg bg-pink-100 border-l-4 border-pink-600 shadow-md">
                            <div className="flex space-x-3">
                              <span className="font-bold min-w-0 flex-shrink-0 text-pink-700" style={{fontFamily: 'Arial, sans-serif'}}>
                                AI TEST:
                              </span>
                              <span className="text-pink-900 font-medium" style={{fontFamily: 'Arial, sans-serif'}}>
                                {currentScript?.content}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                /* Full Width Question */
                <Card className="border-gray-300 bg-white">
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-pink-600" style={{fontFamily: 'Arial, sans-serif'}}>
                            {currentQuestionIndex + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-navy-900 mb-6" style={{fontFamily: 'Arial, sans-serif'}}>
                            {currentQuestion?.question}
                          </h3>
                          
                          <RadioGroup
                            value={selectedAnswers[currentQuestion?.id]?.toString() || ""}
                            onValueChange={(value) => handleAnswerSelect(currentQuestion?.id, parseInt(value))}
                            className="space-y-4"
                          >
                            {currentQuestion?.options.map((option, index) => (
                              <div key={index} className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-pink-50 hover:border-pink-200 transition-colors">
                                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-navy-800 text-lg" style={{fontFamily: 'Arial, sans-serif'}}>
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </FullscreenWrapper>
    </SecurityWrapper>
  );
}