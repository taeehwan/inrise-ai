import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, useSearch, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Clock, BookOpen, FileText, CheckCircle, Sparkles, Play, Lightbulb, AlertCircle, CheckCircle2, XCircle, X, Loader2, GraduationCap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { NewToeflLayout, NewToeflLoadingState, NewToeflIntroHeader } from "@/components/NewToeflLayout";
import { useTheme } from "@/components/theme-provider";
import {
  NewToeflReadingLoadingFallback,
  type BlankSegment,
  type QuestionType,
  type ReadingExplanation,
  type ReadingQuestion,
} from "@/components/new-toefl-reading/shared";

const DeferredNewToeflReadingCompleteWordsTab = lazy(
  () => import("@/components/new-toefl-reading/NewToeflReadingCompleteWordsTab"),
);
const DeferredNewToeflReadingChoiceTab = lazy(
  () => import("@/components/new-toefl-reading/NewToeflReadingChoiceTab"),
);

const sampleCompleteWordsPassage = `The university lib___y offers a wide range of res___ces for students. Whether you need to acc___s academic jour___s or find quiet study sp___s, the facilities are designed to sup___t your learning needs.`;

const sampleComprehensionPassage = `Campus Housing Notice

All students living in dormitories must complete their room selection for the upcoming semester by March 15th. Priority will be given based on credit hours and previous housing history. 

Students who wish to remain in their current rooms should submit the Room Retention Form through the housing portal. Those seeking to change rooms or buildings must participate in the general selection process.

Please note that meal plan adjustments can be made during the first two weeks of the semester.`;

const sampleAcademicPassage = `The development of photosynthesis was perhaps the most significant event in the history of life on Earth. This process, by which organisms convert light energy into chemical energy, fundamentally transformed the planet's atmosphere and enabled the evolution of complex life forms.

Photosynthesis first evolved in cyanobacteria approximately 2.4 billion years ago during the Great Oxidation Event. These microscopic organisms began producing oxygen as a byproduct of their metabolic processes, gradually increasing atmospheric oxygen levels from virtually zero to approximately 21 percent today.

The implications of this shift were profound. The accumulation of oxygen in the atmosphere created the ozone layer, which shields the Earth's surface from harmful ultraviolet radiation. This protection allowed life to eventually colonize land surfaces.`;

const comprehensionQuestions = [
  {
    id: 1,
    question: "What is the deadline for room selection?",
    options: ["March 1st", "March 15th", "March 30th", "April 1st"],
    correctAnswer: 1
  }
];

const academicQuestions = [
  {
    id: 1,
    question: "According to the passage, when did photosynthesis first evolve?",
    options: [
      "Approximately 4.5 billion years ago",
      "Approximately 2.4 billion years ago",
      "Approximately 1 billion years ago",
      "Approximately 500 million years ago"
    ],
    correctAnswer: 1
  }
];

const cleanPassageText = (passage: string): string => {
  if (!passage) return '';

  let text = passage;

  text = text.replace(/(?:\s*(?:Which|What|How|Why|Where|When|Who|According to|The word|It can be inferred|In paragraph|Select the|Look at the|Directions:)[^●]*\?\s*)(●[^●]+){3,}/gi, '');

  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const isQuestionLine = /^(?:\d+[\.\)]\s*)?(?:Which|What|How|Why|Where|When|Who|According|The word|It can|In paragraph|Select|Look at|Directions)/i.test(line) && line.endsWith('?');

    if (isQuestionLine) {
      const remaining = lines.slice(i + 1);
      const optionCount = remaining.filter(l => /^\s*(?:[A-D][\.\)]|●|○)\s+/.test(l)).length;
      if (optionCount >= 3) {
        break;
      }
    }

    if (/^\s*(?:[A-D][\.\)])\s+/.test(line)) {
      const nearbyLines = lines.slice(Math.max(0, i - 3), i);
      const hasQuestionBefore = nearbyLines.some(l => l.trim().endsWith('?'));
      if (hasQuestionBefore) continue;
    }

    cleanedLines.push(lines[i]);
  }

  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

// Format email passages with proper line breaks for headers
const formatEmailPassage = (passage: string): string => {
  if (!passage) return '';
  
  // Detect if passage is an email format (contains To:, From:, Subject: on same line)
  // Use lookahead for Date to capture everything until "Subject:"
  const emailHeaderPattern = /(To:\s*\S+@\S+)\s+(From:\s*\S+@\S+)\s+(Date:.*?)(?=\s+Subject:)\s+(Subject:[^\n]+)/i;
  const match = passage.match(emailHeaderPattern);
  
  if (match) {
    // Split headers onto separate lines
    const toLine = match[1].trim();
    const fromLine = match[2].trim();
    const dateLine = match[3].trim();
    const subjectLine = match[4].trim();
    
    // Get the rest of the content after the headers
    const headerEnd = match.index! + match[0].length;
    const bodyContent = passage.substring(headerEnd).trim();
    
    // Reconstruct with proper line breaks
    return `${toLine}\n${fromLine}\n${dateLine}\n${subjectLine}\n\n${bodyContent}`;
  }
  
  return passage;
};

