import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Headphones, Mic, FileText, Sparkles, Image as ImageIcon, X, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { parseNewToeflListeningText, validateParsedListening } from "@/lib/newToeflListeningParser";
import type {
  NewToeflListeningQuestion,
  NewToeflReadingQuestion,
  NewToeflSpeakingQuestion,
  NewToeflWritingQuestion,
  Question,
} from "@/components/ai-test-creator/shared";
import toeflLogo from "@assets/stock_images/toefl_test_official__8af40204.jpg";

function invalidateTestCaches(qc: any) {
  qc.invalidateQueries({ queryKey: ["/api/tests"] });
  qc.invalidateQueries({ queryKey: ["/api/new-toefl/reading"] });
  qc.invalidateQueries({ queryKey: ["/api/new-toefl/listening"] });
  qc.invalidateQueries({ queryKey: ["/api/new-toefl/speaking"] });
  qc.invalidateQueries({ queryKey: ["/api/new-toefl/writing"] });
  qc.invalidateQueries({ queryKey: ["/api/ai-generated-tests"] });
}
import greLogo from "@assets/stock_images/gre_test_official_lo_3a4e5a73.jpg";
import satLogo from "@assets/stock_images/sat_test_official_lo_8b305fcf.jpg";

const DeferredAITestCreatorFormTab = lazy(() => import("@/components/ai-test-creator/AITestCreatorFormTab"));
const DeferredAITestCreatorInputTabs = lazy(
  () => import("@/components/ai-test-creator/AITestCreatorInputTabs"),
);
const DeferredNewToeflTextParserSection = lazy(
  () => import("@/components/ai-test-creator/NewToeflTextParserSection"),
);

