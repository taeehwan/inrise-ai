import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useParams, useSearch, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle, MessageCircle, Sparkles, User, GraduationCap, Mail, Type, RotateCcw, X } from "lucide-react";
import { NewToefl2026WritingFeedbackPanel, NewToefl2026BuildSentenceFeedbackPanel } from "@/components/NewToeflFeedbackPanel";
import { NewToeflLayout, NewToeflLoadingState, NewToeflIntroHeader } from "@/components/NewToeflLayout";
import { useQuery } from "@tanstack/react-query";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import { apiRequest } from "@/lib/queryClient";

type TaskType = "build-sentence" | "write-email" | "academic-discussion";

// Common female names for avatar detection
const femaleNames = new Set([
  'emma', 'olivia', 'ava', 'isabella', 'sophia', 'sophie', 'mia', 'charlotte', 'amelia', 'harper', 'evelyn',
  'abigail', 'emily', 'elizabeth', 'sofia', 'ella', 'madison', 'scarlett', 'victoria', 'aria', 'grace',
  'chloe', 'camila', 'penelope', 'riley', 'layla', 'lillian', 'nora', 'zoey', 'mila', 'aubrey',
  'hannah', 'lily', 'addison', 'eleanor', 'natalie', 'luna', 'savannah', 'brooklyn', 'leah', 'zoe',
  'stella', 'hazel', 'ellie', 'paisley', 'audrey', 'skylar', 'violet', 'claire', 'bella', 'aurora',
  'lucy', 'anna', 'samantha', 'caroline', 'genesis', 'aaliyah', 'kennedy', 'allison', 'maya', 'sarah',
  'madelyn', 'adeline', 'alexa', 'ariana', 'elena', 'gabriella', 'naomi', 'alice', 'sadie', 'hailey',
  'eva', 'emilia', 'autumn', 'quinn', 'nevaeh', 'piper', 'ruby', 'serenity', 'willow', 'everly',
  'maria', 'jennifer', 'jessica', 'ashley', 'amanda', 'stephanie', 'nicole', 'melissa', 'michelle', 'kimberly',
  'lisa', 'nancy', 'karen', 'betty', 'helen', 'sandra', 'donna', 'carol', 'ruth', 'sharon',
  'patricia', 'catherine', 'christine', 'deborah', 'rachel', 'laura', 'linda', 'barbara', 'susan', 'margaret',
  'amy', 'anne', 'angela', 'diana', 'katherine', 'kate', 'julia', 'jane', 'mary', 'rose'
]);

// Get avatar image based on name (gender detection)
const getAvatarByName = (name: string, index: number = 0): string => {
  const firstName = name.split(' ')[0].toLowerCase();
  const isFemale = femaleNames.has(firstName);
  
  // High-quality avatar images from Unsplash
  const femaleAvatars = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face"
  ];
  
  const maleAvatars = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face"
  ];
  
  if (isFemale) {
    return femaleAvatars[index % femaleAvatars.length];
  }
  return maleAvatars[index % maleAvatars.length];
};

interface BuildSentenceItem {
  id: number;
  contextSentence: string;
  sentenceTemplate: string; // Template with blanks (e.g., "The _____ _____ exciting.")
  words: string[];
  correctOrder: number[];
}

interface EmailPrompt {
  id: number;
  scenario: string;
  recipient: string;
  purpose: string;
  keyPoints: string[];
}

interface DiscussionPost {
  author: string;
  role: "professor" | "student";
  content: string;
  avatar: string;
}

const buildSentenceItems: BuildSentenceItem[] = [
  {
    id: 1,
    contextSentence: "The campus is quiet today because most people are indoors.",
    sentenceTemplate: "_____ _____ _____ _____ _____ _____ _____.",
    words: ["the", "students", "are", "studying", "in", "the", "library"],
    correctOrder: [0, 1, 2, 3, 4, 5, 6]
  },
  {
    id: 2,
    contextSentence: "The scientific community was excited by the recent announcement.",
    sentenceTemplate: "_____ _____ _____ _____ _____ _____.",
    words: ["has", "the", "professor", "research", "published", "groundbreaking"],
    correctOrder: [1, 2, 0, 4, 5, 3]
  },
  {
    id: 3,
    contextSentence: "Students were relieved to hear the good news about the project.",
    sentenceTemplate: "_____ _____ _____ _____ _____ _____ _____.",
    words: ["deadline", "the", "extended", "was", "by", "a", "week"],
    correctOrder: [1, 0, 3, 2, 4, 5, 6]
  },
  {
    id: 4,
    contextSentence: "Scientists have been studying environmental shifts for decades.",
    sentenceTemplate: "_____ _____ _____ _____ _____ _____ _____ _____.",
    words: ["climate", "significantly", "has", "change", "affected", "patterns", "global", "weather"],
    correctOrder: [0, 3, 2, 1, 4, 6, 7, 5]
  },
  {
    id: 5,
    contextSentence: "The professor announced the final project guidelines in class.",
    sentenceTemplate: "_____ _____ _____ _____ _____ _____ _____ _____.",
    words: ["required", "are", "all", "students", "to", "complete", "assignment", "the"],
    correctOrder: [2, 3, 1, 0, 4, 5, 7, 6]
  }
];

const emailPrompt: EmailPrompt = {
  id: 1,
  scenario: "You missed a class due to illness and need to ask your professor for the lecture notes and any assignments you may have missed.",
  recipient: "Professor Johnson",
  purpose: "Request missed lecture materials",
  keyPoints: [
    "Explain the reason for absence",
    "Ask for lecture notes or slides",
    "Inquire about any assignments or deadlines",
    "Express gratitude and willingness to catch up"
  ]
};

const discussionTopic = {
  title: "The Impact of Technology on Education",
  professorPrompt: "In today's class, we've been discussing how technology has transformed the educational landscape. I'd like you to consider both the benefits and potential drawbacks of increased technology use in classrooms.",
  question: "Do you think the benefits of technology in education outweigh the potential drawbacks? Support your position with specific reasons and examples."
};