export default function NewTOEFLReading() {
  const params = useParams<{ testId?: string }>();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const testId = params.testId || new URLSearchParams(searchString).get('testId');
  const isFullTestMode = new URLSearchParams(searchString).get('fullTest') === 'true';
  const fullTestAttemptId = new URLSearchParams(searchString).get('attemptId');
  
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [submissionSaved, setSubmissionSaved] = useState(false);
  const [currentSection, setCurrentSection] = useState<QuestionType>("complete-words");
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [comprehensionQuestionIndex, setComprehensionQuestionIndex] = useState(0);
  const [academicQuestionIndex, setAcademicQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAnswerOnly, setShowAnswerOnly] = useState(false);
  const [explanation, setExplanation] = useState<ReadingExplanation | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [loadedQuestions, setLoadedQuestions] = useState<any[]>([]);
  const [completeWordsInputs, setCompleteWordsInputs] = useState<string[]>([]);
  const [showCompleteWordsAnswers, setShowCompleteWordsAnswers] = useState(false);
  const [isLoadingCompleteWordsAnswers, setIsLoadingCompleteWordsAnswers] = useState(false);
  const [aiSolvedCompleteWords, setAiSolvedCompleteWords] = useState<{ answers: string[], explanation: string } | null>(null);
  const [fontSize, setFontSize] = useState(100); // percent: 80~130
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { logTestStart, logAIUsage } = useActivityTracker();
  const testStartTimeRef = useRef<number>(0);
  
  const { data: testData, isLoading: isLoadingTest } = useQuery<{ questions?: any[]; title?: string; passages?: any[] }>({
    queryKey: ['/api/tests', testId],
    enabled: !!testId,
  });
  
  const cleanQuestionText = (text: string, passage: string): string => {
    if (!text) return '';
    if (text.length < 300) return text;
    if (passage && text.includes(passage.substring(0, 50))) {
      const cleaned = text.replace(passage, '').trim();
      if (cleaned.length > 0) return cleaned;
    }
    if (text.length > 400) {
      const paras = text.split(/\n\n+/);
      if (paras.length > 1) {
        const lastPara = paras[paras.length - 1].trim();
        if (lastPara.length < 350) {
          const isQuestion = lastPara.endsWith('?') ||
            /^(?:What|Which|How|Why|Where|When|Who|According|To evaluate|To assess|To determine|To analyze|Identify|Select|Choose|Based|It can)/i.test(lastPara);
          if (isQuestion) return lastPara;
        }
      }
    }
    const questionPattern = /(?:^|\n)((?:Which|What|How|Why|Where|When|Who|According|The word|It can|In paragraph|Select|Look at|Directions|To evaluate|To assess|To determine|To analyze|Identify|Choose|Based)[^\n]*\??)/ig;
    const allMatches = [...text.matchAll(questionPattern)];
    if (allMatches.length > 0) {
      const lastMatch = allMatches[allMatches.length - 1];
      const candidate = lastMatch[1].trim();
      if (candidate.length < 350) return candidate;
    }
    const allText = text.replace(/\n/g, ' ');
    const sentences = allText.split(/(?<=[.!?])\s+(?=[A-Z])/);
    const shortQuestions = sentences.filter(s =>
      s.trim().length > 10 && s.trim().length < 350 &&
      (s.trim().endsWith('?') || /^(?:To evaluate|To assess|To determine|To analyze|Identify|Select|Choose)/i.test(s.trim()))
    );
    if (shortQuestions.length > 0) return shortQuestions[shortQuestions.length - 1].trim();
    return text.length > 200 ? text.substring(text.length - 200).trim() : text;
  };

  const normalizeQuestions = (questions: any[]): any[] => {
    if (!questions || questions.length === 0) return [];
    
    const hasStandardTypes = questions.some((q: any) => q.type && ['complete-words', 'comprehension', 'academic'].includes(q.type));
    if (hasStandardTypes) {
      const academicQuestions = questions.filter((q: any) => q.type === 'academic');
      const longestAcademicPassage = academicQuestions.reduce((longest: string, q: any) => {
        const p = q.passage || '';
        return p.length > longest.length ? p : longest;
      }, '');

      return questions.map((q: any) => {
        const rawQuestion = q.question || q.questionText || '';
        let passage = q.passage || '';
        if (q.type === 'academic' && passage.length < 200 && longestAcademicPassage.length > 200) {
          passage = longestAcademicPassage;
        }
        return {
          ...q,
          passage,
          question: cleanQuestionText(rawQuestion, passage),
        };
      });
    }
    
    const needsNormalization = questions.some((q: any) => 
      q.questionType || q.questionText || 
      (q.type && !['complete-words', 'comprehension', 'academic'].includes(q.type))
    );
    if (!needsNormalization) return questions;
    
    const longestPassage = questions.reduce((longest: string, q: any) => {
      const p = q.passage || '';
      return p.length > longest.length ? p : longest;
    }, '');
    const isLongAcademicPassage = longestPassage.length > 500;
    
    return questions.map((q: any, idx: number) => {
      const rawQuestionText = q.questionText || q.question || '';
      const qType = q.questionType || q.type || '';
      
      let sectionType: QuestionType;
      if (qType === 'insertion' || qType === 'summary' || qType === 'select-all' || qType === 'select-sentence') {
        sectionType = 'academic';
      } else if (isLongAcademicPassage) {
        sectionType = 'academic';
      } else {
        sectionType = 'comprehension';
      }
      
      let qPassage = q.passage || '';
      if (sectionType === 'academic' && qPassage.length < 200 && longestPassage.length > 200) {
        qPassage = longestPassage;
      }

      return {
        ...q,
        type: sectionType,
        question: cleanQuestionText(rawQuestionText, qPassage),
        passage: qPassage,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
      };
    });
  };

  useEffect(() => {
    if (testData && testData.questions) {
      const passageMap: Record<string, string> = {};
      if (Array.isArray(testData.passages)) {
        for (const p of testData.passages) {
          if (p.id && p.content) passageMap[p.id] = p.content;
        }
      }
      const questionsWithPassage = testData.questions.map((q: any) => {
        if (q.passageId && passageMap[q.passageId] && !q.passage) {
          return { ...q, passage: passageMap[q.passageId] };
        }
        return q;
      });
      const normalized = normalizeQuestions(questionsWithPassage);
      setLoadedQuestions(normalized);
      
      const hasCompleteWords = normalized.some((q: any) => q.type === 'complete-words');
      const hasComprehension = normalized.some((q: any) => q.type === 'comprehension');
      const hasAcademic = normalized.some((q: any) => q.type === 'academic');
      
      if (!hasCompleteWords) {
        if (hasComprehension) {
          setCurrentSection('comprehension');
        } else if (hasAcademic) {
          setCurrentSection('academic');
        }
      }
    }
  }, [testData]);

  useEffect(() => {
    if (isStarted && !testStartTimeRef.current) {
      testStartTimeRef.current = Date.now();
      logTestStart('toefl_reading', testId || 'unknown');
    }
  }, [isStarted, testId]);

  const saveTestSubmission = async () => {
    if (!user?.id || !testId || submissionSaved) return;
    try {
      const timeSpent = testStartTimeRef.current > 0
        ? Math.round((Date.now() - testStartTimeRef.current) / 60000) || 1
        : 1;
      const allAnswers = { ...answers };
      const filledBlanks = completeWordsInputs.filter(v => v.length > 0).length;
      const answeredQuestions = Object.keys(answers).length;
      const totalScore = filledBlanks + answeredQuestions;
      await apiRequest("POST", "/api/test-attempts", {
        userId: user.id,
        testId: testId,
        totalScore: totalScore,
        sectionScores: { section: "reading", examType: "new-toefl", answers: allAnswers, completeWordsInputs: completeWordsInputs },
        timeSpent: timeSpent,
        status: "completed"
      });
      setSubmissionSaved(true);
    } catch (error) {
      console.error("Failed to save test submission:", error);
    }
  };

  const handleFullTestSectionComplete = async () => {
    await saveTestSubmission();
    const totalQuestions = activeCompleteWordsBlanks.length + activeComprehensionQuestions.length + activeAcademicQuestions.length;
    const answeredCount = completeWordsInputs.filter(v => v.length > 0).length + Object.keys(answers).length;
    const rawScore = totalQuestions > 0 ? (answeredCount / totalQuestions) : 0;
    const sectionScore = Math.max(1, Math.min(6, rawScore * 6)).toFixed(1);
    const params: Record<string, string> = { section: 'reading', score: sectionScore };
    if (fullTestAttemptId) params.attemptId = fullTestAttemptId;
    setLocation('/new-toefl/full-test?' + new URLSearchParams(params).toString());
  };

  useEffect(() => {
    return () => {
      if (user?.id && testId && !submissionSaved && testStartTimeRef.current > 0) {
        const hasAnswers = Object.keys(answers).length > 0 || completeWordsInputs.some(v => v.length > 0);
        if (hasAnswers) {
          const timeSpent = Math.round((Date.now() - testStartTimeRef.current) / 60000);
          fetch('/api/test-attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              userId: user.id,
              testId: testId,
              sectionScores: { section: "reading", examType: "new-toefl", answers, completeWordsInputs, partial: true },
              timeSpent: timeSpent || 1,
              status: "completed"
            })
          }).catch(() => {});
        }
      }
    };
  }, []);

  const getQuestionsByType = (type: QuestionType) => {
    return loadedQuestions.filter((q: any) => q.type === type);
  };
  
  // Get passage and questions for each section
  const completeWordsData = getQuestionsByType('complete-words');
  const comprehensionData = getQuestionsByType('comprehension');
  const academicData = getQuestionsByType('academic');
  
  // Use loaded data if available, otherwise fall back to samples
  // Also extract [ANSWER] section from passage if present
  const rawCompleteWordsPassage = completeWordsData.length > 0 
    ? completeWordsData[0].passage 
    : sampleCompleteWordsPassage;
  
  // Extract answers from [ANSWER] line if present in passage
  const extractedAnswersFromPassage: string[] = (() => {
    if (!rawCompleteWordsPassage) return [];
    const answerMatch = rawCompleteWordsPassage.match(/\[ANSWER\]\s*\n?(.+)/i);
    if (answerMatch && answerMatch[1]) {
      return answerMatch[1].split(',').map((a: string) => a.trim()).filter((a: string) => a.length > 0);
    }
    return [];
  })();
  
  // Clean passage by removing [ANSWER] section
  const activeCompleteWordsPassage = rawCompleteWordsPassage 
    ? rawCompleteWordsPassage.replace(/\[ANSWER\]\s*\n?.+$/i, '').trim()
    : rawCompleteWordsPassage;
  
  // Get blanks/answers metadata for complete-words
  // Support multiple data formats:
  // 1. blanks[].answer (from admin panel)
  // 2. answers[].missingLetters (from AI generation)
  // 3. answers[] as string array (fallback)
  const activeCompleteWordsBlanks = completeWordsData.length > 0 
    ? (completeWordsData[0].blanks || [])
    : [];
  
  const activeCompleteWordsAnswers: string[] = (() => {
    if (completeWordsData.length === 0) {
      return ['rary', 'our', 'ess', 'nal', 'ace', 'por'];
    }
    
    const data = completeWordsData[0];
    
    // Priority 1: blanks[].answer format (check for non-empty answers)
    if (activeCompleteWordsBlanks.length > 0) {
      const answers = activeCompleteWordsBlanks.map((b: any) => b.answer || b.missingLetters || '');
      // Only return if we have at least one non-empty answer
      if (answers.some((a: string) => a.length > 0)) {
        return answers;
      }
    }
    
    // Priority 2: answers[].missingLetters format (from AI generation)
    if (data.answers && Array.isArray(data.answers) && data.answers.length > 0) {
      const firstAnswer = data.answers[0];
      if (typeof firstAnswer === 'object' && firstAnswer.missingLetters) {
        return data.answers.map((a: any) => a.missingLetters || '');
      }
      // Priority 3: answers[] as direct string array
      if (typeof firstAnswer === 'string') {
        return data.answers;
      }
    }
    
    // Priority 4: answers extracted from [ANSWER] section in passage
    if (extractedAnswersFromPassage.length > 0) {
      return extractedAnswersFromPassage;
    }
    
    // Fallback: empty array - blankLength will be derived from passage underscores
    return [];
  })();
  
  // Get blank lengths from metadata (for when answers are empty but blankLength is available)
  const activeCompleteWordsBlanksLengths: number[] = (() => {
    if (activeCompleteWordsBlanks.length > 0) {
      return activeCompleteWordsBlanks.map((b: any) => {
        // Check multiple possible length fields
        if (typeof b.blankLength === 'number' && b.blankLength > 0) return b.blankLength;
        if (typeof b.length === 'number' && b.length > 0) return b.length;
        if (b.answer && b.answer.length > 0) return b.answer.length;
        if (b.missingLetters && b.missingLetters.length > 0) return b.missingLetters.length;
        return 0; // Will fallback to underscore pattern
      });
    }
    return [];
  })();
  
  // Parse blanks from passage using regex pattern (matches "word___" or "___")
  // Returns segments: each segment represents text followed by a blank (hasBlank=true) or trailing text (hasBlank=false)
  const parseCompleteWordsBlanks = (passage: string, storedBlanks?: any[]): BlankSegment[] => {
    const segments: BlankSegment[] = [];
    // Enhanced pattern to match various blank formats:
    // - "me___" or "me_____" (prefix + continuous underscores)
    // - "me _ _ _" or "me_ _ _" (prefix + space-separated underscores)
    // - "___" or "_ _ _" (standalone underscores)
    // - "co-op___" or "don't___" (hyphenated/apostrophe hints)
    // - Also handles numbered markers like [1], [2] after underscores
    // Pattern: optional letters (including hyphens/apostrophes), optional space, then underscores
    const blankPattern = /([a-zA-Z][a-zA-Z'-]*)?\s*((?:_\s*)+)(?:\s*\[\d+\])?/g;
    let lastIndex = 0;
    let match;
    let blankIdx = 0;
    
    while ((match = blankPattern.exec(passage)) !== null) {
      const textBefore = passage.substring(lastIndex, match.index);
      const hint = match[1] || ''; // Letters before the blank
      const underscoreSequence = match[2]; // The underscore sequence (may include spaces)
      
      // Count actual underscore characters to determine blank length
      // Each underscore = 1 letter to fill (regardless of spacing)
      const underscoreCount = (underscoreSequence.match(/_/g) || []).length;
      
      // Priority: Use stored blankLength from database if available
      // Otherwise use underscore count from passage pattern
      let blankLength: number;
      const storedBlank = storedBlanks && storedBlanks[blankIdx];
      
      if (storedBlank && typeof storedBlank.blankLength === 'number' && storedBlank.blankLength > 0) {
        // Priority 1: explicit blankLength field from database
        blankLength = storedBlank.blankLength;
      } else if (storedBlank && storedBlank.answer && storedBlank.answer.length > 0) {
        // Priority 2: use answer length from stored data
        blankLength = storedBlank.answer.length;
      } else if (storedBlank && storedBlank.missingLetters && storedBlank.missingLetters.length > 0) {
        // Priority 3: use missingLetters length from stored data
        blankLength = storedBlank.missingLetters.length;
      } else {
        // Fallback: count underscores from passage pattern (each _ = 1 letter)
        blankLength = underscoreCount > 0 ? underscoreCount : 3; // Default minimum of 3 if no underscores detected
      }
      
      lastIndex = match.index + match[0].length;
      segments.push({ text: textBefore, hint, hasBlank: true, blankLength });
      blankIdx++;
    }
    
    // Add remaining text after last blank (no blank to fill)
    const remainingText = passage.substring(lastIndex);
    if (remainingText || segments.length === 0) {
      segments.push({ text: remainingText, hint: '', hasBlank: false, blankLength: 0 });
    }
    
    return segments;
  };
  
  const completeWordsParts = parseCompleteWordsBlanks(activeCompleteWordsPassage, activeCompleteWordsBlanks);
  const blankSegments = completeWordsParts.filter(p => p.hasBlank);
  
  // Authoritative blank count: prefer metadata count over regex-derived count
  // This ensures legacy data with blanks[] but no underscore patterns works correctly
  const blankCount = activeCompleteWordsBlanks.length > 0 
    ? activeCompleteWordsBlanks.length 
    : blankSegments.length;
  
  // Create a unique cache key for the current passage/blanks/language combination
  // Include full passage hash for uniqueness even when same opening text
  const getPassageHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };
  
  // passageContextKey: for input/answer reset - only when passage content or blanks change
  const passageContextKey = `${getPassageHash(activeCompleteWordsPassage || '')}-${blankCount}-${testId || 'default'}`;
  // aiCacheKey: for AI explanation cache - includes language for localized explanations
  const aiCacheKey = `${passageContextKey}-${language}`;
  
  const [prevPassageContextKey, setPrevPassageContextKey] = useState<string>('');
  const [prevAiCacheKey, setPrevAiCacheKey] = useState<string>('');
  const aiCacheKeyRef = useRef<string>(aiCacheKey);
  
  // Keep ref in sync with aiCacheKey
  useEffect(() => {
    aiCacheKeyRef.current = aiCacheKey;
  }, [aiCacheKey]);
  
  // Reset inputs only when passage content or blanks change (NOT on language change)
  useEffect(() => {
    if (passageContextKey !== prevPassageContextKey) {
      setCompleteWordsInputs(new Array(blankCount).fill(''));
      setShowCompleteWordsAnswers(false);
      setAiSolvedCompleteWords(null);
      setIsLoadingCompleteWordsAnswers(false);
      setPrevPassageContextKey(passageContextKey);
      setPrevAiCacheKey(aiCacheKey);
    }
  }, [passageContextKey, blankCount, prevPassageContextKey]);
  
  // Reset AI cache on language change (but preserve user inputs)
  useEffect(() => {
    if (aiCacheKey !== prevAiCacheKey && passageContextKey === prevPassageContextKey) {
      setAiSolvedCompleteWords(null); // Re-fetch AI explanations in new language
      setIsLoadingCompleteWordsAnswers(false);
      setPrevAiCacheKey(aiCacheKey);
    }
  }, [aiCacheKey, prevAiCacheKey, passageContextKey, prevPassageContextKey]);
  
  // Map from segment index to blank index for input tracking
  const getBlankIndex = (segmentIndex: number): number => {
    let blankIdx = 0;
    for (let i = 0; i < segmentIndex; i++) {
      if (completeWordsParts[i]?.hasBlank) blankIdx++;
    }
    return blankIdx;
  };
  
  const handleCompleteWordsInput = (index: number, value: string) => {
    setCompleteWordsInputs(prev => {
      const newInputs = [...prev];
      newInputs[index] = value;
      return newInputs;
    });
  };
  
  // Helper to normalize correctAnswer to numeric index
  const normalizeCorrectAnswer = (answer: any): number => {
    if (typeof answer === 'number') return answer;
    if (typeof answer === 'string') {
      const letterMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      return letterMap[answer.toUpperCase()] ?? 0;
    }
    return 0;
  };
  
  // Helper function to find the passage for a given question index
  // Looks backward from the current index to find the most recent question with a passage defined
  const findPassageForQuestion = (data: any[], questionIndex: number, fallbackPassage: string): string => {
    if (data.length === 0) return fallbackPassage;
    
    // First check if current question has its own passage
    if (data[questionIndex]?.passage) {
      return data[questionIndex].passage;
    }
    
    // Otherwise look backward to find the most recent question with a passage
    for (let i = questionIndex - 1; i >= 0; i--) {
      if (data[i]?.passage) {
        return data[i].passage;
      }
    }
    
    // Last resort: try the first question's passage
    return data[0]?.passage || fallbackPassage;
  };
  
  // Get the current passage based on current question index
  const activeComprehensionPassage = findPassageForQuestion(
    comprehensionData, 
    comprehensionQuestionIndex, 
    sampleComprehensionPassage
  );
  
  const activeComprehensionQuestions = comprehensionData.length > 0 
    ? comprehensionData.map((q: any, idx: number) => ({
        id: idx + 1,
        question: q.question,
        options: q.options || [],
        correctAnswer: normalizeCorrectAnswer(q.correctAnswer),
        passage: q.passage // Store passage with each question
      }))
    : comprehensionQuestions;
  
  // Get the current academic passage based on current question index
  const activeAcademicPassage = findPassageForQuestion(
    academicData, 
    academicQuestionIndex, 
    sampleAcademicPassage
  );
  
  const activeAcademicQuestions = academicData.length > 0 
    ? academicData.map((q: any, idx: number) => ({
        id: idx + 1,
        question: q.question,
        options: q.options || [],
        correctAnswer: normalizeCorrectAnswer(q.correctAnswer),
        passage: q.passage // Store passage with each question
      }))
    : academicQuestions;

  const handleSelectAnswer = (section: string, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [section]: answerIndex }));
    setShowExplanation(false);
    setExplanation(null);
  };

  const handleGetExplanation = async (section: "comprehension" | "academic") => {
    const questionIndex = section === "comprehension" ? comprehensionQuestionIndex : academicQuestionIndex;
    const answerKey = `${section}-${questionIndex}`;
    const userAnswer = answers[answerKey];
    
    if (userAnswer === undefined) {
      toast({
        title: t('reading.selectFirst'),
        description: t('reading.selectDesc'),
        variant: "destructive"
      });
      return;
    }

    const questions = section === "comprehension" ? activeComprehensionQuestions : activeAcademicQuestions;
    const currentQ = questions[questionIndex];
    const passage = section === "comprehension" ? activeComprehensionPassage : activeAcademicPassage;

    setIsLoadingExplanation(true);
    try {
      const response = await fetch('/api/ai/explain-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          correctAnswer: currentQ.correctAnswer,
          userAnswer: userAnswer,
          options: currentQ.options,
          passage: passage,
          section: "reading",
          language: language
        })
      });

      if (!response.ok) throw new Error('Failed to get explanation');
      
      const data = await response.json();
      setExplanation(data.explanation);
      setShowExplanation(true);
    } catch (error) {
      console.error('Explanation error:', error);
      toast({
        title: t('reading.explanFailed'),
        description: t('reading.tryAgain'),
        variant: "destructive"
      });
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleAutoSolveCompleteWords = async () => {
    // Toggle off if already showing
    if (showCompleteWordsAnswers) {
      setShowCompleteWordsAnswers(false);
      return;
    }
    
    // Check if we have stored answers available
    const hasStoredAnswers = activeCompleteWordsAnswers.some((a: string) => a && a.length > 0);
    
    // Show answers immediately (with stored data or placeholder)
    setShowCompleteWordsAnswers(true);
    
    // If we already have AI answers cached for this exact context, no need to call API again
    if (aiSolvedCompleteWords) {
      return;
    }
    
    // Capture the current aiCacheKey at request time to verify later
    const requestKey = aiCacheKey;
    
    // Always call AI to get explanations and validated answers
    if (!isLoadingCompleteWordsAnswers) {
      setIsLoadingCompleteWordsAnswers(true);
      
      try {
        const response = await fetch('/api/ai/solve-reading-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: [{
              type: 'complete-words',
              passage: activeCompleteWordsPassage,
              blankCount: blankCount
            }],
            language: language
          })
        });

        if (!response.ok) throw new Error('Failed to solve questions');
        
        const data = await response.json();
        
        // Only commit results if the passage/context hasn't changed during the request
        if (data.success && data.solutions && data.solutions.length > 0) {
          const solution = data.solutions[0];
          // Verify the request is still relevant (user hasn't navigated away)
          // Use ref to get the current aiCacheKey value, not the stale closure
          if (requestKey === aiCacheKeyRef.current) {
            setAiSolvedCompleteWords({
              answers: solution.answers || [],
              explanation: solution.explanation || ''
            });
          }
        }
      } catch (error) {
        console.error('Auto-solve error:', error);
        // Don't show error toast if we have stored answers to fallback to
        if (!hasStoredAnswers) {
          toast({
            title: t('reading.autoFailed'),
            description: t('reading.tryAgain'),
            variant: "destructive"
          });
        }
      } finally {
        setIsLoadingCompleteWordsAnswers(false);
      }
    }
  };

  if (isLoadingTest) {
    return <NewToeflLoadingState section="reading" />;
  }

  const activeQuestions = loadedQuestions.length > 0 ? loadedQuestions : null;
  const testTitle = testData?.title || "New TOEFL Reading";

  const getCurrentTaskLabel = () => {
    if (currentSection === "complete-words") return "1. Complete the Words";
    if (currentSection === "comprehension") return "2. Comprehension Tasks";
    return "3. Academic Reading";
  };

  const calculateProgress = () => {
    // Calculate progress by counting individual answered items
    // Only count sections that actually have content
    let totalItems = 0;
    let completedItems = 0;
    
    // Complete Words: count blanks if section has content
    if (blankCount > 0) {
      totalItems += blankCount;
      completedItems += completeWordsInputs.filter(v => v && v.length > 0).length;
    }
    
    // Comprehension: count questions if section exists
    if (activeComprehensionQuestions.length > 0) {
      totalItems += activeComprehensionQuestions.length;
      for (let i = 0; i < activeComprehensionQuestions.length; i++) {
        if (answers[`comprehension-${i}`] !== undefined) completedItems++;
      }
    }
    
    // Academic: count questions if section exists
    if (activeAcademicQuestions.length > 0) {
      totalItems += activeAcademicQuestions.length;
      for (let i = 0; i < activeAcademicQuestions.length; i++) {
        if (answers[`academic-${i}`] !== undefined) completedItems++;
      }
    }
    
    // If no items exist, default to 0%
    if (totalItems === 0) return 0;
    
    return Math.round((completedItems / totalItems) * 100);
  };

  if (!isStarted) {
    return (
      <NewToeflLayout section="reading" darkNav>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Bebas+Neue&family=Sora:wght@300;400;500;600;700&display=swap');
          .rd-card { background: #0C1220; border: 1px solid rgba(255,255,255,.06); border-radius: 16px; }
          .rd-card:hover { border-color: rgba(255,255,255,.12); }
          .rd-num { font-family: 'Bebas Neue', sans-serif; }
          .rd-label { font-family: 'Oswald', sans-serif; letter-spacing: .06em; text-transform: uppercase; }
          .rd-body { font-family: 'Sora', sans-serif; }
          .rd-start-btn { background: linear-gradient(135deg, #0060CC, #00BBFF); transition: opacity .2s; }
          .rd-start-btn:hover { opacity: .9; }
          .rd-orb-1 { position:fixed; top:-20vh; left:-15vw; width:55vw; height:55vw; border-radius:50%;
            background:radial-gradient(circle, rgba(0,80,200,.18), transparent 65%); filter:blur(36px); pointer-events:none; z-index:0; }
          .rd-orb-2 { position:fixed; bottom:-15vh; right:-10vw; width:45vw; height:45vw; border-radius:50%;
            background:radial-gradient(circle, rgba(0,120,255,.12), transparent 65%); filter:blur(30px); pointer-events:none; z-index:0; }
        `}</style>
        <div className="rd-orb-1" /><div className="rd-orb-2" />
        <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12 flex flex-col" style={{minHeight:'calc(100vh - 4rem)'}}>
          <div className="grid lg:grid-cols-2 gap-6 items-stretch flex-1 py-8">

            {/* ── Left: header + stats + button ── */}
            <div className="flex flex-col gap-4 justify-center">
              <NewToeflIntroHeader
                section="reading"
                title={testTitle}
                subtitle={activeQuestions ? t('reading.nQuestions').replace('{n}', String(activeQuestions.length)) : '2026 Adaptive Format'}
              />

              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Clock, label: t('reading.approxTime'), sub: t('reading.estTime') },
                  { icon: FileText, label: t('reading.adaptive'), sub: t('reading.adaptiveDesc') },
                  { icon: Sparkles, label: t('reading.stages'), sub: t('reading.stageLabel') },
                ].map((item, i) => (
                  <div key={i} className="rd-card p-3 text-center">
                    <item.icon className="h-5 w-5 mx-auto mb-1" style={{color:'#00BBFF'}} />
                    <p className="text-white font-semibold text-xs rd-body">{item.label}</p>
                    <p className="text-white/50 text-xs rd-body">{item.sub}</p>
                  </div>
                ))}
              </div>

              <button
                className="rd-start-btn w-full text-white py-4 text-base font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 rd-body"
                onClick={() => setIsStarted(true)}
                data-testid="button-start-reading-test"
              >
                <Play className="h-4 w-4" />
                {t('reading.startExam')}
              </button>
            </div>

            {/* ── Right: structure cards ── */}
            <div className="rd-card shadow-2xl p-5 flex flex-col" style={{borderLeft:'none'}}>
              <h2 className="text-xl font-bold text-white mb-1 rd-body">{t('reading.structure')}</h2>
              <p className="text-white/60 text-sm mb-4 rd-body">{t('reading.structureDesc')}</p>
              <div className="space-y-2">
                {[
                  { n: '1', label: 'Complete the Words', desc: t('reading.completeWordsDesc') },
                  { n: '2', label: 'Daily Life', desc: t('reading.comprehensionDesc') },
                  { n: '3', label: 'Academic Reading', desc: t('reading.academicDesc') },
                ].map(item => (
                  <div key={item.n} className="flex items-start gap-3 p-3 rounded-xl" style={{background:'rgba(0,120,255,.06)',border:'1px solid rgba(0,150,255,.1)'}}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg shrink-0 rd-num"
                      style={{background:'linear-gradient(135deg,#0060CC,#00BBFF)'}}>{item.n}</div>
                    <div>
                      <h3 className="font-semibold text-white text-sm rd-body">{item.label}</h3>
                      <p className="text-white/60 text-xs mt-0.5 rd-body">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </NewToeflLayout>
    );
  }

  const fontSizeControls = (
    <div className="flex items-center gap-1">
      <button onClick={() => setFontSize(f => Math.max(80, f - 10))}
        style={{color: isLight ? '#6B7280' : 'rgba(255,255,255,.7)',fontFamily:'Sora,sans-serif',fontSize:12,background: isLight ? 'rgba(0,0,0,.04)' : 'rgba(255,255,255,.08)',border: isLight ? '1px solid #D1D5DB' : '1px solid rgba(255,255,255,.12)',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>A-</button>
      <button onClick={() => setFontSize(f => Math.min(130, f + 10))}
        style={{color: isLight ? '#1F2937' : 'rgba(255,255,255,.9)',fontFamily:'Sora,sans-serif',fontSize:15,background: isLight ? 'rgba(0,0,0,.04)' : 'rgba(255,255,255,.08)',border: isLight ? '1px solid #D1D5DB' : '1px solid rgba(255,255,255,.12)',borderRadius:6,padding:'3px 8px',cursor:'pointer'}}>A+</button>
    </div>
  );

  return (
    <NewToeflLayout
      section="reading"
      isTestMode
      darkNav
      timeRemaining={timeRemaining}
      progress={calculateProgress()}
      currentTaskLabel={getCurrentTaskLabel()}
      rightContent={fontSizeControls}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Bebas+Neue&family=Sora:wght@300;400;500;600;700&display=swap');
        .rd-card { background: #0C1220; border: 1px solid rgba(0,120,255,.08); border-radius: 14px; }
        .rd-orb-1 { position:fixed; top:-20vh; left:-15vw; width:55vw; height:55vw; border-radius:50%;
          background:radial-gradient(circle, rgba(0,80,200,.18), transparent 65%); filter:blur(36px); pointer-events:none; z-index:0; }
        .rd-orb-2 { position:fixed; bottom:-15vh; right:-10vw; width:45vw; height:45vw; border-radius:50%;
          background:radial-gradient(circle, rgba(0,120,255,.12), transparent 65%); filter:blur(30px); pointer-events:none; z-index:0; }
        .rd-tabs-list { background:#0C1220; border:1px solid rgba(0,120,255,.1); border-radius:12px; padding:6px; display:grid; grid-template-columns:repeat(3,1fr); gap:4px; }
        .rd-tab { background:transparent; border:none; border-radius:8px; color:rgba(255,255,255,.45); padding:12px 18px;
          font-family:'Sora',sans-serif; font-size:14px; font-weight:600; cursor:pointer; transition:color .15s,box-shadow .15s;
          display:flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; }
        .rd-tab:hover { color:rgba(255,255,255,.8); }
        .rd-tab.active { color:#00BBFF; box-shadow:0 2px 0 0 #00BBFF; background:rgba(0,187,255,.06); }
        .rd-passage { font-family:Arial,sans-serif; font-size:14px; line-height:1.8; color:rgba(255,255,255,.92); white-space:pre-wrap; }
        .rd-ch { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px;
          border:1px solid rgba(255,255,255,.08); cursor:pointer; transition:border-color .15s, background .15s; margin-bottom:6px; }
        .rd-ch:hover { border-color:rgba(0,136,221,.3); }
        .rd-ch.sel { border-color:rgba(0,136,221,.4); background:rgba(0,136,221,.06); }
        .rd-cr { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.3); flex-shrink:0; transition:border-color .15s; position:relative; }
        .rd-ch.sel .rd-cr { border-color:#00BBFF; }
        .rd-ch.sel .rd-cr::after { content:''; position:absolute; top:50%; left:50%; width:8px; height:8px; border-radius:50%;
          background:#00BBFF; transform:translate(-50%,-50%); }
        .rd-instr { border-left:3px solid #00BBFF; padding:10px 14px; background:rgba(0,120,255,.06); border-radius:0 8px 8px 0; margin-bottom:16px; }
        .rd-hint { color:#00BBFF; font-weight:700; }
        .rd-blank-slot { width:20px; height:28px; display:inline-flex; align-items:center; justify-content:center;
          border-bottom:2px dashed rgba(0,187,255,.6); background:rgba(0,187,255,.08); color:rgba(255,255,255,.9);
          font-family:monospace; font-size:14px; font-weight:700; }
        .rd-blank-slot.filled { border-bottom-color:#00BBFF; background:rgba(0,187,255,.15); }
        .rd-section-label { font-family:'Oswald',sans-serif; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#00BBFF; margin-bottom:4px; }
        .rd-q-num { font-family:'Bebas Neue',sans-serif; font-size:18px; color:rgba(255,255,255,.9); }
        .rd-answer-box { padding:14px 18px; border-radius:12px; border:1px solid rgba(0,187,255,.3); background:rgba(0,187,255,.08); margin-top:12px; }
      `}</style>
      <div className="rd-orb-1" /><div className="rd-orb-2" />
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12 py-8">
        <Tabs value={currentSection} onValueChange={(v) => {
          setCurrentSection(v as QuestionType);
          setShowAnswerOnly(false);
          setShowExplanation(false);
          setExplanation(null);
        }} className="w-full">
          <div className="rd-tabs-list mb-8">
            {[
              { value: 'complete-words', icon: FileText, label: 'Complete Words' },
              { value: 'comprehension', icon: BookOpen, label: 'Daily Life' },
              { value: 'academic', icon: GraduationCap, label: 'Academic Reading' },
            ].map(tab => (
              <button key={tab.value}
                className={`rd-tab${currentSection === tab.value ? ' active' : ''}`}
                onClick={() => { setCurrentSection(tab.value as QuestionType); setShowAnswerOnly(false); setShowExplanation(false); setExplanation(null); }}>
                <tab.icon size={16} />{tab.label}
              </button>
            ))}
          </div>

          <TabsContent value="complete-words">
            <Suspense fallback={<NewToeflReadingLoadingFallback />}>
              <DeferredNewToeflReadingCompleteWordsTab
                t={t}
                fontSize={fontSize}
                completeWordsParts={completeWordsParts}
                getBlankIndex={getBlankIndex}
                activeCompleteWordsAnswers={activeCompleteWordsAnswers}
                activeCompleteWordsBlanksLengths={activeCompleteWordsBlanksLengths}
                completeWordsInputs={completeWordsInputs}
                handleCompleteWordsInput={handleCompleteWordsInput}
                isFullTestMode={isFullTestMode}
                handleAutoSolveCompleteWords={handleAutoSolveCompleteWords}
                showCompleteWordsAnswers={showCompleteWordsAnswers}
                isLoadingCompleteWordsAnswers={isLoadingCompleteWordsAnswers}
                aiSolvedCompleteWords={aiSolvedCompleteWords}
                setShowCompleteWordsAnswers={setShowCompleteWordsAnswers}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="comprehension">
            <Suspense fallback={<NewToeflReadingLoadingFallback />}>
              <DeferredNewToeflReadingChoiceTab
                variant="comprehension"
                title="Reading Passage"
                passageTitle={(() => {
                  const p = activeComprehensionPassage || "";
                  const firstLine = p.split("\n")[0]?.trim() || "";
                  if (firstLine.length > 5 && firstLine.length < 100 && !/^[a-z]/.test(firstLine)) return firstLine;
                  return "Reading Passage";
                })()}
                passage={activeComprehensionPassage}
                questionIndex={comprehensionQuestionIndex}
                questions={activeComprehensionQuestions}
                fontSize={fontSize}
                isLight={isLight}
                answers={answers}
                handleSelectAnswer={handleSelectAnswer}
                showAnswerOnly={showAnswerOnly}
                setShowAnswerOnly={setShowAnswerOnly}
                showExplanation={showExplanation}
                setShowExplanation={setShowExplanation}
                explanation={explanation}
                isFullTestMode={isFullTestMode}
                isLoadingExplanation={isLoadingExplanation}
                onGetExplanation={() => handleGetExplanation("comprehension")}
                onPrev={() => {
                  setComprehensionQuestionIndex((prev) => Math.max(0, prev - 1));
                  setShowExplanation(false);
                  setShowAnswerOnly(false);
                  setExplanation(null);
                }}
                onNext={() => {
                  setComprehensionQuestionIndex((prev) => Math.min(activeComprehensionQuestions.length - 1, prev + 1));
                  setShowExplanation(false);
                  setShowAnswerOnly(false);
                  setExplanation(null);
                }}
                prevDisabled={comprehensionQuestionIndex === 0}
                nextDisabled={comprehensionQuestionIndex >= activeComprehensionQuestions.length - 1}
                t={t}
                formatEmailPassage={formatEmailPassage}
                cleanPassageText={cleanPassageText}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="academic">
            <Suspense fallback={<NewToeflReadingLoadingFallback />}>
              <DeferredNewToeflReadingChoiceTab
                variant="academic"
                title="Academic Reading"
                passageTitle={(() => {
                  const p = activeAcademicPassage || "";
                  const firstLine = p.split("\n")[0]?.trim() || "";
                  if (firstLine.length > 5 && firstLine.length < 120 && !/^[a-z]/.test(firstLine)) return firstLine;
                  return testData?.title || "Reading Passage";
                })()}
                passage={activeAcademicPassage}
                questionIndex={academicQuestionIndex}
                questions={activeAcademicQuestions}
                fontSize={fontSize}
                isLight={isLight}
                answers={answers}
                handleSelectAnswer={handleSelectAnswer}
                showAnswerOnly={showAnswerOnly}
                setShowAnswerOnly={setShowAnswerOnly}
                showExplanation={showExplanation}
                setShowExplanation={setShowExplanation}
                explanation={explanation}
                isFullTestMode={isFullTestMode}
                isLoadingExplanation={isLoadingExplanation}
                onGetExplanation={() => handleGetExplanation("academic")}
                onPrev={() => {
                  setAcademicQuestionIndex((prev) => Math.max(0, prev - 1));
                  setShowExplanation(false);
                  setShowAnswerOnly(false);
                  setExplanation(null);
                }}
                onNext={() => {
                  setAcademicQuestionIndex((prev) => Math.min(activeAcademicQuestions.length - 1, prev + 1));
                  setShowExplanation(false);
                  setShowAnswerOnly(false);
                  setExplanation(null);
                }}
                prevDisabled={academicQuestionIndex === 0}
                nextDisabled={academicQuestionIndex >= activeAcademicQuestions.length - 1}
                t={t}
                formatEmailPassage={formatEmailPassage}
                cleanPassageText={cleanPassageText}
              />
            </Suspense>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-8 gap-4">
          <button
            style={{flex:1,padding:'18px 24px',fontSize:16,fontWeight:700,fontFamily:'Sora,sans-serif',background: isLight ? '#F3F4F6' : 'rgba(255,255,255,.06)',border: isLight ? '1px solid #D1D5DB' : '1px solid rgba(255,255,255,.12)',borderRadius:12,color:currentSection==='complete-words'?(isLight ? '#D1D5DB' : 'rgba(255,255,255,.25)'):(isLight ? '#374151' : 'rgba(255,255,255,.85)'),cursor:currentSection==='complete-words'?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'background .2s'}}
            onClick={() => {
              if (currentSection === "comprehension") {
                if (comprehensionQuestionIndex > 0) {
                  setComprehensionQuestionIndex(prev => prev - 1);
                  setShowExplanation(false); setExplanation(null);
                } else { setCurrentSection("complete-words"); }
              } else if (currentSection === "academic") {
                if (academicQuestionIndex > 0) {
                  setAcademicQuestionIndex(prev => prev - 1);
                  setShowExplanation(false); setExplanation(null);
                } else {
                  setCurrentSection("comprehension");
                  setComprehensionQuestionIndex(activeComprehensionQuestions.length - 1);
                }
              }
            }}
            disabled={currentSection === "complete-words"}
            data-testid="button-prev-section"
          >
            <ArrowLeft size={18} />
            {t('reading.prevQuestion')}
          </button>
          <button
            style={{flex:1,padding:'18px 24px',fontSize:16,fontWeight:700,fontFamily:'Sora,sans-serif',background:'linear-gradient(135deg,#0060CC,#00BBFF)',border:'none',borderRadius:12,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,boxShadow:'0 4px 24px rgba(0,120,255,.25)',transition:'opacity .2s'}}
            onClick={() => {
              if (currentSection === "complete-words") {
                setCurrentSection("comprehension"); setComprehensionQuestionIndex(0);
                setShowExplanation(false); setExplanation(null);
              } else if (currentSection === "comprehension") {
                if (comprehensionQuestionIndex < activeComprehensionQuestions.length - 1) {
                  setComprehensionQuestionIndex(prev => prev + 1);
                  setShowExplanation(false); setExplanation(null);
                } else {
                  setCurrentSection("academic"); setAcademicQuestionIndex(0);
                  setShowExplanation(false); setExplanation(null);
                }
              } else if (currentSection === "academic") {
                if (academicQuestionIndex < activeAcademicQuestions.length - 1) {
                  setAcademicQuestionIndex(prev => prev + 1);
                  setShowExplanation(false); setExplanation(null);
                } else {
                  if (isFullTestMode) { handleFullTestSectionComplete(); }
                  else { saveTestSubmission(); toast({ title: t('reading.testComplete'), description: t('reading.allComplete') }); }
                }
              }
            }}
            data-testid="button-next-question"
          >
            {currentSection === "academic" && academicQuestionIndex >= activeAcademicQuestions.length - 1
              ? (isFullTestMode ? t('reading.nextSection') : t('reading.viewResult'))
              : t('reading.nextQuestion')}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </NewToeflLayout>
  );
}