export default function AITestCreator() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [examType, setExamType] = useState<"toefl" | "new-toefl" | "gre" | "sat">("toefl");
  
  // Admin-only access check
  const isAdmin = user?.role === 'admin';
  
  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      setLocation('/');
    }
  }, [authLoading, isAdmin, setLocation]);
  const [currentSection, setCurrentSection] = useState<"reading" | "listening" | "speaking" | "writing" | "verbal" | "quant" | "reading-writing" | "math">("reading");
  const [testTitle, setTestTitle] = useState("");
  const [content, setContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [isPrivateTest, setIsPrivateTest] = useState(false);
  
  // Excel upload states
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [excelErrors, setExcelErrors] = useState<string[]>([]);
  const [passageTitle, setPassageTitle] = useState<string>("");
  const [passageContent, setPassageContent] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Structured form states
  const [formPassageTitle, setFormPassageTitle] = useState<string>("");
  const [formPassageContent, setFormPassageContent] = useState<string>("");
  const [formNarration, setFormNarration] = useState<string>("");  // For listening sections
  const [formQuestions, setFormQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    questionType: "multiple-choice",
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: "A",
    explanation: "",
    points: 1
  });
  const [quickPasteText, setQuickPasteText] = useState<string>("");  // Quick paste text area

  // TOEFL Speaking specific states
  const [speakingType, setSpeakingType] = useState<"independent" | "integrated">("integrated");
  const [speakingTask, setSpeakingTask] = useState<"1" | "2" | "3" | "4">("2");
  const [speakingQuestion, setSpeakingQuestion] = useState<string>("");
  const [readingPassageTitle, setReadingPassageTitle] = useState<string>("");
  const [readingPassage, setReadingPassage] = useState<string>("");
  const [readingTime, setReadingTime] = useState<number>(45);
  const [listeningScript, setListeningScript] = useState<string>("");
  const [preparationTime, setPreparationTime] = useState<number>(30);
  const [responseTime, setResponseTime] = useState<number>(60);
  
  // Quick Paste states for Speaking Integrated
  const [speakingQuickPaste, setSpeakingQuickPaste] = useState<string>("");
  const [speakingParsedPreview, setSpeakingParsedPreview] = useState<{
    title: string;
    reading: string;
    listening: string;
    question: string;
  } | null>(null);
  const [speakingParseErrors, setSpeakingParseErrors] = useState<string[]>([]);

  // TOEFL Writing specific states
  const [writingType, setWritingType] = useState<"integrated" | "discussion">("integrated");
  const [writingTime, setWritingTime] = useState<number>(1200);
  const [writingReadingTime, setWritingReadingTime] = useState<number>(180);
  const [writingReadingPassage, setWritingReadingPassage] = useState<string>("");
  const [writingListeningScript, setWritingListeningScript] = useState<string>("");
  const [writingQuestion, setWritingQuestion] = useState<string>("");
  
  // Quick Paste states for Writing Integrated
  const [writingQuickPaste, setWritingQuickPaste] = useState<string>("");
  const [writingParsedPreview, setWritingParsedPreview] = useState<{
    reading: string;
    listening: string;
    question: string;
  } | null>(null);
  const [writingParseErrors, setWritingParseErrors] = useState<string[]>([]);
  
  // Quick Paste states for Writing Discussion
  const [discussionQuickPaste, setDiscussionQuickPaste] = useState<string>("");
  const [discussionParsedPreview, setDiscussionParsedPreview] = useState<{
    professorQuestion: string;
    studentResponses: { name: string; response: string }[];
  } | null>(null);
  const [discussionParseErrors, setDiscussionParseErrors] = useState<string[]>([]);

  const [newToeflReadingPreview, setNewToeflReadingPreview] = useState<NewToeflReadingQuestion[]>([]);
  const [newToeflReadingErrors, setNewToeflReadingErrors] = useState<string[]>([]);
  const [isAISolving, setIsAISolving] = useState(false);
  const [aiSolvedQuestions, setAiSolvedQuestions] = useState(false);

  // NEW TOEFL Listening parsed preview states
  const [newToeflListeningPreview, setNewToeflListeningPreview] = useState<NewToeflListeningQuestion[]>([]);
  const [newToeflListeningErrors, setNewToeflListeningErrors] = useState<string[]>([]);
  const [answersNeedReview, setAnswersNeedReview] = useState<boolean>(false);

  // NEW TOEFL Speaking parsed preview states
  const [newToeflSpeakingPreview, setNewToeflSpeakingPreview] = useState<NewToeflSpeakingQuestion[]>([]);
  const [newToeflSpeakingErrors, setNewToeflSpeakingErrors] = useState<string[]>([]);

  // NEW TOEFL Writing parsed preview states
  const [newToeflWritingPreview, setNewToeflWritingPreview] = useState<NewToeflWritingQuestion[]>([]);
  const [newToeflWritingErrors, setNewToeflWritingErrors] = useState<string[]>([]);

  // GRE Quantitative AI Auto-Generation states
  const [greQuantDifficulty, setGreQuantDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [greQuantQuestionCount, setGreQuantQuestionCount] = useState<number>(12);
  const [isGeneratingGreQuant, setIsGeneratingGreQuant] = useState<boolean>(false);

  // SAT Math AI Auto-Generation states
  const [satMathDifficulty, setSatMathDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [satMathQuestionCount, setSatMathQuestionCount] = useState<number>(22);
  const [isGeneratingSatMath, setIsGeneratingSatMath] = useState<boolean>(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse Integrated Speaking Paste helper function (improved with regex)
  const parseIntegratedSpeakingPaste = (text: string): { 
    title: string; 
    reading: string; 
    listening: string; 
    question: string; 
    errors: string[];
  } => {
    const normalized = text.replace(/\r\n?/g, "\n");
    const errors: string[] = [];
    const sections: Record<'title'|'reading'|'listening'|'question', string> = {
      title: '',
      reading: '',
      listening: '',
      question: ''
    };

    if (!normalized.trim()) {
      errors.push('텍스트가 비어있습니다');
      return { ...sections, errors };
    }

    // Regex to capture marker and content (supports inline text, no newline required)
    const pattern = /\[(TITLE|READING|LISTENING|QUESTION)\]\s*([\s\S]*?)(?=\n?\[(?:TITLE|READING|LISTENING|QUESTION)\]|\s*$)/gi;
    let match: RegExpExecArray | null;
    
    while ((match = pattern.exec(normalized)) !== null) {
      const key = match[1].toLowerCase() as keyof typeof sections;
      const value = match[2].trim();
      sections[key] = value;
    }

    // Check for missing or empty sections
    (['title','reading','listening','question'] as const).forEach((key) => {
      if (!sections[key]) {
        errors.push(`${key.toUpperCase()} 섹션을 찾을 수 없거나 내용이 비어있습니다`);
      }
    });

    if (errors.length && Object.values(sections).every((val) => !val)) {
      errors.unshift('필수 마커 [TITLE], [READING], [LISTENING], [QUESTION]를 모두 포함해주세요');
    }

    return { ...sections, errors };
  };

  // Handle parsing Quick Paste text
  const handleParseSpeakingPaste = () => {
    const parsed = parseIntegratedSpeakingPaste(speakingQuickPaste);
    
    if (parsed.errors.length > 0) {
      setSpeakingParseErrors(parsed.errors);
      setSpeakingParsedPreview(null);
      toast({
        title: "파싱 실패",
        description: parsed.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setSpeakingParsedPreview({
      title: parsed.title,
      reading: parsed.reading,
      listening: parsed.listening,
      question: parsed.question
    });
    setSpeakingParseErrors([]);
    
    toast({
      title: "파싱 성공",
      description: "미리보기를 확인하고 적용 버튼을 눌러주세요"
    });
  };

  // Parse Integrated Writing Paste helper function  
  const parseIntegratedWritingPaste = (text: string): {
    reading: string;
    listening: string;
    question: string;
    errors: string[];
  } => {
    const errors: string[] = [];
    const sections = {
      reading: '',
      listening: '',
      question: ''
    };

    if (!text.trim()) {
      errors.push('텍스트가 비어있습니다');
      return { ...sections, errors };
    }

    // More flexible regex patterns that match header with optional whitespace and colon
    const readingMatch = text.match(/Reading\s*passage\s*:?\s*/i);
    const listeningMatch = text.match(/Listening\s*script\s*:?\s*/i);
    const questionMatch = text.match(/Question\s*:?\s*/i);

    if (!readingMatch) errors.push('Reading passage 섹션이 없습니다');
    if (!listeningMatch) errors.push('Listening script 섹션이 없습니다');
    if (!questionMatch) errors.push('Question 섹션이 없습니다');

    if (errors.length > 0) {
      return { ...sections, errors };
    }

    // Get positions and lengths of each header match
    const readingStart = text.search(/Reading\s*passage\s*:?\s*/i);
    const readingHeaderEnd = readingStart + (readingMatch?.[0]?.length || 0);
    
    const listeningStart = text.search(/Listening\s*script\s*:?\s*/i);
    const listeningHeaderEnd = listeningStart + (listeningMatch?.[0]?.length || 0);
    
    const questionStart = text.search(/Question\s*:?\s*/i);
    const questionHeaderEnd = questionStart + (questionMatch?.[0]?.length || 0);

    // Build position map for sorting
    const positions = [
      { name: 'reading', headerEnd: readingHeaderEnd, sectionStart: readingStart },
      { name: 'listening', headerEnd: listeningHeaderEnd, sectionStart: listeningStart },
      { name: 'question', headerEnd: questionHeaderEnd, sectionStart: questionStart }
    ].sort((a, b) => a.sectionStart - b.sectionStart);

    // Extract content between sections
    for (let i = 0; i < positions.length; i++) {
      const current = positions[i];
      const next = positions[i + 1];
      
      const startPos = current.headerEnd;
      const endPos = next ? next.sectionStart : text.length;
      
      const content = text.substring(startPos, endPos).trim();
      sections[current.name as keyof typeof sections] = content;
    }

    if (!sections.reading) errors.push('Reading 내용이 비어있습니다');
    if (!sections.listening) errors.push('Listening 내용이 비어있습니다');
    if (!sections.question) errors.push('Question 내용이 비어있습니다');

    return { ...sections, errors };
  };

  // Handle parsing Writing Quick Paste text
  const handleParseWritingPaste = () => {
    const parsed = parseIntegratedWritingPaste(writingQuickPaste);
    
    if (parsed.errors.length > 0) {
      setWritingParseErrors(parsed.errors);
      setWritingParsedPreview(null);
      toast({
        title: "파싱 실패",
        description: parsed.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setWritingParsedPreview({
      reading: parsed.reading,
      listening: parsed.listening,
      question: parsed.question
    });
    setWritingParseErrors([]);
    
    toast({
      title: "파싱 성공",
      description: "미리보기를 확인하고 생성 버튼을 눌러주세요"
    });
  };

  // Apply parsed data to form fields and create test for Speaking
  const handleApplyParsedSpeaking = async () => {
    if (!speakingParsedPreview) return;

    // 제목 검증
    if (!testTitle.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "테스트 제목을 먼저 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // State에 적용
    setReadingPassageTitle(speakingParsedPreview.title);
    setReadingPassage(speakingParsedPreview.reading);
    setListeningScript(speakingParsedPreview.listening);
    setSpeakingQuestion(speakingParsedPreview.question);

    // 바로 테스트 생성
    setIsProcessing(true);
    setProgress(50);

    try {
      // Speaking question 객체 생성
      const speakingQuestion = {
        id: Date.now().toString(),
        questionType: "speaking",
        speakingType,
        speakingTask,
        readingPassageTitle: speakingParsedPreview.title,
        readingPassage: speakingParsedPreview.reading,
        listeningScript: speakingParsedPreview.listening,
        questionText: speakingParsedPreview.question,
        readingTime: readingTime || 45,
        preparationTime: preparationTime || 30,
        responseTime: responseTime || 60
      };

      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        examType,
        section: "speaking",
        difficulty: "medium",
        questionCount: 1,
        parsedQuestions: [speakingQuestion]
      });

      if (!testResponse.ok) throw new Error("테스트 생성 실패");

      const result = await testResponse.json();
      setProgress(100);

      toast({
        title: "테스트 생성 완료!",
        description: `${examType === "new-toefl" ? "NEW TOEFL" : "TOEFL"} Speaking 테스트가 생성되었습니다.`,
      });

      invalidateTestCaches(queryClient);

      // Speaking 테스트 페이지로 이동
      const speakingRedirect = examType === "new-toefl" 
        ? `/new-toefl-speaking/${result.id}` 
        : `/toefl-speaking-new/${result.id}`;
      setTimeout(() => setLocation(speakingRedirect), 2000);
    } catch (error: any) {
      toast({
        title: "테스트 생성 실패",
        description: error.message || "테스트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Parse Discussion Writing Paste helper function
  const parseDiscussionWritingPaste = (text: string): {
    professorQuestion: string;
    studentResponses: { name: string; response: string }[];
    errors: string[];
  } => {
    const errors: string[] = [];
    const result = {
      professorQuestion: '',
      studentResponses: [] as { name: string; response: string }[]
    };

    if (!text.trim()) {
      errors.push('텍스트가 비어있습니다');
      return { ...result, errors };
    }

    // Professor 섹션 찾기 (• Professor: 또는 Professor: 형식)
    const professorMatch = text.search(/[•\-]?\s*Professor:/i);
    
    if (professorMatch === -1) {
      errors.push('Professor 섹션이 없습니다');
      return { ...result, errors };
    }

    // Professor 질문 끝 위치 (Professor: 이후 텍스트 시작)
    const colonIdx = text.indexOf(':', professorMatch);
    const professorTextStart = colonIdx + 1;
    
    // Professor 섹션 이후의 텍스트에서만 학생 이름 찾기
    const textAfterProfessor = text.substring(professorTextStart);
    
    // 학생 이름 패턴 찾기 (Professor는 명시적으로 제외)
    // 줄 시작에서 선택적 bullet, 이름 (여러 단어 가능), 콜론 필수 또는 줄바꿈
    // "Professor"로 시작하는 경우는 명시적으로 제외
    const studentNameRegex = /(?:^|\n)\s*[•\-]?\s*(?!Professor\s*:)([A-Za-z][\w\s]+?)(?:\s*[:]\s*|\s*\n)/gim;
    const studentMatches = Array.from(textAfterProfessor.matchAll(studentNameRegex));
    
    if (studentMatches.length === 0) {
      errors.push('학생 응답이 없습니다 (최소 1개 필요)');
      return { ...result, errors };
    }

    // Professor 질문 텍스트 추출 (Professor: 다음부터 첫 번째 학생까지)
    const firstStudentPos = studentMatches[0].index!;
    result.professorQuestion = textAfterProfessor.substring(0, firstStudentPos).trim();

    // 각 학생 응답 추출
    for (let i = 0; i < studentMatches.length; i++) {
      const studentName = studentMatches[i][1].trim();
      const matchStart = studentMatches[i].index!;
      const matchText = studentMatches[i][0];
      
      // 콜론이 있으면 콜론 다음부터, 없으면 이름 다음부터 시작
      let responseStart = matchStart + matchText.length;
      if (matchText.includes(':')) {
        const colonPos = textAfterProfessor.indexOf(':', matchStart);
        responseStart = colonPos + 1;
      }
      
      const endPos = i < studentMatches.length - 1 ? studentMatches[i + 1].index! : textAfterProfessor.length;
      let response = textAfterProfessor.substring(responseStart, endPos).trim();
      
      // 따옴표 제거 (시작과 끝의 따옴표만)
      response = response.replace(/^[""\s]+|[""\s]+$/g, '').trim();
      
      if (response) {
        result.studentResponses.push({ name: studentName, response });
      }
    }

    if (!result.professorQuestion) errors.push('Professor 질문 내용이 비어있습니다');
    if (result.studentResponses.length === 0) errors.push('학생 응답 내용이 비어있습니다');

    return { ...result, errors };
  };

  // Handle parsing Discussion Writing Paste text
  const handleParseDiscussionPaste = () => {
    const parsed = parseDiscussionWritingPaste(discussionQuickPaste);
    
    if (parsed.errors.length > 0) {
      setDiscussionParseErrors(parsed.errors);
      setDiscussionParsedPreview(null);
      toast({
        title: "파싱 실패",
        description: parsed.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setDiscussionParsedPreview({
      professorQuestion: parsed.professorQuestion,
      studentResponses: parsed.studentResponses
    });
    setDiscussionParseErrors([]);
    
    toast({
      title: "파싱 성공",
      description: "미리보기를 확인하고 생성 버튼을 눌러주세요"
    });
  };

  // Parse NEW TOEFL Reading text helper function (Natural Format)
  const parseNewToeflReading = (text: string): { 
    questions: NewToeflReadingQuestion[]; 
    errors: string[];
  } => {
    const normalized = text.replace(/\r\n?/g, "\n").trim();
    const errors: string[] = [];
    const questions: NewToeflReadingQuestion[] = [];

    if (!normalized) {
      errors.push('텍스트가 비어있습니다');
      return { questions, errors };
    }

    // Parse Complete the Words section with [ANSWER] support
    const completeWordsMatch = normalized.match(/Complete the Words[\s\S]*?(?=Read a notice|Read an email|Read an academic|\d+\.\s+When|\d+\.\s+What|\d+\.\s+Why|\d+\.\s+How|$)/i);
    if (completeWordsMatch) {
      let cwText = completeWordsMatch[0];
      cwText = cwText.replace(/Complete the Words.*?\n/i, '').replace(/Fill in the missing letters.*?\n/i, '').trim();
      
      if (cwText.length > 20) {
        // Check for [ANSWER] section - format: [ANSWER] word1, word2, word3...
        const answerMatch = cwText.match(/\[ANSWER\]\s*\n?(.+)/i);
        let providedAnswers: string[] = [];
        let hasProvidedAnswers = false;
        if (answerMatch && answerMatch[1]) {
          providedAnswers = answerMatch[1].split(',').map(a => a.trim()).filter(a => a.length > 0);
          hasProvidedAnswers = providedAnswers.length > 0;
          // Remove [ANSWER] section from passage
          cwText = cwText.replace(/\[ANSWER\]\s*\n?.+$/i, '').trim();
        }
        
        // Enhanced pattern to match various blank formats:
        // - "me___" or "me_____" (prefix + continuous underscores)
        // - "me _ _ _" or "me_ _ _" (prefix + space-separated underscores)
        // - "___" or "_ _ _" (standalone underscores)
        // - "co-op___" (hyphenated hints)
        // Pattern: optional letters (with hyphens/apostrophes), optional space, then underscores
        const blankPattern = /([a-zA-Z][a-zA-Z'-]*)?\s*((?:_+\s*)+)/g;
        const answers: string[] = [];
        const blankLengths: number[] = []; // Track actual underscore counts
        let match;
        let idx = 0;
        let usedFallback = false;
        
        while ((match = blankPattern.exec(cwText)) !== null) {
          const prefix = match[1] || '';
          const underscoreSequence = match[2];
          // Count actual underscore characters (not spaces) 
          const underscoreCount = (underscoreSequence.match(/_/g) || []).length;
          blankLengths.push(underscoreCount);
          
          // Use provided answer if available, otherwise mark for AI solving
          if (providedAnswers[idx]) {
            answers.push(providedAnswers[idx]);
          } else {
            usedFallback = true;
            // Don't use guessCompleteWord - let AI handle it later
            answers.push(''); // Empty - will be filled by AI
          }
          idx++;
        }
        
        // Note: If no [ANSWER] section, AI will auto-solve the blanks after parsing
        // No longer show error - AI will handle it
        
        // Validate answer count matches blank count
        if (hasProvidedAnswers && providedAnswers.length !== answers.length) {
          errors.push(`Complete Words: 빈칸 개수(${answers.length})와 정답 개수(${providedAnswers.length})가 일치하지 않습니다.`);
        }
        
        // Check if all answers are provided (non-empty)
        const allAnswersProvided = answers.every(a => a && a.length > 0);
        
        questions.push({
          type: 'complete-words',
          passage: cwText,
          answers: answers.length > 0 ? answers : providedAnswers,
          blankLengths: blankLengths, // Store actual underscore counts for each blank
          answerConfirmed: allAnswersProvided // Only confirmed if all answers provided
        });
      }
    }

    const findQuestionStart = (content: string): number => {
      const lines = content.split('\n');
      let charPos = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) { charPos += lines[i].length + 1; continue; }

        const isNumberedQ = /^\d+\.\s+/.test(line);
        if (isNumberedQ) {
          const remaining = lines.slice(i, i + 12).join('\n');
          const hasA = /(?:^|\n)\s*\(?A\)?[.)]*\s+\S/m.test(remaining);
          const hasB = /(?:^|\n)\s*\(?B\)?[.)]*\s+\S/m.test(remaining);
          const hasC = /(?:^|\n)\s*\(?C\)?[.)]*\s+\S/m.test(remaining);
          if (hasA && hasB && hasC) {
            return charPos;
          }
        }

        const isQuestionLine = /^(What|Why|How|Which|Who|Where|When|According|The word|All of the|In the|Based on)/i.test(line) && line.includes('?');
        if (isQuestionLine) {
          const remaining = lines.slice(i, i + 10).join('\n');
          const hasA = /(?:^|\n)\s*\(?A\)?[.)]*\s+\S/m.test(remaining);
          const hasB = /(?:^|\n)\s*\(?B\)?[.)]*\s+\S/m.test(remaining);
          const hasC = /(?:^|\n)\s*\(?C\)?[.)]*\s+\S/m.test(remaining);
          const hasD = /(?:^|\n)\s*\(?D\)?[.)]*\s+\S/m.test(remaining);
          if (hasA && hasB && hasC && hasD) {
            return charPos;
          }
        }

        charPos += lines[i].length + 1;
      }
      return -1;
    };

    const parseSectionContent = (sectionContent: string, sectionType: 'comprehension' | 'academic') => {
      let content = sectionContent;
      content = content.replace(/^Read\s+a\s+notice\.?\s*\n?/gi, '').replace(/^Read\s+an?\s+email\.?\s*\n?/gi, '').replace(/^Read\s+a\s+public.*?\n?/gi, '').trim();
      content = content.replace(/^\n+/, '').trim();
      
      const passageEnd = findQuestionStart(content);
      if (passageEnd <= 0) return;
      
      const passage = content.substring(0, passageEnd).trim();
      const questionsText = content.substring(passageEnd);
      const parsedQs = parseMultipleChoiceQuestions(questionsText);
      
      for (const q of parsedQs) {
        questions.push({
          type: sectionType,
          passage: passage,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          answerConfirmed: q.hasAnswerKey
        });
      }
    };

    const sectionHeaders = Array.from(normalized.matchAll(/Read\s+a\s+notice|Read\s+an?\s+email|Read\s+an?\s+academic\s+passage/gi));
    
    for (let si = 0; si < sectionHeaders.length; si++) {
      const header = sectionHeaders[si];
      const headerText = header[0].toLowerCase();
      const startIdx = header.index!;
      const endIdx = si < sectionHeaders.length - 1 ? sectionHeaders[si + 1].index! : normalized.length;
      const sectionContent = normalized.substring(startIdx + header[0].length, endIdx).trim();
      
      if (sectionContent.length < 20) continue;
      
      if (/read\s+a\s+notice/i.test(headerText)) {
        parseSectionContent(sectionContent, 'comprehension');
      } else if (/read\s+an?\s+email/i.test(headerText)) {
        parseSectionContent(sectionContent, 'comprehension');
      } else if (/read\s+an?\s+academic/i.test(headerText)) {
        parseSectionContent(sectionContent, 'academic');
      }
    }

    if (questions.length === 0) {
      errors.push('NEW TOEFL Reading 형식을 찾을 수 없습니다. "Complete the Words", "Read a notice", "Read an email", "Read an academic passage" 섹션이 필요합니다.');
    }

    return { questions, errors };
  };

  // Helper to guess complete word from prefix
  const guessCompleteWord = (prefix: string): string => {
    const wordMappings: Record<string, string> = {
      "me": "media", "communi": "communicate", "Platfo": "Platforms", "al": "allow",
      "sha": "share", "upd": "updates", "exce": "excessive", "addi": "addiction",
      "nega": "negative", "effe": "effects", "import": "important", "offl": "offline"
    };
    return wordMappings[prefix] || prefix + "___";
  };

  // Helper to extract answer keys from text (supports various formats)
  const extractAnswerKeys = (text: string): Record<number, string> => {
    const keys: Record<number, string> = {};
    
    // Pattern 1: "Answer Key" section with numbered answers
    const answerKeyMatch = text.match(/Answer\s*Key[:\s]*([\s\S]*?)(?=\n\n|$)/i);
    if (answerKeyMatch) {
      const keySection = answerKeyMatch[1];
      const keyPattern = /(\d+)\s*[.):]\s*([A-D])/gi;
      let match;
      while ((match = keyPattern.exec(keySection)) !== null) {
        keys[parseInt(match[1])] = match[2].toUpperCase();
      }
    }
    
    // Pattern 2: Inline answers like "Correct: B" or "(Answer: C)"
    const inlinePattern = /(?:Correct|Answer)[:\s]*\(?([A-D])\)?/gi;
    let qNum = 1;
    let match;
    while ((match = inlinePattern.exec(text)) !== null) {
      if (!keys[qNum]) keys[qNum] = match[1].toUpperCase();
      qNum++;
    }

    // Pattern 3: Trailing whitespace on an option line marks it as correct
    // e.g. "(C) Yes, the Registrar's Office has one available. " ← trailing space
    {
      const lines = text.split('\n');
      let currentQNum = 0;
      for (const line of lines) {
        const qNumMatch = line.match(/Question\s+(\d+)/i);
        if (qNumMatch) {
          currentQNum = parseInt(qNumMatch[1]);
          continue;
        }
        if (currentQNum > 0 && !keys[currentQNum]) {
          const optMatch = line.match(/^\s*\(([A-D])\)\s+/i);
          if (optMatch && (line.endsWith(' ') || line.endsWith('\t'))) {
            keys[currentQNum] = optMatch[1].toUpperCase();
          }
        }
      }
    }

    return keys;
  };

  const parseMultipleChoiceQuestions = (text: string): { question: string; options: string[]; correctAnswer: string; hasAnswerKey: boolean }[] => {
    const results: { question: string; options: string[]; correctAnswer: string; hasAnswerKey: boolean }[] = [];
    const answerKeys = extractAnswerKeys(text);
    
    const lines = text.split('\n');
    let currentQuestionLines: string[] = [];
    let currentOptions: string[] = [];
    let currentQNum: number | null = null;
    let seqCounter = 0;
    
    const optionRegex = /^\(?([A-D])\)?[.)]*\s+(.*)/;
    
    const flushQuestion = () => {
      if (currentQuestionLines.length > 0 && currentOptions.length === 4) {
        seqCounter++;
        const qNum = currentQNum ?? seqCounter;
        const questionText = currentQuestionLines.join(' ').trim();
        if (questionText.length > 0) {
          const hasKey = !!answerKeys[qNum];
          results.push({
            question: questionText,
            options: currentOptions.map(o => o.trim()),
            correctAnswer: answerKeys[qNum] || '',
            hasAnswerKey: hasKey
          });
        }
      }
      currentQuestionLines = [];
      currentOptions = [];
      currentQNum = null;
    };
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const optionMatch = trimmed.match(optionRegex);
      if (optionMatch) {
        const letter = optionMatch[1];
        const optText = optionMatch[2].trim();
        if (letter === 'A' && currentOptions.length > 0) {
          flushQuestion();
        }
        if (letter === 'A' && currentQuestionLines.length === 0) {
          continue;
        }
        currentOptions.push(optText);
        continue;
      }
      
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        if (currentOptions.length === 4) {
          flushQuestion();
        } else if (currentOptions.length > 0) {
          currentQuestionLines = [];
          currentOptions = [];
        }
        currentQNum = parseInt(numberedMatch[1]);
        currentQuestionLines.push(numberedMatch[2]);
        continue;
      }
      
      if (currentOptions.length === 4) {
        flushQuestion();
      }
      
      if (currentOptions.length === 0) {
        currentQuestionLines.push(trimmed);
      }
    }
    
    flushQuestion();
    
    return results;
  };

  // Handle parsing NEW TOEFL Reading content
  const handleParseNewToeflReading = async () => {
    const parsed = parseNewToeflReading(content);
    
    if (parsed.errors.length > 0) {
      setNewToeflReadingErrors(parsed.errors);
      setNewToeflReadingPreview([]);
      toast({
        title: "파싱 실패",
        description: parsed.errors.slice(0, 2).join(', '),
        variant: "destructive"
      });
      return;
    }

    setNewToeflReadingPreview(parsed.questions);
    setNewToeflReadingErrors([]);
    
    // Check if any questions need AI solving (no confirmed answer)
    const questionsNeedingSolve = parsed.questions.filter(q => !q.answerConfirmed);
    const hasUnsolvedQuestions = questionsNeedingSolve.length > 0;
    
    // If any questions need solving, automatically call AI to solve ALL questions
    // (AI provides better answers when it sees the full context)
    if (hasUnsolvedQuestions && parsed.questions.length > 0) {
      toast({
        title: "AI 정답 분석 시작",
        description: `${parsed.questions.length}개 문제를 AI가 분석합니다...`
      });
      
      setIsAISolving(true);
      setAiSolvedQuestions(false);
      
      try {
        // Prepare questions for AI solving
        const questionsForAI = parsed.questions.map(q => {
          // Count blanks properly - match space-separated and continuous underscores
          let blankCount = 0;
          if (q.type === 'complete-words' && q.passage) {
            // Same pattern as parseNewToeflReading: matches "me _ _ _", "me___", "___", etc.
            const blankPattern = /([a-zA-Z][a-zA-Z'-]*)?\s*((?:_+\s*)+)/g;
            while (blankPattern.exec(q.passage) !== null) {
              blankCount++;
            }
          }
          return {
            type: q.type,
            passage: q.passage || '',
            question: q.question,
            options: q.options,
            blankCount: q.type === 'complete-words' ? blankCount : undefined,
            blankLengths: q.blankLengths // Pass actual underscore counts to AI
          };
        });
        
        // Use fetch directly to avoid any apiRequest side effects
        const response = await fetch("/api/ai/solve-reading-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: questionsForAI, language: 'ko' }),
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.solutions && result.solutions.length > 0) {
          // Update questions with AI solutions
          const updatedQuestions = parsed.questions.map((q, idx) => {
            const solution = result.solutions[idx];
            if (!solution) return { ...q, answerConfirmed: true };
            
            if (q.type === 'complete-words') {
              return {
                ...q,
                answers: solution.answers || q.answers,
                answerConfirmed: true
              };
            } else {
              // For comprehension/academic questions, use AI's answer
              return {
                ...q,
                correctAnswer: solution.correctAnswer || q.correctAnswer || 'A',
                answerConfirmed: true
              };
            }
          });
          
          setNewToeflReadingPreview(updatedQuestions);
          setAiSolvedQuestions(true);
          
          toast({
            title: "AI 정답 분석 완료",
            description: `${result.solutions.length}개 문제의 정답을 AI가 분석했습니다. 미리보기를 확인하세요.`
          });
        } else {
          throw new Error("AI 솔루션이 비어있습니다");
        }
      } catch (error) {
        console.error("AI solving error:", error);
        toast({
          title: "AI 분석 실패",
          description: "AI 정답 분석에 실패했습니다. 정답을 수동으로 확인해주세요.",
          variant: "destructive"
        });
      } finally {
        setIsAISolving(false);
      }
    } else {
      // All questions already have confirmed answers
      toast({
        title: "파싱 성공",
        description: `${parsed.questions.length}개 문제가 파싱되었습니다. 정답 키가 모두 감지되었습니다.`
      });
    }
  };

  // Create test from parsed NEW TOEFL Reading content
  const handleCreateNewToeflReadingTest = async () => {
    if (newToeflReadingPreview.length === 0) {
      toast({
        title: "문제 없음",
        description: "먼저 텍스트를 파싱해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!testTitle.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "테스트 제목을 먼저 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // If AI is still solving, wait for it to complete
    if (isAISolving) {
      toast({
        title: "AI 분석 진행 중",
        description: "AI가 정답을 분석 중입니다. 잠시 후 다시 시도해주세요."
      });
      return;
    }
    
    // No longer require manual answer confirmation - AI handles it automatically
    // Questions without answers will be solved by AI during grading

    setIsProcessing(true);
    setProgress(30);
    setProcessingStage("NEW TOEFL Reading 테스트를 생성하고 있습니다...");

    try {
      // Helper to convert letter answer (A, B, C, D) to numeric index (0, 1, 2, 3)
      const letterToIndex = (letter: string): number => {
        const map: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        return map[letter?.toUpperCase()] ?? 0;
      };
      
      // Convert parsed questions to the expected format (use 'type' not 'questionType' for frontend compatibility)
      const parsedQuestions = newToeflReadingPreview.map((q, idx) => {
        // For complete-words, extract blanks from passage with blankLength
        let blanks: { position: number; answer: string; hint: string; blankLength: number }[] | undefined;
        if (q.type === 'complete-words' && q.passage) {
          blanks = [];
          // Enhanced pattern: matches space-separated and continuous underscores with optional hint
          // Also handles numbered markers like [1], [2] after underscores
          const blankPattern = /([a-zA-Z][a-zA-Z'-]*)?\s*((?:_\s*)+)(?:\s*\[\d+\])?/g;
          let match;
          let position = 0;
          while ((match = blankPattern.exec(q.passage)) !== null) {
            const hint = match[1] || '';
            const underscoreSequence = match[2];
            // Count actual underscores for blankLength
            const underscoreCount = (underscoreSequence.match(/_/g) || []).length;
            const fullWord = q.answers?.[position] || '';
            
            // Extract just the MISSING letters (fullWord minus hint prefix)
            // e.g., "Recycling" - "Recyc" = "ling"
            let missingLetters = '';
            if (fullWord) {
              if (hint && hint.length > 0 && fullWord.toLowerCase().startsWith(hint.toLowerCase())) {
                // Normal case: hint exists, extract missing part
                missingLetters = fullWord.slice(hint.length);
              } else if (hint && hint.length > 0) {
                // Hint exists but doesn't match exactly - still extract the suffix if possible
                const hintLower = hint.toLowerCase();
                const wordLower = fullWord.toLowerCase();
                if (wordLower.includes(hintLower)) {
                  const startIdx = wordLower.indexOf(hintLower);
                  missingLetters = fullWord.slice(startIdx + hint.length);
                } else {
                  // Fallback: use fullWord minus hint length as approximation
                  missingLetters = fullWord.slice(hint.length);
                }
              } else {
                // No hint (standalone blank) - entire fullWord is the answer
                missingLetters = fullWord;
              }
            }
            
            // blankLength: Priority order
            // 1. Use pre-calculated blankLengths from parsing (actual underscore count)
            // 2. Fallback to current underscore count if not available
            const storedBlankLength = q.blankLengths?.[position];
            const blankLength = storedBlankLength && storedBlankLength > 0 
              ? storedBlankLength 
              : (underscoreCount > 0 ? underscoreCount : 3);
            
            blanks.push({
              position,
              answer: missingLetters || fullWord, // Use full word if missing letters extraction failed
              hint: hint,
              blankLength
            });
            position++;
          }
        }
        
        return {
          id: `${Date.now()}-${idx}`,
          type: q.type,
          passage: q.passage,
          question: q.question || `Complete the passage with the correct words`,
          options: q.options || [],
          correctAnswer: letterToIndex(q.correctAnswer || 'A'), // Convert letter to numeric index
          answers: q.answers || [],
          blanks,
        };
      });

      setProgress(60);
      setProcessingStage("테스트를 저장하고 있습니다...");

      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        examType: "new-toefl",
        section: "reading",
        difficulty: "medium",
        questionCount: parsedQuestions.length,
        parsedQuestions,
        isActive: !isPrivateTest
      });

      if (!testResponse.ok) throw new Error("테스트 생성 실패");

      const result = await testResponse.json();
      setProgress(100);
      setProcessingStage("완료! 테스트로 이동합니다...");

      toast({
        title: "테스트 생성 완료!",
        description: `${parsedQuestions.length}개 문제가 생성되었습니다.`,
      });

      invalidateTestCaches(queryClient);

      setTimeout(() => setLocation(`/new-toefl-reading/${result.id}`), 2000);
    } catch (error: any) {
      toast({
        title: "테스트 생성 실패",
        description: error.message || "테스트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Parse NEW TOEFL Listening text helper function (Natural Format)
  const parseNewToeflListening = (text: string): { 
    questions: NewToeflListeningQuestion[]; 
    errors: string[];
  } => {
    const errors: string[] = [];
    const questions: NewToeflListeningQuestion[] = [];

    if (!text.trim()) {
      errors.push('텍스트가 비어있습니다');
      return { questions, errors };
    }

    const parsed = parseNewToeflListeningText(text);
    const validation = validateParsedListening(parsed);

    if (!validation.valid) {
      errors.push(...validation.errors);
    }

    const extractedKeys = extractAnswerKeys(text);

    for (const q of parsed.listenAndChoose) {
      questions.push({
        type: 'choose-response',
        prompt: q.dialogue,
        question: q.dialogue,
        script: q.dialogue,
        options: q.options,
        correctAnswer: extractedKeys[q.id] || q.correctAnswer || 'A',
        answerConfirmed: !!extractedKeys[q.id]
      });
    }

    const allPassages = [
      ...parsed.conversations.map(p => ({ ...p, mappedType: 'conversation' as const })),
      ...parsed.announcements.map(p => ({ ...p, mappedType: 'conversation' as const })),
      ...parsed.academicTalks.map(p => ({ ...p, mappedType: 'academic-talk' as const })),
    ];

    for (const passage of allPassages) {
      for (const pq of passage.questions) {
        questions.push({
          type: passage.mappedType,
          script: passage.content,
          question: pq.question,
          options: pq.options,
          correctAnswer: extractedKeys[pq.id] || pq.correctAnswer || 'A',
          answerConfirmed: !!extractedKeys[pq.id]
        });
      }
    }

    if (questions.length === 0) {
      errors.push('NEW TOEFL Listening 형식을 찾을 수 없습니다. "Listen and Choose a Response", "Conversation", "Academic Talk" 섹션이 필요합니다.');
    }

    console.log(`[AI Test Creator] Parsed ${questions.length} total questions: ${parsed.listenAndChoose.length} Choose Response, ${parsed.conversations.length} Conv, ${parsed.announcements.length} Ann, ${parsed.academicTalks.length} AT`);

    return { questions, errors };
  };

  const handleParseNewToeflListening = async () => {
    const parsed = parseNewToeflListening(content);
    
    if (parsed.errors.length > 0) {
      setNewToeflListeningErrors(parsed.errors);
      setNewToeflListeningPreview([]);
      toast({ title: "파싱 실패", description: parsed.errors.slice(0, 2).join(', '), variant: "destructive" });
      return;
    }

    // All questions confirmed only when every question has an extracted key
    const allConfirmed = parsed.questions.every(q => q.answerConfirmed);
    
    if (allConfirmed) {
      // Every answer already confirmed via trailing-space or answer-key markers
      setNewToeflListeningPreview(parsed.questions);
      setNewToeflListeningErrors([]);
      toast({ title: "파싱 성공", description: `${parsed.questions.length}개 문제가 파싱되었습니다.` });
    } else {
      // Some answers missing — use AI to solve unconfirmed questions
      setIsProcessing(true);
      setProcessingStage("AI가 정답을 분석하고 있습니다...");
      setProgress(10);
      
      try {
        const unconfirmedCount = parsed.questions.filter(q => !q.answerConfirmed).length;
        toast({ title: "AI 분석 시작", description: `${unconfirmedCount}개 문제의 정답을 AI가 분석합니다...` });
        
        const response = await fetch('/api/ai/solve-listening-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: parsed.questions, language: 'ko' })
        });
        
        if (response.ok) {
          const result = await response.json();
          // Merge: keep already-confirmed answers, use AI result for the rest
          const mergedQuestions = result.questions.map((aiQ: NewToeflListeningQuestion, i: number) => {
            const parsedQ = parsed.questions[i];
            if (parsedQ?.answerConfirmed) {
              return { ...aiQ, correctAnswer: parsedQ.correctAnswer, answerConfirmed: true };
            }
            return aiQ;
          });
          setNewToeflListeningPreview(mergedQuestions);
          setNewToeflListeningErrors([]);
          const confirmedByAI = mergedQuestions.filter((q: NewToeflListeningQuestion) => q.answerConfirmed).length;
          toast({ 
            title: "파싱 및 분석 완료", 
            description: `${mergedQuestions.length}개 문제 파싱됨 (${confirmedByAI}개 확인됨).`
          });
        } else {
          // Fallback - use parsed questions with default answers
          setNewToeflListeningPreview(parsed.questions);
          setNewToeflListeningErrors([]);
          toast({ 
            title: "파싱 성공 (AI 분석 실패)", 
            description: `${parsed.questions.length}개 문제 파싱됨. 정답을 수동으로 확인해주세요.`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("AI solve error:", error);
        setNewToeflListeningPreview(parsed.questions);
        setNewToeflListeningErrors([]);
        toast({ 
          title: "파싱 성공 (AI 분석 실패)", 
          description: `${parsed.questions.length}개 문제 파싱됨. 정답을 수동으로 확인해주세요.`,
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
        setProgress(0);
        setProcessingStage("");
      }
    }
  };

  const handleCreateNewToeflListeningTest = async () => {
    if (newToeflListeningPreview.length === 0 || !testTitle.trim()) {
      toast({ title: "입력 필요", description: "제목과 파싱된 문제가 필요합니다.", variant: "destructive" });
      return;
    }

    // Check if all questions have confirmed answers
    const unconfirmedQuestions = newToeflListeningPreview.filter(q => !q.answerConfirmed);
    
    if (unconfirmedQuestions.length > 0) {
      toast({
        title: "정답 확인 필요",
        description: `${unconfirmedQuestions.length}개 문제의 정답을 확인해주세요. 미리보기에서 정답을 클릭하여 확인하세요.`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setProcessingStage("NEW TOEFL Listening 테스트를 생성하고 있습니다...");

    const letterToIndex = (letter: string): number => {
      const map: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      return map[letter?.toUpperCase()] ?? 0;
    };

    try {
      const parsedQuestions = newToeflListeningPreview.map((q, idx) => {
        let textForTTS = '';
        if (q.type === 'choose-response') {
          textForTTS = q.script || q.prompt || '';
        } else {
          const scriptPart = q.script || '';
          const questionPart = q.question || '';
          const questionWithNumber = questionPart ? `\n\nQuestion ${idx + 1}. ${questionPart}` : '';
          textForTTS = scriptPart + questionWithNumber;
        }
        return {
          id: `${Date.now()}-${idx}`,
          type: q.type,
          prompt: q.prompt,
          script: q.script,
          audioScript: textForTTS,
          question: q.question || q.prompt || '',
          options: q.options,
          correctAnswer: letterToIndex(q.correctAnswer),
          audioUrl: '',
          explanation: q.explanation || '',
          optionTimestamps: undefined as any,
        };
      });

      setProgress(10);
      setProcessingStage("테스트를 먼저 저장하고 있습니다 (데이터 보호)...");
      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        isActive: !isPrivateTest,
        examType: "new-toefl",
        section: "listening",
        difficulty: "medium",
        questionCount: parsedQuestions.length,
        parsedQuestions
      });

      const result = await testResponse.json();
      const savedTestId = result.id;
      console.log(`✅ Test saved to DB first (without audio): ${savedTestId}`);

      invalidateTestCaches(queryClient);

      setProgress(20);
      setProcessingStage("음성 생성을 시작합니다...");

      let ttsSuccessCount = 0;
      let ttsFailCount = 0;
      
      for (let idx = 0; idx < parsedQuestions.length; idx++) {
        const q = parsedQuestions[idx];
        const textForTTS = q.audioScript || '';
        
        if (!textForTTS.trim()) {
          console.warn(`⚠️ No text for TTS in question ${idx + 1}`);
          ttsFailCount++;
          continue;
        }

        let audioUrl = '';
        const maxRetries = 2;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            setProcessingStage(`음성 생성 중... (${idx + 1}/${parsedQuestions.length})${attempt > 0 ? ' [재시도]' : ''}`);
            const ttsBody: any = { script: textForTTS };
            if (q.type === 'choose-response') {
              ttsBody.contentType = 'choose-response';
              if (Array.isArray(q.options) && q.options.length > 0) {
                ttsBody.options = q.options;
              }
            }
            const ttsResponse = await fetch('/api/ai/generate-tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(ttsBody)
            });
            
            if (ttsResponse.ok) {
              const ttsResult = await ttsResponse.json();
              audioUrl = ttsResult.audioUrl || '';
              if (ttsResult.optionTimestamps) {
                parsedQuestions[idx].optionTimestamps = ttsResult.optionTimestamps;
              }
              break;
            } else {
              if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 2000));
            }
          } catch (ttsError) {
            console.warn(`TTS attempt ${attempt + 1} failed for question ${idx + 1}:`, ttsError);
            if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (audioUrl) {
          parsedQuestions[idx].audioUrl = audioUrl;
          ttsSuccessCount++;
          console.log(`✅ TTS ${idx + 1}/${parsedQuestions.length}: ${audioUrl}`);
        } else {
          ttsFailCount++;
          console.warn(`❌ TTS failed for question ${idx + 1} after retries`);
        }

        setProgress(20 + Math.floor((idx + 1) / parsedQuestions.length * 70));
      }

      setProcessingStage("음성 포함 테스트를 업데이트하고 있습니다...");
      try {
        await apiRequest("POST", `/api/ai/update-test-audio/${savedTestId}`, {
          questions: parsedQuestions
        });
        console.log(`✅ Test updated with audio URLs`);
      } catch (updateErr) {
        console.error("Failed to update test with audio URLs:", updateErr);
      }

      setProgress(100);
      setProcessingStage("완료!");

      invalidateTestCaches(queryClient);

      if (ttsFailCount > 0) {
        toast({ 
          title: "테스트 생성 완료!", 
          description: `${parsedQuestions.length}개 문제 저장됨. ${ttsSuccessCount}개 음성 성공, ${ttsFailCount}개 음성 실패 (관리자 페이지에서 재생성 가능).`
        });
      } else {
        toast({ title: "테스트 생성 완료!", description: `${parsedQuestions.length}개 문제와 음성이 모두 생성되었습니다.` });
      }

      setTimeout(() => setLocation(`/new-toefl-listening/${savedTestId}`), 2000);
    } catch (error: any) {
      console.error("Test creation failed:", error);
      toast({ title: "테스트 생성 실패", description: error.message || "서버 연결 오류가 발생했습니다. 다시 시도해주세요.", variant: "destructive" });
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Parse NEW TOEFL Speaking text helper function (Natural Format)
  const parseNewToeflSpeaking = (text: string): { 
    questions: NewToeflSpeakingQuestion[]; 
    errors: string[];
  } => {
    const normalized = text.replace(/\r\n?/g, "\n").trim();
    const errors: string[] = [];
    const questions: NewToeflSpeakingQuestion[] = [];

    if (!normalized) {
      errors.push('텍스트가 비어있습니다');
      return { questions, errors };
    }

    // Parse "Listen and Repeat" section
    const listenRepeatMatch = normalized.match(/Listen and Repeat[\s\S]*?(?=Take an Interview|$)/i);
    if (listenRepeatMatch) {
      const section = listenRepeatMatch[0];
      
      const contextMatch = section.match(/Context:\s*([^\n]+)/i);
      const context = contextMatch ? contextMatch[1].trim() : '';
      
      const statementPattern = /(?:Supervisor\s+)?Statement\s*(\d+):\s*"([^"]+)"/gi;
      let match;
      while ((match = statementPattern.exec(section)) !== null) {
        questions.push({
          type: 'listen-repeat',
          sentence: match[2].trim(),
          sampleAnswer: match[2].trim()
        });
      }
      
      if (questions.length === 0) {
        const altPattern = /(\d+)\.\s*"([^"]+)"/g;
        while ((match = altPattern.exec(section)) !== null) {
          questions.push({
            type: 'listen-repeat',
            sentence: match[2].trim(),
            sampleAnswer: match[2].trim()
          });
        }
      }
    }

    // Parse "Take an Interview" section
    const interviewMatch = normalized.match(/Take an Interview[\s\S]*/i);
    if (interviewMatch) {
      const section = interviewMatch[0];
      
      const openingMatch = section.match(/Interviewer\s+Opening:\s*"([^"]+)"/i);
      if (openingMatch) {
        questions.push({
          type: 'interview',
          question: openingMatch[1].trim(),
          sampleAnswer: "Sample answer for opening question"
        });
      }
      
      const questionPattern = /Interviewer\s+Question\s*(\d+):\s*"([^"]+)"/gi;
      let match;
      while ((match = questionPattern.exec(section)) !== null) {
        questions.push({
          type: 'interview',
          question: match[2].trim(),
          sampleAnswer: `Sample answer for interview question ${match[1]}`
        });
      }
    }

    if (questions.length === 0) {
      errors.push('NEW TOEFL Speaking 형식을 찾을 수 없습니다. "Listen and Repeat", "Take an Interview" 섹션이 필요합니다.');
    }

    return { questions, errors };
  };

  const handleParseNewToeflSpeaking = () => {
    const parsed = parseNewToeflSpeaking(content);
    
    if (parsed.errors.length > 0) {
      setNewToeflSpeakingErrors(parsed.errors);
      setNewToeflSpeakingPreview([]);
      toast({ title: "파싱 실패", description: parsed.errors.slice(0, 2).join(', '), variant: "destructive" });
      return;
    }

    setNewToeflSpeakingPreview(parsed.questions);
    setNewToeflSpeakingErrors([]);
    toast({ title: "파싱 성공", description: `${parsed.questions.length}개 문제가 파싱되었습니다.` });
  };

  const handleCreateNewToeflSpeakingTest = async () => {
    if (newToeflSpeakingPreview.length === 0 || !testTitle.trim()) {
      toast({ title: "입력 필요", description: "제목과 파싱된 문제가 필요합니다.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setProgress(30);
    setProcessingStage("NEW TOEFL Speaking 테스트를 생성하고 있습니다...");

    try {
      const parsedQuestions = newToeflSpeakingPreview.map((q, idx) => ({
        id: `${Date.now()}-${idx}`,
        questionType: q.type,
        sentence: q.sentence,
        questionText: q.question || q.sentence || '',
        sampleAnswer: q.sampleAnswer,
      }));

      setProgress(60);
      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        examType: "new-toefl",
        section: "speaking",
        difficulty: "medium",
        questionCount: parsedQuestions.length,
        parsedQuestions,
        isActive: !isPrivateTest
      });

      if (!testResponse.ok) throw new Error("테스트 생성 실패");
      const result = await testResponse.json();
      setProgress(100);
      toast({ title: "테스트 생성 완료!", description: `${parsedQuestions.length}개 문제가 생성되었습니다.` });
      invalidateTestCaches(queryClient);
      setTimeout(() => setLocation(`/new-toefl-speaking/${result.id}`), 2000);
    } catch (error: any) {
      toast({ title: "테스트 생성 실패", description: error.message, variant: "destructive" });
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Parse NEW TOEFL Writing text helper function (Natural Format)
  const parseNewToeflWriting = (text: string): { 
    questions: NewToeflWritingQuestion[]; 
    errors: string[];
  } => {
    const normalized = text.replace(/\r\n?/g, "\n").trim();
    const errors: string[] = [];
    const questions: NewToeflWritingQuestion[] = [];

    if (!normalized) {
      errors.push('텍스트가 비어있습니다');
      return { questions, errors };
    }

    // Parse "Build a Sentence" section
    // Supports multiple headers:
    // - "Build a Sentence"
    // - "Move the words in the boxes to create grammatical sentences"
    // Format: Context sentence → Template (with _____) → Words (separated by /)
    const buildSentencePatterns = [
      /Build a Sentence[\s\S]*?(?=Write an Email|Write for an Academic|$)/i,
      /Move the words[\s\S]*?(?=Write an Email|Write for an Academic|$)/i,
    ];
    
    let buildSentenceSection = '';
    for (const pattern of buildSentencePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        buildSentenceSection = match[0];
        break;
      }
    }
    
    if (buildSentenceSection) {
      // Remove header lines
      const section = buildSentenceSection
        .replace(/^Build a Sentence\s*/i, '')
        .replace(/^Move the words in the boxes to create grammatical sentences\.?\s*/i, '')
        .replace(/^Move the words[^\n]*\n?/i, '')
        .trim();
      
      // Keep all lines including blank ones for proper lookahead
      const allLines = section.split('\n').map(l => l.trim());
      
      let i = 0;
      while (i < allLines.length) {
        const line = allLines[i];
        
        // Skip empty lines
        if (!line) {
          i++;
          continue;
        }
        
        // A context sentence: starts with capital letter, NOT a template (no underscores), NOT words (no /)
        const hasUnderscores = /_+/.test(line);
        const hasSlash = /\s*\/\s*/.test(line);
        const isContextSentence = 
          /^[A-Z]/.test(line) && 
          !hasUnderscores && 
          !hasSlash && 
          line.length > 10;
        
        if (isContextSentence) {
          const contextSentence = line;
          let sentenceTemplate = "";
          let scrambledWords: string[] = [];
          
          // Look for the template line (contains underscores) - skip blank lines
          let templateIdx = i + 1;
          while (templateIdx < allLines.length && !allLines[templateIdx]) {
            templateIdx++;
          }
          
          if (templateIdx < allLines.length) {
            const templateLine = allLines[templateIdx];
            // Accept any sequence of underscores as template indicator
            if (/_+/.test(templateLine)) {
              sentenceTemplate = templateLine;
              
              // Look for the words line (contains /) - skip blank lines
              let wordsIdx = templateIdx + 1;
              while (wordsIdx < allLines.length && !allLines[wordsIdx]) {
                wordsIdx++;
              }
              
              if (wordsIdx < allLines.length) {
                const wordsLine = allLines[wordsIdx];
                // Accept "/" with or without surrounding spaces
                if (/\s*\/\s*/.test(wordsLine)) {
                  // Clean up words - remove leading numbers or bullets, split by / with optional spaces
                  const cleanedWordsLine = wordsLine.replace(/^\d+\.\s*/, '').replace(/^[\s•\-\*]+/, '').trim();
                  scrambledWords = cleanedWordsLine.split(/\s*\/\s*/).map(w => w.trim()).filter(w => w.length > 0);
                  i = wordsIdx;
                }
              }
            }
          }
          
          if (scrambledWords.length > 0 && sentenceTemplate) {
            const correctOrder = scrambledWords.map((_, idx) => idx);
            
            questions.push({
              type: 'build-sentence',
              contextSentence: contextSentence,
              sentenceTemplate: sentenceTemplate,
              words: scrambledWords,
              correctOrder: correctOrder,
              answer: contextSentence
            });
          }
        }
        i++;
      }
    }

    // Parse "Write an Email" section
    // Format: 
    // Write an Email
    // You are taking Professor Thompson's introduction to economics course...
    // Write an email to Professor Thompson. In your email:
    // • Explain why you missed the midterm exam
    // • Mention that you have medical documentation
    // • Request to schedule a makeup exam
    const emailMatch = normalized.match(/Write an Email[\s\S]*?(?=Write for an Academic|$)/i);
    console.log('[DEBUG] Email parsing - emailMatch found:', !!emailMatch);
    if (emailMatch) {
      console.log('[DEBUG] Email section content (first 200 chars):', emailMatch[0].substring(0, 200));
      const section = emailMatch[0].replace(/^Write an Email\s*/i, '').trim();
      
      // Extract scenario: everything before "Write an email to" or "In your email"
      let scenario = '';
      let recipient = 'recipient@email.com';
      const keyPoints: string[] = [];
      
      // Try to find "Write an email to [Name]" pattern
      const writeToMatch = section.match(/Write an email to\s+([^.]+)\./i);
      if (writeToMatch) {
        recipient = writeToMatch[1].trim();
        // Scenario is everything before "Write an email to"
        const scenarioEnd = section.indexOf(writeToMatch[0]);
        scenario = section.substring(0, scenarioEnd).trim();
        
        // Key points are after "In your email:" - look for bullet points or numbered items
        const afterWriteTo = section.substring(scenarioEnd + writeToMatch[0].length);
        const keyPointsMatch = afterWriteTo.match(/In your email[:\s]*([\s\S]*?)(?=$)/i);
        if (keyPointsMatch) {
          const pointsText = keyPointsMatch[1];
          // Match bullet points (•, -, *) or numbered items
          const points = pointsText.split(/\n/).filter(l => l.trim().length > 0);
          points.forEach(p => {
            const cleaned = p.replace(/^[\s•\-\*\d.]+/, '').trim();
            if (cleaned.length > 5) keyPoints.push(cleaned);
          });
        }
      } else {
        // Fallback: entire section is scenario
        scenario = section;
      }
      
      console.log('[DEBUG] Email parsed - scenario:', scenario?.substring(0, 100), 'keyPoints:', keyPoints.length);
      questions.push({
        type: 'email',
        scenario: scenario || 'Write a professional email based on the given context.',
        topic: keyPoints.join('\n') || 'Write a professional email.',
        sampleAnswer: `To: ${recipient}\nSubject: [Your subject]\n\n[Your email content here]`
      });
    }

    // Parse "Write for an Academic Discussion" section
    // Uses line-based segmentation for reliable extraction
    const discussionMatch = normalized.match(/Write for an Academic Discussion[\s\S]*/i);
    console.log('[DEBUG] Discussion parsing - discussionMatch found:', !!discussionMatch);
    if (discussionMatch) {
      console.log('[DEBUG] Discussion section content (first 300 chars):', discussionMatch[0].substring(0, 300));
      let section = discussionMatch[0].replace(/^Write for an Academic Discussion\s*/i, '').trim();
      
      // Split into lines for structured parsing
      const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Known header patterns to skip (only at the beginning)
      const headerPatterns = [
        /^directions/i,
        /^you will have/i,
        /^typically/i,
        /^a professor has posted/i,
        /^your professor is teaching/i,
        /^your response will be scored/i,
        /^make a contribution/i,
        /^in your response,?\s+you should/i,
      ];
      
      // Skip header lines at the beginning
      let startIdx = 0;
      while (startIdx < lines.length) {
        const line = lines[startIdx];
        const isHeader = headerPatterns.some(p => p.test(line));
        if (isHeader) {
          startIdx++;
        } else {
          break;
        }
      }
      
      let professorName = '';
      let professorQuestion = '';
      const students: { name: string; response: string }[] = [];
      
      // Find professor line - robust matcher for "Professor/Dr Name(s)" followed by optional content
      // Captures: "Professor Davis", "Dr. Van Helsing:", "Professor Vance We are..."
      let profLineIdx = -1;
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        // Match "Professor/Dr" followed by name(s), then optional verb, then optional content
        // The name can be multi-word but stops when we hit a common sentence starter
        const profMatch = line.match(/^(?:Professor|Dr\.?)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s*(?:posted|says|writes)?[:\s]*(.*)?$/i);
        if (profMatch) {
          const namePart = profMatch[1].trim();
          let extractedName = namePart;
          let contentStart = (profMatch[2] || '').trim();
          
          // Check if the "name" accidentally includes content start words
          const sentenceStarters = ['We', 'I', 'Today', 'This', 'The', 'In', 'As', 'For', 'Let', 'Our', 
            'How', 'What', 'Should', 'Is', 'Are', 'Do', 'Does', 'Can', 'Could', 'Would', 'Some', 
            'Many', 'Most', 'Recent', 'New', 'One', 'A', 'Proponents', 'Critics', 'Research'];
          const nameParts = namePart.split(/\s+/);
          
          // If name has 2+ parts and second part is a sentence starter, split it
          if (nameParts.length >= 2 && sentenceStarters.includes(nameParts[1])) {
            extractedName = nameParts[0];
            contentStart = nameParts.slice(1).join(' ') + ' ' + contentStart;
          }
          
          professorName = `Professor ${extractedName}`;
          if (contentStart.length > 5) {
            professorQuestion = contentStart.trim();
          }
          profLineIdx = i;
          break;
        }
      }
      
      // If professor found, collect question from following lines until student marker
      // Also track where first student begins
      let firstStudentIdx = -1;
      if (profLineIdx >= 0) {
        const questionLines: string[] = [];
        if (professorQuestion) questionLines.push(professorQuestion);
        
        for (let i = profLineIdx + 1; i < lines.length; i++) {
          const line = lines[i];
          // Stop only at explicit student marker: "Student Name" or "Student: Name"
          if (/^Student[:\s]/i.test(line)) {
            firstStudentIdx = i;
            break;
          }
          questionLines.push(line);
        }
        professorQuestion = questionLines.join(' ').trim();
      }
      
      // Parse students - start from first student marker, not from professor line
      // This ensures professor question lines are not accidentally parsed as students
      let currentStudentName = '';
      let currentStudentResponse: string[] = [];
      let inStudentSection = false;
      
      const studentStartIdx = firstStudentIdx >= 0 ? firstStudentIdx : (profLineIdx >= 0 ? profLineIdx + 1 : startIdx);
      for (let i = studentStartIdx; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip empty lines when collecting
        if (!line) continue;
        
        // Check for student marker: "Student: Name" or "Student Name"
        // Match "Student" followed by colon/space, then a name (single capitalized word)
        const studentMatch = line.match(/^Student[:\s]+([A-Z][a-zA-Z]+)\s*$/i);
        if (studentMatch) {
          // Save previous student if exists
          if (currentStudentName && currentStudentResponse.length > 0) {
            students.push({
              name: currentStudentName,
              response: currentStudentResponse.join(' ').trim()
            });
          }
          currentStudentName = studentMatch[1].trim();
          currentStudentResponse = [];
          inStudentSection = true;
          continue;
        }
        
        // Also check for "Student: Name Response..." format (all on one line)
        const studentMatchInline = line.match(/^Student[:\s]+([A-Z][a-zA-Z]+)\s+(.+)$/i);
        if (studentMatchInline) {
          // Save previous student if exists
          if (currentStudentName && currentStudentResponse.length > 0) {
            students.push({
              name: currentStudentName,
              response: currentStudentResponse.join(' ').trim()
            });
          }
          currentStudentName = studentMatchInline[1].trim();
          currentStudentResponse = [studentMatchInline[2].trim()];
          inStudentSection = true;
          continue;
        }
        
        // If in student section, collect response lines
        if (inStudentSection) {
          // Check if this line starts a new student (Name: format without "Student" prefix)
          const nameOnlyMatch = line.match(/^([A-Z][a-zA-Z]+)[:\s]+(.+)$/);
          const commonWords = ['Professor', 'Dr', 'The', 'This', 'That', 'However', 'Although', 'For', 'In', 
            'On', 'At', 'To', 'By', 'With', 'From', 'As', 'But', 'Or', 'And', 'If', 'When', 'While', 'Some',
            'Many', 'Most', 'All', 'Any', 'Such', 'What', 'Which', 'How', 'Why', 'Where', 'Universities', 'Gene', 'DNA'];
          if (nameOnlyMatch && !commonWords.includes(nameOnlyMatch[1])) {
            // Save current student and start new one
            if (currentStudentName && currentStudentResponse.length > 0) {
              students.push({
                name: currentStudentName,
                response: currentStudentResponse.join(' ').trim()
              });
            }
            currentStudentName = nameOnlyMatch[1].trim();
            currentStudentResponse = [nameOnlyMatch[2].trim()];
            continue;
          }
          // Add line to current student's response
          currentStudentResponse.push(line);
        }
      }
      
      // Save last student
      if (currentStudentName && currentStudentResponse.length > 0) {
        students.push({
          name: currentStudentName,
          response: currentStudentResponse.join(' ').trim()
        });
      }
      
      // Fallback if no professor found - use first non-header paragraph
      if (!professorName && !professorQuestion && startIdx < lines.length) {
        professorName = 'Professor Johnson';
        const contentLines: string[] = [];
        for (let i = startIdx; i < lines.length && i < startIdx + 5; i++) {
          if (!/^Student[:\s]/i.test(lines[i])) {
            contentLines.push(lines[i]);
          } else break;
        }
        professorQuestion = contentLines.join(' ').trim();
      }
      
      console.log('[DEBUG] Discussion parsed - professorName:', professorName, 'professorQuestion:', professorQuestion?.substring(0, 80), 'students:', students.length);
      console.log('[DEBUG] Students:', JSON.stringify(students.map(s => ({ name: s.name, responseLen: s.response?.length || 0 }))));
      questions.push({
        type: 'discussion',
        // topic is just the professor question content (not formatted with name)
        topic: professorQuestion || '',
        // professorQuestion is the full professor prompt
        professorQuestion: professorQuestion || '',
        // Store professor name separately
        professorName: professorName || 'Professor Johnson',
        // studentResponses in the format expected by the server and frontend
        studentResponses: students.length > 0 ? students : [],
        // scenario as backup for legacy compatibility
        scenario: students.length > 0 
          ? students.map(s => `${s.name}: ${s.response}`).join('\n\n')
          : '',
        sampleAnswer: 'Write a well-developed response contributing to the academic discussion with at least 100 words.'
      });
    }

    if (questions.length === 0) {
      errors.push('NEW TOEFL Writing 형식을 찾을 수 없습니다. "Build a Sentence", "Write an Email", "Write for an Academic Discussion" 섹션이 필요합니다.');
    }

    console.log('[DEBUG] Final questions array:', JSON.stringify(questions.map(q => ({
      type: q.type,
      hasScenario: !!q.scenario,
      hasTopic: !!q.topic,
      hasProfessorName: !!q.professorName,
      hasProfessorQuestion: !!q.professorQuestion,
      hasStudentResponses: !!q.studentResponses && q.studentResponses.length > 0
    })), null, 2));

    return { questions, errors };
  };

  const handleParseNewToeflWriting = () => {
    const parsed = parseNewToeflWriting(content);
    
    if (parsed.errors.length > 0) {
      setNewToeflWritingErrors(parsed.errors);
      setNewToeflWritingPreview([]);
      toast({ title: "파싱 실패", description: parsed.errors.slice(0, 2).join(', '), variant: "destructive" });
      return;
    }

    setNewToeflWritingPreview(parsed.questions);
    setNewToeflWritingErrors([]);
    toast({ title: "파싱 성공", description: `${parsed.questions.length}개 문제가 파싱되었습니다.` });
  };

  const handleCreateNewToeflWritingTest = async () => {
    if (newToeflWritingPreview.length === 0 || !testTitle.trim()) {
      toast({ title: "입력 필요", description: "제목과 파싱된 문제가 필요합니다.", variant: "destructive" });
      return;
    }

    // DEBUG: Log state before creating test
    console.log('[DEBUG] handleCreateNewToeflWritingTest - newToeflWritingPreview:', 
      newToeflWritingPreview.map(q => ({
        type: q.type,
        hasProfessorName: !!q.professorName,
        professorName: q.professorName,
        hasProfessorQuestion: !!q.professorQuestion,
        professorQuestionLen: q.professorQuestion?.length,
        hasStudentResponses: Array.isArray(q.studentResponses) && q.studentResponses.length > 0,
        studentResponsesCount: q.studentResponses?.length
      }))
    );

    setIsProcessing(true);
    setProgress(30);
    setProcessingStage("NEW TOEFL Writing 테스트를 생성하고 있습니다...");

    try {
      const parsedQuestions = newToeflWritingPreview.map((q, idx) => ({
        id: `${Date.now()}-${idx}`,
        type: q.type, // Include type field for server-side processing
        questionType: q.type,
        words: q.words,
        contextSentence: q.contextSentence,
        sentenceTemplate: q.sentenceTemplate,
        correctOrder: q.correctOrder,
        scenario: q.scenario,
        topic: q.topic,
        professorName: q.professorName, // For discussion: professor name
        professorQuestion: q.professorQuestion, // For discussion: professor prompt/question
        studentResponses: q.studentResponses, // For discussion: array of {name, response}
        questionText: q.scenario || q.topic || (q.words ? q.words.join(', ') : ''),
        answer: q.answer,
        sampleAnswer: q.sampleAnswer,
      }));

      // DEBUG: Log what we're sending to API
      console.log('[DEBUG] API payload - parsedQuestions (discussion item):', 
        parsedQuestions.find(q => q.type === 'discussion'));

      setProgress(60);
      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        examType: "new-toefl",
        section: "writing",
        difficulty: "medium",
        questionCount: parsedQuestions.length,
        parsedQuestions,
        isActive: !isPrivateTest
      });

      if (!testResponse.ok) throw new Error("테스트 생성 실패");
      const result = await testResponse.json();
      setProgress(100);
      toast({ title: "테스트 생성 완료!", description: `${parsedQuestions.length}개 문제가 생성되었습니다.` });
      invalidateTestCaches(queryClient);
      setTimeout(() => setLocation(`/new-toefl-writing/${result.id}`), 2000);
    } catch (error: any) {
      toast({ title: "테스트 생성 실패", description: error.message, variant: "destructive" });
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleConfirmAllNewToeflReadingAnswers = () => {
    setNewToeflReadingPreview((questions) =>
      questions.map((question) => ({
        ...question,
        answerConfirmed: true,
      })),
    );
    toast({
      title: "모든 정답 확인됨",
      description: "모든 문제의 정답이 확인되었습니다.",
    });
  };

  const handleConfirmAllNewToeflListeningAnswers = () => {
    setNewToeflListeningPreview((questions) =>
      questions.map((question) => ({
        ...question,
        answerConfirmed: true,
      })),
    );
    toast({
      title: "모든 정답 확인됨",
      description: "모든 문제의 정답이 확인되었습니다.",
    });
  };

  // Apply parsed data to form fields and create test for Writing
  const handleApplyParsedWriting = async () => {
    if (!writingParsedPreview) return;

    // 제목 검증
    if (!testTitle.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "테스트 제목을 먼저 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // State에 적용
    setWritingReadingPassage(writingParsedPreview.reading);
    setWritingListeningScript(writingParsedPreview.listening);
    setWritingQuestion(writingParsedPreview.question);

    // 바로 테스트 생성
    setIsProcessing(true);
    setProgress(50);

    try {
      // Writing question 객체 생성
      const writingQuestion = {
        id: Date.now().toString(),
        questionType: "writing",
        writingType: "integrated",
        readingPassage: writingParsedPreview.reading,
        listeningScript: writingParsedPreview.listening,
        questionText: writingParsedPreview.question,
        readingTime: writingReadingTime || 180,
        writingTime: writingTime || 1200
      };

      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        examType,
        section: "writing",
        difficulty: "medium",
        questionCount: 1,
        parsedQuestions: [writingQuestion]
      });

      if (!testResponse.ok) throw new Error("테스트 생성 실패");

      const result = await testResponse.json();
      setProgress(100);

      toast({
        title: "테스트 생성 완료!",
        description: `${examType === "new-toefl" ? "NEW TOEFL" : "TOEFL"} Writing 테스트가 생성되었습니다.`,
      });

      invalidateTestCaches(queryClient);

      // Writing 테스트 페이지로 이동
      const writingRedirect = examType === "new-toefl" 
        ? `/new-toefl-writing/${result.id}` 
        : `/toefl-writing/${result.id}`;
      setTimeout(() => setLocation(writingRedirect), 2000);
    } catch (error: any) {
      toast({
        title: "테스트 생성 실패",
        description: error.message || "테스트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Apply parsed data and create test for Discussion Writing
  const handleApplyParsedDiscussion = async () => {
    if (!discussionParsedPreview) return;

    // 제목 검증
    if (!testTitle.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "테스트 제목을 먼저 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 바로 테스트 생성
    setIsProcessing(true);
    setProgress(50);

    try {
      // Discussion question 객체 생성 - topic 필드 필수 (new-toefl-writing.tsx에서 사용)
      const discussionQuestion = {
        id: Date.now().toString(),
        type: "discussion",
        questionType: "discussion",
        writingType: "discussion",
        topic: discussionParsedPreview.professorQuestion,
        questionText: discussionParsedPreview.professorQuestion,
        professorQuestion: discussionParsedPreview.professorQuestion,
        studentResponses: discussionParsedPreview.studentResponses,
        writingTime: writingTime || 600
      };

      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        examType,
        section: "writing",
        difficulty: "medium",
        questionCount: 1,
        parsedQuestions: [discussionQuestion],
        isActive: !isPrivateTest
      });

      if (!testResponse.ok) throw new Error("테스트 생성 실패");

      const result = await testResponse.json();
      setProgress(100);

      toast({
        title: "테스트 생성 완료!",
        description: `${examType === "new-toefl" ? "NEW TOEFL" : "TOEFL"} Writing Discussion 테스트가 생성되었습니다.`,
      });

      invalidateTestCaches(queryClient);

      // Writing 테스트 페이지로 이동
      const discussionRedirect = examType === "new-toefl" 
        ? `/new-toefl-writing/${result.id}` 
        : `/toefl-writing/${result.id}`;
      setTimeout(() => setLocation(discussionRedirect), 2000);
    } catch (error: any) {
      toast({
        title: "테스트 생성 실패",
        description: error.message || "테스트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // 자동 저장 및 복구 기능
  useEffect(() => {
    // 페이지 로드 시 저장된 데이터 복구
    const savedData = localStorage.getItem('ai-test-creator-form-data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.testTitle) setTestTitle(parsed.testTitle);
        if (parsed.formPassageTitle) setFormPassageTitle(parsed.formPassageTitle);
        if (parsed.formPassageContent) setFormPassageContent(parsed.formPassageContent);
        if (parsed.formNarration) setFormNarration(parsed.formNarration);
        if (parsed.formQuestions) setFormQuestions(parsed.formQuestions);
        if (parsed.currentQuestion) setCurrentQuestion(parsed.currentQuestion);
      } catch (e) {
        console.error('Failed to restore saved data:', e);
      }
    }
  }, []);

  // 입력 내용이 변경될 때마다 자동 저장
  useEffect(() => {
    const dataToSave = {
      testTitle,
      formPassageTitle,
      formPassageContent,
      formNarration,
      formQuestions,
      currentQuestion
    };
    localStorage.setItem('ai-test-creator-form-data', JSON.stringify(dataToSave));
  }, [testTitle, formPassageTitle, formPassageContent, formNarration, formQuestions, currentQuestion]);

  // Excel template download handler
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`/api/ai/download-excel-template?examType=${examType}&section=${currentSection}`);
      
      if (!response.ok) throw new Error("템플릿 다운로드 실패");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-template-${examType}-${currentSection}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "템플릿 다운로드 완료",
        description: "엑셀 템플릿이 다운로드되었습니다.",
      });
    } catch (error: any) {
      toast({
        title: "다운로드 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Excel file upload handler
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setIsProcessing(true);
    setProgress(30);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('examType', examType);
      formData.append('section', currentSection);

      const response = await fetch('/api/ai/upload-excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("엑셀 파일 업로드 실패");

      const result = await response.json();
      setParsedQuestions(result.questions || []);
      setExcelErrors(result.errors || []);
      setPassageTitle(result.passageTitle || "");
      setPassageContent(result.passageContent || "");
      setNarration(result.narration || "");
      setProgress(100);

      toast({
        title: "파일 업로드 완료",
        description: result.message || `${result.totalQuestions}개의 문제가 파싱되었습니다.`,
      });
    } catch (error: any) {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
      setParsedQuestions([]);
      setExcelErrors([]);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Create test from Excel parsed questions
  const handleCreateFromExcel = async () => {
    if (!testTitle.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "테스트 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (parsedQuestions.length === 0) {
      toast({
        title: "문제 없음",
        description: "먼저 엑셀 파일을 업로드하세요.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(50);

    try {
      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        examType,
        section: currentSection,
        difficulty: "medium",
        questionCount: parsedQuestions.length,
        parsedQuestions: parsedQuestions
      });

      if (!testResponse.ok) throw new Error("테스트 생성 실패");

      const result = await testResponse.json();
      setProgress(100);

      toast({
        title: "테스트 생성 완료!",
        description: `${parsedQuestions.length}개 문제로 테스트가 생성되었습니다.`,
      });

      invalidateTestCaches(queryClient);

      // Navigate to test
      let redirectPath = `/test-taking/${result.id}`;
      if (examType === "toefl") {
        switch (currentSection) {
          case "reading": redirectPath = `/toefl-reading/${result.id}`; break;
          case "listening": redirectPath = `/toefl-listening/${result.id}`; break;
          case "speaking": redirectPath = `/toefl-speaking-new/${result.id}`; break;
          case "writing": redirectPath = `/toefl-writing/${result.id}`; break;
        }
      } else if (examType === "new-toefl") {
        switch (currentSection) {
          case "reading": redirectPath = `/new-toefl-reading/${result.id}`; break;
          case "listening": redirectPath = `/new-toefl-listening/${result.id}`; break;
          case "speaking": redirectPath = `/new-toefl-speaking/${result.id}`; break;
          case "writing": redirectPath = `/new-toefl-writing/${result.id}`; break;
        }
      }

      setTimeout(() => setLocation(redirectPath), 2000);
    } catch (error: any) {
      toast({
        title: "테스트 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // 단일 문제 파싱 함수
  const parseSingleQuestion = (blockLines: string[]): Partial<Question> => {
    // 첫 번째 줄에서 질문 텍스트 추출
    let questionText = blockLines[0].replace(/^\d+\.\s*/, '');
    let nextIndex = 1;
    
    // 다음 줄이 ○나 A. B. 등으로 시작하기 전까지 질문에 추가
    while (nextIndex < blockLines.length && 
           !blockLines[nextIndex].match(/^[○●■]/) && 
           !blockLines[nextIndex].match(/^[A-Za-z]\./)) {
      if (blockLines[nextIndex].trim()) {
        questionText += ' ' + blockLines[nextIndex];
      }
      nextIndex++;
    }
    
    // 보기 찾기 (○로 시작하는 라인들)
    const options: string[] = [];
    let correctAnswer = "A"; // 기본값
    
    for (let i = nextIndex; i < blockLines.length; i++) {
      const line = blockLines[i];
      
      // 정답 정보 찾기 (Answer: C, 정답: C, Correct: C 형식)
      const answerMatch = line.match(/^(?:Answer|정답|Correct):\s*([A-D])/i);
      if (answerMatch) {
        correctAnswer = answerMatch[1].toUpperCase();
        continue;
      }
      
      if (line.startsWith('○') || line.startsWith('●') || line.startsWith('■')) {
        options.push(line.replace(/^[○●■]\s*/, '').trim());
      } else if (line.match(/^[A-Z]\./)) {
        // A. B. C. D. 형식 (대문자만)
        options.push(line.replace(/^[A-Z]\.\s*/, '').trim());
      } else if (line.match(/^[a-z]\./)) {
        // a. b. c. d. 형식 (소문자)
        options.push(line.replace(/^[a-z]\.\s*/, '').trim());
      }
    }
    
    // 보기 개수에 따라 문제 유형 결정
    if (options.length === 0) {
      // 보기가 없는 경우 - insertion 문제로 처리
      return {
        questionType: "insertion",
        questionText: questionText.trim(),
        options: [],
        correctAnswer: "",
        points: 1
      };
    } else if (options.length === 4) {
      return {
        questionType: "multiple-choice",
        questionText: questionText.trim(),
        options,
        correctAnswer: correctAnswer,
        points: 1
      };
    } else if (options.length === 6) {
      // Summary 문제
      return {
        questionType: "summary",
        questionText: questionText.trim(),
        options,
        correctAnswer: "",
        points: 2
      };
    } else if (options.length >= 2 && options.length <= 4) {
      // 2-4개 보기면 multiple-choice로 처리 (빈 보기로 채움)
      const paddedOptions = [...options];
      while (paddedOptions.length < 4) {
        paddedOptions.push("");
      }
      return {
        questionType: "multiple-choice",
        questionText: questionText.trim(),
        options: paddedOptions.slice(0, 4),
        correctAnswer: correctAnswer,
        points: 1
      };
    } else {
      throw new Error(`보기가 ${options.length}개입니다. 4개 또는 6개가 필요합니다.`);
    }
  };

  // 여러 문제 파싱 함수
  const parseQuickPasteTextMultiple = (text: string): Partial<Question>[] => {
    const lines = text.trim().split('\n').map(line => line.trim());
    const questions: Partial<Question>[] = [];
    
    // 문제 번호로 분할 (1., 2., 3., ... 형식)
    const questionBlocks: string[][] = [];
    let currentBlock: string[] = [];
    
    for (const line of lines) {
      if (/^\d+\./.test(line)) {
        // 새 문제 시작
        if (currentBlock.length > 0) {
          questionBlocks.push(currentBlock);
        }
        currentBlock = [line];
      } else if (line) {
        // 현재 문제에 추가
        currentBlock.push(line);
      }
    }
    
    // 마지막 블록 추가
    if (currentBlock.length > 0) {
      questionBlocks.push(currentBlock);
    }
    
    if (questionBlocks.length === 0) {
      throw new Error("문제를 찾을 수 없습니다. 각 문제는 번호로 시작해야 합니다. (예: 1. Question text)");
    }
    
    // 각 블록을 개별 문제로 파싱
    for (let i = 0; i < questionBlocks.length; i++) {
      try {
        const parsed = parseSingleQuestion(questionBlocks[i]);
        questions.push(parsed);
      } catch (error: any) {
        console.warn(`문제 ${i + 1} 파싱 실패:`, error.message);
        // 파싱 실패한 문제는 건너뛰고 계속 진행
      }
    }
    
    if (questions.length === 0) {
      throw new Error("파싱 가능한 문제를 찾을 수 없습니다.");
    }
    
    return questions;
  };

  const handleQuickPaste = () => {
    if (!quickPasteText.trim()) {
      toast({
        title: "텍스트를 입력하세요",
        description: "문제와 보기를 붙여넣기 해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsedQuestions = parseQuickPasteTextMultiple(quickPasteText);
      
      // 모든 파싱된 문제를 문제 목록에 추가
      const questionsWithIds = parsedQuestions.map((q, index) => ({
        id: `q${formQuestions.length + index + 1}`,
        ...q,
        passage: formPassageContent || q.passage // Use formPassageContent if available
      })) as Question[];
      
      setFormQuestions([...formQuestions, ...questionsWithIds]);
      setQuickPasteText(""); // 파싱 후 텍스트 영역 비우기

      toast({
        title: "파싱 완료!",
        description: `${parsedQuestions.length}개의 문제가 목록에 추가되었습니다.`,
      });
    } catch (error: any) {
      toast({
        title: "파싱 실패",
        description: error.message || "문제 형식을 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  // Structured form handlers
  const handleAddQuestion = () => {
    if (!currentQuestion.questionText?.trim()) {
      toast({
        title: "입력 필요",
        description: "문제 내용을 입력하세요.",
        variant: "destructive",
      });
      return;
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      questionType: currentQuestion.questionType || "multiple-choice",
      questionText: currentQuestion.questionText || "",
      options: currentQuestion.options || [],
      correctAnswer: currentQuestion.correctAnswer || "A",
      explanation: currentQuestion.explanation || "",
      passage: formPassageContent,
      points: currentQuestion.points || 1
    };

    setFormQuestions([...formQuestions, newQuestion]);
    
    // Reset form (keep passage and question type)
    const resetOptions = currentQuestion.questionType === "multiple-choice" ? ["", "", "", ""] :
                         currentQuestion.questionType === "summary" ? ["", "", "", "", "", ""] : [];
    
    setCurrentQuestion({
      questionType: currentQuestion.questionType || "multiple-choice",
      questionText: "",
      options: resetOptions,
      correctAnswer: currentQuestion.questionType === "multiple-choice" ? "A" : "",
      explanation: "",
      points: 1
    });

    toast({
      title: "문제 추가됨",
      description: `총 ${formQuestions.length + 1}개의 문제`,
    });
  };

  const handleRemoveQuestion = (id: string) => {
    setFormQuestions(formQuestions.filter(q => q.id !== id));
  };

  const handleCreateFromForm = async () => {
    if (!testTitle.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "테스트 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (formQuestions.length === 0) {
      toast({
        title: "문제 없음",
        description: "먼저 문제를 추가하세요.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(50);

    try {
      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        examType,
        section: currentSection,
        difficulty: "medium",
        questionCount: formQuestions.length,
        parsedQuestions: formQuestions,
        passageTitle: formPassageTitle,
        passageContent: formPassageContent,
        narration: formNarration
      });

      if (!testResponse.ok) throw new Error("테스트 생성 실패");

      const result = await testResponse.json();
      setProgress(100);

      // 성공적으로 테스트가 생성되면 저장된 데이터 삭제
      localStorage.removeItem('ai-test-creator-form-data');

      toast({
        title: "테스트 생성 완료!",
        description: `${formQuestions.length}개 문제로 테스트가 생성되었습니다.`,
      });

      invalidateTestCaches(queryClient);

      // Navigate to test
      let redirectPath = `/test-taking/${result.id}`;
      if (examType === "toefl") {
        switch (currentSection) {
          case "reading": redirectPath = `/toefl-reading/${result.id}`; break;
          case "listening": redirectPath = `/toefl-listening/${result.id}`; break;
          case "speaking": redirectPath = `/toefl-speaking-new/${result.id}`; break;
          case "writing": redirectPath = `/toefl-writing/${result.id}`; break;
        }
      } else if (examType === "new-toefl") {
        switch (currentSection) {
          case "reading": redirectPath = `/new-toefl-reading/${result.id}`; break;
          case "listening": redirectPath = `/new-toefl-listening/${result.id}`; break;
          case "speaking": redirectPath = `/new-toefl-speaking/${result.id}`; break;
          case "writing": redirectPath = `/new-toefl-writing/${result.id}`; break;
        }
      }

      setTimeout(() => setLocation(redirectPath), 2000);
    } catch (error: any) {
      toast({
        title: "테스트 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // GRE Quantitative AI Auto-Generation Handler
  const handleGreQuantAutoGenerate = async () => {
    if (!testTitle.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "테스트 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingGreQuant(true);
    
    try {
      toast({
        title: "AI 문제 생성 시작",
        description: `${greQuantQuestionCount}개의 GRE Quantitative 문제를 생성 중입니다...`,
      });

      // Call AI generation API
      const response = await apiRequest("POST", "/api/gre/quantitative/generate", {
        difficulty: greQuantDifficulty,
        questionCount: greQuantQuestionCount,
        includeDataInterpretation: true,
        language: 'ko'
      });

      let generatedData;
      try {
        generatedData = await response.json();
      } catch {
        throw new Error("AI 서버 응답을 파싱할 수 없습니다.");
      }

      if (!response.ok) {
        throw new Error(generatedData?.message || "AI 문제 생성에 실패했습니다.");
      }

      if (!generatedData?.questions || !Array.isArray(generatedData.questions) || generatedData.questions.length === 0) {
        throw new Error("AI가 문제를 생성하지 못했습니다. 다시 시도해주세요.");
      }

      toast({
        title: "문제 생성 완료",
        description: `${generatedData.questions.length}개의 문제가 생성되었습니다. 저장 중...`,
      });

      // Save to database
      const saveResponse = await apiRequest("POST", "/api/gre/quantitative/save-test", {
        questions: generatedData.questions,
        title: testTitle.trim(),
        difficulty: greQuantDifficulty
      });

      let saveResult;
      try {
        saveResult = await saveResponse.json();
      } catch {
        throw new Error("저장 서버 응답을 파싱할 수 없습니다.");
      }

      if (!saveResponse.ok || !saveResult?.success) {
        throw new Error(saveResult?.message || "테스트 저장에 실패했습니다.");
      }

      toast({
        title: "테스트 생성 완료!",
        description: `${generatedData.questions.length}개의 GRE Quantitative 문제가 저장되었습니다. 페이지 이동 중...`,
      });

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ["/api/test-sets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gre/quantitative/tests"] });

      // Navigate to the test immediately with a short delay for toast visibility
      const targetUrl = `/gre/quantitative-reasoning?testId=${saveResult.testId}`;
      console.log('Redirecting to GRE Quant test:', targetUrl);
      setTimeout(() => {
        setLocation(targetUrl);
      }, 500);

    } catch (error: any) {
      toast({
        title: "생성 실패",
        description: error.message || "문제 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingGreQuant(false);
    }
  };

  // SAT Math AI Auto-Generation Handler
  const handleSatMathAutoGenerate = async () => {
    if (!testTitle.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "테스트 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingSatMath(true);
    
    try {
      toast({
        title: "AI 문제 생성 시작",
        description: `${satMathQuestionCount}개의 SAT Math 문제를 생성 중입니다...`,
      });

      // Call SAT Math AI generation API
      const response = await apiRequest("POST", "/api/ai/generate-sat-math-section", {
        difficulty: satMathDifficulty,
        questionCount: satMathQuestionCount,
        setTitle: testTitle.trim()
      });

      let generatedData;
      try {
        generatedData = await response.json();
      } catch {
        throw new Error("AI 서버 응답을 파싱할 수 없습니다.");
      }

      if (!response.ok) {
        throw new Error(generatedData?.message || "AI 문제 생성에 실패했습니다.");
      }

      if (!generatedData?.testData?.questions || !Array.isArray(generatedData.testData.questions) || generatedData.testData.questions.length === 0) {
        throw new Error("AI가 문제를 생성하지 못했습니다. 다시 시도해주세요.");
      }

      toast({
        title: "테스트 생성 완료!",
        description: `${generatedData.testData.questions.length}개의 SAT Math 문제가 저장되었습니다.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/test-sets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-generated-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sat/math"] });

      // Navigate to SAT Math test page with the new test
      setTimeout(() => {
        setLocation(`/sat/math?testId=${generatedData.testId}`);
      }, 1500);

    } catch (error: any) {
      toast({
        title: "생성 실패",
        description: error.message || "문제 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSatMath(false);
    }
  };

  // 텍스트 파싱 테스트 생성 핸들러
  const handleGenerateTest = async () => {
    if (!testTitle.trim()) {
      toast({
        title: "제목 입력 필요",
        description: "테스트 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "입력 필요",
        description: "텍스트를 입력해주세요. 100자 이상의 텍스트를 입력하면 파싱하여 문제를 생성합니다.",
        variant: "destructive",
      });
      return;
    }

    if (content.trim().length < 100) {
      toast({
        title: "텍스트가 너무 짧습니다",
        description: "100자 이상의 텍스트를 입력해주세요. 웹 폼이나 엑셀을 사용하여 직접 문제를 작성할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingStage("입력된 텍스트를 분석하여 문제를 생성 중...");

    try {
      setProgress(30);

      // GRE Verbal Reasoning의 경우 AI 없이 직접 파싱
      if (examType === "gre" && currentSection === "verbal") {
        setProcessingStage("GRE Verbal Reasoning 문제를 파싱하고 있습니다...");
        
        // 직접 파싱을 위해 바로 테스트 생성 엔드포인트 호출
        const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
          title: testTitle.trim(),
          examType,
          section: currentSection,
          difficulty: "medium",
          questionCount: 0, // 파싱 후 자동 계산됨
          userContent: content.trim() // 원본 텍스트 전달
        });

        if (!testResponse.ok) {
          throw new Error("테스트 생성에 실패했습니다.");
        }

        const testResult = await testResponse.json();
        setProgress(100);
        setProcessingStage("완료! 테스트로 이동합니다...");
        
        toast({
          title: "테스트 생성 완료!",
          description: "생성된 문제로 시험을 시작합니다.",
        });

        // 생성된 테스트 목록 새로고침
        invalidateTestCaches(queryClient);
        
        // 2초 후 테스트 응시 인터페이스로 자동 이동
        setTimeout(() => {
          setLocation(`/gre/verbal-reasoning?testId=${testResult.id}`);
        }, 2000);
        
        return; // 함수 종료
      }

      // GRE Quantitative Reasoning의 경우 별도 파싱 엔드포인트 사용
      if (examType === "gre" && currentSection === "quant") {
        setProcessingStage("GRE Quantitative Reasoning 문제를 파싱하고 있습니다...");
        
        // 1. 파싱 API 호출
        const parseResponse = await apiRequest("POST", "/api/gre/quant/parse", {
          content: content.trim()
        });

        if (!parseResponse.ok) {
          throw new Error("GRE Quantitative 문제 파싱에 실패했습니다.");
        }

        const parseResult = await parseResponse.json();
        setProgress(60);
        setProcessingStage("파싱된 문제로 테스트를 생성하고 있습니다...");
        
        // 2. 파싱된 문제로 테스트 생성
        const createResponse = await apiRequest("POST", "/api/gre/quant/create", {
          title: testTitle.trim(),
          questions: parseResult.questions
        });

        if (!createResponse.ok) {
          throw new Error("테스트 생성에 실패했습니다.");
        }

        const createResult = await createResponse.json();
        setProgress(100);
        setProcessingStage("완료! 테스트로 이동합니다...");
        
        toast({
          title: "테스트 생성 완료!",
          description: `${parseResult.totalQuestions}개 문제가 생성되었습니다.`,
        });

        // 생성된 테스트 목록 새로고침
        invalidateTestCaches(queryClient);
        
        // 2초 후 테스트 응시 인터페이스로 자동 이동
        setTimeout(() => {
          setLocation(`/gre/quantitative-reasoning?testId=${createResult.testId}`);
        }, 2000);
        
        return; // 함수 종료
      }

      // 다른 섹션은 AI 파싱 사용
      const parseResponse = await apiRequest("POST", "/api/ai/parse-text-questions", {
        pastedText: content.trim(),
        examType,
        section: currentSection,
        difficulty: "medium"
      });

      if (!parseResponse.ok) {
        throw new Error("텍스트 파싱에 실패했습니다.");
      }

      const parseResult = await parseResponse.json();
      setProgress(60);
      setProcessingStage("파싱된 내용으로 테스트를 생성하고 있습니다...");

      // 파싱된 문제로 테스트 생성
      const testResponse = await apiRequest("POST", "/api/ai/generate-test-set", {
        title: testTitle.trim(),
        examType,
        section: currentSection,
        difficulty: "medium",
        questionCount: parseResult.questions.length,
        parsedQuestions: parseResult.questions
      });

      if (!testResponse.ok) {
        throw new Error("테스트 생성에 실패했습니다.");
      }

      const testResult = await testResponse.json();

      setProgress(100);
      setProcessingStage("완료! 테스트로 이동합니다...");
      
      toast({
        title: "테스트 생성 완료!",
        description: "생성된 문제로 시험을 시작합니다.",
      });

      // 생성된 테스트 목록 새로고침
      invalidateTestCaches(queryClient);
      
      // 섹션별로 올바른 경로로 이동
      let redirectPath = `/test-taking/${testResult.id}`;
      
      if (examType === "toefl") {
        switch (currentSection) {
          case "reading":
            redirectPath = `/toefl-reading/${testResult.id}`;
            break;
          case "listening":
            redirectPath = `/toefl-listening/${testResult.id}`;
            break;
          case "speaking":
            redirectPath = `/toefl-speaking-new/${testResult.id}`;
            break;
          case "writing":
            redirectPath = `/toefl-writing/${testResult.id}`;
            break;
        }
      } else if (examType === "new-toefl") {
        switch (currentSection) {
          case "reading":
            redirectPath = `/new-toefl-reading/${testResult.id}`;
            break;
          case "listening":
            redirectPath = `/new-toefl-listening/${testResult.id}`;
            break;
          case "speaking":
            redirectPath = `/new-toefl-speaking/${testResult.id}`;
            break;
          case "writing":
            redirectPath = `/new-toefl-writing/${testResult.id}`;
            break;
        }
      } else if (examType === "gre") {
        switch (currentSection) {
          case "verbal":
            redirectPath = `/gre/verbal-reasoning?testId=${testResult.id}`;
            break;
          case "quant":
            redirectPath = `/gre/quantitative-reasoning?testId=${testResult.id}`;
            break;
          case "writing":
            redirectPath = `/gre/analytical-writing?testId=${testResult.id}`;
            break;
        }
      }
      
      // 2초 후 테스트 응시 인터페이스로 자동 이동
      setTimeout(() => {
        setLocation(redirectPath);
      }, 2000);

    } catch (error: any) {
      setIsProcessing(false);
      setProgress(0);
      setProcessingStage("");
      
      toast({
        title: "테스트 생성 실패",
        description: error.message || "테스트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // Block rendering for non-admin users
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" />
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">로딩 중...</div>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[100px]" />
        <Card className="relative z-10 p-8 text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4 text-white">접근 권한이 없습니다</h2>
          <p className="text-gray-400 mb-4">이 페이지는 관리자만 접근할 수 있습니다.</p>
          <Button onClick={() => setLocation('/')} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">홈으로 돌아가기</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0a0a0f]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px]" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 pt-8">
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <Card className="backdrop-blur-xl border border-white/10 bg-white/5 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-5">
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span>테스트 생성기</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-5 space-y-5">
            {/* Row 1: 시험 유형 + 섹션 선택 (같은 줄) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 시험 유형 드롭다운 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-white flex items-center gap-2">
                  <span className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>시험 유형</span>
                </Label>
                <Select value={examType} onValueChange={(value) => {
                  setExamType(value as any);
                  if (value === "toefl" || value === "new-toefl") setCurrentSection("reading");
                  else if (value === "gre") setCurrentSection("verbal");
                  else if (value === "sat") setCurrentSection("reading-writing");
                }}>
                  <SelectTrigger className="h-12 border-2 border-white/20 rounded-xl bg-white/10 backdrop-blur-sm focus:border-purple-500 transition-all duration-300 text-white">
                    <SelectValue placeholder="시험 선택" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-white/20 bg-[#1e293b] shadow-2xl">
                    <SelectItem value="toefl" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                      <div className="flex items-center gap-2">
                        <img src={toeflLogo} alt="TOEFL" className="w-6 h-6 object-contain rounded" />
                        <span>TOEFL IBT</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="new-toefl" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                      <div className="flex items-center gap-2">
                        <img src={toeflLogo} alt="NEW TOEFL" className="w-6 h-6 object-contain rounded" />
                        <span>NEW TOEFL 2026</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gre" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                      <div className="flex items-center gap-2">
                        <img src={greLogo} alt="GRE" className="w-6 h-6 object-contain rounded" />
                        <span>GRE GENERAL</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sat" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                      <div className="flex items-center gap-2">
                        <img src={satLogo} alt="SAT" className="w-6 h-6 object-contain rounded" />
                        <span>SAT</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 섹션 선택 드롭다운 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-white flex items-center gap-2">
                  <span className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>섹션 선택</span>
                </Label>
                <Select value={currentSection} onValueChange={(value) => setCurrentSection(value as any)}>
                  <SelectTrigger className="h-12 border-2 border-white/20 rounded-xl bg-white/10 backdrop-blur-sm focus:border-purple-500 transition-all duration-300 text-white">
                    <SelectValue placeholder="섹션 선택" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-white/20 bg-[#1e293b] shadow-2xl">
                    {(examType === "toefl" || examType === "new-toefl") ? (
                      <>
                        <SelectItem value="reading" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span>Reading</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="listening" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                          <div className="flex items-center gap-2">
                            <Headphones className="h-4 w-4 text-green-500" />
                            <span>Listening</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="speaking" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                          <div className="flex items-center gap-2">
                            <Mic className="h-4 w-4 text-orange-500" />
                            <span>Speaking</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="writing" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-500" />
                            <span>Writing</span>
                          </div>
                        </SelectItem>
                      </>
                    ) : examType === "sat" ? (
                      <>
                        <SelectItem value="reading-writing" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-rose-500" />
                            <span>Reading & Writing</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="math" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-500" />
                            <span>Math</span>
                          </div>
                        </SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="verbal" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span>Verbal Reasoning</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="quant" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-500" />
                            <span>Quantitative Reasoning</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="writing" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-purple-500" />
                            <span>Analytical Writing</span>
                          </div>
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 테스트 제목 입력 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>테스트 제목</span>
              </Label>
              <Input
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="테스트 제목 (예: Chapter 3 Reading Practice)"
                className="h-12 border-2 border-white/20 rounded-xl bg-white/10 backdrop-blur-sm focus:border-purple-500 transition-all duration-300 text-white placeholder:text-gray-400"
                data-testid="input-test-title"
              />
            </div>

            {/* 비공개 토글 */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: isPrivateTest ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)', border: isPrivateTest ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                onClick={() => setIsPrivateTest(!isPrivateTest)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
                style={{ background: isPrivateTest ? '#EF4444' : 'rgba(255,255,255,0.2)' }}
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200" style={{ transform: isPrivateTest ? 'translateX(22px)' : 'translateX(4px)' }} />
              </button>
              <span className="text-sm font-medium" style={{ color: isPrivateTest ? '#FCA5A5' : 'rgba(255,255,255,0.6)' }}>
                {isPrivateTest ? '🔒 비공개 (관리자만 볼 수 있음)' : '🌐 공개 (학생에게 노출됨)'}
              </span>
            </div>

            {/* 텍스트/웹폼 입력 */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-white flex items-center gap-2">
                <span className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span>{examType === "new-toefl" ? "텍스트 입력" : examType === "toefl" ? "웹폼 입력" : "입력 방식 선택"}</span>
              </Label>

              {examType === "new-toefl" ? (
                <Suspense fallback={null}>
                  <DeferredNewToeflTextParserSection
                    currentSection={currentSection}
                    content={content}
                    setContent={setContent}
                    isProcessing={isProcessing}
                    onReadingConfirmAll={handleConfirmAllNewToeflReadingAnswers}
                    onListeningConfirmAll={handleConfirmAllNewToeflListeningAnswers}
                    handleParseNewToeflReading={handleParseNewToeflReading}
                    handleCreateNewToeflReadingTest={handleCreateNewToeflReadingTest}
                    newToeflReadingErrors={newToeflReadingErrors}
                    newToeflReadingPreview={newToeflReadingPreview}
                    setNewToeflReadingPreview={setNewToeflReadingPreview}
                    handleParseNewToeflListening={handleParseNewToeflListening}
                    handleCreateNewToeflListeningTest={handleCreateNewToeflListeningTest}
                    newToeflListeningErrors={newToeflListeningErrors}
                    newToeflListeningPreview={newToeflListeningPreview}
                    setNewToeflListeningPreview={setNewToeflListeningPreview}
                    handleParseNewToeflSpeaking={handleParseNewToeflSpeaking}
                    handleCreateNewToeflSpeakingTest={handleCreateNewToeflSpeakingTest}
                    newToeflSpeakingErrors={newToeflSpeakingErrors}
                    newToeflSpeakingPreview={newToeflSpeakingPreview}
                    handleParseNewToeflWriting={handleParseNewToeflWriting}
                    handleCreateNewToeflWritingTest={handleCreateNewToeflWritingTest}
                    newToeflWritingErrors={newToeflWritingErrors}
                    newToeflWritingPreview={newToeflWritingPreview}
                  />
                </Suspense>
              ) : examType === "toefl" ? (
                /* TOEFL 웹폼 전용 UI - 탭 없이 웹폼만 표시 */
                <div className="space-y-6">
                  {/* 자동 저장 안내 */}
                  <div className="p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-400" />
                    <p className="text-sm text-purple-200">
                      입력 내용이 자동으로 저장됩니다. 페이지를 새로고침해도 안전합니다.
                    </p>
                  </div>

                  {/* TOEFL Speaking 전용 UI */}
                  {currentSection === "speaking" ? (
                    <div className="space-y-6">
                      {/* Speaking Type & Task 선택 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-white">Speaking Type</Label>
                          <Select value={speakingType} onValueChange={(value: any) => setSpeakingType(value)}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-speaking-type-toefl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-white/20">
                              <SelectItem value="independent">Independent (독립형)</SelectItem>
                              <SelectItem value="integrated">Integrated (통합형)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-white">Task 번호</Label>
                          <Select value={speakingTask} onValueChange={(value: any) => setSpeakingTask(value)}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-speaking-task-toefl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-white/20">
                              <SelectItem value="1">Task 1</SelectItem>
                              <SelectItem value="2">Task 2</SelectItem>
                              <SelectItem value="3">Task 3</SelectItem>
                              <SelectItem value="4">Task 4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Integrated Quick Paste */}
                      {speakingType === "integrated" ? (
                        <div className="space-y-6">
                          <div className="p-4 bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border border-teal-500/30 rounded-xl">
                            <h3 className="font-bold text-teal-300 mb-2 flex items-center gap-2">
                              <Sparkles className="h-5 w-5" />
                              ⚡ Quick Paste 사용법
                            </h3>
                            <div className="text-sm text-teal-200 space-y-2">
                              <p>아래 형식으로 텍스트를 입력하면 자동으로 필드를 분리합니다:</p>
                              <div className="bg-black/30 p-2 rounded text-xs font-mono text-teal-100 border border-teal-500/20">
                                [TITLE] Reading Passage Title<br/>
                                [READING] Reading passage content...<br/>
                                [LISTENING] Listening script...<br/>
                                [QUESTION] Speaking question...
                              </div>
                            </div>
                          </div>
                          <Textarea
                            value={speakingQuickPaste}
                            onChange={(e) => setSpeakingQuickPaste(e.target.value)}
                            placeholder="[TITLE], [READING], [LISTENING], [QUESTION] 마커와 함께 전체 텍스트를 붙여넣으세요..."
                            className="min-h-64 text-base bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            data-testid="textarea-speaking-quick-paste-toefl"
                          />
                          <div className="flex gap-3">
                            <Button onClick={handleParseSpeakingPaste} disabled={!speakingQuickPaste.trim()}
                              className="flex-1 h-12 bg-gradient-to-r from-teal-500 to-cyan-500 text-white" data-testid="button-parse-speaking-toefl">
                              텍스트 파싱
                            </Button>
                            <Button onClick={handleApplyParsedSpeaking} disabled={!speakingParsedPreview || !testTitle.trim()}
                              className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white" data-testid="button-apply-speaking-toefl">
                              <Sparkles className="h-5 w-5 mr-2" />테스트 생성
                            </Button>
                          </div>
                          {speakingParseErrors.length > 0 && (
                            <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                              <h4 className="font-bold text-red-300 mb-2">⚠️ 파싱 오류</h4>
                              <ul className="list-disc list-inside text-sm text-red-200">
                                {speakingParseErrors.map((e, i) => <li key={i}>{e}</li>)}
                              </ul>
                            </div>
                          )}
                          {speakingParsedPreview && (
                            <div className="p-4 bg-teal-900/30 border border-teal-500/30 rounded-xl">
                              <h4 className="font-bold text-teal-300 mb-3 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" />파싱 결과 미리보기</h4>
                              <div className="space-y-3 text-sm">
                                <div><span className="text-teal-400 font-semibold">제목:</span> <span className="text-white">{speakingParsedPreview.title}</span></div>
                                <div><span className="text-teal-400 font-semibold">Reading:</span> <span className="text-gray-300 line-clamp-2">{speakingParsedPreview.reading}</span></div>
                                <div><span className="text-teal-400 font-semibold">Listening:</span> <span className="text-gray-300 line-clamp-2">{speakingParsedPreview.listening}</span></div>
                                <div><span className="text-teal-400 font-semibold">Question:</span> <span className="text-gray-300">{speakingParsedPreview.question}</span></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Independent Speaking */
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-white">Speaking Question</Label>
                            <Textarea
                              value={speakingQuestion}
                              onChange={(e) => setSpeakingQuestion(e.target.value)}
                              placeholder="Speaking 질문을 입력하세요..."
                              className="min-h-32 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                              data-testid="textarea-independent-question-toefl"
                            />
                          </div>
                          <Button onClick={async () => {
                            if (!testTitle.trim() || !speakingQuestion.trim()) {
                              toast({ title: "입력 필요", description: "제목과 질문을 입력해주세요.", variant: "destructive" });
                              return;
                            }
                            setIsProcessing(true);
                            try {
                              const q = { id: Date.now().toString(), questionType: "speaking", speakingType, speakingTask, questionText: speakingQuestion, preparationTime, responseTime };
                              const res = await apiRequest("POST", "/api/ai/generate-test-set", { title: testTitle.trim(), examType, section: "speaking", difficulty: "medium", questionCount: 1, parsedQuestions: [q] });
                              if (!res.ok) throw new Error("테스트 생성 실패");
                              const result = await res.json();
                              toast({ title: "테스트 생성 완료!" });
                              invalidateTestCaches(queryClient);
                              setTimeout(() => setLocation(`/toefl-speaking-new/${result.id}`), 2000);
                            } catch (error: any) { toast({ title: "오류", description: error.message, variant: "destructive" }); }
                            finally { setIsProcessing(false); }
                          }} disabled={isProcessing} className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white" data-testid="button-create-independent-toefl">
                            <Sparkles className="h-5 w-5 mr-2" />{isProcessing ? "생성 중..." : "테스트 생성"}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : currentSection === "writing" ? (
                    /* TOEFL Writing UI */
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-white">Writing Type</Label>
                          <Select value={writingType} onValueChange={(value: any) => setWritingType(value)}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-writing-type-toefl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-white/20">
                              <SelectItem value="integrated">Integrated (통합형)</SelectItem>
                              <SelectItem value="discussion">Discussion (토론형)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {writingType === "integrated" ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-xl">
                            <h3 className="font-bold text-indigo-300 mb-2">📝 Integrated Writing Quick Paste</h3>
                            <div className="text-sm text-indigo-200">
                              <div className="bg-black/30 p-2 rounded text-xs font-mono">
                                Reading passage:<br/>내용...<br/><br/>Listening script:<br/>내용...<br/><br/>Question:<br/>질문...
                              </div>
                            </div>
                          </div>
                          <Textarea
                            value={writingQuickPaste}
                            onChange={(e) => setWritingQuickPaste(e.target.value)}
                            placeholder="Reading passage:, Listening script:, Question: 형식으로 입력..."
                            className="min-h-64 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            data-testid="textarea-writing-quick-paste-toefl"
                          />
                          <div className="flex gap-3">
                            <Button onClick={handleParseWritingPaste} disabled={!writingQuickPaste.trim()} className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                              텍스트 파싱
                            </Button>
                            <Button onClick={async () => {
                              if (!writingParsedPreview || !testTitle.trim()) return;
                              setIsProcessing(true);
                              try {
                                const q = { id: Date.now().toString(), questionType: "writing", writingType: "integrated", readingPassage: writingParsedPreview.reading, listeningScript: writingParsedPreview.listening, questionText: writingParsedPreview.question, writingTime, writingReadingTime };
                                const res = await apiRequest("POST", "/api/ai/generate-test-set", { title: testTitle.trim(), examType, section: "writing", difficulty: "medium", questionCount: 1, parsedQuestions: [q] });
                                if (!res.ok) throw new Error("테스트 생성 실패");
                                const result = await res.json();
                                toast({ title: "테스트 생성 완료!" });
                                invalidateTestCaches(queryClient);
                                setTimeout(() => setLocation(`/toefl-writing/${result.id}`), 2000);
                              } catch (error: any) { toast({ title: "오류", description: error.message, variant: "destructive" }); }
                              finally { setIsProcessing(false); }
                            }} disabled={!writingParsedPreview || isProcessing} className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                              <Sparkles className="h-5 w-5 mr-2" />테스트 생성
                            </Button>
                          </div>
                          {writingParseErrors.length > 0 && (
                            <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                              <h4 className="font-bold text-red-300 mb-2">⚠️ 파싱 오류</h4>
                              <ul className="list-disc list-inside text-sm text-red-200">{writingParseErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                            </div>
                          )}
                          {writingParsedPreview && (
                            <div className="p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-xl">
                              <h4 className="font-bold text-indigo-300 mb-3"><CheckCircle2 className="h-5 w-5 inline mr-2" />파싱 결과</h4>
                              <div className="space-y-2 text-sm">
                                <div><span className="text-indigo-400 font-semibold">Reading:</span> <span className="text-gray-300 line-clamp-2">{writingParsedPreview.reading}</span></div>
                                <div><span className="text-indigo-400 font-semibold">Listening:</span> <span className="text-gray-300 line-clamp-2">{writingParsedPreview.listening}</span></div>
                                <div><span className="text-indigo-400 font-semibold">Question:</span> <span className="text-gray-300">{writingParsedPreview.question}</span></div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Discussion Writing */
                        <div className="space-y-4">
                          <div className="p-4 bg-orange-900/30 border border-orange-500/30 rounded-xl">
                            <h3 className="font-bold text-orange-300 mb-2">📝 Discussion Writing Quick Paste</h3>
                            <div className="text-sm text-orange-200">
                              <div className="bg-black/30 p-2 rounded text-xs font-mono">
                                Professor: 질문...<br/>Student1: 응답1...<br/>Student2: 응답2...
                              </div>
                            </div>
                          </div>
                          <Textarea
                            value={discussionQuickPaste}
                            onChange={(e) => setDiscussionQuickPaste(e.target.value)}
                            placeholder="Professor:, Student 이름: 형식으로 입력..."
                            className="min-h-64 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            data-testid="textarea-discussion-quick-paste-toefl"
                          />
                          <div className="flex gap-3">
                            <Button onClick={handleParseDiscussionPaste} disabled={!discussionQuickPaste.trim()} className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                              텍스트 파싱
                            </Button>
                            <Button onClick={async () => {
                              if (!discussionParsedPreview || !testTitle.trim()) return;
                              setIsProcessing(true);
                              try {
                                const q = { id: Date.now().toString(), type: "discussion", questionType: "discussion", writingType: "discussion", topic: discussionParsedPreview.professorQuestion, professorQuestion: discussionParsedPreview.professorQuestion, studentResponses: discussionParsedPreview.studentResponses, writingTime };
                                const res = await apiRequest("POST", "/api/ai/generate-test-set", { title: testTitle.trim(), examType, section: "writing", difficulty: "medium", questionCount: 1, parsedQuestions: [q] });
                                if (!res.ok) throw new Error("테스트 생성 실패");
                                const result = await res.json();
                                toast({ title: "테스트 생성 완료!" });
                                invalidateTestCaches(queryClient);
                                setTimeout(() => setLocation(`/toefl-writing/${result.id}`), 2000);
                              } catch (error: any) { toast({ title: "오류", description: error.message, variant: "destructive" }); }
                              finally { setIsProcessing(false); }
                            }} disabled={!discussionParsedPreview || isProcessing} className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                              <Sparkles className="h-5 w-5 mr-2" />테스트 생성
                            </Button>
                          </div>
                          {discussionParseErrors.length > 0 && (
                            <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                              <h4 className="font-bold text-red-300 mb-2">⚠️ 파싱 오류</h4>
                              <ul className="list-disc list-inside text-sm text-red-200">{discussionParseErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                            </div>
                          )}
                          {discussionParsedPreview && (
                            <div className="p-4 bg-orange-900/30 border border-orange-500/30 rounded-xl">
                              <h4 className="font-bold text-orange-300 mb-3"><CheckCircle2 className="h-5 w-5 inline mr-2" />파싱 결과</h4>
                              <div className="space-y-2 text-sm">
                                <div><span className="text-orange-400 font-semibold">Professor:</span> <span className="text-gray-300">{discussionParsedPreview.professorQuestion}</span></div>
                                {discussionParsedPreview.studentResponses.map((s, i) => (
                                  <div key={i}><span className="text-orange-400 font-semibold">{s.name}:</span> <span className="text-gray-300 line-clamp-1">{s.response}</span></div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* TOEFL Reading / Listening - 웹폼 UI */
                    <>
                      {/* 지문 입력 */}
                      <div className="space-y-4 p-4 bg-blue-900/30 border border-blue-500/30 rounded-xl">
                        <h3 className="font-bold text-blue-300 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {currentSection === "listening" ? "Listening 스크립트 입력" : "Reading 지문 입력"}
                        </h3>
                        <Input
                          value={formPassageTitle}
                          onChange={(e) => setFormPassageTitle(e.target.value)}
                          placeholder="지문 제목"
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          data-testid="input-passage-title-toefl"
                        />
                        <Textarea
                          value={currentSection === "listening" ? formNarration : formPassageContent}
                          onChange={(e) => currentSection === "listening" ? setFormNarration(e.target.value) : setFormPassageContent(e.target.value)}
                          placeholder={currentSection === "listening" ? "Listening 스크립트를 입력하세요..." : "Reading 지문을 입력하세요..."}
                          className="min-h-48 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          data-testid="textarea-passage-content-toefl"
                        />
                      </div>

                      {/* Quick Paste 영역 */}
                      <div className="space-y-4 p-4 bg-purple-900/30 border border-purple-500/30 rounded-xl">
                        <h3 className="font-bold text-purple-300">⚡ Quick Paste - 문제 빠르게 추가</h3>
                        <Textarea
                          value={quickPasteText}
                          onChange={(e) => setQuickPasteText(e.target.value)}
                          placeholder={"1. 질문 내용\nA. 옵션1\nB. 옵션2\n정답: A\n\n2. 다음 질문..."}
                          className="min-h-40 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          data-testid="textarea-quick-paste-toefl"
                        />
                        <Button onClick={handleQuickPaste} disabled={!quickPasteText.trim()} className="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                          문제 파싱하여 추가
                        </Button>
                      </div>

                      {/* 문제 목록 */}
                      <div className="space-y-3 p-4 bg-purple-900/30 rounded-xl border border-purple-500/30">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-purple-300 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            문제 목록
                          </h3>
                          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                            {formQuestions.length}개
                          </span>
                        </div>
                        {formQuestions.length === 0 ? (
                          <div className="p-6 bg-black/30 rounded-lg border-2 border-dashed border-purple-500/30 text-center">
                            <p className="text-slate-300 text-sm">아직 추가된 문제가 없습니다. Quick Paste로 문제를 추가해주세요.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {formQuestions.map((q, index) => (
                              <div key={q.id} className="p-3 bg-black/30 rounded-lg border border-purple-500/20">
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex-1">
                                    <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded text-xs">문제 {index + 1}</span>
                                    <p className="text-sm text-white mt-1">{q.questionText}</p>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => handleRemoveQuestion(q.id)} className="text-red-400 hover:text-red-300">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button onClick={handleCreateFromForm} disabled={isProcessing || formQuestions.length === 0} className="w-full h-16 bg-gradient-to-r from-purple-600 to-indigo-600 text-white" data-testid="button-create-toefl-test">
                        <Sparkles className="h-6 w-6 mr-2" />
                        {isProcessing ? "생성 중..." : "테스트 생성"}
                      </Button>
                    </>
                  )}
                </div>
              ) : examType === "gre" && currentSection === "quant" ? (
                /* GRE Quantitative Reasoning - AI 자동 생성만 표시 (탭 없음) */
                <div className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-xl">
                    <h3 className="font-bold text-indigo-300 mb-3 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-400" />
                      GRE Quantitative Reasoning AI 자동 생성
                    </h3>
                    <p className="text-sm text-indigo-200 mb-4">
                      2025 GRE 공식 포맷에 맞는 문제를 AI가 자동으로 생성합니다. 
                      차트, 그래프 기반 Data Interpretation 문제도 포함됩니다.
                    </p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <Label className="text-indigo-300 text-xs">난이도</Label>
                        <Select 
                          value={greQuantDifficulty} 
                          onValueChange={(v) => setGreQuantDifficulty(v as 'easy' | 'medium' | 'hard')}
                        >
                          <SelectTrigger className="bg-slate-800 border-indigo-500/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">쉬움</SelectItem>
                            <SelectItem value="medium">보통</SelectItem>
                            <SelectItem value="hard">어려움</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-indigo-300 text-xs">문제 수</Label>
                        <Select 
                          value={String(greQuantQuestionCount)} 
                          onValueChange={(v) => setGreQuantQuestionCount(Number(v))}
                        >
                          <SelectTrigger className="bg-slate-800 border-indigo-500/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="6">6문제</SelectItem>
                            <SelectItem value="12">12문제</SelectItem>
                            <SelectItem value="15">15문제 (실전)</SelectItem>
                            <SelectItem value="20">20문제</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={handleGreQuantAutoGenerate}
                          disabled={isGeneratingGreQuant}
                          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
                          data-testid="button-gre-quant-auto-generate"
                        >
                          {isGeneratingGreQuant ? (
                            <>
                              <span className="animate-spin mr-2">⟳</span>
                              생성 중...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI 생성
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-indigo-300/70">
                      ✓ Quantitative Comparison (40%) ✓ Multiple Choice (30%) ✓ Numeric Entry (12%) ✓ Data Interpretation (18%)
                    </div>
                  </div>
                  
                  <div className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                    <h4 className="font-medium text-purple-300 mb-2">💡 GRE Quantitative Reasoning</h4>
                    <p className="text-sm text-purple-200">
                      수학 기호, 방정식, 차트/그래프를 포함한 복잡한 문제 유형 때문에 
                      AI 자동 생성만 지원됩니다. 위 옵션을 선택하고 'AI 생성' 버튼을 클릭하세요.
                    </p>
                  </div>
                </div>
              ) : examType === "sat" && currentSection === "math" ? (
                /* SAT Math - AI 자동 생성만 표시 (탭 없음) */
                <div className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-rose-900/40 to-red-900/40 border border-rose-500/30 rounded-xl">
                    <h3 className="font-bold text-rose-300 mb-3 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-400" />
                      SAT Math AI 자동 생성
                    </h3>
                    <p className="text-sm text-rose-200 mb-4">
                      2024-2025 Digital SAT 공식 포맷에 맞는 문제를 AI가 자동으로 생성합니다.
                      Algebra, Advanced Math, Problem Solving, Geometry & Trigonometry 4개 영역을 포함합니다.
                    </p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <Label className="text-rose-300 text-xs">난이도</Label>
                        <Select 
                          value={satMathDifficulty} 
                          onValueChange={(v) => setSatMathDifficulty(v as 'easy' | 'medium' | 'hard')}
                        >
                          <SelectTrigger className="bg-slate-800 border-rose-500/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">쉬움</SelectItem>
                            <SelectItem value="medium">보통</SelectItem>
                            <SelectItem value="hard">어려움</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-rose-300 text-xs">문제 수</Label>
                        <Select 
                          value={String(satMathQuestionCount)} 
                          onValueChange={(v) => setSatMathQuestionCount(Number(v))}
                        >
                          <SelectTrigger className="bg-slate-800 border-rose-500/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10문제</SelectItem>
                            <SelectItem value="22">22문제 (1모듈)</SelectItem>
                            <SelectItem value="30">30문제</SelectItem>
                            <SelectItem value="44">44문제 (실전)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={handleSatMathAutoGenerate}
                          disabled={isGeneratingSatMath}
                          className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white"
                          data-testid="button-sat-math-auto-generate"
                        >
                          {isGeneratingSatMath ? (
                            <>
                              <span className="animate-spin mr-2">⟳</span>
                              생성 중...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI 생성
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-rose-300/70">
                      ✓ Algebra (35%) ✓ Advanced Math (35%) ✓ Problem Solving (15%) ✓ Geometry & Trig (15%) | ~75% Multiple Choice + ~25% Grid-In
                    </div>
                  </div>
                  
                  <div className="p-4 bg-rose-900/20 border border-rose-500/20 rounded-xl">
                    <h4 className="font-medium text-rose-300 mb-2">💡 SAT Math (Digital 2024-2025)</h4>
                    <p className="text-sm text-rose-200">
                      수학 기호, 방정식, 그래프를 포함한 복잡한 문제 유형 때문에 
                      AI 자동 생성만 지원됩니다. 위 옵션을 선택하고 'AI 생성' 버튼을 클릭하세요.
                      계산기는 모든 문제에서 사용 가능합니다 (Desmos 내장).
                    </p>
                  </div>
                </div>
              ) : examType === "gre" && currentSection === "verbal" ? (
                /* GRE Verbal - 텍스트 파싱만 */
                <div className="space-y-6 mt-6">
                  <div className="p-4 bg-blue-900/30 border border-blue-500/30 rounded-xl">
                    <h3 className="font-bold text-blue-300 mb-2 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      GRE Verbal Reasoning 텍스트 파싱 형식
                    </h3>
                    <div className="text-sm text-blue-200 space-y-2">
                      <p><strong>✅ 지원하는 문제 유형 (어떤 순서로도 가능):</strong></p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li><strong>Reading Comprehension:</strong> "Questions X to Y are based on the following reading passage" 형식</li>
                        <li><strong>Text Completion:</strong> "Blank (i)", "Blank (ii)" 형식 또는 1개 빈칸</li>
                        <li><strong>Sentence Equivalence:</strong> "select the two answer choices" 형식 (6개 무라벨 선택지)</li>
                      </ul>
                      <p className="mt-2 text-blue-300">📋 GRE 공식 시험 텍스트를 그대로 붙여넣으세요. 섹션 헤더와 문제 순서를 자동으로 파싱합니다.</p>
                    </div>
                  </div>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={"GRE Verbal Reasoning 문제를 입력하세요.\n\n지원 형식:\n• Question 1 또는 Q1 (둘 다 가능)\n• SECTION N | 헤더는 자동으로 무시됩니다\n• For each blank select one entry... 전역 지시문 지원\n\n예시 1 (Question 형식):\nFor Questions 1 to 4, select two answer choices...\nQuestion 1\n[질문 내용]\n[선택지1]\n...\n\n예시 2 (Q 형식):\nFor each blank select one entry from the corresponding column of choices.\nQ1\n[질문 내용]\nA. 선택지1\nB. 선택지2\n\nQuestions 5 to 8 are based on the following reading passage.\n[지문 내용]\nQuestion 5\n[질문 내용]\nA. ...\nB. ..."}
                    className="min-h-64 text-lg border-2 border-slate-200 rounded-xl"
                    data-testid="textarea-content"
                  />
                  <Button
                    onClick={handleGenerateTest}
                    disabled={isProcessing}
                    className="w-full h-16 text-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    data-testid="button-generate-test"
                  >
                    <Sparkles className="h-6 w-6 mr-2" />
                    {isProcessing ? "생성 중..." : "테스트 생성하기"}
                  </Button>
                </div>
              ) : (
                /* 기타 섹션 - 3개 탭 (텍스트 파싱, 엑셀, 웹폼) */
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text">텍스트 파싱</TabsTrigger>
                  <TabsTrigger value="excel">엑셀</TabsTrigger>
                  <TabsTrigger value="form">웹 폼</TabsTrigger>
                </TabsList>

                <Suspense fallback={null}>
                  <DeferredAITestCreatorInputTabs
                    content={content}
                    setContent={setContent}
                    isProcessing={isProcessing}
                    handleGenerateTest={handleGenerateTest}
                    handleDownloadTemplate={handleDownloadTemplate}
                    handleExcelUpload={handleExcelUpload}
                    fileInputRef={fileInputRef}
                    excelFile={excelFile}
                    parsedQuestions={parsedQuestions}
                    excelErrors={excelErrors}
                    passageTitle={passageTitle}
                    passageContent={passageContent}
                    handleCreateFromExcel={handleCreateFromExcel}
                  />
                </Suspense>

                {/* 웹 폼 탭 */}
                <Suspense fallback={null}>
                  <DeferredAITestCreatorFormTab
                    currentSection={currentSection}
                    isProcessing={isProcessing}
                    speakingType={speakingType}
                    setSpeakingType={setSpeakingType}
                    speakingTask={speakingTask}
                    setSpeakingTask={setSpeakingTask}
                    speakingQuestion={speakingQuestion}
                    setSpeakingQuestion={setSpeakingQuestion}
                    preparationTime={preparationTime}
                    setPreparationTime={setPreparationTime}
                    responseTime={responseTime}
                    setResponseTime={setResponseTime}
                    speakingQuickPaste={speakingQuickPaste}
                    setSpeakingQuickPaste={setSpeakingQuickPaste}
                    handleParseSpeakingPaste={handleParseSpeakingPaste}
                    speakingParseErrors={speakingParseErrors}
                    speakingParsedPreview={speakingParsedPreview}
                    handleApplyParsedSpeaking={handleApplyParsedSpeaking}
                    writingType={writingType}
                    setWritingType={setWritingType}
                    writingQuickPaste={writingQuickPaste}
                    setWritingQuickPaste={setWritingQuickPaste}
                    handleParseWritingPaste={handleParseWritingPaste}
                    writingParseErrors={writingParseErrors}
                    writingParsedPreview={writingParsedPreview}
                    handleApplyParsedWriting={handleApplyParsedWriting}
                    discussionQuickPaste={discussionQuickPaste}
                    setDiscussionQuickPaste={setDiscussionQuickPaste}
                    handleParseDiscussionPaste={handleParseDiscussionPaste}
                    discussionParseErrors={discussionParseErrors}
                    discussionParsedPreview={discussionParsedPreview}
                    handleApplyParsedDiscussion={handleApplyParsedDiscussion}
                    formPassageTitle={formPassageTitle}
                    setFormPassageTitle={setFormPassageTitle}
                    formPassageContent={formPassageContent}
                    setFormPassageContent={setFormPassageContent}
                    formNarration={formNarration}
                    setFormNarration={setFormNarration}
                    quickPasteText={quickPasteText}
                    setQuickPasteText={setQuickPasteText}
                    handleQuickPaste={handleQuickPaste}
                    currentQuestion={currentQuestion}
                    setCurrentQuestion={setCurrentQuestion}
                    handleAddQuestion={handleAddQuestion}
                    formQuestions={formQuestions}
                    handleRemoveQuestion={handleRemoveQuestion}
                    handleCreateFromForm={handleCreateFromForm}
                  />
                </Suspense>
              </Tabs>
              )}
            </div>

            {/* 진행상황 표시 */}
            {isProcessing && (
              <div className="space-y-4 p-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-purple-300">진행 상황</span>
                  <span className="text-sm text-purple-200">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-purple-600 text-center">{processingStage}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
