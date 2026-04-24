import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useParams, useSearch, useLocation } from "wouter";
import { ArrowRight, Clock, Volume2, FileText, Play, Pause, RotateCcw, Sparkles, Headphones, MessageSquare, GraduationCap, CheckCircle, ScrollText, ChevronDown, ChevronUp, X, Loader2, Download, Lightbulb, BookOpen, AlertCircle, CheckCircle2, XCircle, ArrowLeft, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/components/theme-provider";
import { NewToeflLayout, NewToeflLoadingState } from "@/components/NewToeflLayout";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { 
  playSafariCompatibleAudio, 
  unlockAudioContext,
  createSafariCompatibleMediaRecorder,
  getSupportedMimeType
} from "@/lib/safariAudioCompat";

type CategoryType = "choose-response" | "conversation" | "academic-talk";

// Option timestamp for audio highlight sync (from backend)
interface OptionTimestamp {
  option: string;        // "A", "B", "C", "D"
  startTime: number;     // Start time in seconds
  endTime: number;       // End time in seconds
}

interface AudioItem {
  id: number;
  audioScript: string;
  duration: string;
  question: string;
  options: string[];
  correctAnswer?: number;
  audioUrl?: string;
  hideQuestionText?: boolean;
  optionTimestamps?: OptionTimestamp[];  // Timestamps for each option highlight
  // For grouped questions (multiple questions per script)
  scriptId?: string;  // Identifier for the script this question belongs to
  questionIndex?: number;  // Index within the group (0, 1, 2, ...)
  totalQuestionsInGroup?: number;  // Total questions in this script group
  isFirstInGroup?: boolean;  // Only show audio player for first question in group
}

// Calculate estimated audio duration based on word count
// Average speaking rate: ~150 words per minute (2.5 words per second)
function calculateDuration(text: string): string {
  if (!text || text.trim().length === 0) return '0:15';
  
  // Count words (split by whitespace)
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  
  // Calculate seconds: ~2.5 words per second for natural speech, add 10% buffer for pauses
  const seconds = Math.ceil((wordCount / 2.5) * 1.1);
  
  // Minimum 10 seconds, maximum 10 minutes
  const clampedSeconds = Math.max(10, Math.min(seconds, 600));
  
  const minutes = Math.floor(clampedSeconds / 60);
  const remainingSeconds = clampedSeconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

interface Category {
  type: CategoryType;
  title: string;
  description: string;
  items: AudioItem[];
}

const DeferredNewToeflListeningIntroView = lazy(
  () => import("@/components/new-toefl-listening/NewToeflListeningIntroView"),
);
const DeferredNewToeflListeningCompletionView = lazy(
  () => import("@/components/new-toefl-listening/NewToeflListeningCompletionView"),
);

const categories: Category[] = [
  {
    type: "conversation",
    title: "Conversations",
    description: "Listen and Choose a Response (1-8) + Conversation Questions (9-12)",
    items: [
      // Listen and Choose a Response Questions 1-8 (hideQuestionText = true)
      {
        id: 1,
        audioScript: `Woman: Where is the student health center?`,
        duration: "0:15",
        question: "Listen and choose the best response.",
        hideQuestionText: true,
        options: [
          "A) It is located in the Student Union building on the second floor and is open from 8 to 5 on weekdays.",
          "B) Health is important.",
          "C) I'm not sick.",
          "D) Students need healthcare."
        ],
        correctAnswer: 0
      },
      {
        id: 2,
        audioScript: `Man: Is the library open on weekends?`,
        duration: "0:15",
        question: "Listen and choose the best response.",
        hideQuestionText: true,
        options: [
          "A) Books are important.",
          "B) I study at home.",
          "C) It is open on Saturday from 10 to 8 and on Sunday from noon to midnight.",
          "D) Libraries have books."
        ],
        correctAnswer: 2
      },
      {
        id: 3,
        audioScript: `Woman: Can I drop a class after the deadline?`,
        duration: "0:15",
        question: "Listen and choose the best response.",
        hideQuestionText: true,
        options: [
          "A) Deadlines matter.",
          "B) You need to obtain dean approval and a valid reason, so you should see your advisor.",
          "C) I never drop classes.",
          "D) Classes are required."
        ],
        correctAnswer: 1
      },
      {
        id: 4,
        audioScript: `Man: Where can I print on campus?`,
        duration: "0:15",
        question: "Listen and choose the best response.",
        hideQuestionText: true,
        options: [
          "A) Printing costs money.",
          "B) Paper is useful.",
          "C) I don't print.",
          "D) You can find computer labs in the library and academic buildings where it costs 10 cents per page."
        ],
        correctAnswer: 3
      },
      {
        id: 5,
        audioScript: `Woman: Are there math tutors?`,
        duration: "0:15",
        question: "Listen and choose the best response.",
        hideQuestionText: true,
        options: [
          "A) Math is difficult.",
          "B) I'm good at math.",
          "C) Yes, visit the Academic Support Center Monday through Thursday from 3 to 8 PM for free help.",
          "D) Numbers are important."
        ],
        correctAnswer: 2
      },
      {
        id: 6,
        audioScript: `Man: How do I add money to my meal plan?`,
        duration: "0:15",
        question: "Listen and choose the best response.",
        hideQuestionText: true,
        options: [
          "A) Use the dining services website or visit the card office in the dining hall.",
          "B) Food is necessary.",
          "C) I cook myself.",
          "D) Meal plans exist."
        ],
        correctAnswer: 0
      },
      {
        id: 7,
        audioScript: `Woman: Is there a bus to downtown?`,
        duration: "0:15",
        question: "Listen and choose the best response.",
        hideQuestionText: true,
        options: [
          "A) Transportation helps.",
          "B) Downtown is far.",
          "C) I have a car.",
          "D) Take Route 7 every 30 minutes from the main gate which is free with your student ID."
        ],
        correctAnswer: 3
      },
      {
        id: 8,
        audioScript: `Man: When's the graduation application deadline?`,
        duration: "0:15",
        question: "Listen and choose the best response.",
        hideQuestionText: true,
        options: [
          "A) Graduation is important.",
          "B) It is October 1st for the spring semester and March 1st for the fall semester through the registrar's online portal.",
          "C) I graduated already.",
          "D) Applications take time."
        ],
        correctAnswer: 1
      },
      // Conversation Questions 9-12 (hideQuestionText = false)
      {
        id: 9,
        audioScript: `Student: Professor Kim, I missed yesterday's exam. I had the flu.
Professor: Do you have documentation?
Student: Yes, here's the health center note.
Professor: Since you have proof and contacted me within 24 hours, you can take a makeup. But it'll have different questions and may be harder. Next Monday, 2 PM in my office.
Student: Thank you! I'll be ready.
Professor: This is your one makeup chance this semester. Email me before missing future exams if possible.`,
        duration: "1:00",
        question: "Why does the professor allow the student to take a makeup exam?",
        hideQuestionText: false,
        options: [
          "A) She asked the professor nicely",
          "B) The professor is generally lenient",
          "C) All students are allowed to retake",
          "D) She provided documentation and contacted the professor within 24 hours"
        ],
        correctAnswer: 3
      },
      {
        id: 10,
        audioScript: `Student: Professor Kim, I missed yesterday's exam. I had the flu.
Professor: Do you have documentation?
Student: Yes, here's the health center note.
Professor: Since you have proof and contacted me within 24 hours, you can take a makeup. But it'll have different questions and may be harder. Next Monday, 2 PM in my office.
Student: Thank you! I'll be ready.
Professor: This is your one makeup chance this semester. Email me before missing future exams if possible.`,
        duration: "1:00",
        question: "What information does the professor provide regarding the nature of makeup exams?",
        hideQuestionText: false,
        options: [
          "A) They will have different questions and may be harder",
          "B) They are usually easier than the original exams",
          "C) They are identical to the original version",
          "D) They do not count toward the final grade"
        ],
        correctAnswer: 0
      },
      {
        id: 11,
        audioScript: `Advisor: Why switch from biology to psychology?
Student: I took Intro to Psych and loved it. I'm more interested in human behavior than lab work.
Advisor: Good reason. You're a sophomore, so switching won't delay graduation much. Psychology has different requirements—five core courses plus electives. Your biology credits will count toward total credits.
Student: I won't lose those credits?
Advisor: No, they'll count. But you need all psych major requirements. Meet with a psych advisor to plan. Fill out the change form online—takes about two weeks for approval.`,
        duration: "1:15",
        question: "Why does the student wish to change majors from biology to psychology?",
        hideQuestionText: false,
        options: [
          "A) She found the biology laboratory work too challenging and time-consuming",
          "B) Her friends in the psychology program recommended she make the switch",
          "C) She discovered a stronger interest in human behavior after taking an introductory psychology course",
          "D) She believes psychology will be easier and require less intensive studying"
        ],
        correctAnswer: 2
      },
      {
        id: 12,
        audioScript: `Advisor: Why switch from biology to psychology?
Student: I took Intro to Psych and loved it. I'm more interested in human behavior than lab work.
Advisor: Good reason. You're a sophomore, so switching won't delay graduation much. Psychology has different requirements—five core courses plus electives. Your biology credits will count toward total credits.
Student: I won't lose those credits?
Advisor: No, they'll count. But you need all psych major requirements. Meet with a psych advisor to plan. Fill out the change form online—takes about two weeks for approval.`,
        duration: "1:15",
        question: "What does the advisor tell the student about her biology credits?",
        hideQuestionText: false,
        options: [
          "A) They will be completely lost and cannot be used toward graduation",
          "B) They will count toward her total credit requirements but not as psychology prerequisites",
          "C) She will need to retake equivalent courses in the psychology department",
          "D) They can be transferred to another institution but not used at this university"
        ],
        correctAnswer: 1
      }
    ]
  },
  {
    type: "academic-talk",
    title: "Academic Talks",
    description: "Answer questions about academic lectures and talks.",
    items: [
      {
        id: 15,
        audioScript: `Podcast Host: Have you ever wondered why you can remember some things easily but forget others almost immediately? There's actually a fascinating distinction psychologists make about how we store information. Short-term memory holds about seven items for 20-30 seconds. It's why phone numbers are seven digits—you dial right after looking them up. Long-term memory stores information much longer, even a lifetime, with unlimited capacity. How does information move from short-term to long-term memory? Through rehearsal and making meaningful connections. Simply repeating information, called maintenance rehearsal, helps somewhat. But elaborative rehearsal—connecting new information to what you already know—is far more effective. And here's something crucial for students: sleep plays a vital role in memory consolidation. During sleep, your brain actively strengthens the neural pathways for memories formed during the day.`,
        duration: "1:30",
        question: "According to the speaker, what is the typical capacity of short-term memory?",
        hideQuestionText: false,
        options: [
          "A) It has unlimited capacity like long-term memory",
          "B) It can hold thousands of pieces of information simultaneously",
          "C) It typically holds approximately seven items at one time",
          "D) It can only process one piece of information at a time"
        ],
        correctAnswer: 2
      },
      {
        id: 16,
        audioScript: `Podcast Host: Have you ever wondered why you can remember some things easily but forget others almost immediately? There's actually a fascinating distinction psychologists make about how we store information. Short-term memory holds about seven items for 20-30 seconds. It's why phone numbers are seven digits—you dial right after looking them up. Long-term memory stores information much longer, even a lifetime, with unlimited capacity. How does information move from short-term to long-term memory? Through rehearsal and making meaningful connections. Simply repeating information, called maintenance rehearsal, helps somewhat. But elaborative rehearsal—connecting new information to what you already know—is far more effective. And here's something crucial for students: sleep plays a vital role in memory consolidation. During sleep, your brain actively strengthens the neural pathways for memories formed during the day.`,
        duration: "1:30",
        question: "How long does information typically remain in short-term memory without rehearsal?",
        hideQuestionText: false,
        options: [
          "A) Information stays permanently without any effort required",
          "B) Most information fades away after approximately twenty to thirty seconds",
          "C) Information can be retained for several hours with minimal effort",
          "D) Information disappears almost immediately within one second"
        ],
        correctAnswer: 1
      },
      {
        id: 17,
        audioScript: `Podcast Host: Have you ever wondered why you can remember some things easily but forget others almost immediately? There's actually a fascinating distinction psychologists make about how we store information. Short-term memory holds about seven items for 20-30 seconds. It's why phone numbers are seven digits—you dial right after looking them up. Long-term memory stores information much longer, even a lifetime, with unlimited capacity. How does information move from short-term to long-term memory? Through rehearsal and making meaningful connections. Simply repeating information, called maintenance rehearsal, helps somewhat. But elaborative rehearsal—connecting new information to what you already know—is far more effective. And here's something crucial for students: sleep plays a vital role in memory consolidation. During sleep, your brain actively strengthens the neural pathways for memories formed during the day.`,
        duration: "1:30",
        question: "What does the speaker mean by 'elaborative rehearsal'?",
        hideQuestionText: false,
        options: [
          "A) Making meaningful connections between new information and existing knowledge",
          "B) Simply repeating new information over and over again",
          "C) Deliberately trying to forget unwanted or outdated information",
          "D) Studying material while sleeping to improve memory consolidation"
        ],
        correctAnswer: 0
      },
      {
        id: 18,
        audioScript: `Podcast Host: Have you ever wondered why you can remember some things easily but forget others almost immediately? There's actually a fascinating distinction psychologists make about how we store information. Short-term memory holds about seven items for 20-30 seconds. It's why phone numbers are seven digits—you dial right after looking them up. Long-term memory stores information much longer, even a lifetime, with unlimited capacity. How does information move from short-term to long-term memory? Through rehearsal and making meaningful connections. Simply repeating information, called maintenance rehearsal, helps somewhat. But elaborative rehearsal—connecting new information to what you already know—is far more effective. And here's something crucial for students: sleep plays a vital role in memory consolidation. During sleep, your brain actively strengthens the neural pathways for memories formed during the day.`,
        duration: "1:30",
        question: "Why does the speaker emphasize the importance of sleep for memory?",
        hideQuestionText: false,
        options: [
          "A) Sleep is not actually important for memory formation or retention",
          "B) Sleep causes people to forget information they studied earlier",
          "C) Sleep prevents students from studying effectively during nighttime hours",
          "D) The brain actively consolidates and strengthens memories during sleep periods"
        ],
        correctAnswer: 3
      }
    ]
  }
];

function resolveCorrectAnswer(correctAnswer: any, options: string[]): number {
  if (typeof correctAnswer === 'number') return correctAnswer;
  if (typeof correctAnswer === 'string') {
    const letterIdx = ['A', 'B', 'C', 'D'].indexOf(correctAnswer.toUpperCase().replace(/[^A-D]/g, ''));
    if (letterIdx >= 0) return letterIdx;
    const textIdx = options.findIndex(opt => opt === correctAnswer);
    return textIdx >= 0 ? textIdx : 0;
  }
  return 0;
}

export default function NewTOEFLListening() {
  const params = useParams<{ testId?: string; id?: string }>();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const testId = params.testId || params.id || new URLSearchParams(searchString).get('testId');
  const isFullTestMode = new URLSearchParams(searchString).get('fullTest') === 'true';
  const fullTestAttemptId = new URLSearchParams(searchString).get('attemptId');
  
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { user } = useAuth();
  const [submissionSaved, setSubmissionSaved] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [currentScriptLineIndex, setCurrentScriptLineIndex] = useState(0);
  const scriptLinesRef = useRef<HTMLDivElement[]>([]);
  const [loadedCategories, setLoadedCategories] = useState<Category[] | null>(null);
  
  // Reset script refs when item changes
  useEffect(() => {
    scriptLinesRef.current = [];
    setCurrentScriptLineIndex(0);
  }, [currentItemIndex, currentCategoryIndex]);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrls, setGeneratedAudioUrls] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  const [explanations, setExplanations] = useState<Record<string, any>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<Record<string, boolean>>({});
  const [showAnswerOnly, setShowAnswerOnly] = useState<Record<string, boolean>>({});
  const [playedAudioGroups, setPlayedAudioGroups] = useState<Set<string>>(new Set());
  const [practiceMode, setPracticeMode] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [segmentDurationsMap, setSegmentDurationsMap] = useState<Record<string, { speaker: string; text: string; durationMs: number; startMs: number; endMs: number }[]>>({});
  const [activePlayingOption, setActivePlayingOption] = useState<string | null>(null);
  const [optionTimestampsMap, setOptionTimestampsMap] = useState<Record<string, OptionTimestamp[]>>({});
  const optionTimestampsMapRef = useRef<Record<string, OptionTimestamp[]>>({});
  useEffect(() => { optionTimestampsMapRef.current = optionTimestampsMap; }, [optionTimestampsMap]);

  const activeCategories = loadedCategories || categories;
  
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentCategoryRef = useRef<any>(null);
  const currentItemRef = useRef<any>(null);
  const currentCategoryIndexRef = useRef(currentCategoryIndex);
  const currentItemIndexRef = useRef(currentItemIndex);
  
  useEffect(() => { currentCategoryIndexRef.current = currentCategoryIndex; }, [currentCategoryIndex]);
  useEffect(() => { currentItemIndexRef.current = currentItemIndex; }, [currentItemIndex]);

  // Populate optionTimestampsMap from pre-loaded item data (for pre-generated audio)
  useEffect(() => {
    let addedTimestampsForCurrentItem = false;
    if (activeCategories && currentCategoryIndex < activeCategories.length) {
      const category = activeCategories[currentCategoryIndex];
      if (category?.type === 'choose-response' && category.items) {
        category.items.forEach((item, idx) => {
          if (item.optionTimestamps && item.optionTimestamps.length > 0) {
            const key = `${currentCategoryIndex}-${idx}`;
            // Update ref immediately so timeupdate handler can use it before React re-render
            if (!optionTimestampsMapRef.current[key]) {
              optionTimestampsMapRef.current = { ...optionTimestampsMapRef.current, [key]: item.optionTimestamps! };
              if (idx === currentItemIndex) addedTimestampsForCurrentItem = true;
            }
            setOptionTimestampsMap(prev => {
              if (prev[key]) return prev; // already set
              return { ...prev, [key]: item.optionTimestamps! };
            });
          }
        });
      }
    }
    // If timestamps just arrived for the currently-playing item and RAF is not running,
    // restart RAF so highlights work even if audio was already playing (race condition fix)
    if (addedTimestampsForCurrentItem && audioRef.current && !audioRef.current.paused && rafRef.current === null) {
      startOptionHighlightRAF();
    }
    // Reset active option when navigating away
    setActivePlayingOption(null);
  }, [currentCategoryIndex, currentItemIndex, activeCategories]);

  const waveformBars28 = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => Math.round(Math.abs(Math.sin(i * 0.7 + 0.5)) * 14 + 4)),
  []);
  const waveformBars40 = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => Math.round(Math.abs(Math.sin(i * 0.5 + 1.0) * Math.cos(i * 0.3)) * 40 + 10)),
  []);
  
  // Apply volume to audio element whenever it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  // Apply playback speed to audio element whenever it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);
  const testStartTimeRef = useRef<number>(0);
  const questionAudioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { logTestStart, logAIUsage } = useActivityTracker();
  
  const { data: testData, isLoading: isLoadingTest } = useQuery<{ 
    questions?: any[]; 
    title?: string;
    passages?: any[];
    scripts?: any[];
    listenAndChoose?: any[];
    conversations?: any[];
    announcements?: any[];
    academicTalks?: any[];
  }>({
    queryKey: ['/api/tests', testId],
    enabled: !!testId,
  });
  
  useEffect(() => {
    if (isStarted && !testStartTimeRef.current) {
      testStartTimeRef.current = Date.now();
      logTestStart('toefl_listening', testId || 'unknown');
    }
  }, [isStarted, testId]);

  useEffect(() => {
    if (testData) {
      console.log('[Listening Debug] testData received:', {
        hasListenAndChoose: !!testData.listenAndChoose,
        hasConversations: !!testData.conversations,
        hasAnnouncements: !!testData.announcements,
        hasAcademicTalks: !!testData.academicTalks,
        passagesLength: testData.passages?.length ?? 0,
        scriptsLength: testData.scripts?.length ?? 0,
        questionsLength: testData.questions?.length ?? 0
      });
      
      let parsedCategories: Category[] = [];
      
      // Try to parse from various data sources
      // Priority 1: Structured format with explicit category fields
      if (testData.listenAndChoose || testData.conversations || testData.announcements || testData.academicTalks) {
        console.log('[Listening Debug] Using Priority 1: Structured format');
        parsedCategories = parseStructuredTestData(testData);
      }
      // Priority 2: Passages array (AI generated tests)
      else if (testData.passages && testData.passages.length > 0) {
        console.log('[Listening Debug] Using Priority 2: Passages array');
        parsedCategories = parsePassagesToCategories(testData.passages);
      }
      // Priority 3: Scripts + Questions array (AI generated listening tests)
      else if (testData.scripts && testData.scripts.length > 0 && testData.questions) {
        console.log('[Listening Debug] Using Priority 3: Scripts + Questions');
        console.log('[Listening Debug] First script type:', testData.scripts[0]?.type);
        console.log('[Listening Debug] First script audioUrl:', testData.scripts[0]?.audioUrl);
        parsedCategories = parseScriptsAndQuestionsToCategories(testData.scripts, testData.questions);
      }
      // Priority 4: Questions array only (generic format)
      else if (testData.questions && testData.questions.length > 0) {
        console.log('[Listening Debug] Using Priority 4: Questions only');
        parsedCategories = parseTestDataToCategories(testData.questions);
      }
      
      console.log('[Listening Debug] Parsed categories:', parsedCategories.map(c => ({ type: c.type, itemCount: c.items.length })));
      
      // Normalize: Ensure all three categories exist (even if empty)
      // This guarantees navigation tabs are always visible
      const normalizedCategories = normalizeCategories(parsedCategories);
      console.log('[Listening Debug] Normalized categories:', normalizedCategories.map(c => ({ type: c.type, itemCount: c.items.length })));
      
      if (normalizedCategories.length > 0) {
        setLoadedCategories(normalizedCategories);
      }
    }
  }, [testData]);
  
  // Ensure all category types are present in the result
  const normalizeCategories = (parsedCategories: Category[]): Category[] => {
    const categoryTypeMap: Record<CategoryType, Category | null> = {
      'choose-response': null,
      'conversation': null,
      'academic-talk': null
    };
    
    // Map parsed categories by type
    parsedCategories.forEach(cat => {
      categoryTypeMap[cat.type] = cat;
    });
    
    // Check if we have any main content categories
    const hasMainContent = parsedCategories.some(cat => 
      cat.items.length > 0 && ['conversation', 'academic-talk'].includes(cat.type)
    );
    
    const hasChooseResponse = (categoryTypeMap['choose-response']?.items?.length ?? 0) > 0;
    
    if (!hasMainContent && !hasChooseResponse) {
      // No items at all - return empty to fallback to default categories
      return [];
    }
    
    const result: Category[] = [];
    
    // Add choose-response category if it has items (first category)
    if (hasChooseResponse) {
      result.push(categoryTypeMap['choose-response']!);
    }
    
    // Always add main categories when we have main content
    // Order: Listen and Choose a Response -> Conversations -> Academic Talks
    if (hasMainContent) {
      // Conversation panel (show even if empty)
      result.push(categoryTypeMap['conversation'] || {
        type: 'conversation',
        title: 'Conversations',
        description: 'Answer questions about short conversations.',
        items: []
      });
      
      // Academic Talk panel (show even if empty)
      result.push(categoryTypeMap['academic-talk'] || {
        type: 'academic-talk',
        title: 'Academic Talks',
        description: 'Answer questions about academic lectures and talks.',
        items: []
      });
    }
    
    return result;
  };
  
  // Parse structured test data with explicit category fields
  const parseStructuredTestData = (data: any): Category[] => {
    const result: Category[] = [];
    
    if (data.listenAndChoose && data.listenAndChoose.length > 0) {
      result.push({
        type: 'choose-response',
        title: 'Listen and Choose a Response',
        description: 'Select the best response to the question or statement.',
        items: data.listenAndChoose.map((q: any, idx: number) => {
          const scriptText = q.dialogue || q.content || q.script || q.prompt || '';
          return {
            id: idx + 1,
            audioScript: scriptText,
            duration: q.duration || calculateDuration(scriptText),
            question: q.question || 'What is the best response?',
            options: q.options || [],
            correctAnswer: resolveCorrectAnswer(q.correctAnswer, q.options || []),
            audioUrl: q.audioUrl,
            optionTimestamps: q.optionTimestamps, // For audio highlight sync
            // Hide options in exam mode for Listen and Choose a Response
            hideQuestionText: true
          };
        })
      });
    }
    
    // Conversations and Announcements go into conversations category
    const convItems: AudioItem[] = [];
    
    if (data.conversations && data.conversations.length > 0) {
      data.conversations.forEach((conv: any, convIdx: number) => {
        const script = conv.script || conv.content || conv.dialogue || '';
        const questions = conv.questions || [conv];
        questions.forEach((q: any, qIdx: number) => {
          convItems.push({
            id: convIdx * 100 + qIdx + 1,
            audioScript: script,
            duration: conv.duration || calculateDuration(script),
            question: q.question || q.text || '',
            options: q.options || [],
            correctAnswer: resolveCorrectAnswer(q.correctAnswer, q.options || []),
            audioUrl: conv.audioUrl || q.audioUrl
          });
        });
      });
    }
    
    // Announcements also go into conversations category
    if (data.announcements && data.announcements.length > 0) {
      data.announcements.forEach((ann: any, annIdx: number) => {
        const script = ann.script || ann.content || '';
        const questions = ann.questions || [ann];
        questions.forEach((q: any, qIdx: number) => {
          convItems.push({
            id: 1000 + annIdx * 100 + qIdx + 1,
            audioScript: script,
            duration: ann.duration || calculateDuration(script),
            question: q.question || q.text || '',
            options: q.options || [],
            correctAnswer: resolveCorrectAnswer(q.correctAnswer, q.options || []),
            audioUrl: ann.audioUrl || q.audioUrl
          });
        });
      });
    }
    
    if (convItems.length > 0) {
      result.push({
        type: 'conversation',
        title: 'Conversations',
        description: 'Answer questions about short conversations.',
        items: convItems
      });
    }
    
    // Academic Talks as separate category
    if (data.academicTalks && data.academicTalks.length > 0) {
      const academicTalkItems: AudioItem[] = [];
      data.academicTalks.forEach((talk: any, talkIdx: number) => {
        const script = talk.script || talk.content || '';
        const questions = talk.questions || [talk];
        questions.forEach((q: any, qIdx: number) => {
          academicTalkItems.push({
            id: 2000 + talkIdx * 100 + qIdx + 1,
            audioScript: script,
            duration: talk.duration || calculateDuration(script),
            question: q.question || q.text || '',
            options: q.options || [],
            correctAnswer: resolveCorrectAnswer(q.correctAnswer, q.options || []),
            audioUrl: talk.audioUrl || q.audioUrl
          });
        });
      });
      if (academicTalkItems.length > 0) {
        result.push({
          type: 'academic-talk',
          title: 'Academic Talks',
          description: 'Answer questions about academic lectures and talks.',
          items: academicTalkItems
        });
      }
    }
    
    return result;
  };
  
  // Parse scripts + questions arrays from AI-generated listening tests
  // Key feature: Groups multiple questions under the same script (audio plays once, then multiple questions shown sequentially)
  const parseScriptsAndQuestionsToCategories = (scripts: any[], questions: any[]): Category[] => {
    const categoryMap: Record<CategoryType, AudioItem[]> = {
      'choose-response': [],
      'conversation': [],
      'academic-talk': []
    };
    
    // Determine category based on script type OR content analysis
    const getCategoryFromScriptType = (scriptType: string, scriptContent?: string): CategoryType => {
      const type = (scriptType || '').toLowerCase().replace(/_/g, '-');
      
      // First try explicit type - check for listen-and-choose FIRST (highest priority)
      if (type === 'listen-and-choose' || type === 'choose-response' || type === 'listen-choose' || 
          type.includes('listen-and-choose') || type.includes('choose-response') || type.includes('response')) {
        console.log('[Listening Parser] Detected type: choose-response (from explicit type)');
        return 'choose-response';
      }
      if (type === 'lecture' || type === 'academic-talk' || type === 'academic-lecture' || type.includes('lecture') || type.includes('podcast')) {
        return 'academic-talk';
      }
      if (type === 'conversation' || type.includes('conversation') || type.includes('dialogue') || type.includes('announcement') || type.includes('campus') || type.includes('monologue')) {
        return 'conversation';
      }
      
      // If no type specified, analyze content to infer type
      if (!type && scriptContent) {
        const content = scriptContent.toLowerCase();
        
        // Check for lecture/podcast indicators FIRST (academic talk)
        if (/listen to (a |part of a )?(lecture|podcast)/i.test(content) ||
            /lecturer:/i.test(content) ||
            /podcast host:/i.test(content) ||
            /in a .*(class|course)/i.test(content)) {
          console.log('[Listening Parser] Inferred type: academic-talk (from lecture/podcast context)');
          return 'academic-talk';
        }
        
        // Check for conversation indicators (multiple speakers in dialogue, or announcements)
        const hasStudent = /student(\s*\d*)?\s*:/i.test(content);
        const hasAdvisor = /advisor\s*:/i.test(content);
        const hasLibrarian = /librarian\s*:/i.test(content);
        const hasMan = /\bman\s*:/i.test(content);
        const hasWoman = /\bwoman\s*:/i.test(content);
        const hasAnnouncement = /announcement/i.test(content) || /attention (students|everyone)/i.test(content);
        
        if ((hasStudent && (hasAdvisor || hasLibrarian)) || (hasMan && hasWoman) || hasAnnouncement) {
          console.log('[Listening Parser] Inferred type: conversation (from speaker/announcement analysis)');
          return 'conversation';
        }
        
        // Default to academic-talk for content with professor or educational context
        if (/professor|lecture|class|academic/i.test(content)) {
          console.log('[Listening Parser] Inferred type: academic-talk (default from educational context)');
          return 'academic-talk';
        }
      }
      
      // Default fallback
      console.log('[Listening Parser] Using default fallback: academic-talk');
      return 'academic-talk';
    };
    
    // Group questions by their scriptIndex
    const questionsByScript: Record<number, any[]> = {};
    questions.forEach((q) => {
      const scriptIdx = q.scriptIndex ?? 0;
      if (!questionsByScript[scriptIdx]) {
        questionsByScript[scriptIdx] = [];
      }
      questionsByScript[scriptIdx].push(q);
    });
    
    console.log(`[Listening Parser] Total scripts: ${scripts.length}, Total questions: ${questions.length}`);
    
    // Process each script and its questions
    scripts.forEach((script, scriptIdx) => {
      const scriptType = script.type || '';
      const scriptContent = script.content || script.script || '';
      // Pass both type and content for better category detection
      const categoryType = getCategoryFromScriptType(scriptType, scriptContent);
      const audioUrl = script.audioUrl || null;
      const scriptQuestions = questionsByScript[scriptIdx] || [];
      const totalQuestionsInGroup = scriptQuestions.length;
      const scriptId = `script-${scriptIdx}`;
      
      console.log(`[Listening Parser] Script ${scriptIdx}: type="${scriptType}" -> category="${categoryType}", questions=${totalQuestionsInGroup}, audioUrl="${audioUrl || 'none'}"`);
      
      // Create AudioItem for each question, with grouping metadata
      scriptQuestions.forEach((q, qIdx) => {
        const isFirstInGroup = qIdx === 0;
        
        // Set hideQuestionText to true for choose-response type (Listen and Choose a Response)
        // This hides options in exam mode, shows them in practice mode
        const isChooseResponse = categoryType === 'choose-response';
        
        const item: AudioItem = {
          id: scriptIdx * 100 + qIdx + 1,
          // Only include audioScript for the first question in the group
          audioScript: isFirstInGroup ? scriptContent : '',
          duration: script.duration ? String(script.duration) : calculateDuration(scriptContent),
          question: q.question || '',
          options: q.options || [],
          correctAnswer: resolveCorrectAnswer(q.correctAnswer, q.options || []),
          // Only include audioUrl for the first question in the group
          audioUrl: isFirstInGroup ? audioUrl : undefined,
          // Pass optionTimestamps for choose-response highlight sync.
          // Fallback to script-level timestamps in case top-level questions array
          // wasn't updated (e.g. older audio generated before per-question storage).
          optionTimestamps: q.optionTimestamps ||
            (isChooseResponse && isFirstInGroup
              ? (script.optionTimestamps || script.questions?.[0]?.optionTimestamps)
              : undefined),
          // Grouping metadata
          scriptId: scriptId,
          questionIndex: qIdx,
          totalQuestionsInGroup: totalQuestionsInGroup,
          isFirstInGroup: isFirstInGroup,
          // Hide options for Listen and Choose a Response (show in practice mode only)
          hideQuestionText: isChooseResponse
        };
        
        categoryMap[categoryType].push(item);
      });
    });
    
    console.log(`[Listening Parser] Final category counts: choose-response=${categoryMap['choose-response'].length}, conversation=${categoryMap['conversation'].length}, academic-talk=${categoryMap['academic-talk'].length}`);
    
    // Build result with categories (3 categories for NEW TOEFL 2026)
    // Order: Listen and Choose a Response -> Conversations -> Academic Talks
    const result: Category[] = [];
    
    // Listen and Choose a Response (FIRST - this is the NEW TOEFL 2026 format)
    result.push({
      type: 'choose-response',
      title: 'Listen and Choose a Response',
      description: 'Listen to a short audio and select the best response.',
      items: categoryMap['choose-response']
    });
    
    // Conversations
    result.push({
      type: 'conversation',
      title: 'Conversations',
      description: 'Answer questions about short conversations.',
      items: categoryMap['conversation']
    });
    
    // Academic Talks
    result.push({
      type: 'academic-talk',
      title: 'Academic Talks',
      description: 'Answer questions about academic lectures and talks.',
      items: categoryMap['academic-talk']
    });
    
    return result;
  };
  
  // Parse passages array from AI-generated tests
  const parsePassagesToCategories = (passages: any[]): Category[] => {
    const categoryMap: Record<CategoryType, AudioItem[]> = {
      'choose-response': [],
      'conversation': [],
      'academic-talk': []
    };
    
    passages.forEach((passage: any, passageIdx: number) => {
      const script = passage.script || passage.content || '';
      const passageType = (passage.type || '').toLowerCase().replace(/_/g, '-');
      
      // Determine category from passage type - prioritize exact match first
      let categoryType: CategoryType = 'conversation';
      
      // Check for exact type matches first
      if (passageType === 'conversation' || passageType === 'announcement') {
        categoryType = 'conversation';
      } else if (passageType === 'academic-talk' || passageType === 'academictalk' || passageType === 'lecture' || passageType === 'podcast') {
        categoryType = 'academic-talk';
      } else if (passageType === 'choose-response' || passageType === 'chooseresponse') {
        categoryType = 'choose-response';
      }
      // Then check for partial matches
      else if (passageType.includes('choose') || passageType.includes('response')) {
        categoryType = 'choose-response';
      } else if (passageType.includes('academic') || passageType.includes('talk') || passageType.includes('lecture') || passageType.includes('podcast')) {
        categoryType = 'academic-talk';
      } else if (passageType.includes('conversation') || passageType.includes('dialogue') || passageType.includes('announcement')) {
        categoryType = 'conversation';
      } else {
        // Content-based detection for fallback
        const hasStudent = /student(\s*\d*)?\s*:/i.test(script);
        const hasAdvisor = /advisor\s*:/i.test(script);
        const hasMan = /\bman\s*:/i.test(script);
        const hasWoman = /\bwoman\s*:/i.test(script);
        const hasProfessor = /professor\s*:/i.test(script);
        const hasPodcast = /podcast\s*host\s*:/i.test(script);
        const hasLibrarian = /librarian\s*:/i.test(script);
        const hasNarrator = /narrator\s*:.*listen\s*to\s*(part\s*of\s*)?a\s*(lecture|talk|podcast)/i.test(script);
        const hasAnnouncement = /announcement/i.test(script) || /attention (students|everyone)/i.test(script);
        
        // Check narrator intro for type hints
        if (hasNarrator || hasPodcast || /professor\s*:.*today.*lecture|let.*me.*explain|as.*we.*discussed/i.test(script)) {
          categoryType = 'academic-talk';
        } else if ((hasMan && hasWoman) || (hasStudent && (hasAdvisor || hasLibrarian)) || hasAnnouncement) {
          categoryType = 'conversation';
        } else if (hasProfessor && script.length > 800 && !hasStudent) {
          categoryType = 'academic-talk';
        } else if (script.length < 200) {
          categoryType = 'choose-response';
        }
      }
      
      console.log(`[Listening Parser] Passage ${passageIdx}: type="${passageType}" -> default category="${categoryType}"`);
      
      const questions = passage.questions || [passage];
      console.log(`[Listening Parser] Passage ${passageIdx} has ${questions.length} questions, types: ${questions.map((q: any) => q.type || 'unknown').join(', ')}`);
      questions.forEach((q: any, qIdx: number) => {
        // Use individual question type if available, fallback to passage category
        const qType = (q.type || '').toLowerCase().replace(/_/g, '-');
        let itemCategory = categoryType;
        
        // Override category based on individual question type
        if (qType === 'choose-response' || qType === 'chooseresponse' || qType.includes('choose')) {
          itemCategory = 'choose-response';
        } else if (qType === 'academic-talk' || qType === 'academictalk' || qType.includes('lecture') || qType.includes('podcast')) {
          itemCategory = 'academic-talk';
        } else if (qType === 'conversation' || qType.includes('conversation') || qType.includes('announcement')) {
          itemCategory = 'conversation';
        }
        
        // Use question-specific script/audioScript if available
        const itemScript = q.audioScript || q.script || script;
        
        const audioUrl = q.audioUrl || passage.audioUrl || null;
        console.log(`[Listening Parser] Q${qIdx}: type=${qType}, itemCategory=${itemCategory}, audioUrl=${audioUrl || 'none'}`);
        
        categoryMap[itemCategory].push({
          id: passageIdx * 100 + qIdx + 1,
          audioScript: itemScript,
          duration: q.duration || passage.duration || calculateDuration(itemScript),
          question: q.question || q.questionText || q.text || 'What is the best response?',
          options: q.options || [],
          correctAnswer: resolveCorrectAnswer(q.correctAnswer, q.options || []),
          audioUrl,
          optionTimestamps: q.optionTimestamps,
          hideQuestionText: itemCategory === 'choose-response'
        });
      });
    });
    
    console.log(`[Listening Parser] Category counts: choose-response=${categoryMap['choose-response'].length}, conversation=${categoryMap['conversation'].length}, academic-talk=${categoryMap['academic-talk'].length}`);
    
    // Return categories (3 categories for NEW TOEFL 2026)
    const result: Category[] = [];
    if (categoryMap['choose-response'].length > 0) {
      result.push({
        type: 'choose-response',
        title: 'Listen and Choose a Response',
        description: 'Select the best response to the question or statement.',
        items: categoryMap['choose-response']
      });
    }
    // Include main categories if any of them have items
    const hasMainCategories = categoryMap['conversation'].length > 0 || 
                               categoryMap['academic-talk'].length > 0;
    
    if (hasMainCategories) {
      result.push({
        type: 'conversation',
        title: 'Conversations',
        description: 'Answer questions about short conversations.',
        items: categoryMap['conversation']
      });
      result.push({
        type: 'academic-talk',
        title: 'Academic Talks',
        description: 'Answer questions about academic lectures and talks.',
        items: categoryMap['academic-talk']
      });
    }
    
    return result;
  };
  
  const parseTestDataToCategories = (questions: any[]): Category[] => {
    const categoryMap: Record<CategoryType, AudioItem[]> = {
      'choose-response': [],
      'conversation': [],
      'academic-talk': []
    };
    
    // Helper to detect question category based on type and content
    const detectCategory = (q: any, qIndex: number): CategoryType => {
      const rawType = (q.type || q.questionType || '').toLowerCase();
      const script = (q.script || q.prompt || q.audioScript || '').toLowerCase();
      const questionText = (q.question || '').toLowerCase();
      
      // Priority 1: Use explicit type when present
      if (rawType === 'conversation' || rawType === 'announcement') return 'conversation';
      if (rawType === 'academic-talk' || rawType === 'academic_talk' || rawType === 'lecture' || rawType === 'podcast') {
        return 'academic-talk';
      }
      if (rawType === 'choose-response' || rawType === 'choose_response' || rawType === 'listen-and-choose' || rawType === 'listen_and_choose') return 'choose-response';
      
      // Priority 2: Check section headers in question content
      const fullContent = `${script} ${questionText}`;
      
      // Check for section header markers
      if (/conversation\s*\(questions?\s*\d+/i.test(fullContent) || 
          /\bconversation\b.*\bquestions?\b/i.test(fullContent) ||
          /announcement\s*\(questions?/i.test(fullContent)) {
        return 'conversation';
      }
      if (/academic\s*talk|lecture\s*\(questions?|podcast/i.test(fullContent)) {
        return 'academic-talk';
      }
      if (/listen\s*(and|&)?\s*choose\s*(a\s*)?response/i.test(fullContent)) {
        return 'choose-response';
      }
      
      // Priority 3: Content-based detection
      
      // Check if it's a dialogue (has multiple speakers)
      const hasStudent = /student(\s*\d*)?\s*:/i.test(script);
      const hasProfessor = /professor\s*:/i.test(script);
      const hasMan = /\bman\s*:/i.test(script);
      const hasWoman = /\bwoman\s*:/i.test(script);
      const hasAdvisor = /advisor\s*:/i.test(script);
      const hasLibrarian = /librarian\s*:/i.test(script);
      const hasNarrator = /narrator\s*:/i.test(script);
      const hasEmployee = /employee\s*:/i.test(script);
      const hasRegistrar = /registrar\s*:/i.test(script);
      
      // Conversations: dialogues between student and another person (professor, advisor, etc.)
      if (hasStudent && (hasProfessor || hasMan || hasWoman || hasAdvisor || hasLibrarian || hasEmployee || hasRegistrar)) {
        return 'conversation';
      }
      
      // Conversations: dialogues between man and woman (campus scenarios)
      if (hasMan && hasWoman) {
        return 'conversation';
      }
      
      // Academic talks/lectures: long content with professor speaking alone
      if ((hasProfessor || /lecturer\s*:/i.test(script) || /podcast\s*host\s*:/i.test(script)) && !hasStudent && !hasMan && !hasWoman && script.length > 500) {
        return 'academic-talk';
      }
      
      // Pure narrative with narrator only (long form) -> academic talk
      if (hasNarrator && !hasStudent && !hasProfessor && !hasMan && !hasWoman && script.length > 500) {
        return 'academic-talk';
      }
      
      // Length-based fallback with stricter thresholds
      // Very short prompts (< 150 chars) with simple question-response = choose-response
      if (script.length < 150 && /\?\s*$/.test(script.trim())) {
        return 'choose-response';
      }
      
      // Medium length dialogue-like content
      if (script.length < 400) {
        return 'choose-response';
      }
      
      // Longer content with multiple speakers = conversation
      const speakerCount = (script.match(/\b(man|woman|student|professor|advisor|employee)\s*:/gi) || []).length;
      if (speakerCount >= 2 && script.length < 1500) {
        return 'conversation';
      }
      
      // Very long content without clear dialogue patterns → academic talk
      if (script.length > 800) {
        return 'academic-talk';
      }
      
      return 'choose-response';
    };
    
    questions.forEach((q: any, index: number) => {
      const type = detectCategory(q, index);
      const script = q.script || q.prompt || q.audioScript || '';
      
      // For choose-response type, the question should be simple, not the script
      // Strip speaker labels from question text if it looks like a script
      let questionText = q.question || 'What is the best response?';
      // Extended regex to handle variants like "Student 1:", "Woman (excited):", "Man 2:", etc.
      const looksLikeScript = /^(Woman|Man|Student|Professor|Narrator|Lecturer|M|W|F|S|P|N|L|Speaker|Male|Female|Person)(\s*\d+|\s*\([^)]+\))?\s*:/i.test(questionText);
      if (type === 'choose-response' && looksLikeScript) {
        questionText = 'What is the best response?';
      }
      
      const item: AudioItem = {
        id: index + 1,
        audioScript: script,
        duration: q.duration || calculateDuration(script),
        question: questionText,
        options: q.options || [],
        correctAnswer: resolveCorrectAnswer(q.correctAnswer, q.options || []),
        audioUrl: q.audioUrl,
        optionTimestamps: q.optionTimestamps, // For audio highlight sync
        // Hide options for Listen and Choose a Response (show in practice mode only)
        hideQuestionText: type === 'choose-response'
      };
      
      categoryMap[type].push(item);
    });
    
    // Build result with all non-empty categories
    const result: Category[] = [];
    
    if (categoryMap['choose-response'].length > 0) {
      result.push({
        type: 'choose-response',
        title: 'Listen and Choose a Response',
        description: 'Select the best response to the question or statement.',
        items: categoryMap['choose-response']
      });
    }
    if (categoryMap['conversation'].length > 0) {
      result.push({
        type: 'conversation',
        title: 'Conversations',
        description: 'Answer questions about short conversations.',
        items: categoryMap['conversation']
      });
    }
    if (categoryMap['academic-talk'].length > 0) {
      result.push({
        type: 'academic-talk',
        title: 'Academic Talks',
        description: 'Answer questions about academic lectures and talks.',
        items: categoryMap['academic-talk']
      });
    }
    
    return result;
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentCategory = activeCategories[currentCategoryIndex] || activeCategories[0];
  const currentItem = currentCategory?.items[currentItemIndex] || currentCategory?.items[0];
  currentCategoryRef.current = currentCategory;
  currentItemRef.current = currentItem;
  const totalItems = activeCategories.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedCount = completedItems.size;

  const saveTestSubmission = async (): Promise<boolean> => {
    if (!user?.id || !testId || submissionSaved) return submissionSaved;
    try {
      const timeSpentMinutes = Math.round((Date.now() - testStartTimeRef.current) / 60000) || 1;
      await apiRequest("POST", "/api/test-attempts", {
        userId: user.id,
        testId: testId,
        totalScore: Math.round((completedItems.size / totalItems) * 100),
        sectionScores: {
          section: "listening",
          examType: "new-toefl",
          completedCount: completedItems.size,
          totalItems: totalItems,
          answers: answers,
        },
        timeSpent: timeSpentMinutes,
        status: "completed"
      });
      setSubmissionSaved(true);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleFullTestSectionComplete = async () => {
    await saveTestSubmission();
    const rawScore = totalItems > 0 ? (completedCount / totalItems) : 0;
    const sectionScore = Math.max(1, Math.min(6, rawScore * 6)).toFixed(1);
    const urlParams: Record<string, string> = { section: 'listening', score: sectionScore };
    if (fullTestAttemptId) urlParams.attemptId = fullTestAttemptId;
    setLocation('/new-toefl/full-test?' + new URLSearchParams(urlParams).toString());
  };

  useEffect(() => {
    return () => {
      if (user?.id && testId && !submissionSaved && completedItems.size > 0) {
        const timeSpent = Math.round((Date.now() - testStartTimeRef.current) / 60000);
        fetch('/api/test-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: user.id,
            testId: testId,
            sectionScores: { section: "listening", examType: "new-toefl", completedCount: completedItems.size, partial: true },
            timeSpent: timeSpent || 1,
            status: "completed"
          })
        }).catch(() => {});
      }
    };
  }, []);

  // Helper to generate audio group key based on script content
  const getAudioGroupKey = (categoryIndex: number, item: AudioItem, itemIndex?: number): string => {
    // For choose-response, each item has unique audio
    const category = activeCategories[categoryIndex];
    if (category?.type === 'choose-response') {
      return `${categoryIndex}-${item?.id ?? `item-${itemIndex ?? 0}`}`;
    }
    // For conversation/announcement, group by script content (first 100 chars as identifier)
    const scriptKey = item?.audioScript?.substring(0, 100);
    if (!scriptKey) return `${categoryIndex}-item-${itemIndex ?? 0}`;
    return `${categoryIndex}-${scriptKey}`;
  };
  
  // Check if category has items - used for early returns
  const hasItems = currentCategory?.items && currentCategory.items.length > 0;
  
  // Check if current item's audio group has already been played
  // Only compute valid group key when item exists
  const currentAudioGroupKey = (hasItems && currentItem) 
    ? getAudioGroupKey(currentCategoryIndex, currentItem, currentItemIndex) 
    : '';
  const hasPlayedCurrentGroup = currentAudioGroupKey ? playedAudioGroups.has(currentAudioGroupKey) : false;
  
  // Find first item index in current audio group (for conversation/announcement)
  const getFirstItemIndexInGroup = (): number => {
    if (!hasItems || !currentItem) return 0;
    if (currentCategory?.type === 'choose-response') return currentItemIndex;
    const currentScript = currentItem?.audioScript?.substring(0, 100) || '';
    for (let i = 0; i < currentCategory.items.length; i++) {
      const itemScript = currentCategory.items[i].audioScript?.substring(0, 100) || '';
      if (itemScript === currentScript) return i;
    }
    return currentItemIndex;
  };

  // Get all items in the same audio group (questions sharing the same audio)
  const getItemsInCurrentGroup = (): { item: AudioItem; index: number }[] => {
    if (!currentCategory || !currentItem) return [];
    if (currentCategory.type === 'choose-response') {
      return [{ item: currentItem, index: currentItemIndex }];
    }
    const currentScript = currentItem?.audioScript?.substring(0, 100) || '';
    const groupItems: { item: AudioItem; index: number }[] = [];
    for (let i = 0; i < currentCategory.items.length; i++) {
      const itemScript = currentCategory.items[i].audioScript?.substring(0, 100) || '';
      if (itemScript === currentScript) {
        groupItems.push({ item: currentCategory.items[i], index: i });
      }
    }
    return groupItems;
  };

  const currentGroupItems = getItemsInCurrentGroup();
  
  // Effect to show question directly if audio group was already played
  // Use currentAudioGroupKey directly to ensure we're checking the correct group
  useEffect(() => {
    // Skip if no items in category or no current item
    if (!currentCategory?.items?.length || !currentItem) return;
    
    // Recompute the group key inside the effect to avoid stale closure issues
    const category = activeCategories[currentCategoryIndex];
    if (!category) return;
    
    let computedGroupKey: string;
    if (category.type === 'choose-response') {
      computedGroupKey = `${currentCategoryIndex}-${currentItem.id}`;
    } else {
      const scriptKey = currentItem.audioScript?.substring(0, 100);
      if (!scriptKey) return; // No script, skip group tracking
      computedGroupKey = `${currentCategoryIndex}-${scriptKey}`;
    }
    
    if (playedAudioGroups.has(computedGroupKey) && !showQuestion) {
      setAudioProgress(100);
      setShowQuestion(true);
      setIsPlaying(false);
    }
  }, [currentCategoryIndex, currentItemIndex, currentItem?.id, playedAudioGroups, showQuestion, activeCategories, currentCategory?.items?.length]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      } else if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
      setIsPlaying(false);
      return;
    }
    
    const itemKey = `${currentCategoryIndex}-${currentItemIndex}`;
    const cachedAudioUrl = generatedAudioUrls[itemKey];
    const hasAudioUrl = currentItem?.audioUrl || cachedAudioUrl;
    
    console.log(`[Audio Debug] Play pressed. itemKey=${itemKey}, currentItem.audioUrl=${currentItem?.audioUrl}, cachedAudioUrl=${cachedAudioUrl}, hasAudioUrl=${hasAudioUrl}, hasAudioScript=${!!currentItem?.audioScript}`);
    
    const isChooseResponseCat = currentCategory?.type === 'choose-response';
    const hasTimestamps = !!optionTimestampsMapRef.current[itemKey];

    if (hasAudioUrl && audioRef.current) {
      audioRef.current.src = currentItem?.audioUrl || cachedAudioUrl;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.volume = audioVolume;

      // For choose-response: always fetch fresh timestamps from TTS API before playing.
      // This ensures we use precise timestamps from buildChooseResponseAudio, not
      // pre-loaded estimated ones that may be stale or out-of-sync with cached audio.
      if (isChooseResponseCat && currentItem?.audioScript) {
        try {
          const tsRes = await fetch('/api/ai/generate-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              script: currentItem.audioScript,
              contentType: 'choose-response',
              options: currentItem.options || []
            })
          });
          const tsData = await tsRes.json();
          if (tsData.optionTimestamps && Array.isArray(tsData.optionTimestamps) && tsData.optionTimestamps.length > 0) {
            optionTimestampsMapRef.current = { ...optionTimestampsMapRef.current, [itemKey]: tsData.optionTimestamps };
            setOptionTimestampsMap(prev => ({ ...prev, [itemKey]: tsData.optionTimestamps }));
            console.log(`[Choose-Response] Fetched timestamps for ${itemKey}:`, tsData.optionTimestamps.length, 'options');
            // If audio somehow started before timestamps arrived, restart RAF to pick them up
            if (audioRef.current && !audioRef.current.paused && rafRef.current === null) {
              startOptionHighlightRAF();
            }
          }
          // If a fresh audio URL was returned (cache miss), use it
          if (tsData.audioUrl && audioRef.current && tsData.audioUrl !== audioRef.current.src) {
            audioRef.current.src = tsData.audioUrl;
            setGeneratedAudioUrls(prev => ({ ...prev, [itemKey]: tsData.audioUrl }));
          }
        } catch (e) {
          console.warn('[Choose-Response] Timestamp fetch failed, proceeding without highlights:', e);
        }
      }

      try {
        await unlockAudioContext();
        await playSafariCompatibleAudio(audioRef.current);
        setIsPlaying(true);
      } catch (err) {
        console.error('Audio playback failed:', err);
        startSimulatedPlayback();
        setIsPlaying(true);
      }
    } else if (currentItem?.audioScript && currentItem.audioScript.trim().length > 0 && !isGeneratingAudio) {
      setIsGeneratingAudio(true);
      
      try {
        const isChooseResponseItem = currentCategory.type === 'choose-response' || currentItem.hideQuestionText;
        const contentTypeForTTS = currentCategory.type === 'academic-talk' ? 'academic' :
                                   isChooseResponseItem ? 'choose-response' : 'conversation';
        
        const ttsBody: any = { 
          script: currentItem.audioScript,
          contentType: contentTypeForTTS
        };
        if (isChooseResponseItem && currentItem.options && currentItem.options.length > 0) {
          ttsBody.options = currentItem.options;
        }
        
        const response = await fetch('/api/ai/generate-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ttsBody)
        });
        
        if (!response.ok) {
          throw new Error('Audio generation failed');
        }
        
        const data = await response.json();
        if (data.audioUrl) {
          setGeneratedAudioUrls(prev => ({ ...prev, [itemKey]: data.audioUrl }));
          if (data.segmentDurations && Array.isArray(data.segmentDurations)) {
            console.log(`[Script Sync] Stored segment durations for ${itemKey}:`, data.segmentDurations.length, 'segments');
            setSegmentDurationsMap(prev => ({ ...prev, [itemKey]: data.segmentDurations }));
          }
          if (data.optionTimestamps && Array.isArray(data.optionTimestamps) && data.optionTimestamps.length > 0) {
            console.log(`[Choose-Response] Stored optionTimestamps for ${itemKey}:`, data.optionTimestamps.length, 'options');
            // Update ref immediately so timeupdate handler can use it before React re-render
            optionTimestampsMapRef.current = { ...optionTimestampsMapRef.current, [itemKey]: data.optionTimestamps };
            setOptionTimestampsMap(prev => ({ ...prev, [itemKey]: data.optionTimestamps }));
          }
          if (audioRef.current) {
            audioRef.current.src = data.audioUrl;
            audioRef.current.playbackRate = playbackSpeed;
            audioRef.current.volume = audioVolume;
            try {
              await unlockAudioContext();
              await playSafariCompatibleAudio(audioRef.current);
              setIsPlaying(true);
            } catch (err) {
              console.error('Audio playback failed:', err);
            }
          }
        }
      } catch (error) {
        console.error('TTS generation error:', error);
        toast({
          title: "음성 생성 실패",
          description: "음성 서비스에 연결할 수 없습니다. 시뮬레이션 모드로 전환합니다.",
          variant: "destructive"
        });
        startSimulatedPlayback();
        setIsPlaying(true);
      } finally {
        setIsGeneratingAudio(false);
      }
    } else {
      startSimulatedPlayback();
      setIsPlaying(true);
    }
  };
  
  const startSimulatedPlayback = () => {
    audioIntervalRef.current = setInterval(() => {
      setAudioProgress(prev => {
        if (prev >= 100) {
          clearInterval(audioIntervalRef.current!);
          setIsPlaying(false);
          setShowQuestion(true);
          // Mark this audio group as played
          if (currentAudioGroupKey) {
            setPlayedAudioGroups(prevGroups => new Set(prevGroups).add(currentAudioGroupKey));
          }
          return 100;
        }
        return prev + 1;
      });
    }, 50);
  };
  
  // Helper function to calculate line index based on word count proportions
  const calculateLineIndexFromProgress = (script: string, progressRatio: number): number => {
    const lines = script.split('\n').filter((line: string) => line.trim());
    if (lines.length === 0) return 0;
    
    // Calculate word counts for each line
    const wordCounts = lines.map((line: string) => line.split(/\s+/).length);
    const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);
    
    if (totalWords === 0) return 0;
    
    // Find which line corresponds to the current progress based on cumulative word ratio
    let cumulativeRatio = 0;
    for (let i = 0; i < lines.length; i++) {
      cumulativeRatio += wordCounts[i] / totalWords;
      if (progressRatio <= cumulativeRatio) {
        return i;
      }
    }
    return lines.length - 1;
  };
  
  // RAF-based option highlight polling (60fps precision instead of timeupdate ~250ms)
  const startOptionHighlightRAF = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // pausedTicks: Safari sometimes reports audio.paused=true for a few frames right
    // after play() before the audio truly starts. Tolerate up to 12 frames (~200ms at
    // 60fps) of paused state before genuinely terminating. handleAudioPause() cancels
    // the RAF immediately on true user-pause, so this grace window is safe.
    let pausedTicks = 0;
    const MAX_PAUSED_TICKS = 12;
    const poll = () => {
      if (!audioRef.current || audioRef.current.ended) {
        rafRef.current = null;
        setActivePlayingOption(null);
        return;
      }
      if (audioRef.current.paused) {
        pausedTicks++;
        if (pausedTicks > MAX_PAUSED_TICKS) {
          rafRef.current = null;
          return;
        }
        // During grace period, keep RAF alive but skip highlight updates
        rafRef.current = requestAnimationFrame(poll);
        return;
      }
      pausedTicks = 0;
      const cur = audioRef.current.currentTime;
      const itemKey = `${currentCategoryIndexRef.current}-${currentItemIndexRef.current}`;
      const optTimestamps = optionTimestampsMapRef.current[itemKey];
      if (optTimestamps && optTimestamps.length > 0) {
        // Validate timestamps: filter out entries with endTime <= startTime (corrupted/old format
        // where the "second pass" endTime fill wasn't applied, leaving endTime=0).
        let workingTimestamps = optTimestamps.filter(ts => ts.endTime > ts.startTime);
        // If all timestamps are corrupted (endTime=0), reconstruct endTimes from adjacent
        // startTimes so old cached entries still produce highlights.
        if (workingTimestamps.length === 0 && optTimestamps.length > 0) {
          const audioDur = audioRef.current?.duration || 0;
          workingTimestamps = optTimestamps.map((ts, i) => ({
            ...ts,
            endTime: i < optTimestamps.length - 1
              ? optTimestamps[i + 1].startTime
              : (audioDur > 0 ? audioDur : ts.startTime + 5)
          })).filter(ts => ts.endTime > ts.startTime);
        }
        let foundOpt: string | null = null;
        if (workingTimestamps.length > 0) {
          for (const ts of workingTimestamps) {
            if (cur >= ts.startTime && cur < ts.endTime) { foundOpt = ts.option; break; }
          }
          // If no match found but we're past the last valid option's startTime, keep it highlighted
          // (handles slight endTime underestimation from VBR audio duration calculation)
          if (foundOpt === null) {
            const last = workingTimestamps[workingTimestamps.length - 1];
            if (cur >= last.startTime) foundOpt = last.option;
          }
        }
        // If no workingTimestamps could be recovered, fall through with foundOpt=null
        setActivePlayingOption(prev => prev !== foundOpt ? foundOpt : prev);
      } else {
        // No timestamps available yet — clear any stale highlight from a previous item
        setActivePlayingOption(prev => prev !== null ? null : prev);
      }
      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      setAudioCurrentTime(current);
      setAudioProgress((current / duration) * 100);

      // Ensure RAF is running for choose-response highlight sync.
      // This auto-restarts it if it was killed by the Safari paused-tick grace period
      // or if it never started (e.g., timestamps arrived after onPlay fired and RAF died).
      if (
        currentCategory?.type === 'choose-response' &&
        !audioRef.current.paused &&
        !audioRef.current.ended &&
        rafRef.current === null
      ) {
        startOptionHighlightRAF();
      }
      
      const script = currentItem?.audioScript || '';
      const itemKey = `${currentCategoryIndexRef.current}-${currentItemIndexRef.current}`;
      if (script && duration > 0) {
        const segDurations = segmentDurationsMap[itemKey];
        const currentMs = current * 1000;
        
        let lineIndex: number;
        if (segDurations && segDurations.length > 0) {
          lineIndex = 0;
          for (let i = 0; i < segDurations.length; i++) {
            if (currentMs >= segDurations[i].startMs && currentMs < segDurations[i].endMs) {
              lineIndex = i;
              break;
            } else if (currentMs >= segDurations[i].endMs) {
              lineIndex = Math.min(i + 1, segDurations.length - 1);
            }
          }
        } else {
          const progressRatio = current / duration;
          lineIndex = calculateLineIndexFromProgress(script, progressRatio);
        }
        
        if (lineIndex !== currentScriptLineIndex) {
          setCurrentScriptLineIndex(lineIndex);
          
          if (showScriptPanel && scriptLinesRef.current[lineIndex]) {
            scriptLinesRef.current[lineIndex].scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }
      }
    }
  };
  
  const handleAudioEnded = async () => {
    setIsPlaying(false);
    setShowQuestion(true);
    setAudioProgress(100);
    setActivePlayingOption(null);
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    
    if (currentAudioGroupKey) {
      setPlayedAudioGroups(prev => new Set(prev).add(currentAudioGroupKey));
    }
    
  };
  
  // Cache for question audio URLs to avoid repeated generation
  const [questionAudioUrls, setQuestionAudioUrls] = useState<Record<string, string>>({});
  const [isGeneratingQuestionAudio, setIsGeneratingQuestionAudio] = useState(false);
  
  const stopAllAudio = (resetProgress: boolean = false) => {
    if (questionAudioTimeoutRef.current) {
      clearTimeout(questionAudioTimeoutRef.current);
      questionAudioTimeoutRef.current = null;
    }
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    // Cancel option-highlight RAF explicitly so the highlight clears immediately
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setActivePlayingOption(null);
    if (resetProgress) {
      setAudioProgress(0);
      setAudioCurrentTime(0);
    }
  };
  
  // Play question audio for conversation/academic-talk items
  // Takes explicit indices to avoid stale closure issues
  const playQuestionAudio = async (item: AudioItem, catIdx?: number, itemIdx?: number) => {
    if (!item?.question || item.question.trim().length === 0) return;
    if (isGeneratingQuestionAudio) return; // Prevent overlapping requests
    
    // Stop any current audio first
    stopAllAudio();
    
    // Use explicit indices if provided, fallback to current state
    const categoryIndex = catIdx ?? currentCategoryIndex;
    const questionIndex = itemIdx ?? currentItemIndex;
    const questionKey = `question-${item.id || `${categoryIndex}-${questionIndex}`}`;
    
    // Check cache first
    const cachedUrl = questionAudioUrls[questionKey];
    if (cachedUrl && audioRef.current) {
      audioRef.current.src = cachedUrl;
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.volume = audioVolume;
      try {
        await unlockAudioContext();
        await playSafariCompatibleAudio(audioRef.current);
        setIsPlaying(true);
      } catch (err) {
        console.error('Cached question audio playback failed:', err);
        setIsPlaying(false);
      }
      return;
    }
    
    setIsGeneratingQuestionAudio(true);
    
    try {
      // For conversation/academic-talk: Only read the QUESTION text, NOT the answer choices
      // The user should read options on screen while hearing the question
      const questionScript = item.question;
      
      const response = await fetch('/api/ai/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          script: questionScript,
          contentType: 'academic'  // Use clear academic speech for question reading
        })
      });
      
      if (!response.ok) {
        throw new Error('Question audio generation failed');
      }
      
      const data = await response.json();
      if (data.audioUrl) {
        // Cache the generated URL
        setQuestionAudioUrls(prev => ({ ...prev, [questionKey]: data.audioUrl }));
        
        if (audioRef.current) {
          audioRef.current.src = data.audioUrl;
          audioRef.current.playbackRate = playbackSpeed;
          audioRef.current.volume = audioVolume;
          try {
            await unlockAudioContext();
            await playSafariCompatibleAudio(audioRef.current);
            setIsPlaying(true);
          } catch (err) {
            console.error('Question audio playback failed:', err);
            setIsPlaying(false);
          }
        }
      }
    } catch (error) {
      console.error('Question TTS generation error:', error);
    } finally {
      setIsGeneratingQuestionAudio(false);
    }
  };
  
  // Schedule question audio with proper index capture and state validation
  const scheduleQuestionAudio = (item: AudioItem, catIdx: number, itemIdx: number, delay: number = 100) => {
    // Cancel any pending timeout
    if (questionAudioTimeoutRef.current) {
      clearTimeout(questionAudioTimeoutRef.current);
    }
    questionAudioTimeoutRef.current = setTimeout(() => {
      // Validate that we're still on the same item before playing
      // This prevents stale audio playback after rapid navigation
      if (currentCategoryIndex === catIdx && currentItemIndex === itemIdx) {
        // Reset progress for question audio
        setAudioProgress(0);
        setAudioCurrentTime(0);
        playQuestionAudio(item, catIdx, itemIdx);
      }
    }, delay);
  };
  
  const handleAudioLoaded = () => {
    if (audioRef.current) {
      const duration = audioRef.current.duration;
      setAudioDuration(duration);
    }
  };
  
  const handleAudioPlay = () => {
    if (currentCategory?.type === 'choose-response') {
      setShowQuestion(true);
    }
    startOptionHighlightRAF();
  };
  
  const handleAudioPause = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };
  
  const handleDownloadAudio = async () => {
    const itemKey = `${currentCategoryIndex}-${currentItemIndex}`;
    const audioUrl = currentItem?.audioUrl || generatedAudioUrls[itemKey];
    
    if (!audioUrl) {
      toast({
        title: "No Audio Available",
        description: "Please play the audio first to generate it.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `listening_${currentCategory.type}_${currentItemIndex + 1}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Could not download the audio file.",
        variant: "destructive"
      });
    }
  };

  const handleRestart = () => {
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setIsPlaying(false);
    setShowQuestion(false);
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSelectAnswer = (optionIndex: number) => {
    const key = `${currentCategoryIndex}-${currentItemIndex}`;
    setAnswers(prev => ({ ...prev, [key]: optionIndex }));
    setCompletedItems(prev => new Set(prev).add(key));
  };

  const handleNextItem = () => {
    if (!hasItems) return;
    if (currentItemIndex < currentCategory.items.length - 1) {
      const nextIndex = currentItemIndex + 1;
      const nextItem = currentCategory.items[nextIndex];
      
      setCurrentItemIndex(nextIndex);
      
      // For grouped questions: if not first in group, show question immediately
      const isFollowUpQuestion = nextItem?.isFirstInGroup === false;
      
      // Stop current audio when changing items and reset progress
      stopAllAudio(true);
      
      // Only check played groups if item exists and has a script
      if (nextItem?.audioScript) {
        const nextGroupKey = getAudioGroupKey(currentCategoryIndex, nextItem, nextIndex);
        if (playedAudioGroups.has(nextGroupKey)) {
          setAudioProgress(100);
          setShowQuestion(true);
          
          // Auto-play question audio for conversation/academic-talk when returning to played item
          if (currentCategory && ['conversation', 'academic-talk'].includes(currentCategory.type) && nextItem) {
            scheduleQuestionAudio(nextItem, currentCategoryIndex, nextIndex, 100);
          }
          return;
        }
      }
      
      // Show question immediately for follow-up questions in the same script group
      resetAudioState(isFollowUpQuestion);
      
      // For follow-up questions in conversation/academic-talk, auto-play question audio
      if (isFollowUpQuestion && currentCategory && ['conversation', 'academic-talk'].includes(currentCategory.type) && nextItem) {
        scheduleQuestionAudio(nextItem, currentCategoryIndex, nextIndex, 100);
      }
    }
  };

  const handlePrevItem = () => {
    if (!hasItems) return;
    if (currentItemIndex > 0) {
      const prevIndex = currentItemIndex - 1;
      const prevItem = currentCategory.items[prevIndex];
      
      setCurrentItemIndex(prevIndex);
      
      // Stop current audio when changing items and reset progress
      stopAllAudio(true);
      
      // For grouped questions: if not first in group, show question immediately
      const isFollowUpQuestion = prevItem?.isFirstInGroup === false;
      
      // Only check played groups if item exists and has a script
      if (prevItem?.audioScript) {
        const prevGroupKey = getAudioGroupKey(currentCategoryIndex, prevItem, prevIndex);
        if (playedAudioGroups.has(prevGroupKey)) {
          setAudioProgress(100);
          setShowQuestion(true);
          
          // Auto-play question audio for conversation/academic-talk when returning to played item
          if (currentCategory && ['conversation', 'academic-talk'].includes(currentCategory.type) && prevItem) {
            scheduleQuestionAudio(prevItem, currentCategoryIndex, prevIndex, 100);
          }
          return;
        }
      }
      
      // Show question immediately for follow-up questions in the same script group
      resetAudioState(isFollowUpQuestion);
      
      // For follow-up questions in conversation/academic-talk, auto-play question audio
      if (isFollowUpQuestion && currentCategory && ['conversation', 'academic-talk'].includes(currentCategory.type) && prevItem) {
        scheduleQuestionAudio(prevItem, currentCategoryIndex, prevIndex, 100);
      }
    }
  };

  const handleNextCategory = () => {
    if (currentCategoryIndex < activeCategories.length - 1) {
      const nextCatIndex = currentCategoryIndex + 1;
      const nextCategory = activeCategories[nextCatIndex];
      const nextItem = nextCategory?.items[0];
      
      setCurrentCategoryIndex(nextCatIndex);
      setCurrentItemIndex(0);
      
      // Stop current audio when changing categories and reset progress
      stopAllAudio(true);
      
      // Only check played groups if item exists and has a script
      if (nextItem?.audioScript) {
        const nextGroupKey = getAudioGroupKey(nextCatIndex, nextItem, 0);
        if (playedAudioGroups.has(nextGroupKey)) {
          setAudioProgress(100);
          setShowQuestion(true);
          
          // Auto-play question audio for conversation/academic-talk
          if (nextCategory && ['conversation', 'academic-talk'].includes(nextCategory.type) && nextItem) {
            scheduleQuestionAudio(nextItem, nextCatIndex, 0, 100);
          }
          return;
        }
      }
      resetAudioState();
    }
  };

  const resetAudioState = (showQuestionImmediately: boolean = false) => {
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setCurrentScriptLineIndex(0);  // Reset script line position
    // For grouped questions that aren't the first in their group, show question immediately
    setShowQuestion(showQuestionImmediately);
    setIsPlaying(false);
    setShowExplanation({});
    setExplanations({});
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const handleGetExplanation = async (qIndex: number, item: AudioItem) => {
    const key = `${currentCategoryIndex}-${qIndex}`;
    const userAnswer = answers[key];
    
    if (userAnswer === undefined) {
      toast({
        title: "답을 먼저 선택해주세요",
        description: "해설을 보려면 답을 선택해야 합니다.",
        variant: "destructive"
      });
      return;
    }

    setLoadingExplanation(prev => ({ ...prev, [key]: true }));
    try {
      const response = await fetch('/api/ai/explain-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: item.question,
          correctAnswer: item.correctAnswer,
          userAnswer: userAnswer,
          options: item.options,
          passage: item.audioScript,
          section: "listening",
          language: language
        })
      });

      if (!response.ok) throw new Error('Failed to get explanation');
      
      const data = await response.json();
      setExplanations(prev => ({ ...prev, [key]: data.explanation }));
      setShowExplanation(prev => ({ ...prev, [key]: true }));
    } catch (error) {
      console.error('Explanation error:', error);
      toast({
        title: "해설 생성 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setLoadingExplanation(prev => ({ ...prev, [key]: false }));
    }
  };

  const getCategoryIcon = (type: CategoryType) => {
    switch (type) {
      case "choose-response": return <CheckCircle className="h-5 w-5" />;
      case "conversation": return <MessageSquare className="h-5 w-5" />;
      case "academic-talk": return <GraduationCap className="h-5 w-5" />;
      default: return <Headphones className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (type: CategoryType) => {
    switch (type) {
      case "choose-response": return "from-teal-500 to-cyan-600";
      case "conversation": return "from-blue-500 to-indigo-600";
      case "academic-talk": return "from-orange-500 to-amber-600";
      default: return "from-gray-500 to-gray-600";
    }
  };

  const getCategoryBadgeColor = (type: CategoryType) => {
    switch (type) {
      case "choose-response": return "bg-teal-500/20 text-teal-300 border-teal-400/30";
      case "conversation": return "bg-blue-500/20 text-blue-300 border-blue-400/30";
      case "academic-talk": return "bg-orange-500/20 text-orange-300 border-orange-400/30";
      default: return "bg-gray-500/20 text-gray-300 border-gray-400/30";
    }
  };

  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);
  
  if (testId && isLoadingTest) {
    return <NewToeflLoadingState section="listening" />;
  }

  const testTitle = testData?.title || "New TOEFL Listening";
  
  if (showCompletionScreen) {
    return (
      <Suspense fallback={<NewToeflLoadingState section="listening" />}>
        <DeferredNewToeflListeningCompletionView
          isLight={isLight}
          completedCount={completedCount}
          totalItems={totalItems}
          elapsedMinutes={Math.round((Date.now() - testStartTimeRef.current) / 60000)}
          onGoHome={() => setLocation('/new-toefl')}
          onGoDashboard={() => setLocation('/dashboard')}
        />
      </Suspense>
    );
  }

  if (!isStarted) {
    const introStats = [
      { icon: <Clock className="h-5 w-5" style={{ color: "#00E87B" }} />, label: "약 30분", sub: "예상 소요 시간" },
      { icon: <FileText className="h-5 w-5" style={{ color: "#00E87B" }} />, label: `${totalItems}문제`, sub: "총 문제 수" },
      { icon: <Sparkles className="h-5 w-5" style={{ color: "#00E87B" }} />, label: "3가지", sub: "과제 유형" },
    ];
    const introCategories = activeCategories.map((cat) => ({
      key: cat.type,
      icon: getCategoryIcon(cat.type),
      title: cat.title,
      description: cat.description,
      count: cat.items.length,
    }));

    return (
      <Suspense fallback={<NewToeflLoadingState section="listening" />}>
        <DeferredNewToeflListeningIntroView
          title={testTitle}
          stats={introStats}
          categories={introCategories}
          onStart={() => setIsStarted(true)}
        />
      </Suspense>
    );
  }

  const rightContent = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
        <span className="text-cyan-600 text-sm font-medium">
          {completedCount} / {totalItems}
        </span>
        <span className="text-gray-500 text-xs">완료</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowScriptPanel(!showScriptPanel)}
        className={`border-cyan-500/30 hover:bg-cyan-500/10 transition-all ${
          showScriptPanel ? 'bg-cyan-500/10 text-cyan-600' : 'text-cyan-600'
        }`}
        data-testid="button-toggle-script"
      >
        <ScrollText className="h-4 w-4 mr-1" />
        Script
        {showScriptPanel ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPracticeMode(!practiceMode)}
        className={`border-purple-500/30 hover:bg-purple-500/10 transition-all ${
          practiceMode ? 'bg-purple-500/20 text-purple-400 border-purple-400' : 'text-purple-400'
        }`}
        data-testid="button-toggle-practice"
      >
        <Eye className="h-4 w-4 mr-1" />
        {practiceMode ? '시험 모드' : '연습 모드'}
      </Button>
    </div>
  );

  return (
    <NewToeflLayout
      section="listening"
      isTestMode
      timeRemaining={timeRemaining}
      progress={(completedCount / totalItems) * 100}
      currentTaskLabel={`${currentCategory.title} - 문제 ${currentItemIndex + 1}/${currentCategory.items.length}`}
      rightContent={rightContent}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;600&family=Sora:wght@400;600;700&display=swap');
        .ls-card { background: #0C1220; border: 1px solid rgba(0,200,100,.08); border-radius: 16px; }
        .ls-card:hover { border-color: rgba(0,232,123,.15); }
        .ls-orb-1 { position:fixed; top:-20vh; left:-15vw; width:55vw; height:55vw; border-radius:50%; background:radial-gradient(circle, rgba(0,180,100,.2), transparent 65%); pointer-events:none; z-index:0; }
        .ls-orb-2 { position:fixed; bottom:-15vh; right:-10vw; width:45vw; height:45vw; border-radius:50%; background:radial-gradient(circle, rgba(0,200,120,.15), transparent 65%); pointer-events:none; z-index:0; }
        .ls-tabs-list { background:#0C1220; border:1px solid rgba(0,200,100,.1); border-radius:12px; padding:6px; display:grid; grid-template-columns:repeat(3,1fr); gap:4px; }
        .ls-tab { background:transparent; border:none; border-radius:8px; color:rgba(255,255,255,.45); padding:12px 18px; font-family:'Sora',sans-serif; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; white-space:nowrap; }
        .ls-tab:hover { color:rgba(255,255,255,.8); }
        .ls-tab.active { color:#00E87B; box-shadow:0 2px 0 0 #00E87B; background:rgba(0,232,123,.06); }
        .ls-audio-vis { background:#0C1220; border-radius:10px; padding:24px 16px; position:relative; overflow:hidden; }
        .ls-ch { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.08); cursor:pointer; transition:all .15s; }
        .ls-ch:hover { border-color:rgba(0,232,123,.3); }
        .ls-ch.sel { border-color:rgba(0,232,123,.4); background:rgba(0,232,123,.06); }
        .ls-ch.playing { border-color:#00E87B; background:rgba(0,232,123,.14); box-shadow:0 0 0 1px rgba(0,232,123,.25), 0 0 16px rgba(0,232,123,.12); }
        .ls-ch.sel.playing { border-color:#00E87B; background:rgba(0,232,123,.14); box-shadow:0 0 0 1px rgba(0,232,123,.25), 0 0 16px rgba(0,232,123,.12); }
        .ls-cr { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.3); flex-shrink:0; transition:border-color .15s; position:relative; }
        .ls-ch.sel .ls-cr { border-color:#00E87B; }
        .ls-ch.sel .ls-cr::after { content:''; position:absolute; top:50%; left:50%; width:8px; height:8px; border-radius:50%; background:#00E87B; transform:translate(-50%,-50%); }
        .ls-chbox { padding:18px; border-radius:10px; text-align:center; font-family:'Oswald',sans-serif; font-size:20px; border:1px solid rgba(255,255,255,.1); cursor:pointer; transition:all .2s; color:rgba(255,255,255,.8); background:rgba(255,255,255,.04); }
        .ls-chbox:hover { border-color:rgba(0,136,221,.3); background:rgba(0,136,221,.06); }
        .ls-chbox.sel { border-color:rgba(0,136,221,.4); background:rgba(0,136,221,.06); color:#0088DD; }
        .ls-chbox.playing { border-color:#00E87B; background:rgba(0,232,123,.16); color:#00E87B; box-shadow:0 0 0 2px rgba(0,232,123,.3), 0 0 20px rgba(0,232,123,.15); }
        .ls-chbox.sel.playing { border-color:#00E87B; background:rgba(0,232,123,.18); color:#00E87B; box-shadow:0 0 0 2px rgba(0,232,123,.3), 0 0 20px rgba(0,232,123,.15); }
        .ls-section-label { font-family:'Oswald',sans-serif; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#00E87B; margin-bottom:4px; }
        .ls-q-num { font-family:'Bebas Neue',sans-serif; font-size:18px; color:rgba(255,255,255,.9); }
        .ls-answer-box { padding:14px 18px; border-radius:12px; border:1px solid rgba(0,232,123,.3); background:rgba(0,232,123,.08); margin-top:12px; }
        .ls-instr { border-left:3px solid #00E87B; padding:10px 14px; background:rgba(0,200,100,.06); border-radius:0 8px 8px 0; margin-bottom:16px; }
        .ls-script { display:none; background:#0C1220; border:1px solid rgba(0,200,100,.12); border-radius:8px; padding:10px; margin-top:8px; }
        .ls-script.show { display:block; }
        .ls-script-body { font-family:Arial,sans-serif; font-size:12px; color:rgba(255,255,255,.75); line-height:1.8; }
        .ls-body { font-family:'Sora',sans-serif; }
        .ls-num { font-family:'Bebas Neue',sans-serif; }
        .ls-label { font-family:'Oswald',sans-serif; letter-spacing:.06em; text-transform:uppercase; }
        .ls-q-nav-btn { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; cursor:pointer; border:1px solid rgba(255,255,255,.1); background:transparent; color:rgba(255,255,255,.4); transition:all .15s; font-family:'Sora',sans-serif; flex-shrink:0; }
        .ls-q-nav-btn:hover { border-color:rgba(0,232,123,.3); color:rgba(255,255,255,.8); }
        .ls-q-nav-btn.current { border-color:#00E87B; color:#00E87B; background:rgba(0,232,123,.08); }
        .ls-q-nav-btn.done { border-color:rgba(0,232,123,.3); background:rgba(0,232,123,.08); color:#00E87B; }
        .ls-play-btn { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#00B85F,#00E87B); border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; box-shadow:0 0 24px rgba(0,232,123,.35); }
        .ls-play-btn:hover { opacity:.9; transform:scale(1.05); }
        .ls-play-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .ls-ctrl-btn { width:44px; height:44px; border-radius:12px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; color:rgba(255,255,255,.6); }
        .ls-ctrl-btn:hover { background:rgba(255,255,255,.12); border-color:rgba(255,255,255,.25); color:#fff; }
      `}</style>
      <div className="ls-orb-1" /><div className="ls-orb-2" />

      <audio
        ref={audioRef}
        onTimeUpdate={handleAudioTimeUpdate}
        onEnded={handleAudioEnded}
        onLoadedMetadata={handleAudioLoaded}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        preload="auto"
        playsInline
        webkit-playsinline="true"
      />

      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12 py-6">
        {/* Category Tabs */}
        <div className="ls-tabs-list mb-5">
          {activeCategories.map((cat, index) => {
            const catCompleted = cat.items.filter((_, i) =>
              completedItems.has(`${index}-${i}`)
            ).length;
            const isActive = index === currentCategoryIndex;
            const allDone = catCompleted === cat.items.length && cat.items.length > 0;
            const tabLabel = cat.type === 'choose-response' ? 'Listen & Choose'
              : cat.type === 'conversation' ? 'Conversations' : 'Academic Talks';
            return (
              <button
                key={cat.type}
                onClick={() => {
                  const firstItem = cat.items?.[0];
                  setCurrentCategoryIndex(index);
                  setCurrentItemIndex(0);
                  if (firstItem?.audioScript) {
                    const groupKey = getAudioGroupKey(index, firstItem, 0);
                    if (playedAudioGroups.has(groupKey)) {
                      setAudioProgress(100);
                      setShowQuestion(true);
                      setIsPlaying(false);
                      if (audioRef.current) audioRef.current.pause();
                      return;
                    }
                  }
                  resetAudioState();
                }}
                className={`ls-tab${isActive ? ' active' : ''}`}
              >
                <span className="flex items-center gap-1.5 justify-center">
                  {allDone && !isActive && <CheckCircle className="h-3.5 w-3.5" style={{color:'#00E87B'}} />}
                  {tabLabel}
                  <span style={{fontSize:11,opacity:.6,fontFamily:'Sora,sans-serif'}}>{catCompleted}/{cat.items.length}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Question Navigation within Category */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {currentCategory.items.map((item, index) => {
            const isCompleted = completedItems.has(`${currentCategoryIndex}-${index}`);
            const isActive = index === currentItemIndex;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentItemIndex(index);
                  if (item?.audioScript) {
                    const targetGroupKey = getAudioGroupKey(currentCategoryIndex, item, index);
                    if (playedAudioGroups.has(targetGroupKey)) {
                      setAudioProgress(100);
                      setShowQuestion(true);
                      setIsPlaying(false);
                      if (audioRef.current) audioRef.current.pause();
                      return;
                    }
                  }
                  resetAudioState();
                }}
                className={`ls-q-nav-btn${isActive ? ' current' : isCompleted ? ' done' : ''}`}
                data-testid={`question-nav-${index}`}
              >
                {isCompleted && !isActive ? '✓' : index + 1}
              </button>
            );
          })}
        </div>

        {/* Empty Category State */}
        {(!currentCategory?.items || currentCategory.items.length === 0) ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="ls-card p-12 text-center max-w-md">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getCategoryColor(currentCategory?.type || 'conversation')} mx-auto flex items-center justify-center mb-6`}>
                {getCategoryIcon(currentCategory?.type || 'conversation')}
              </div>
              <p className="text-white text-xl font-bold mb-3 ls-body">{currentCategory?.title || 'Category'} 항목 없음</p>
              <p className="text-white/50 text-base ls-body">이 카테고리에는 아직 문제가 생성되지 않았습니다.</p>
            </div>
          </div>
        ) : (
        <div className="grid lg:grid-cols-2 gap-6 min-h-[70vh]">
          {/* Audio Player Card */}
          <div className="ls-card min-h-[70vh] p-6 flex flex-col gap-5">
            {/* Card Header */}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryColor(currentCategory.type)} flex items-center justify-center flex-shrink-0`}>
                {getCategoryIcon(currentCategory.type)}
              </div>
              <div className="min-w-0">
                <div className="ls-section-label">{currentCategory.type === 'choose-response' ? 'Listen & Choose' : currentCategory.type === 'conversation' ? 'Conversations' : 'Academic Talks'}</div>
                <div className="flex items-baseline gap-2">
                  <span className="ls-q-num">#{currentItemIndex + 1}</span>
                  {currentItem?.totalQuestionsInGroup && currentItem.totalQuestionsInGroup > 1 && (
                    <span className="text-sm text-white/40 ls-body">({(currentItem.questionIndex || 0) + 1}/{currentItem.totalQuestionsInGroup})</span>
                  )}
                  <span className="text-white/40 text-xs ls-body ml-1">· {currentItem?.duration || '0:00'}</span>
                </div>
              </div>
            </div>
            {/* For grouped questions, show audio player only for first question */}
            {currentItem?.isFirstInGroup === false ? (
              <div className="ls-audio-vis flex flex-col items-center py-8">
                <CheckCircle2 className="h-16 w-16" style={{color:'#00E87B'}} />
                <p className={`mt-4 text-sm font-medium ls-body ${isLight ? 'text-gray-600' : 'text-white/70'}`}>오디오 재생 완료</p>
                <p className={`text-xs mt-1 ls-body ${isLight ? 'text-gray-400' : 'text-white/40'}`}>이전 오디오를 참고하여 질문에 답하세요</p>
                <span className="mt-3 px-3 py-1 rounded-full text-xs ls-body" style={{background:'rgba(0,232,123,.15)',color:'#00E87B',border:'1px solid rgba(0,232,123,.3)'}}>
                  같은 스크립트의 {(currentItem.questionIndex || 0) + 1}번째 질문
                </span>
              </div>
            ) : (
              <div className="ls-audio-vis">
                {showScriptPanel ? (
                  /* ── Script View ─────────────────────────── */
                  <div>
                    <div className="flex items-center gap-1 mb-3">
                      <div className="flex items-center gap-0.5 flex-1 h-6">
                        {waveformBars28.map((barHeight, i) => (
                          <div
                            key={i}
                            className="w-1 rounded-full"
                            style={{
                              height: isPlaying ? `${barHeight}px` : '3px',
                              background: isPlaying ? '#00E87B' : (isLight ? '#D1D5DB' : 'rgba(255,255,255,.2)'),
                              opacity: audioProgress > (i / 28) * 100 ? 1 : 0.25
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs ml-2 shrink-0 ls-body" style={{color: isPlaying ? '#00E87B' : audioProgress === 100 ? '#00E87B' : (isLight ? '#9CA3AF' : 'rgba(255,255,255,.3)')}}>
                        {isPlaying ? '재생 중' : audioProgress === 100 ? '완료' : '대기 중'}
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto script-panel-scroll space-y-0.5">
                      {(() => {
                        const script = currentItem?.audioScript || '';
                        let lines = script.split('\n').filter((line: string) => line.trim());
                        const isConvOrAcademic = currentCategory?.type === 'conversation' || currentCategory?.type === 'academic-talk';
                        if (isConvOrAcademic && lines.length > 0) {
                          lines = lines.filter((line: string) => !/^question\s*\d*\s*:/i.test(line.trim()));
                          const hasSpeakerLabel = (l: string) => /^[A-Za-z]+\s*\d*\s*:/i.test(l.trim());
                          if (lines.length > 0) {
                            const last = lines[lines.length - 1].trim();
                            if (last.endsWith('?') && !hasSpeakerLabel(last)) lines = lines.slice(0, -1);
                          }
                        }
                        if (lines.length === 0) return <p className="text-white/30 text-sm py-2 ls-body">스크립트가 없습니다.</p>;
                        return lines.map((line: string, idx: number) => (
                          <div
                            key={idx}
                            ref={(el) => {
                              if (el) {
                                while (scriptLinesRef.current.length <= idx) scriptLinesRef.current.push(null as any);
                                scriptLinesRef.current[idx] = el;
                              }
                            }}
                            className="text-sm py-1 px-2.5 rounded-lg transition-all duration-300 leading-relaxed ls-body"
                            style={{
                              background: idx === currentScriptLineIndex && isPlaying ? 'rgba(0,232,123,.12)' : 'transparent',
                              color: idx === currentScriptLineIndex && isPlaying ? '#00E87B' : idx < currentScriptLineIndex ? (isLight ? '#9CA3AF' : 'rgba(255,255,255,.3)') : (isLight ? '#1F2937' : 'rgba(255,255,255,.8)'),
                              borderLeft: idx === currentScriptLineIndex && isPlaying ? '2px solid #00E87B' : '2px solid transparent',
                            }}
                          >
                            {line}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ) : (
                  /* ── Headphones View ────────────────────── */
                  <>
                    <div className="absolute inset-0 flex items-center justify-center gap-1 pointer-events-none">
                      {waveformBars40.map((barHeight, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-full"
                          style={{
                            height: isPlaying ? `${barHeight}px` : '4px',
                            background: isPlaying ? '#00E87B' : (isLight ? '#D1D5DB' : 'rgba(255,255,255,.2)'),
                            opacity: audioProgress > (i / 40) * 100 ? 1 : 0.3
                          }}
                        />
                      ))}
                    </div>
                    <div className="relative z-10 flex flex-col items-center py-8 p-6">
                      <Headphones className={`h-14 w-14 ${isPlaying ? 'animate-pulse' : ''}`} style={{color: isPlaying ? '#00E87B' : (isLight ? '#D1D5DB' : 'rgba(255,255,255,.2)')}} />
                      <p className="mt-3 text-sm ls-body" style={{color: isLight ? '#9CA3AF' : 'rgba(255,255,255,.4)'}}>
                        {isPlaying ? '재생 중...' : audioProgress === 100 ? '재생 완료' : t('toefl.listening.playHint')}
                      </p>
                      </div>
                    </>
                  )}
                </div>
              )}

            {/* Choose-response option highlight indicator — shown during audio playback */}
            {currentCategory.type === 'choose-response' && isPlaying && (
              <div className="flex items-center justify-center gap-3 py-2">
                {['A', 'B', 'C', 'D'].map((letter) => {
                  const isActive = activePlayingOption === letter;
                  return (
                    <div
                      key={letter}
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 ls-num"
                      style={isActive ? {background:'linear-gradient(135deg,#00B85F,#00E87B)',color:'#000',boxShadow:'0 0 20px rgba(0,232,123,.5)',transform:'scale(1.1)'} : {background: isLight ? '#F3F4F6' : 'rgba(255,255,255,.08)',color: isLight ? '#6B7280' : 'rgba(255,255,255,.4)',border: isLight ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,.15)'}}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Progress track */}
            <div className="space-y-2">
              <div className="slider-container slider-green">
                <Slider
                  value={[audioProgress]}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                  onValueChange={(value) => {
                    const newProgress = value[0];
                    setAudioProgress(newProgress);
                    if (audioRef.current && audioRef.current.duration > 0 && isFinite(audioRef.current.duration)) {
                      audioRef.current.currentTime = (newProgress / 100) * audioRef.current.duration;
                      setAudioCurrentTime(audioRef.current.currentTime);
                      const script = currentItem?.audioScript || '';
                      if (script) {
                        const progressRatio = newProgress / 100;
                        const lineIndex = calculateLineIndexFromProgress(script, progressRatio);
                        setCurrentScriptLineIndex(lineIndex);
                        if (showScriptPanel && scriptLinesRef.current[lineIndex]) {
                          scriptLinesRef.current[lineIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }
                    }
                  }}
                />
              </div>
              <div className="flex justify-between text-xs ls-body" style={{color: isLight ? '#9CA3AF' : 'rgba(255,255,255,.35)'}}>
                <span>{audioDuration > 0 ? formatTime(Math.floor(audioCurrentTime)) : '0:00'}</span>
                <span>{audioDuration > 0 ? formatTime(Math.floor(audioDuration)) : currentItem?.duration || '--:--'}</span>
              </div>
            </div>

            {/* Transport Controls */}
            <div className="flex items-center justify-center gap-3">
              <button onClick={handleRestart} data-testid="button-restart-audio" title="처음부터 다시" className="ls-ctrl-btn">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={handlePlayPause}
                disabled={isGeneratingAudio}
                data-testid="button-play-pause"
                className="ls-play-btn"
                style={isGeneratingAudio ? {opacity:.5,cursor:'not-allowed'} : {}}
              >
                {isGeneratingAudio ? <Loader2 className="h-6 w-6 animate-spin" style={{color:'#000'}} /> : isPlaying ? <Pause className="h-6 w-6" style={{color:'#000'}} /> : <Play className="h-6 w-6 ml-0.5" style={{color:'#000'}} />}
              </button>
              <button
                onClick={() => { if (showQuestion && currentItemIndex < currentCategory.items.length - 1) { handleNextItem(); } else { setShowQuestion(true); } }}
                data-testid="button-skip-to-questions"
                title="문제 보기"
                className="ls-ctrl-btn"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              {currentItem?.audioUrl && (
                <button onClick={handleDownloadAudio} data-testid="button-download-audio" title="오디오 다운로드" className="ls-ctrl-btn" style={{borderColor:'rgba(0,232,123,.2)',color:'#00E87B'}}>
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Volume & Speed Controls */}
            <div className="flex items-center justify-center gap-6 px-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" style={{color: isLight ? '#9CA3AF' : 'rgba(255,255,255,.4)'}} />
                <div className="w-24 slider-container slider-green">
                  <Slider value={[audioVolume * 100]} onValueChange={(v) => setAudioVolume(v[0] / 100)} max={100} min={0} step={5} className="cursor-pointer" />
                </div>
                <span className="text-xs w-8 ls-body" style={{color: isLight ? '#9CA3AF' : 'rgba(255,255,255,.4)'}}>{Math.round(audioVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs ls-body" style={{color: isLight ? '#9CA3AF' : 'rgba(255,255,255,.4)'}}>속도</span>
                <div className="w-24 slider-container slider-amber">
                  <Slider value={[playbackSpeed * 100]} onValueChange={(v) => setPlaybackSpeed(v[0] / 100)} max={200} min={50} step={10} className="cursor-pointer" />
                </div>
                <span className="text-xs w-10 ls-body" style={{color: isLight ? '#9CA3AF' : 'rgba(255,255,255,.4)'}}>{playbackSpeed.toFixed(1)}x</span>
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className={`ls-card min-h-[70vh] p-6 flex flex-col gap-5 transition-opacity ${showQuestion ? 'opacity-100' : 'opacity-50'}`}>
            {/* Card Header */}
            <div className="flex items-center gap-2">
              <div className="ls-section-label">Question</div>
              <span className="ls-q-num ml-1">{currentItemIndex + 1}</span>
              <span className="text-white/30 text-xs ls-body">/ {currentCategory.items.length}</span>
              {completedItems.has(`${currentCategoryIndex}-${currentItemIndex}`) && (
                <CheckCircle className="h-4 w-4 ml-1" style={{color:'#00E87B'}} />
              )}
              {currentItem?.hideQuestionText && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full ls-body" style={{background:'rgba(0,232,123,.12)',color:'#00E87B',border:'1px solid rgba(0,232,123,.25)'}}>Listen & Choose</span>
              )}
            </div>
            <div className="overflow-y-auto flex-1 space-y-5">
              {showQuestion && currentItem ? (
                <>
                <div className="space-y-5">
                  {/* Question text (hidden for choose-response in exam mode) */}
                  {!currentItem.hideQuestionText && (
                    <p className="text-white font-medium text-lg leading-relaxed ls-body">{currentItem.question}</p>
                  )}

                  {/* Options */}
                  {currentItem.hideQuestionText && !practiceMode ? (
                    /* ── Listen & Choose: 2×2 grid ── */
                    <div className="space-y-3">
                      <div className="ls-instr ls-body text-sm" style={{color: isLight ? '#374151' : 'rgba(255,255,255,.75)'}}>
                        🎧 {t('toefl.listening.selectResponse')}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {['A', 'B', 'C', 'D'].map((letter, i) => {
                          const itemKey = `${currentCategoryIndex}-${currentItemIndex}`;
                          const isSelected = answers[itemKey] === i;
                          const isHighlighted = activePlayingOption === letter && isPlaying;
                          return (
                            <button
                              key={letter}
                              onClick={() => {
                                const newAnswers = { ...answers, [itemKey]: i };
                                setAnswers(newAnswers);
                                if (!completedItems.has(itemKey)) {
                                  setCompletedItems(prev => new Set([...Array.from(prev), itemKey]));
                                }
                              }}
                              className={`ls-chbox${isSelected ? ' sel' : ''}${isHighlighted ? ' playing' : ''}`}
                              data-testid={`option-listening-${currentItemIndex}-${i}`}
                            >
                              {letter}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* ── Conversations / Academic Talks: vertical list ── */
                    <div className="space-y-2">
                      {currentItem.options.map((option, i) => {
                        const itemKey = `${currentCategoryIndex}-${currentItemIndex}`;
                        const isSelected = answers[itemKey] === i;
                        const letter = String.fromCharCode(65 + i);
                        const isHighlighted = activePlayingOption === letter && isPlaying;
                        return (
                          <label
                            key={i}
                            className={`ls-ch${isSelected ? ' sel' : ''}${isHighlighted ? ' playing' : ''}`}
                            data-testid={`option-listening-${currentItemIndex}-${i}`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentCategoryIndex}-${currentItemIndex}`}
                              checked={isSelected}
                              onChange={() => {
                                const newAnswers = { ...answers, [itemKey]: i };
                                setAnswers(newAnswers);
                                if (!completedItems.has(itemKey)) {
                                  setCompletedItems(prev => new Set([...Array.from(prev), itemKey]));
                                }
                              }}
                              className="hidden"
                            />
                            <div className="ls-cr" />
                            <span className="text-white/90 text-base leading-relaxed ls-body">{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                    {/* 정답/해설 버튼 - 실전 모드에서는 숨김 */}
                    {!isFullTestMode && (
                      <div className="flex gap-2 mt-3">
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ls-body transition-all"
                          style={{background:'rgba(0,187,255,.15)',color:'#00BBFF',border:'1px solid rgba(0,187,255,.25)'}}
                          onClick={() => {
                            const itemKey = `${currentCategoryIndex}-${currentItemIndex}`;
                            setShowAnswerOnly((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          ◎ {showAnswerOnly[`${currentCategoryIndex}-${currentItemIndex}`] ? '정답 숨기기' : t('toefl.reading.answer')}
                        </button>
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ls-body transition-all"
                          style={{background:'rgba(139,92,246,.2)',color:'#C4B5FD',border:'1px solid rgba(139,92,246,.3)'}}
                          onClick={() => handleGetExplanation(currentItemIndex, currentItem)}
                          disabled={loadingExplanation[`${currentCategoryIndex}-${currentItemIndex}`] || answers[`${currentCategoryIndex}-${currentItemIndex}`] === undefined}
                        >
                          {loadingExplanation[`${currentCategoryIndex}-${currentItemIndex}`] ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> 생성중...</>
                          ) : (
                            <><Lightbulb className="h-3 w-3" /> 💡 {t('toefl.reading.explanation')}</>
                          )}
                        </button>
                      </div>
                    )}

                    {/* 정답 패널 */}
                    {showAnswerOnly[`${currentCategoryIndex}-${currentItemIndex}`] && currentItem.correctAnswer !== undefined && (
                      <div className="ls-answer-box mt-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'linear-gradient(135deg,#00B85F,#00E87B)'}}>
                            <CheckCircle2 className="h-4 w-4" style={{color:'#000'}} />
                          </div>
                          <div>
                            <span className="font-bold text-xs ls-label" style={{color:'#00E87B'}}>{t('toefl.reading.answer')}</span>
                            <p className="text-white font-semibold text-sm ls-body mt-0.5">
                              {String.fromCharCode(65 + currentItem.correctAnswer)}) {currentItem.options[currentItem.correctAnswer]}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 해설 패널 - 세련된 글래스모피즘 디자인 */}
                    {showExplanation[`${currentCategoryIndex}-${currentItemIndex}`] && explanations[`${currentCategoryIndex}-${currentItemIndex}`] && (
                      <div className="mt-3 p-4 bg-gradient-to-br from-slate-800/90 via-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-500/40 backdrop-blur-xl shadow-xl shadow-purple-500/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-bold text-sm flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/30">
                              <Lightbulb className="h-3 w-3 text-white" />
                            </div>
                            iNRISE 해설
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const itemKey = `${currentCategoryIndex}-${currentItemIndex}`;
                              setShowExplanation(prev => ({ ...prev, [itemKey]: false }));
                            }}
                            className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* 정답 여부 - 세련된 디자인 */}
                        <div className={`p-3 rounded-xl backdrop-blur-sm ${explanations[`${currentCategoryIndex}-${currentItemIndex}`].isCorrect ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/40' : 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/40'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md ${explanations[`${currentCategoryIndex}-${currentItemIndex}`].isCorrect ? 'bg-gradient-to-br from-green-500 to-emerald-500 shadow-green-500/30' : 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/30'}`}>
                              {explanations[`${currentCategoryIndex}-${currentItemIndex}`].isCorrect ? (
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              ) : (
                                <XCircle className="h-4 w-4 text-white" />
                              )}
                            </div>
                            <div>
                              <span className={`text-sm font-bold ${explanations[`${currentCategoryIndex}-${currentItemIndex}`].isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                {explanations[`${currentCategoryIndex}-${currentItemIndex}`].isCorrect ? '정답!' : '오답'}
                              </span>
                              <p className="text-gray-300 text-xs">
                                정답: {explanations[`${currentCategoryIndex}-${currentItemIndex}`].correctAnswer} - {explanations[`${currentCategoryIndex}-${currentItemIndex}`].correctAnswerText}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 정답 이유 */}
                        <div>
                          <h4 className="text-emerald-400 font-semibold text-xs flex items-center gap-1 mb-2">
                            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                              <CheckCircle className="h-2.5 w-2.5 text-white" />
                            </div>
                            정답 이유
                          </h4>
                          <p className="text-gray-300 text-xs leading-relaxed bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                            {explanations[`${currentCategoryIndex}-${currentItemIndex}`].correctReason}
                          </p>
                        </div>

                        {/* 오답 분석 */}
                        {explanations[`${currentCategoryIndex}-${currentItemIndex}`].wrongAnswers && explanations[`${currentCategoryIndex}-${currentItemIndex}`].wrongAnswers.length > 0 && (
                          <div>
                            <h4 className="text-rose-400 font-semibold text-xs flex items-center gap-1 mb-2">
                              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center">
                                <AlertCircle className="h-2.5 w-2.5 text-white" />
                              </div>
                              오답 분석
                            </h4>
                            <div className="space-y-1.5">
                              {explanations[`${currentCategoryIndex}-${currentItemIndex}`].wrongAnswers.map((wrong: any, idx: number) => (
                                <div key={idx} className="bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10 text-xs">
                                  <p className="text-gray-400 font-medium">{wrong.option}. {wrong.text}</p>
                                  <p className="text-gray-300 mt-0.5">{wrong.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 필수 어휘 */}
                        {explanations[`${currentCategoryIndex}-${currentItemIndex}`].keyVocabulary && explanations[`${currentCategoryIndex}-${currentItemIndex}`].keyVocabulary.length > 0 && (
                          <div>
                            <h4 className="text-sky-400 font-semibold text-xs flex items-center gap-1 mb-2">
                              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
                                <BookOpen className="h-2.5 w-2.5 text-white" />
                              </div>
                              필수 어휘
                            </h4>
                            <div className="space-y-1.5">
                              {explanations[`${currentCategoryIndex}-${currentItemIndex}`].keyVocabulary.map((vocab: any, idx: number) => (
                                <div key={idx} className="bg-white/5 backdrop-blur-sm p-3 rounded-lg border border-white/10 text-xs">
                                  <span className="text-white font-bold">{vocab.word}</span>
                                  <span className="text-sky-300 ml-1">- {vocab.meaning}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 학습 팁 */}
                        {explanations[`${currentCategoryIndex}-${currentItemIndex}`].studyTip && (
                          <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded text-xs">
                            <span className="text-purple-300 font-bold">💡 학습 팁: </span>
                            <span className="text-purple-200">{explanations[`${currentCategoryIndex}-${currentItemIndex}`].studyTip}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white border-white/15 disabled:opacity-30 py-5 text-base font-bold ls-body transition-all"
                      disabled={currentItemIndex === 0}
                      onClick={handlePrevItem}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      이전 문제
                    </Button>
                    {currentItemIndex < currentCategory.items.length - 1 ? (
                      <Button
                        className="flex-1 py-5 text-base font-bold ls-body transition-all hover:opacity-90"
                        style={{background:'linear-gradient(135deg,#00B85F,#00E87B)',color:'#000',boxShadow:'0 4px 20px rgba(0,232,123,.25)'}}
                        onClick={handleNextItem}
                        data-testid="button-next-item"
                      >
                        다음 문제
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : currentCategoryIndex < activeCategories.length - 1 ? (
                      <Button
                        className="flex-1 py-5 text-base font-bold ls-body transition-all hover:opacity-90"
                        style={{background:'linear-gradient(135deg,#00B85F,#00E87B)',color:'#000',boxShadow:'0 4px 20px rgba(0,232,123,.25)'}}
                        onClick={handleNextCategory}
                        data-testid="button-next-category"
                      >
                        다음 카테고리
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 py-5 text-base font-bold ls-body transition-all hover:opacity-90"
                        style={{background:'linear-gradient(135deg,#B45309,#F59E0B)',color:'#000'}}
                        data-testid="button-finish-test"
                        onClick={async () => {
                          if (isFullTestMode) {
                            await handleFullTestSectionComplete();
                          } else {
                            const saved = await saveTestSubmission();
                            if (saved) {
                              setShowCompletionScreen(true);
                            } else {
                              toast({ title: "제출 오류", description: "제출에 실패했습니다. 다시 시도해주세요.", variant: "destructive" });
                            }
                          }
                        }}
                      >
                        {isFullTestMode ? "다음 섹션으로" : "시험 완료"}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Headphones className="h-16 w-16 mb-4" style={{color: isLight ? '#D1D5DB' : 'rgba(255,255,255,.2)'}} />
                  <p className="text-white/40 ls-body">오디오를 듣고 문제를 푸세요</p>
                  <Progress value={audioProgress} className="w-32 mt-4" />
                  <p className="text-sm mt-2 ls-body" style={{color:'#00E87B'}}>{Math.round(audioProgress)}%</p>
                  <Button
                    className="mt-6 ls-body"
                    style={{background:'linear-gradient(135deg,#00B85F,#00E87B)',color:'#000',fontWeight:700}}
                    onClick={() => setShowQuestion(true)}
                    data-testid="button-show-questions"
                  >
                    문제 보기
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </NewToeflLayout>
  );
}