const discussionPosts: DiscussionPost[] = [
  {
    author: "Dr. Sarah Mitchell",
    role: "professor",
    content: discussionTopic.professorPrompt,
    avatar: "SM"
  },
  {
    author: "Alex Chen",
    role: "student",
    content: "I believe technology in education is largely beneficial. Online resources like Khan Academy have helped me understand complex topics that were difficult to grasp from textbooks alone.",
    avatar: "AC"
  },
  {
    author: "Maria Santos",
    role: "student",
    content: "While I appreciate the convenience of technology, I'm concerned about the digital divide. Not all students have equal access to devices and internet at home.",
    avatar: "MS"
  }
];

const DeferredNewToeflWritingIntroView = lazy(
  () => import("@/components/new-toefl-writing/NewToeflWritingIntroView"),
);
const DeferredNewToeflWritingResultsView = lazy(
  () => import("@/components/new-toefl-writing/NewToeflWritingResultsView"),
);

export default function NewTOEFLWriting() {
  const [, setLocation] = useLocation();
  const params = useParams<{ testId?: string }>();
  const searchString = useSearch();
  const testId = params.testId || new URLSearchParams(searchString).get('testId');
  const _searchParams = new URLSearchParams(searchString);
  const isFullTestMode = _searchParams.get('fullTest') === 'true';
  const fullTestAttemptId = _searchParams.get('attemptId') || null;
  
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [isStarted, setIsStarted] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskType>("build-sentence");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);
  
  const [selectedWords, setSelectedWords] = useState<number[]>([]);
  const [availableWords, setAvailableWords] = useState<number[]>([]);
  const [completedSentences, setCompletedSentences] = useState<Set<number>>(new Set());
  const [checkedSentences, setCheckedSentences] = useState<Set<number>>(new Set()); // Track which sentences have been checked (for showing feedback)
  
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailCompleted, setEmailCompleted] = useState(false);
  const [showEmailFeedback, setShowEmailFeedback] = useState(false);
  
  const [discussionResponse, setDiscussionResponse] = useState("");
  const [discussionWordCount, setDiscussionWordCount] = useState(0);
  const [discussionCompleted, setDiscussionCompleted] = useState(false);
  const [showDiscussionFeedback, setShowDiscussionFeedback] = useState(false);
  
  const [showResults, setShowResults] = useState(false);
  const [loadedQuestions, setLoadedQuestions] = useState<any[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const testStartTimeRef = useRef<number>(0);
  const { logTestStart, logAIUsage } = useActivityTracker();
  const { user } = useAuth();
  const { canGetAIFeedback } = useSubscription();
  const { t } = useLanguage();
  const [submissionSaved, setSubmissionSaved] = useState(false);
  
  const { data: testData, isLoading: isLoadingTest } = useQuery<{ 
    questions?: any[]; 
    title?: string;
    discussionTask?: {
      professorName?: string;
      professorQuestion?: string;
      students?: Array<{ name: string; response: string }>;
      instructions?: string;
      classContext?: string;
    };
    emailTask?: any;
    buildSentences?: any[];
  }>({
    queryKey: ['/api/tests', testId],
    enabled: !!testId,
  });
  
  useEffect(() => {
    if (testData && testData.questions) {
      // Debug: Log the raw questions data to understand structure
      console.log('[DEBUG] loadedQuestions raw data:', testData.questions.map((q: any) => ({
        type: q.type,
        questionType: q.questionType,
        professorName: q.professorName,
        hasProfessorQuestion: !!q.professorQuestion,
        professorQuestionPreview: q.professorQuestion?.substring(0, 50),
        hasStudentResponses: Array.isArray(q.studentResponses) && q.studentResponses.length > 0,
        studentResponsesCount: q.studentResponses?.length,
        hasTopic: !!q.topic,
        topicPreview: q.topic?.substring(0, 50)
      })));
      setLoadedQuestions(testData.questions);
    }
  }, [testData]);

  useEffect(() => {
    if (isStarted && !testStartTimeRef.current) {
      testStartTimeRef.current = Date.now();
      logTestStart('toefl_writing', testId || 'unknown');
    }
  }, [isStarted, testId]);

  // Use loaded questions if available, otherwise fallback to default data
  // Only include questions that have words array (build-sentence type)
  const activeBuildSentenceItems: BuildSentenceItem[] = loadedQuestions.length > 0
    ? loadedQuestions
        .filter((q: any) => {
          // Must have words array to be a valid build-sentence question
          const hasWords = Array.isArray(q.words) && q.words.length > 0;
          const isBuildSentence = q.type === 'build-sentence' || q.writingType === 'build-sentence' || q.questionType === 'build-sentence';
          return hasWords || isBuildSentence;
        })
        .filter((q: any) => Array.isArray(q.words) && q.words.length > 0) // Double check words exist
        .map((q: any, idx: number) => {
          // Generate sentenceTemplate if not provided: use blank count matching words length
          const wordsCount = q.words?.length || 0;
          const defaultTemplate = wordsCount > 0 
            ? "_____ ".repeat(wordsCount).trim() + "."
            : "";
          
          // Normalize correctOrder: ensure it's numeric indices
          // If it's string[] (words in correct order), find their indices in the original words array
          // If already number[], use as-is
          let normalizedCorrectOrder: number[] = [];
          const wordsArray = q.words || [];
          
          if (Array.isArray(q.correctOrder) && q.correctOrder.length > 0) {
            if (typeof q.correctOrder[0] === 'number') {
              // Already numeric indices
              normalizedCorrectOrder = q.correctOrder;
            } else if (typeof q.correctOrder[0] === 'string') {
              // It's words in correct order - find each word's index in the original words array
              normalizedCorrectOrder = q.correctOrder.map((word: string) => {
                const idx = wordsArray.findIndex((w: string) => w.toLowerCase() === word.toLowerCase());
                return idx >= 0 ? idx : 0;
              });
              console.log('[Build a Sentence] Converted correctOrder:', {
                originalWords: wordsArray,
                correctOrderWords: q.correctOrder,
                normalizedIndices: normalizedCorrectOrder
              });
            }
          } else {
            // Default: assume words are already in correct order (indices 0,1,2,3...)
            normalizedCorrectOrder = wordsArray.map((_: any, i: number) => i);
          }
          
          return {
            id: idx + 1,
            contextSentence: q.contextSentence || q.passage || q.context || "Complete the sentence with the given words.",
            sentenceTemplate: q.sentenceTemplate || defaultTemplate,
            words: q.words || [],
            correctOrder: normalizedCorrectOrder
          };
        })
    : buildSentenceItems;
  
  // Use fallback if no valid build-sentence items found
  const effectiveBuildSentenceItems = activeBuildSentenceItems.length > 0 
    ? activeBuildSentenceItems 
    : buildSentenceItems;

  const currentSentenceItem = effectiveBuildSentenceItems[currentItemIndex] || buildSentenceItems[0];

  // Extract Email Prompt from loaded questions
  // Email questions: have scenario but NO words array, topic contains instructions
  const activeEmailPrompt: EmailPrompt = (() => {
    // Find email question: has scenario, no words array, and topic contains action verbs like "explain", "describe", "request"
    const emailQuestion = loadedQuestions.find((q: any) => {
      // Explicit type check
      if (q.type === 'write-email' || q.writingType === 'write-email' || q.questionType === 'write-email' ||
          q.type === 'email' || q.writingType === 'email' || q.questionType === 'email') {
        return true;
      }
      // Content-based detection: has scenario, no words, topic with instructions
      const hasScenario = q.scenario && typeof q.scenario === 'string' && q.scenario.length > 0;
      const noWords = !Array.isArray(q.words) || q.words.length === 0;
      const topicHasInstructions = q.topic && typeof q.topic === 'string' && 
        (/explain|describe|request|write/i.test(q.topic));
      return hasScenario && noWords && topicHasInstructions;
    });
    
    if (emailQuestion) {
      // Parse key points from topic field (split by newlines)
      let keyPoints: string[] = [];
      if (Array.isArray(emailQuestion.keyPoints)) {
        keyPoints = emailQuestion.keyPoints;
      } else if (emailQuestion.topic && typeof emailQuestion.topic === 'string') {
        // Split by newlines and filter non-empty lines
        keyPoints = emailQuestion.topic.split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);
      }
      
      // Parse recipient from "To:" line in sampleAnswer or scenario
      let recipient = emailQuestion.recipient || '';
      if (!recipient) {
        const sampleText = emailQuestion.sampleAnswer || emailQuestion.scenario || '';
        const toMatch = sampleText.match(/To:\s*([^\n]+)/i);
        if (toMatch) recipient = toMatch[1].trim();
      }
      
      // Parse purpose from first key point or generate from scenario
      let purpose = emailQuestion.purpose || '';
      if (!purpose && keyPoints.length > 0) {
        purpose = keyPoints[0];
      }
      
      return {
        id: 1,
        scenario: emailQuestion.scenario || emailPrompt.scenario,
        recipient: recipient || 'Customer Service',
        purpose: purpose || 'Address the issue described',
        keyPoints: keyPoints.length > 0 ? keyPoints : emailPrompt.keyPoints
      };
    }
    
    return emailPrompt; // Fallback to default
  })();

  // Extract Discussion Topic and Posts from loaded questions OR testData.discussionTask
  // Priority: testData.discussionTask (parsed structure) > loadedQuestions (raw question format)
  const activeDiscussionData = (() => {
    // FIRST PRIORITY: Check testData.discussionTask directly (from admin parser)
    if (testData?.discussionTask && testData.discussionTask.professorQuestion) {
      const dt = testData.discussionTask;
      // Prevent double "Professor" prefix - only add if not already present
      const rawName = dt.professorName || '';
      const professorName = rawName 
        ? (rawName.toLowerCase().startsWith('professor') || rawName.toLowerCase().startsWith('dr') 
           ? rawName 
           : `Professor ${rawName}`)
        : 'Professor Johnson';
      const professorPrompt = dt.professorQuestion || '';
      
      // Build student posts from discussionTask.students array
      const studentPosts: DiscussionPost[] = (dt.students || []).map((student, idx) => ({
        author: student.name || `Student ${idx + 1}`,
        role: "student" as const,
        content: student.response || '',
        avatar: (student.name || 'S').substring(0, 2).toUpperCase()
      }));
      
      // Extract title from first sentence of professor prompt
      const firstSentence = professorPrompt.split('.')[0];
      const discussionTitle = firstSentence && firstSentence.length < 100 ? firstSentence : 'Academic Discussion';
      
      return {
        topic: {
          title: discussionTitle,
          professorPrompt: professorPrompt,
          question: professorPrompt
        },
        posts: [
          {
            author: professorName,
            role: "professor" as const,
            content: professorPrompt,
            avatar: professorName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
          },
          ...studentPosts
        ] as DiscussionPost[]
      };
    }
    
    // SECOND PRIORITY: Find discussion question in loadedQuestions
    // Step 1: First try explicit type check (highest priority)
    let discussionQuestion = loadedQuestions.find((q: any) => {
      return q.type === 'academic-discussion' || q.writingType === 'academic-discussion' || q.questionType === 'academic-discussion' ||
          q.type === 'discussion' || q.writingType === 'discussion' || q.questionType === 'discussion';
    });
    
    // Step 2: If no explicit type match, fall back to content-based detection
    if (!discussionQuestion) {
      discussionQuestion = loadedQuestions.find((q: any) => {
        // Skip email type - only match unlabeled questions with discussion-like content
        if (q.type === 'email' || q.questionType === 'email' || q.writingType === 'email') {
          return false;
        }
        // Content-based detection: topic has professor-like content, scenario has student names
        const hasLongTopic = q.topic && typeof q.topic === 'string' && q.topic.length > 200;
        const noWords = !Array.isArray(q.words) || q.words.length === 0;
        const scenarioHasStudents = q.scenario && typeof q.scenario === 'string' && 
          (/[A-Z][a-z]+:/i.test(q.scenario)); // Has "Name:" pattern like "Emma:" or "James:"
        return hasLongTopic && noWords && scenarioHasStudents;
      });
    }
    
    if (discussionQuestion) {
      // Debug: Log the discussion question data
      console.log('[DEBUG] discussionQuestion found:', {
        type: discussionQuestion.type,
        professorName: discussionQuestion.professorName,
        professorQuestion: discussionQuestion.professorQuestion?.substring(0, 80),
        hasTopic: !!discussionQuestion.topic,
        hasStudentResponses: Array.isArray(discussionQuestion.studentResponses),
        studentResponsesCount: discussionQuestion.studentResponses?.length
      });
      
      // Parse student posts from studentResponses or studentPosts or scenario field
      let studentPosts: DiscussionPost[] = [];
      
      // First priority: studentResponses array (from AI parsing)
      if (Array.isArray(discussionQuestion.studentResponses) && discussionQuestion.studentResponses.length > 0) {
        studentPosts = discussionQuestion.studentResponses.map((post: any, idx: number) => ({
          author: post.name || post.author || `Student ${idx + 1}`,
          role: "student" as const,
          content: post.response || post.content || post.text || '',
          avatar: (post.name || post.author || 'S').substring(0, 2).toUpperCase()
        }));
      } else if (Array.isArray(discussionQuestion.studentPosts)) {
        studentPosts = discussionQuestion.studentPosts.map((post: any, idx: number) => ({
          author: post.author || post.name || `Student ${idx + 1}`,
          role: "student" as const,
          content: post.content || post.text || post.response || '',
          avatar: (post.author || post.name || 'S')[0].toUpperCase() + ((post.author || post.name || 'T')[1] || '').toUpperCase()
        }));
      } else if (discussionQuestion.scenario && typeof discussionQuestion.scenario === 'string') {
        // Parse student posts from scenario text format: "Sophia: I believe... \n\nDavid: I'm skeptical..."
        const scenarioText = discussionQuestion.scenario;
        
        // Simple split approach for "Name: response" format - handles multi-word names
        const parts = scenarioText.split(/\n+(?=[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?:)/);
        for (const part of parts) {
          const nameMatch = part.match(/^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)[:\s]+([\s\S]+)/);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            const content = nameMatch[2].trim();
            const nameLower = name.toLowerCase();
            // Skip professor, directions, or other non-student entries
            if (nameLower === 'professor' || nameLower.includes('posted') || 
                nameLower === 'student' || nameLower === 'directions' ||
                nameLower.startsWith('dr') || content.length < 20) {
              continue;
            }
            studentPosts.push({
              author: name,
              role: "student" as const,
              content: content,
              avatar: name.substring(0, 2).toUpperCase()
            });
          }
        }
      }
      
      // Parse professor info from topic field or professorName
      let professorName = discussionQuestion.professorName && discussionQuestion.professorName !== 'Professor' 
        ? discussionQuestion.professorName 
        : '';  // Will be set by fallback logic below
      let professorPrompt = discussionQuestion.professorPrompt || discussionQuestion.professorQuestion || '';
      let discussionTitle = discussionQuestion.title || 'Academic Discussion';
      
      // Generate professor name from context if not provided
      if (!professorName) {
        // Try to infer a contextual professor name based on topic
        const topicLower = (discussionQuestion.topic || discussionQuestion.scenario || '').toLowerCase();
        if (topicLower.includes('gene') || topicLower.includes('biology') || topicLower.includes('genetic')) {
          professorName = 'Dr. Harrison';
        } else if (topicLower.includes('climate') || topicLower.includes('environment')) {
          professorName = 'Professor Chen';
        } else if (topicLower.includes('ai') || topicLower.includes('technology') || topicLower.includes('computer')) {
          professorName = 'Dr. Martinez';
        } else if (topicLower.includes('economic') || topicLower.includes('business')) {
          professorName = 'Professor Williams';
        } else {
          professorName = 'Professor Johnson';
        }
      }
      
      if (discussionQuestion.topic && typeof discussionQuestion.topic === 'string') {
        const topicText = discussionQuestion.topic;
        // Check if topic starts with professor name: "Martinez: Urban planners..."
        // But NOT common words that might have colons (Universities:, Companies:, etc.)
        const profNameMatch = topicText.match(/^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?):\s*/);
        
        // List of words that look like names but are actually topic starters
        const nonNameWords = ['universities', 'companies', 'students', 'schools', 'colleges', 
          'researchers', 'governments', 'organizations', 'institutions', 'scientists',
          'people', 'countries', 'businesses', 'industries', 'experts', 'professionals',
          'today', 'recently', 'many', 'some', 'most', 'all', 'these', 'those'];
        
        if (profNameMatch) {
          const extractedName = profNameMatch[1];
          const isNonNameWord = nonNameWords.includes(extractedName.toLowerCase());
          
          // Only treat as professor name if it's not a common word
          if (!isNonNameWord) {
            // Prevent double prefix
            if (!extractedName.toLowerCase().startsWith('professor') && !extractedName.toLowerCase().startsWith('dr')) {
              professorName = `Professor ${extractedName}`;
            } else {
              professorName = extractedName;
            }
            professorPrompt = topicText.replace(/^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?:\s*/, '').trim();
          } else {
            // Not a professor name, keep the full text as the prompt
            professorPrompt = topicText;
          }
        } else {
          professorPrompt = topicText;
        }
        
        // Try to extract title from first sentence or use default
        const firstSentence = professorPrompt.split('.')[0];
        if (firstSentence && firstSentence.length < 100) {
          discussionTitle = firstSentence;
        }
      }
      
      // Fallback: if no professor prompt found, use question or topic
      if (!professorPrompt) {
        professorPrompt = discussionQuestion.question || discussionQuestion.topic || discussionTopic.professorPrompt;
      }
      
      // Enhanced fallback: if still no professor prompt, try to infer from scenario/questionText
      if (!professorPrompt && discussionQuestion.scenario) {
        // Check if scenario starts with a professor prompt before student responses
        const scenarioText = discussionQuestion.scenario;
        // Look for professor-like intro before first student "Name:" pattern
        const firstStudentMatch = scenarioText.match(/^([\s\S]*?)(?=\n?[A-Z][a-z]+:\s)/);
        if (firstStudentMatch && firstStudentMatch[1].trim().length > 50) {
          professorPrompt = firstStudentMatch[1].trim();
        }
      }
      
      // Final fallback: generate a contextual prompt based on student discussion topics
      if (!professorPrompt && studentPosts.length > 0) {
        // Try to infer topic from student posts content
        const firstPost = studentPosts[0]?.content || '';
        if (firstPost.toLowerCase().includes('gene editing')) {
          professorPrompt = "Today we're discussing the ethics of gene editing technology. What are your thoughts on using gene editing to treat genetic diseases? Please share your perspective and explain your reasoning.";
          discussionTitle = "The Ethics of Gene Editing";
        } else if (firstPost.toLowerCase().includes('artificial intelligence') || firstPost.toLowerCase().includes('AI')) {
          professorPrompt = "We're exploring the impact of artificial intelligence on society. What do you think about AI's role in our future? Share your thoughts and reasoning.";
          discussionTitle = "AI and Society";
        } else if (firstPost.toLowerCase().includes('climate') || firstPost.toLowerCase().includes('environment')) {
          professorPrompt = "Today's topic is environmental policy. What actions do you think should be taken to address climate change? Please explain your position.";
          discussionTitle = "Environmental Policy";
        } else {
          professorPrompt = "I'd like to hear your thoughts on this important topic. Please share your perspective and explain your reasoning. Consider the arguments presented and provide your own insights.";
        }
      }
      
      return {
        topic: {
          title: discussionQuestion.title || discussionTitle || discussionTopic.title,
          professorPrompt: professorPrompt || discussionTopic.professorPrompt,
          question: professorPrompt || discussionQuestion.question || discussionTopic.question
        },
        posts: [
          {
            author: professorName,
            role: "professor" as const,
            content: professorPrompt || discussionTopic.professorPrompt,
            avatar: professorName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
          },
          ...(studentPosts.length > 0 ? studentPosts : discussionPosts.filter(p => p.role === 'student'))
        ] as DiscussionPost[]
      };
    }
    
    return {
      topic: discussionTopic,
      posts: discussionPosts
    };
  })();

  const activeDiscussionTopic = activeDiscussionData.topic;
  const activeDiscussionPosts = activeDiscussionData.posts;

  const calculateWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleStartTest = () => {
    setIsStarted(true);
    resetSentenceState();
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Do NOT auto-finish - user must manually submit even when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetSentenceState = () => {
    const indices = currentSentenceItem.words.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setAvailableWords(indices);
    setSelectedWords([]);
    // Clear checked state so user can re-check after reset
    setCheckedSentences(prev => {
      const newSet = new Set(prev);
      newSet.delete(currentItemIndex);
      return newSet;
    });
  };

  const handleWordClick = (wordIndex: number) => {
    if (availableWords.includes(wordIndex)) {
      setAvailableWords(prev => prev.filter(i => i !== wordIndex));
      setSelectedWords(prev => [...prev, wordIndex]);
      // Clear checked state when user modifies answer, allowing re-check
      if (checkedSentences.has(currentItemIndex)) {
        setCheckedSentences(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentItemIndex);
          return newSet;
        });
      }
    }
  };

  const handleRemoveWord = (position: number) => {
    const wordIndex = selectedWords[position];
    setSelectedWords(prev => prev.filter((_, i) => i !== position));
    setAvailableWords(prev => [...prev, wordIndex]);
    // Clear checked state when user modifies answer, allowing re-check
    if (checkedSentences.has(currentItemIndex)) {
      setCheckedSentences(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentItemIndex);
        return newSet;
      });
    }
  };

  const checkSentenceCorrect = () => {
    if (selectedWords.length !== currentSentenceItem.words.length) return false;
    return selectedWords.every((wordIdx, pos) => currentSentenceItem.correctOrder[pos] === wordIdx);
  };

  const handleSubmitSentence = () => {
    // Mark as checked (shows feedback panel regardless of correct/incorrect)
    setCheckedSentences(prev => new Set(prev).add(currentItemIndex));
    
    // Debug log for checking answer
    const isCorrect = checkSentenceCorrect();
    console.log('[Build a Sentence] Submit check:', {
      currentItemIndex,
      selectedWords,
      correctOrder: currentSentenceItem.correctOrder,
      words: currentSentenceItem.words,
      isCorrect
    });
    
    // Mark as completed if correct
    if (isCorrect) {
      setCompletedSentences(prev => {
        const newSet = new Set(prev).add(currentItemIndex);
        console.log('[Build a Sentence] Completed sentences:', Array.from(newSet));
        return newSet;
      });
    }
  };

  const handleNextSentence = () => {
    if (currentItemIndex < effectiveBuildSentenceItems.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else {
      setCurrentTask("write-email");
    }
  };

  const handleEmailSubmit = () => {
    if (emailSubject.trim() && emailBody.trim()) {
      setEmailCompleted(true);
    }
  };

  const handleDiscussionChange = (value: string) => {
    setDiscussionResponse(value);
    setDiscussionWordCount(calculateWordCount(value));
  };

  const handleDiscussionSubmit = () => {
    setDiscussionCompleted(true);
  };

  const saveTestSubmission = async () => {
    if (!user?.id || !testId || submissionSaved) return;
    try {
      const timeSpentMinutes = Math.round((Date.now() - testStartTimeRef.current) / 60000) || 1;
      const emailText = emailSubject ? `Subject: ${emailSubject}\n\n${emailBody}` : emailBody;
      await apiRequest("POST", "/api/test-attempts", {
        userId: user.id,
        testId: testId,
        totalScore: Math.round(((completedSentences.size + (emailCompleted ? 1 : 0) + (discussionCompleted ? 1 : 0)) / 7) * 100),
        sectionScores: {
          section: "writing",
          examType: "new-toefl",
          sentencesCompleted: completedSentences.size,
          emailCompleted: emailCompleted,
          discussionCompleted: discussionCompleted,
          emailText: emailText,
          discussionText: discussionResponse,
          totalItems: 7
        },
        timeSpent: timeSpentMinutes,
        status: "completed"
      });
      setSubmissionSaved(true);
    } catch (err) {
      console.error("Failed to save test submission:", err);
    }
  };

  const handleFullTestSectionComplete = () => {
    const attemptParam = fullTestAttemptId ? `&attemptId=${fullTestAttemptId}` : '';
    setLocation(`/new-toefl/full-test?section=writing&score=4.5${attemptParam}`);
  };

  const handleFinishTest = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    saveTestSubmission();
    if (isFullTestMode) {
      handleFullTestSectionComplete();
    } else {
      setShowResults(true);
    }
  };

  useEffect(() => {
    if (isStarted && currentTask === "build-sentence") {
      resetSentenceState();
    }
  }, [currentItemIndex, isStarted]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (user?.id && testId && !submissionSaved && (completedSentences.size > 0 || emailBody || discussionResponse)) {
        const timeSpent = Math.round((Date.now() - testStartTimeRef.current) / 60000);
        const emailText = emailSubject ? `Subject: ${emailSubject}\n\n${emailBody}` : emailBody;
        fetch('/api/test-attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: user.id,
            testId: testId,
            sectionScores: { section: "writing", examType: "new-toefl", sentencesCompleted: completedSentences.size, emailCompleted, discussionCompleted, emailText, discussionText: discussionResponse, partial: true },
            timeSpent: timeSpent || 1,
            status: "completed"
          })
        }).catch(() => {});
      }
    };
  }, []);

  if (isLoadingTest) {
    return <NewToeflLoadingState section="writing" />;
  }

  const activeQuestions = loadedQuestions.length > 0 ? loadedQuestions : null;
  const testTitle = testData?.title || "New TOEFL Writing";

  const getCurrentTaskLabel = () => {
    switch (currentTask) {
      case "build-sentence": return "Build a Sentence";
      case "write-email": return "Write an Email";
      case "academic-discussion": return "Academic Discussion";
    }
  };

  const calculateProgress = () => {
    return ((completedSentences.size + (emailCompleted ? 1 : 0) + (discussionCompleted ? 1 : 0)) / 7) * 100;
  };

  if (!isStarted) {
    return (
      <Suspense fallback={<NewToeflLoadingState section="writing" />}>
        <DeferredNewToeflWritingIntroView
          isLight={isLight}
          title={testTitle}
          questionCountText={activeQuestions ? `${activeQuestions.length}개 문제` : "2026 완전 개편된 형식"}
          onStart={handleStartTest}
          t={t}
        />
      </Suspense>
    );
  }

  if (showResults) {
    return (
      <Suspense fallback={<NewToeflLoadingState section="writing" />}>
        <DeferredNewToeflWritingResultsView
          isLight={isLight}
          completedSentencesSize={completedSentences.size}
          emailCompleted={emailCompleted}
          discussionWordCount={discussionWordCount}
          t={t}
        />
      </Suspense>
    );
  }

  return (
    <NewToeflLayout
      section="writing"
      isTestMode
      showReformBadge
      darkNav
      timeRemaining={timeRemaining}
      progress={calculateProgress()}
      currentTaskLabel={getCurrentTaskLabel()}
    >
      <div className="wt-single">
        {/* wt-stabs: sticky subtab bar — violet box-shadow underline */}
        <div className="wt-stabs">
          <button
            onClick={() => { setCurrentTask("build-sentence"); setCurrentItemIndex(0); }}
            className={`wt-st${currentTask === "build-sentence" ? " on" : ""}`}
            data-testid="button-tab-sentence"
          >
            <Type className="h-3.5 w-3.5 shrink-0" />
            <span>Build a Sentence</span>
            <span style={{fontSize:9,opacity:0.6,fontFamily:'monospace'}}>{completedSentences.size}/5</span>
          </button>
          <button
            onClick={() => setCurrentTask("write-email")}
            className={`wt-st${currentTask === "write-email" ? " on" : ""}`}
            data-testid="button-tab-email"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span>Write an Email</span>
            <span style={{fontSize:9,opacity:0.6,fontFamily:'monospace',color: emailCompleted ? '#00E87B' : undefined}}>
              {emailCompleted ? '✓' : '—'}
            </span>
          </button>
          <button
            onClick={() => setCurrentTask("academic-discussion")}
            className={`wt-st${currentTask === "academic-discussion" ? " on" : ""}`}
            data-testid="button-tab-discussion"
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Discussion</span>
            <span style={{fontSize:9,opacity:0.6,fontFamily:'monospace',color: discussionCompleted ? '#00E87B' : undefined}}>
              {discussionCompleted ? '✓' : '—'}
            </span>
          </button>
        </div>

        {/* ── Build a Sentence: 2-column 분할 레이아웃 ── */}
        {currentTask === "build-sentence" && (
        <div className="wt-split">
          {/* LEFT: 문맥 + 템플릿 + 빌더 + 버튼 */}
          <div className="wt-pL" style={{ background: 'rgba(14,10,31,0.85)' }}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest mb-0.5" style={{ color: '#C4B5FD', letterSpacing: '1.4px', fontSize: 11 }}>Build a Sentence</p>
                <p className="text-xl font-bold text-white">#{currentItemIndex + 1}</p>
                <p className="text-xs mt-0.5" style={{ color: isLight ? '#6B7280' : 'rgba(255,255,255,0.4)' }}>{t('newtoefl.writing.buildSentenceDesc')}</p>
              </div>
              {completedSentences.has(currentItemIndex) && (
                <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>{t('writing.correct')}</span>
              )}
            </div>

            {/* Context */}
            <div className="ctx">
              <p className="ctx-label">📖 Context</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,243,255,0.8)' }}>{currentSentenceItem.contextSentence}</p>
            </div>

            {/* Sentence template */}
            {currentSentenceItem.sentenceTemplate && (
              <div className="p-4 rounded-xl" style={{ background: 'rgba(76,29,149,0.18)', border: '1px solid rgba(196,181,253,0.14)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(196,181,253,0.65)', letterSpacing: '1.4px', fontSize: 10 }}>Complete the sentence</p>
                <p className="text-base font-medium leading-relaxed" style={{ color: '#F5F3FF' }}>
                  {currentSentenceItem.sentenceTemplate.split('_____').map((part, idx, arr) => (
                    <span key={idx}>
                      {part}
                      {idx < arr.length - 1 && (
                        <span className="inline-block mx-1 px-4 py-1 min-w-[60px] text-center" style={{ background: 'rgba(76,29,149,0.25)', borderBottom: '2px solid #A78BFA', color: '#EDE9FE' }}>
                          {selectedWords[idx] !== undefined ? currentSentenceItem.words[selectedWords[idx]] : '___'}
                        </span>
                      )}
                    </span>
                  ))}
                </p>
              </div>
            )}

            {/* Sentence builder row */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(167,139,250,0.6)' }}>Your answer</p>
              <div className="sb-row">
                {selectedWords.length === 0 ? (
                  <span className="sb-row-empty">{t('newtoefl.writing.clickWordsHint')}</span>
                ) : (
                  selectedWords.map((wordIdx, pos) => (
                    <button
                      key={`selected-${pos}`}
                      onClick={() => handleRemoveWord(pos)}
                      className="wb-chip sel flex items-center gap-1"
                      data-testid={`button-remove-word-${pos}`}
                    >
                      {currentSentenceItem.words[wordIdx]}
                      <X className="h-3 w-3" style={{ opacity: 0.6 }} />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={resetSentenceState}
                className="btn-wt slate px-6"
                data-testid="button-reset-sentence"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('writing.reset')}
              </button>
              <button
                onClick={handleSubmitSentence}
                disabled={selectedWords.length !== currentSentenceItem.words.length || checkedSentences.has(currentItemIndex)}
                className="btn-wt green flex-1"
                data-testid="button-check-sentence"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('writing.checkAnswer')}
              </button>
            </div>
          </div>

          {/* RIGHT: 단어 뱅크 + 피드백 */}
          <div className="wt-pR">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#C4B5FD', letterSpacing: '1.4px', fontSize: 11 }}>Word Bank</p>
              <div className="wb">
                {availableWords.map((wordIdx) => (
                  <button
                    key={`available-${wordIdx}`}
                    onClick={() => handleWordClick(wordIdx)}
                    className="wb-chip"
                    data-testid={`button-word-${wordIdx}`}
                  >
                    {currentSentenceItem.words[wordIdx]}
                  </button>
                ))}
              </div>
            </div>

            {checkedSentences.has(currentItemIndex) && (
              <NewToefl2026BuildSentenceFeedbackPanel
                correctSentence={currentSentenceItem.words.map((_, i) => currentSentenceItem.words[currentSentenceItem.correctOrder[i]]).join(" ")}
                userSentence={selectedWords.map(idx => currentSentenceItem.words[idx]).join(" ")}
                context={currentSentenceItem.contextSentence}
                correctBlanks={currentSentenceItem.words.map((_, i) => currentSentenceItem.words[currentSentenceItem.correctOrder[i]]).join(" ")}
                userBlanks={selectedWords.map(idx => currentSentenceItem.words[idx]).join(" ")}
              />
            )}
          </div>
        </div>
        )}

        {/* ── Write an Email: 좌우 분할 레이아웃 ── */}
        {currentTask === "write-email" && (
        <div className="wt-split">
          {/* 좌측 패널: 상황 설명 */}
          <div className="wt-pL">
            <p className="text-xl font-bold text-white mb-1">{t('newtoefl.writing.emailSection')}</p>
            <p className="text-xs mb-4" style={{ color: isLight ? '#6B7280' : 'rgba(255,255,255,0.4)' }}>{t('newtoefl.writing.emailSectionDesc')}</p>

            <div className="ctx mb-4">
              <p className="ctx-label">{t('newtoefl.writing.situation')}</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: isLight ? '#374151' : 'rgba(255,255,255,0.75)' }}>{activeEmailPrompt.scenario}</p>
            </div>

            <div className="email-fields mb-4">
              <div className="ef">
                <p className="ef-label">{t('newtoefl.writing.recipient')}</p>
                <p className="ef-value">{activeEmailPrompt.recipient}</p>
              </div>
              <div className="ef">
                <p className="ef-label">{t('newtoefl.writing.purpose')}</p>
                <p className="ef-value">{activeEmailPrompt.purpose}</p>
              </div>
            </div>

            <div className="ctx vi">
              <p className="ctx-label">{t('newtoefl.writing.keypoints')}</p>
              <ul className="space-y-1.5">
                {activeEmailPrompt.keyPoints.map((point, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2" style={{ color: isLight ? '#374151' : 'rgba(255,255,255,0.7)' }}>
                    <span style={{ color: '#A78BFA' }}>•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 우측 패널: 이메일 작성 */}
          <div className="wt-pR">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#C4B5FD', letterSpacing: '1.4px', fontSize: 11 }}>Compose Email</p>
              {emailCompleted && (
                <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>{t('writing.complete')}</span>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: isLight ? '#6B7280' : 'rgba(255,255,255,0.5)' }}>{t('newtoefl.writing.subjectLabel')}</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="text-white text-base"
                  style={{ background: 'rgba(76,29,149,0.18)', border: '1px solid rgba(196,181,253,0.22)', color: '#F5F3FF' }}
                  disabled={emailCompleted}
                  data-testid="input-email-subject"
                />
              </div>
              <div className="flex flex-col flex-1">
                <label className="text-xs mb-1.5 block" style={{ color: isLight ? '#6B7280' : 'rgba(255,255,255,0.5)' }}>{t('newtoefl.writing.bodyLabel')}</label>
                <div className="flex-1" style={{ border: '1px solid rgba(196,181,253,0.22)', borderRadius: 10, overflow: 'hidden' }}>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder={"Dear Professor Johnson,\n\n..."}
                    className="write-area"
                    style={{ minHeight: 280, borderRadius: 0 }}
                    disabled={emailCompleted}
                    data-testid="textarea-email-body"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={handleEmailSubmit}
                disabled={!emailSubject.trim() || !emailBody.trim() || emailCompleted}
                className="btn-wt green flex-1"
                data-testid="button-submit-email"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {emailCompleted ? t('newtoefl.writing.submitted') : t('newtoefl.writing.submitEmail')}
              </button>
              {!isFullTestMode && (
                canGetAIFeedback ? (
                  <button
                    onClick={() => setShowEmailFeedback(true)}
                    disabled={!emailSubject.trim() || !emailBody.trim()}
                    className="btn-wt violet"
                    data-testid="button-request-email-feedback"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('newtoefl.writing.requestFeedback')}
                  </button>
                ) : (
                  <SubscriptionGuard requiredTier="light" feature="AI 라이팅 피드백" variant="compact">
                    <></>
                  </SubscriptionGuard>
                )
              )}
              <button
                onClick={() => setCurrentTask("academic-discussion")}
                className="btn-wt slate"
                data-testid="button-go-discussion"
              >
                {t('newtoefl.writing.goToDiscussion')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>

            {!isFullTestMode && (showEmailFeedback || emailCompleted) && emailBody.trim() && (
              <div className="mt-2">
                <NewToefl2026WritingFeedbackPanel
                  feedbackType="email"
                  scenario={activeEmailPrompt.scenario}
                  recipient={activeEmailPrompt.recipient}
                  keyPoints={activeEmailPrompt.keyPoints}
                  userSubject={emailSubject}
                  userBody={emailBody}
                />
              </div>
            )}
          </div>
        </div>
        )}

        {/* ── Academic Discussion: 좌우 분할 레이아웃 ── */}
        {currentTask === "academic-discussion" && (
        <div className="wt-split">
          {/* 좌측 패널: 안내 + 교수/학생 게시물 */}
          <div className="wt-pL" style={{ background: 'rgba(14,10,31,0.85)' }}>
            {/* 상단 헤더 */}
            <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#C4B5FD', letterSpacing: '1.4px', fontSize: 11 }}>Academic Discussion</p>

            {/* Directions */}
            <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(76,29,149,0.14)', border: '1px solid rgba(196,181,253,0.14)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: '#C4B5FD', letterSpacing: '1.4px', fontSize: 10 }}>Directions</p>
              <p className="text-xs leading-relaxed" style={{ color: isLight ? '#6B7280' : 'rgba(255,255,255,0.6)' }}>
                You have 10 minutes to plan, write, and revise your response. Typically, an effective response will contain 100 to 150 words.
              </p>
            </div>

            {/* Professor card */}
            <div className="dc flex items-start gap-3 mb-3">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face"
                alt={activeDiscussionPosts.find(p => p.role === "professor")?.author || "Professor"}
                className="dc-av flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold uppercase tracking-wide text-white">
                    {activeDiscussionPosts.find(p => p.role === "professor")?.author || "Professor"}
                  </span>
                  <span className="dc-rl">
                    Professor
                  </span>
                </div>
                <p className="dc-text">{activeDiscussionTopic.question}</p>
              </div>
            </div>

            {/* Student posts */}
            <div className="space-y-2">
              {activeDiscussionPosts.filter(post => post.role === "student").map((post, index) => (
                <div key={index} className="dc flex items-start gap-3">
                  <img
                    src={getAvatarByName(post.author, index)}
                    alt={post.author}
                    className="dc-av flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold uppercase tracking-wide text-white">{post.author}</span>
                      <span className="dc-rl">
                        <User className="h-2.5 w-2.5" />
                        Student
                      </span>
                    </div>
                    <p className="dc-text">{post.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 우측 패널: 응답 작성 */}
          <div className="wt-pR">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#C4B5FD', letterSpacing: '1.4px', fontSize: 11 }}>Your Response</p>
              {discussionCompleted && (
                <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>{t('writing.complete')}</span>
              )}
            </div>

            <div className="dc-panel flex-1 flex flex-col mb-4">
              <div className="dc-panel-bar">
                <div className="flex gap-1.5">
                  <button className="dc-edit-btn">Cut</button>
                  <button className="dc-edit-btn">Copy</button>
                  <button className="dc-edit-btn">Paste</button>
                </div>
              </div>
              <textarea
                value={discussionResponse}
                onChange={(e) => handleDiscussionChange(e.target.value)}
                placeholder={"In your response, you should do the following:\n• Express and support your opinion on the topic.\n• Make a contribution to the discussion in your own words."}
                className="write-area flex-1"
                style={{ minHeight: 320 }}
                disabled={discussionCompleted}
                data-testid="textarea-discussion-response"
              />
              <div className="wc-bar">
                <div className="flex items-center gap-2">
                  <span style={{ color: isLight ? '#6B7280' : 'rgba(255,255,255,0.5)' }}>Word Count:</span>
                  <span className={`wc-count ${discussionWordCount >= 100 ? 'wc-ok' : 'wc-warn'}`}>{discussionWordCount}</span>
                  {discussionWordCount < 100 && (
                    <span className="text-xs" style={{ color: isLight ? '#9CA3AF' : 'rgba(255,255,255,0.35)' }}>({t('newtoefl.writing.minWords')})</span>
                  )}
                </div>
                {discussionWordCount < 100 && discussionWordCount > 0 && (
                  <span className="text-xs" style={{ color: '#FCD34D' }}>{100 - discussionWordCount} {t('newtoefl.writing.moreWords')}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={handleDiscussionSubmit}
                disabled={discussionCompleted}
                className="btn-wt green flex-1"
                data-testid="button-submit-discussion"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {discussionCompleted ? t('newtoefl.writing.submitted') : t('newtoefl.writing.submitDiscussion')}
              </button>
              {!isFullTestMode && (
                canGetAIFeedback ? (
                  <button
                    onClick={() => setShowDiscussionFeedback(true)}
                    disabled={!discussionResponse.trim()}
                    className="btn-wt violet"
                    data-testid="button-request-discussion-feedback"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('newtoefl.writing.requestFeedback')}
                  </button>
                ) : (
                  <SubscriptionGuard requiredTier="light" feature="AI 라이팅 피드백" variant="compact">
                    <></>
                  </SubscriptionGuard>
                )
              )}
              <button
                onClick={handleFinishTest}
                className="btn-wt slate"
                data-testid="button-finish-test"
              >
                {t('newtoefl.writing.finishTest')}
              </button>
            </div>

            {!isFullTestMode && (showDiscussionFeedback || discussionCompleted) && discussionResponse.trim() && (
              <div className="mt-2">
                <NewToefl2026WritingFeedbackPanel
                  feedbackType="discussion"
                  topic={activeDiscussionTopic.title}
                  professorPrompt={activeDiscussionTopic.professorPrompt}
                  otherPosts={activeDiscussionPosts.filter(p => p.role === "student").map(p => ({ author: p.author, content: p.content }))}
                  userResponse={discussionResponse}
                />
              </div>
            )}
          </div>
        </div>
        )}

        {/* wt-s-bottom: Build a Sentence prev/next navigation */}
        {currentTask === "build-sentence" && (
          <div className="wt-s-bottom">
            <button
              onClick={() => setCurrentItemIndex(prev => Math.max(0, prev - 1))}
              disabled={currentItemIndex === 0}
              className="btn-wt slate"
              style={{flex:1}}
              data-testid="button-prev-sentence"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('newtoefl.writing.prev')}
            </button>
            <button
              onClick={handleNextSentence}
              className="btn-wt violet"
              style={{flex:1}}
              data-testid="button-next-sentence"
            >
              {currentItemIndex === effectiveBuildSentenceItems.length - 1 ? t('newtoefl.writing.goToEmail') : t('newtoefl.writing.next')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        )}
      </div>{/* /wt-single */}
    </NewToeflLayout>
  );
}
