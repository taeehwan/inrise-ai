import React, { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Flag,
  Home,
  X,
  Check,
  Lightbulb,
  Loader2,
  Maximize,
  Minimize,
  ArrowDown,
  ChevronRight,
  BarChart3
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Helper function to parse questions from passage content
function parseQuestionsFromText(questionsText: string) {
  const questions = [];
  const questionBlocks = questionsText.split(/\n\n(?=.*?\?)/);
  
  for (let i = 0; i < questionBlocks.length; i++) {
    const block = questionBlocks[i].trim();
    if (!block.includes('?')) continue;
    
    const lines = block.split('\n').filter(line => line.trim());
    const questionText = lines[0].trim();
    
    if (questionText.includes('?')) {
      const options = [];
      for (let j = 1; j < lines.length; j++) {
        const line = lines[j].trim();
        if (line.startsWith('○ ')) {
          options.push(line.substring(2).trim());
        }
      }
      
      if (options.length > 0) {
        questions.push({
          id: `q${i + 1}`,
          questionType: 'multiple_choice',
          questionText: questionText,
          options: options,
          correctAnswer: 0, // Will be determined by scoring
          points: 1
        });
      }
    }
  }
  
  return questions;
}
import { useAuth } from "@/hooks/useAuth";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import type { Test, Question, TestAttempt } from "@shared/schema";

const ToeflReadingLoginGate = lazy(
  () => import("@/components/toefl-reading/ToeflReadingLoginGate"),
);
const ToeflReadingReportDialog = lazy(
  () => import("@/components/toefl-reading/ToeflReadingReportDialog"),
);
const FeedbackDialog = lazy(() =>
  import("@/components/ToeflFeedbackPanel").then((module) => ({
    default: module.FeedbackDialog,
  })),
);

interface ReadingPassage {
  id: string;
  title: string;
  content: string;
}

// Mock TOEFL Reading data for demonstration
const mockReadingPassage: ReadingPassage = {
  id: "passage-1",
  title: "The Devonian History of the Mediterranean",
  content: `In 1970 geologists Kenneth J. Hsü and William B. F. Ryan were collecting research data while aboard the oceanographic research vessel Glomar Challenger. As members of the Glomar Challenger team, they were involved in the project of drilling under the Mediterranean Sea. Certainly, there were good reasons to seek the answer to this question about the ocean's past history.

The Mediterranean's floor is covered by sedimentary rock. That rock includes strata of evaporites—salt deposits left by evaporation—common in desert salt lakes. Some of these salt deposits are thick enough to form domes that bulge upward, distorting the overlying rock. These discoveries proved that the Mediterranean Sea had completely dried up in the past.

The researchers discovered that the Mediterranean Sea had literally dried up. In fact, it happened not just once, but on many occasions. The evidence indicated that the drying up of the Mediterranean had taken place over a period of approximately one million years during the Miocene epoch, roughly 6 million years ago. When the Mediterranean dried up, it would have looked like Death Valley looks today. The evaporation of the Mediterranean is referred to as the Messinian Salinity Crisis.

During the Messinian Salinity Crisis, the Mediterranean basin would have been a vast salt desert, 3,000 meters below sea level. The surrounding land would have been much different from today's Mediterranean climate. Evidence suggests that at the time, the flora surrounding the basin would have been subtropical, much like that found in sub-Saharan Africa today.

Scientists theorized that the drying up was likely caused by the gradual movement of tectonic plates that closed the Strait of Gibraltar, essentially cutting off the Mediterranean from the Atlantic Ocean. With no water source feeding it and the subtropical climate of the region, the Mediterranean would have evaporated completely.

The refilling of the Mediterranean was just as dramatic as its drying. When tectonic plate movement eventually reopened the connection to the Atlantic Ocean through the Strait of Gibraltar, water came rushing back in a spectacular fashion. The refilling process is estimated to have taken anywhere from a few hundred to a few thousand years, a remarkably short time in geological terms.`
};

// Mock TOEFL Reading questions for demonstration
const mockQuestions: any[] = [
  {
    id: "q1",
    questionText: "According to paragraph 1, what were Hsü and Ryan doing in 1970?",
    questionType: "multiple-choice",
    options: [
      "They were studying salt formations in desert lakes",
      "They were collecting research data while drilling under the Mediterranean Sea",
      "They were investigating the climate history of the Mediterranean region",
      "They were analyzing sedimentary rock samples from various ocean floors"
    ],
    correctAnswer: "They were collecting research data while drilling under the Mediterranean Sea",
    explanation: "The passage states that Hsü and Ryan were 'collecting research data while aboard the oceanographic research vessel Glomar Challenger' and 'were involved in the project of drilling under the Mediterranean Sea.'",
    passage: "The Devonian History of the Mediterranean",
    difficulty: "medium",
    points: 1,
    orderIndex: 0,
    testId: "toefl-reading-1",
    createdAt: new Date(),
    audioUrl: null,
    imageUrl: null,
    writingPrompt: null
  },
  {
    id: "q2",
    questionText: "The word 'distorting' in paragraph 2 is closest in meaning to",
    questionType: "multiple-choice",
    options: [
      "strengthening",
      "deforming",
      "supporting", 
      "clarifying"
    ],
    correctAnswer: "deforming",
    explanation: "In this context, 'distorting' means to change the shape or form of something, which is most similar to 'deforming.'",
    passage: "The Devonian History of the Mediterranean",
    difficulty: "easy",
    points: 1,
    orderIndex: 1,
    testId: "toefl-reading-1",
    createdAt: new Date(),
    audioUrl: null,
    imageUrl: null,
    writingPrompt: null
  },
  {
    id: "q3",
    questionText: "According to the passage, the Messinian Salinity Crisis refers to",
    questionType: "multiple-choice",
    options: [
      "The period when the Mediterranean Sea completely dried up",
      "A geological event that created the Strait of Gibraltar",
      "The formation of salt deposits in desert regions",
      "The subtropical climate that existed 6 million years ago"
    ],
    correctAnswer: "The period when the Mediterranean Sea completely dried up",
    explanation: "The passage explicitly states that 'The evaporation of the Mediterranean is referred to as the Messinian Salinity Crisis.'",
    passage: "The Devonian History of the Mediterranean",
    difficulty: "medium",
    points: 1,
    orderIndex: 2,
    testId: "toefl-reading-1",
    createdAt: new Date(),
    audioUrl: null,
    imageUrl: null,
    writingPrompt: null
  },
  {
    id: "q4",
    questionText: "What can be inferred about the Mediterranean basin during the Messinian Salinity Crisis?",
    questionType: "multiple-choice",
    options: [
      "It maintained some water sources from underground rivers",
      "It was completely covered by subtropical vegetation",
      "It resembled Death Valley with extremely low elevation",
      "It was gradually filled with sedimentary rock deposits"
    ],
    correctAnswer: "It resembled Death Valley with extremely low elevation",
    explanation: "The passage states that when the Mediterranean dried up, 'it would have looked like Death Valley looks today' and was 'a vast salt desert, 3,000 meters below sea level.'",
    passage: "The Devonian History of the Mediterranean",
    difficulty: "hard",
    points: 1,
    orderIndex: 3,
    testId: "toefl-reading-1",
    createdAt: new Date(),
    audioUrl: null,
    imageUrl: null,
    writingPrompt: null
  },
  {
    id: "q5",
    questionText: "An introductory sentence for a brief summary of the passage is provided below. Complete the summary by selecting the THREE answer choices that express the most important ideas in the passage. Some sentences do not belong in the summary because they express ideas that are not presented in the passage or are minor ideas in the passage.",
    questionType: "summary",
    options: [
      "Geologists in 1970 conducted research drilling under the Mediterranean Sea to understand its history",
      "The Mediterranean Sea has always maintained consistent salt levels throughout its geological history", 
      "Scientific evidence suggests the Mediterranean basin underwent major dessication approximately six million years ago",
      "Temperature differences between ancient and modern Mediterranean waters explain current salt concentrations",
      "Salt deposits and marine fossils provide evidence of the sea's dramatic environmental changes",
      "Most marine organisms easily survived the Mediterranean's environmental transformations over millions of years"
    ],
    correctAnswer: "Geologists in 1970 conducted research drilling under the Mediterranean Sea to understand its history,Scientific evidence suggests the Mediterranean basin underwent major dessication approximately six million years ago,Salt deposits and marine fossils provide evidence of the sea's dramatic environmental changes",
    explanation: "These three choices capture the main ideas: the research conducted, the major dessication event, and the evidence found.",
    points: 3,
    orderIndex: 4,
    testId: "toefl-reading-1",
    createdAt: new Date(),
    audioUrl: null,
    imageUrl: null,
    writingPrompt: null
  },
  {
    id: "q6",
    questionText: "In the passage, information about Mediterranean organisms is mentioned in relation to which of the following? Categorize the items by dragging them into the appropriate categories.",
    questionType: "category",
    options: [
      "Evidence of desiccation",
      "Marine fossil discovery", 
      "Salt concentration levels",
      "Deep drilling research",
      "Environmental adaptation",
      "Geological time periods",
      "Species survival rates"
    ],
    categories: {
      "Direct Evidence": [],
      "Research Methods": [],
      "Environmental Impact": []
    },
    correctAnswer: {
      "Direct Evidence": ["Evidence of desiccation", "Marine fossil discovery"],
      "Research Methods": ["Deep drilling research"],
      "Environmental Impact": ["Environmental adaptation", "Species survival rates"]
    },
    explanation: "This categorization question tests understanding of how different types of information relate to the main themes of the passage.",
    points: 5,
    orderIndex: 5,
    testId: "toefl-reading-1",
    createdAt: new Date(),
    audioUrl: null,
    imageUrl: null,
    writingPrompt: null
  }
];

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function TOEFLReading() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Extract test ID from URL path - FIXED for ai-toefl-reading tests
  const urlPath = window.location.pathname;
  let urlTestId: string | null = null;
  
  if (urlPath.includes('/test-taking/')) {
    urlTestId = urlPath.split('/test-taking/')[1];
  } else if (urlPath.includes('/toefl-reading/')) {
    urlTestId = urlPath.split('/toefl-reading/')[1];  
  } else {
    urlTestId = new URLSearchParams(window.location.search).get('testId');
  }
  
  // Use URL test ID directly - no need for default test lookup
  const actualTestId = urlTestId;

  // Fetch actual test data instead of using mock data
  const { data: testData, isLoading: testLoading } = useQuery({
    queryKey: ["/api/tests", actualTestId],
    enabled: !!actualTestId && isAuthenticated,
  });

  // Check if this is a TestSet test (not new AI test)
  const isTestSetTest = actualTestId?.startsWith('testset-');
  const testSetId = isTestSetTest && actualTestId ? actualTestId.replace('testset-', '') : null;

  // Fetch TestSet data for legacy AI-generated tests (only if it's actually a testSet)
  const { data: testSetData, isLoading: testSetLoading } = useQuery({
    queryKey: ["/api/test-sets", testSetId],
    enabled: !!testSetId && isAuthenticated && isTestSetTest,
  });

  // Force use of questions data - always ensure we have questions
  let actualQuestions = mockQuestions; // fallback always available
  
  if (testData && (testData as any).questions) {
    actualQuestions = (testData as any).questions;
    
    // Parse questions from passage content if template questions exist
    if (actualQuestions.length > 0 && actualQuestions[0]?.question === "이 지문의 주요 내용은 무엇입니까?") {
      const passages = (testData as any)?.passages;
      if (passages && passages[0] && passages[0].content) {
        const content = passages[0].content;
        const questionsMatch = content.match(/Questions\n(.*?)$/);
        
        if (questionsMatch && questionsMatch[1]) {
          const questionsText = questionsMatch[1];
          const parsedQuestions = parseQuestionsFromText(questionsText);
          
          if (parsedQuestions.length > 0) {
            actualQuestions = parsedQuestions;
          }
        }
      }
    }
  } else if (testSetData && (testSetData as any).questions) {
    actualQuestions = (testSetData as any).questions;
  }
  
  // FORCE: Always ensure we have at least mock questions
  if (!actualQuestions || actualQuestions.length === 0) {
    actualQuestions = mockQuestions;
  }
  
  // Extract passage - check multiple sources
  let actualPassage = mockReadingPassage;
  
  // First, check if testData has passages array (AI generated tests)
  if (testData && (testData as any).passages && (testData as any).passages.length > 0) {
    const passageObj = (testData as any).passages[0];
    
    actualPassage = {
      id: passageObj.id || "ai-passage-1",
      title: passageObj.title || "Reading Passage",
      content: passageObj.content || passageObj.text || ""
    };
  }
  // Fallback: check question's passage field
  else if (actualQuestions && actualQuestions.length > 0) {
    const questionWithPassage = actualQuestions.find((q: any) => q.passage);
    if (questionWithPassage?.passage) {
      // Only use if it looks like actual content (not just a title)
      if (questionWithPassage.passage.length > 100) {
        actualPassage = {
          id: "ai-passage-1",
          title: "Reading Passage", 
          content: questionWithPassage.passage
        };
      }
    }
  }
  
  // FORCE: Always ensure we have a passage
  if (!actualPassage || !actualPassage.content || actualPassage.content.length < 50) {
    actualPassage = mockReadingPassage;
  }
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedSummaryAnswers, setSelectedSummaryAnswers] = useState<string[]>([]);
  const [summarySlots, setSummarySlots] = useState<(string | null)[]>([null, null, null]); // 3 slots for drag-and-drop
  const [availableSummaryOptions, setAvailableSummaryOptions] = useState<string[]>([]);
  const [categoryAnswers, setCategoryAnswers] = useState<Record<string, string[]>>({});
  const [availableOptions, setAvailableOptions] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(1080); // 18 minutes for TOEFL reading
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  
  // AI Solution states
  const [showSolution, setShowSolution] = useState(false);
  const [solutionExplanation, setSolutionExplanation] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [loadingSolution, setLoadingSolution] = useState(false);
  const [currentSolutionQuestion, setCurrentSolutionQuestion] = useState<Question | null>(null);

  const currentQuestion = actualQuestions && actualQuestions.length > 0 ? actualQuestions[currentQuestionIndex] : null;

  // Function to determine which paragraph(s) a question relates to
  const getQuestionParagraphScope = (question: Question | null): number[] => {
    if (!question || !question.questionText) return [];
    
    const questionText = question.questionText.toLowerCase();
    
    // Extract paragraph numbers from question text (e.g., "paragraph 1", "paragraph 2")
    const paragraphMatch = questionText.match(/paragraph\s*(\d+)/);
    if (paragraphMatch) {
      return [parseInt(paragraphMatch[1])];
    }
    
    // For certain question types, determine scope based on content
    if (questionText.includes('according to the passage') || 
        questionText.includes('the passage suggests') ||
        questionText.includes('overall') ||
        questionText.includes('throughout the passage')) {
      return [1, 2, 3, 4, 5, 6]; // Entire passage
    }
    
    // Default to first paragraph if no specific indication
    return [1];
  };

  // Function to extract target word from vocabulary questions
  const getTargetWordFromQuestion = (question: Question | null): string | null => {
    if (!question || !question.questionText) return null;
    
    const questionText = question.questionText;
    
    // Match patterns like "The word 'precise' is closest in meaning to" or "The word precise is closest in meaning to"
    const wordMatch = questionText.match(/(?:the word|word)\s+['"]?([\w-]+)['"]?\s+(?:in|is)/i);
    if (wordMatch) {
      return wordMatch[1];
    }
    
    return null;
  };

  // Function to extract target sentence from sentence questions
  const getTargetSentenceFromQuestion = (question: Question | null): string | null => {
    if (!question) return null;
    
    const questionText = question.questionText;
    
    // Check if this is a sentence paraphrase question
    if (questionText && (questionText.toLowerCase().includes('which of the sentences below best expresses') ||
        questionText.toLowerCase().includes('which sentence best expresses') ||
        questionText.toLowerCase().includes('the following sentence'))) {
      
      // Look for quoted sentences in the question
      const sentenceMatch = questionText.match(/"([^"]+)"/);
      if (sentenceMatch) {
        return sentenceMatch[1];
      }
      
      // Look for sentences after "The following sentence" or similar patterns
      const followingMatch = questionText.match(/following sentence[:\s]+(.+?)(?:\?|$)/i);
      if (followingMatch) {
        return followingMatch[1].trim();
      }
    }
    
    return null;
  };

  // Function to highlight target word or sentence in paragraph text
  const highlightTargetTextInParagraph = (text: string, targetWord: string | null, targetSentence: string | null): React.ReactNode => {
    if (!targetWord && !targetSentence) {
      return text;
    }
    
    let result: React.ReactNode = text;
    
    // First, highlight target word if present
    if (targetWord) {
      // Create a case-insensitive regex to find the target word
      const wordRegex = new RegExp(`\\b(${targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      const wordParts = text.split(wordRegex);
      
      result = wordParts.map((part, index) => {
        if (part && targetWord && part.toLowerCase() === targetWord.toLowerCase()) {
          return (
            <mark key={`word-${index}`} className="bg-yellow-300 text-black font-semibold px-1 rounded">
              {part}
            </mark>
          );
        }
        return part;
      });
    }
    
    // Then, highlight target sentence if present
    if (targetSentence) {
      // Clean and normalize the target sentence for matching
      const cleanTargetSentence = targetSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
      
      // Try to find the sentence in the text (case-insensitive, flexible matching)
      const sentenceRegex = new RegExp(`(${cleanTargetSentence})`, 'gi');
      
      if (typeof result === 'string') {
        const sentenceParts = result.split(sentenceRegex);
        result = sentenceParts.map((part, index) => {
          if (part && targetSentence && part.toLowerCase().includes(targetSentence.toLowerCase())) {
            return (
              <mark key={`sentence-${index}`} className="bg-blue-200 text-black font-medium px-1 rounded border-l-4 border-blue-500">
                {part}
              </mark>
            );
          }
          return part;
        });
      } else {
        // If result is already JSX (from word highlighting), convert back to string for sentence matching
        const textContent = React.Children.toArray(result).map(child => 
          typeof child === 'string' ? child : (child as any)?.props?.children || ''
        ).join('');
        
        if (textContent && targetSentence && textContent.toLowerCase().includes(targetSentence.toLowerCase())) {
          // Find sentence boundaries more intelligently
          const sentences = textContent.split(/(?<=[.!?])\s+/);
          const matchingSentenceIndex = sentences.findIndex(s => 
            s && targetSentence && s.toLowerCase().includes(targetSentence.toLowerCase())
          );
          
          if (matchingSentenceIndex >= 0) {
            result = sentences.map((sentence, index) => {
              if (index === matchingSentenceIndex) {
                return (
                  <mark key={`sentence-${index}`} className="bg-blue-200 text-black font-medium px-1 rounded border-l-4 border-blue-500">
                    {sentence}
                  </mark>
                );
              }
              return sentence + (index < sentences.length - 1 ? ' ' : '');
            });
          }
        }
      }
    }
    
    return result;
  };

  // Split passage content into paragraphs
  const splitPassageIntoParagraphs = (content: string): string[] => {
    if (!content) return [];
    
    // Check if content looks like JSON and try to extract passage text
    let cleanedContent = content;
    
    // If content starts with { or [, it might be JSON - try to parse it
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(content);
        // If it's an object with a passage field, use that
        if (parsed && typeof parsed === 'object' && 'passage' in parsed) {
          cleanedContent = parsed.passage;
        } else if (parsed && typeof parsed === 'string') {
          cleanedContent = parsed;
        }
      } catch (e) {
        // If parsing fails, just use the content as is
        console.log('Failed to parse passage content, using as-is');
      }
    }
    
    // Paragraph splitting
    let paragraphs: string[] = [];
    
    // Try different paragraph separation patterns
    if (cleanedContent.includes('\n\n')) {
      // Standard double newline separation
      paragraphs = cleanedContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    } else {
      // Look for natural paragraph breaks based on sentence patterns
      // Split by periods followed by significant whitespace or line breaks
      const potentialParagraphs = cleanedContent.split(/\.\s*\n\s*(?=[A-Z])/);
      
      if (potentialParagraphs.length > 1) {
        paragraphs = potentialParagraphs.map((p, index) => {
          // Add back the period except for the last paragraph
          return index < potentialParagraphs.length - 1 ? p + '.' : p;
        }).filter(p => p.trim().length > 0);
      } else {
        // Last resort: keep as single paragraph if no clear breaks found
        paragraphs = [cleanedContent];
      }
    }
    
    // Clean up each paragraph and normalize whitespace
    paragraphs = paragraphs.map(p => {
      // Remove extra whitespace and normalize line breaks within paragraphs
      return p.replace(/\s+/g, ' ').trim();
    }).filter(p => p.length > 0);
    
    // If still only one very long paragraph, try to split by logical sentence breaks
    if (paragraphs.length === 1 && paragraphs[0].length > 1000) {
      const longText = paragraphs[0];
      // Look for sentences that could be paragraph breaks (e.g., transition sentences)
      const potentialBreaks = longText.split(/\.\s+(?=It\s|Other\s|However\s|Furthermore\s|The\s+earliest\s|A\s+major\s|Scientists\s|Researchers\s|When\s|During\s)/);
      
      if (potentialBreaks.length > 1) {
        paragraphs = potentialBreaks.map((p, index) => {
          return index < potentialBreaks.length - 1 ? p + '.' : p;
        }).filter(p => p.trim().length > 0);
      }
    }
    
    return paragraphs;
  };

  const passageContent = actualPassage?.content || (actualPassage as any)?.text || "";
  const passageParagraphs = splitPassageIntoParagraphs(passageContent);
  
  const questionScope = getQuestionParagraphScope(currentQuestion);
  const targetWord = getTargetWordFromQuestion(currentQuestion);
  const targetSentence = getTargetSentenceFromQuestion(currentQuestion);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated, isLoading]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !isTestCompleted) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      handleFinishTest();
    }
  }, [timeRemaining, isTestCompleted]);

  // Initialize summary slots when summary question is shown - restore from previous answers if available
  useEffect(() => {
    if (currentQuestion?.questionType === "summary") {
      const options = (currentQuestion as any).options || [];
      const questionId = currentQuestion.id;
      
      // Check if we have previously saved answers for this question
      const savedAnswer = answers[questionId];
      if (savedAnswer && savedAnswer.length > 0) {
        // Restore from saved answer
        const savedItems = savedAnswer.split(',').filter(Boolean);
        const newSlots: (string | null)[] = [null, null, null];
        savedItems.forEach((item, idx) => {
          if (idx < 3) {
            newSlots[idx] = item;
          }
        });
        setSummarySlots(newSlots);
        setSelectedSummaryAnswers(savedItems);
        // Available options are those not in slots
        setAvailableSummaryOptions(options.filter((opt: string) => !savedItems.includes(opt)));
      } else if (selectedSummaryAnswers.length > 0) {
        // Use current selection if it exists
        const newSlots: (string | null)[] = [null, null, null];
        selectedSummaryAnswers.forEach((item, idx) => {
          if (idx < 3) {
            newSlots[idx] = item;
          }
        });
        setSummarySlots(newSlots);
        setAvailableSummaryOptions(options.filter((opt: string) => !selectedSummaryAnswers.includes(opt)));
      } else {
        // Fresh start
        setAvailableSummaryOptions(options);
        setSummarySlots([null, null, null]);
      }
    }
  }, [currentQuestion?.id, currentQuestion?.questionType]);

  // Initialize category answers and available options when question changes
  useEffect(() => {
    if (currentQuestion?.questionType === "category") {
      const categories = Object.keys((currentQuestion as any).categories || {});
      const initialAnswers: Record<string, string[]> = {};
      categories.forEach((cat: string) => {
        initialAnswers[cat] = [];
      });
      setCategoryAnswers(initialAnswers);
      setAvailableOptions([...(currentQuestion.options as string[])]);
    }
  }, [currentQuestion?.id, currentQuestion?.options]);

  const submitAttemptMutation = useMutation({
    mutationFn: async (attemptData: any) => {
      const response = await apiRequest("POST", "/api/attempts", attemptData);
      return response;
    },
    onSuccess: (data: any) => {
      setAttemptId(data.id);
      setShowReport(true);
      setIsTestCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/attempts"] });
      toast({
        title: "테스트 완료!",
        description: "답안이 성공적으로 제출되었습니다.",
      });
    },
    onError: (error) => {
      console.error('Submit error:', error);
      toast({
        title: "제출 오류",
        description: "답안 제출 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  const aiSolutionMutation = useMutation({
    mutationFn: async (question: Question) => {
      // Better passage data handling
      const passageText = actualPassage?.content || (actualPassage as any)?.text || (actualPassage as any)?.passage || 
                          question.passage || "No passage available";
      
      try {
        const response = await apiRequest("POST", "/api/ai/explain-answer", {
          question: question.questionText,
          correctAnswer: question.correctAnswer,
          options: question.options,
          passage: passageText
        });
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('AI Solution API Error:', error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      console.log('AI Solution Success - Full Data:', data);
      console.log('AI Solution Success - Data Type:', typeof data);
      console.log('AI Solution Success - Explanation:', data?.explanation);
      
      let explanation = "";
      
      // Try to get explanation from various possible response formats
      if (data && typeof data === 'object') {
        explanation = data.explanation || data.content || data.message || data.result || "";
      } else if (typeof data === 'string') {
        explanation = data;
      }
      
      console.log('Final extracted explanation:', explanation);
      
      // If we have a valid explanation, show it  
      if (explanation && explanation.trim() !== "" && explanation.length > 10) {
        setSolutionExplanation(explanation);
        setLoadingSolution(false);
        toast({
          title: "AI 설명 완료", 
          description: "AI 설명이 생성되었습니다.",
        });
      } else {
        // If explanation is empty or too short, show error
        setSolutionExplanation("AI 설명을 생성했지만 내용을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        setLoadingSolution(false);
        console.error('Empty or invalid explanation received:', explanation);
      }
    },
    onError: (error: any) => {
      console.error('AI solution error details:', error);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response);
      
      let errorMessage = "AI 설명을 생성하는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.";
      
      // Try to get more specific error information
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setSolutionExplanation(errorMessage);
      setLoadingSolution(false);
      toast({
        title: "AI 설명 오류",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const handleAnswerChange = (value: string) => {
    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    }
  };

  const handleSummaryAnswerChange = (option: string, isSelected: boolean) => {
    if (isSelected && selectedSummaryAnswers.length >= 3) {
      toast({
        title: "Maximum selections reached",
        description: "You can only select 3 answers for summary questions.",
        variant: "destructive"
      });
      return;
    }

    if (isSelected) {
      setSelectedSummaryAnswers(prev => [...prev, option]);
    } else {
      setSelectedSummaryAnswers(prev => prev.filter(ans => ans !== option));
    }
  };

  // Drag and drop handlers for Summary questions
  const handleSummaryDragStart = (e: React.DragEvent, option: string) => {
    e.dataTransfer.setData('text/plain', option);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSummaryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSummaryDropToSlot = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    const option = e.dataTransfer.getData('text/plain');
    
    // Check if slot already has an item
    if (summarySlots[slotIndex] !== null) {
      // Return existing item to available options
      const existingItem = summarySlots[slotIndex];
      if (existingItem) {
        setAvailableSummaryOptions(prev => [...prev, existingItem]);
      }
    }
    
    // Remove from available options or from another slot
    setAvailableSummaryOptions(prev => prev.filter(opt => opt !== option));
    const newSlots = [...summarySlots];
    // Remove from other slot if exists
    const existingSlotIndex = newSlots.findIndex(s => s === option);
    if (existingSlotIndex !== -1) {
      newSlots[existingSlotIndex] = null;
    }
    newSlots[slotIndex] = option;
    setSummarySlots(newSlots);
    
    // Update selectedSummaryAnswers for scoring
    const filledSlots = newSlots.filter(s => s !== null) as string[];
    setSelectedSummaryAnswers(filledSlots);
    
    // Also update answers object for persistence
    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: filledSlots.join(',') }));
    }
  };

  const handleRemoveFromSlot = (slotIndex: number) => {
    const option = summarySlots[slotIndex];
    if (option) {
      setAvailableSummaryOptions(prev => [...prev, option]);
      const newSlots = [...summarySlots];
      newSlots[slotIndex] = null;
      setSummarySlots(newSlots);
      
      // Update selectedSummaryAnswers for scoring
      const filledSlots = newSlots.filter(s => s !== null) as string[];
      setSelectedSummaryAnswers(filledSlots);
      
      // Also update answers object for persistence
      if (currentQuestion) {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: filledSlots.join(',') }));
      }
    }
  };

  const handleSummaryDropToBank = (e: React.DragEvent) => {
    e.preventDefault();
    const option = e.dataTransfer.getData('text/plain');
    
    // Find and remove from slots
    const slotIndex = summarySlots.findIndex(s => s === option);
    if (slotIndex !== -1) {
      const newSlots = [...summarySlots];
      newSlots[slotIndex] = null;
      setSummarySlots(newSlots);
      
      if (!availableSummaryOptions.includes(option)) {
        setAvailableSummaryOptions(prev => [...prev, option]);
      }
      
      // Update selectedSummaryAnswers for scoring
      const filledSlots = newSlots.filter(s => s !== null) as string[];
      setSelectedSummaryAnswers(filledSlots);
      
      // Also update answers object for persistence
      if (currentQuestion) {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: filledSlots.join(',') }));
      }
    }
  };

  const handleCategoryDrop = (option: string, category: string) => {
    // First, remove from availableOptions if it's there
    if (availableOptions.includes(option)) {
      setAvailableOptions(prev => prev.filter(opt => opt !== option));
    } else {
      // If not in availableOptions, it must be in another category - remove it from there
      setCategoryAnswers(prev => {
        const newAnswers = { ...prev };
        Object.keys(newAnswers).forEach(cat => {
          if (cat !== category && newAnswers[cat].includes(option)) {
            newAnswers[cat] = newAnswers[cat].filter(item => item !== option);
          }
        });
        return newAnswers;
      });
    }
    
    // Add to the target category (if not already there)
    setCategoryAnswers(prev => {
      if (prev[category]?.includes(option)) return prev;
      return {
        ...prev,
        [category]: [...(prev[category] || []), option]
      };
    });
  };

  const handleRemoveFromCategory = (option: string, category: string) => {
    setCategoryAnswers(prev => ({
      ...prev,
      [category]: prev[category].filter(opt => opt !== option)
    }));
    setAvailableOptions(prev => [...prev, option]);
  };

  const handleNext = () => {
    if (actualQuestions && currentQuestionIndex < actualQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleFinishTest = () => {
    const finalAnswers = { ...answers };
    
    // Add summary answers
    if (actualQuestions) {
      const summaryQuestions = actualQuestions.filter((q: any) => q.questionType === "summary");
      summaryQuestions.forEach((q: any) => {
        finalAnswers[q.id] = selectedSummaryAnswers.join(',');
      });

      // Add category answers
      const categoryQuestions = actualQuestions.filter((q: any) => q.questionType === "category");
      categoryQuestions.forEach((q: any) => {
        const categorizedAnswers = Object.entries(categoryAnswers)
          .map(([cat, opts]) => `${cat}:${opts.join(',')}`)
          .join('|');
        finalAnswers[q.id] = categorizedAnswers;
      });
    }

    const attemptData = {
      testId: actualTestId || 'toefl-reading-1',
      answers: finalAnswers,
      timeSpent: 3600 - timeRemaining,
      completed: true
    };

    submitAttemptMutation.mutate(attemptData);
  };

  const handleGenerateSolution = (question: Question) => {
    setCurrentSolutionQuestion(question);
    setLoadingSolution(true);
    setSolutionExplanation("");
    setShowSolution(true); // Show modal immediately
    aiSolutionMutation.mutate(question);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };


  // Show login modal if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <Suspense
        fallback={
          <FullscreenWrapper className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div />
          </FullscreenWrapper>
        }
      >
        <ToeflReadingLoginGate
          showLoginModal={showLoginModal}
          setShowLoginModal={setShowLoginModal}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            toast({
              title: "로그인 성공",
              description: "TOEFL Reading 테스트를 시작할 수 있습니다!",
            });
          }}
        />
      </Suspense>
    );
  }

  const isSummaryQuestion = currentQuestion?.questionType === "summary";
  const isCategoryQuestion = currentQuestion?.questionType === "category";
  
  // Only summary and category questions should be fullscreen, not reading_comprehension
  const isFullScreenQuestion = isSummaryQuestion || isCategoryQuestion;
  const progress = actualQuestions ? ((currentQuestionIndex + 1) / actualQuestions.length) * 100 : 0;

  // 테스트 번호 계산 (URL에서 testId 기반으로)
  const getTestNumber = (testId: string) => {
    if (testId?.includes('1') || testId === 'toefl-reading-1') return 1;
    if (testId?.includes('2') || testId === 'toefl-reading-2') return 2;
    if (testId?.includes('3') || testId === 'toefl-reading-3') return 3;
    if (testId?.includes('4') || testId === 'toefl-reading-4') return 4;
    if (testId?.includes('5') || testId === 'toefl-reading-5') return 5;
    if (testId?.includes('6') || testId === 'toefl-reading-6') return 6;
    if (testId?.includes('7') || testId === 'toefl-reading-7') return 7;
    if (testId?.includes('8') || testId === 'toefl-reading-8') return 8;
    if (testId?.includes('9') || testId === 'toefl-reading-9') return 9;
    if (testId?.includes('10') || testId === 'toefl-reading-10') return 10;
    return 1; // 기본값
  };

  const testNumber = getTestNumber(actualTestId || 'toefl-reading-1');

  return (
    <SecurityWrapper 
      watermark="iNRISE TOEFL READING TEST"
      testNumber={testNumber}
      disableRightClick={true}
      disableKeyboardShortcuts={true}
      disableTextSelection={true}
      disableScreenshot={true}
      showSecurityNotice={true}
    >
      <FullscreenWrapper className="min-h-screen bg-white" hideButton={true}>
      {/* Header */}
      <div className="bg-purple-800 text-white p-4 shadow-lg relative">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            <Link href="/">
              <img src={logoPath} alt="iNRISE Logo" className="h-8" />
            </Link>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold" style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>TOEFL Reading Practice</h1>
              <p className="text-purple-200 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>Question {currentQuestionIndex + 1} of {actualQuestions ? actualQuestions.length : 0}</p>
            </div>
          </div>

          {/* Center - Progress Bar */}
          <div className="flex-1 mx-8 max-w-md">
            <div className="bg-purple-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center text-purple-200 text-xs mt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
              {Math.round(progress)}% Complete
            </p>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-purple-700 px-3 py-2 rounded-lg">
              <Clock className="h-5 w-5 text-purple-300" />
              <span className="font-mono text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>{formatTime(timeRemaining)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReport(true)}
              className="bg-white text-purple-800 border-white hover:bg-purple-50 font-semibold shadow-sm mr-2"
              style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="ml-1">REPORT</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullScreen}
              className="bg-white text-purple-800 border-white hover:bg-purple-50 font-semibold shadow-sm"
              style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}
            >
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="ml-1">FULL SCREEN</span>
            </Button>
            <Link href="/">
              <Button variant="outline" size="sm" className="text-purple-200 border-purple-400 hover:bg-purple-700" style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>
                <Home className="h-4 w-4 mr-1" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-purple-100 border-b border-purple-200 p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="text-purple-700 border-purple-300 hover:bg-purple-50"
            style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center space-x-2">
            {actualQuestions && actualQuestions.map((_: any, index: number) => (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentQuestionIndex(index)}
                className={index === currentQuestionIndex 
                  ? "bg-purple-600 text-white" 
                  : "text-purple-700 border-purple-300 hover:bg-purple-50"
                }
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {index + 1}
              </Button>
            ))}
          </div>

          {actualQuestions && currentQuestionIndex === actualQuestions.length - 1 ? (
            <Button
              onClick={handleFinishTest}
              disabled={submitAttemptMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}
            >
              {submitAttemptMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Flag className="h-4 w-4 mr-1" />
              )}
              Finish Test
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={!actualQuestions || currentQuestionIndex === actualQuestions.length - 1}
              className="text-purple-700 border-purple-300 hover:bg-purple-50"
              style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={isFullScreenQuestion ? "min-h-[calc(100vh-120px)]" : "flex min-h-[calc(100vh-120px)]"}>
        {/* Split-screen Layout for Regular Questions */}
        {!isFullScreenQuestion && (
          <>
            {/* Left Panel - Questions */}
            <div className="w-1/2 p-6 bg-white border-r border-purple-200">
              {currentQuestion && (
                <Card className="min-h-full">
                  <CardHeader className="bg-purple-100 border-b border-purple-300 min-h-[80px] flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-purple-900" style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>
                        Question {currentQuestionIndex + 1}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {currentQuestion.points && (
                          <Badge variant="secondary" className="bg-purple-300 text-purple-900" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateSolution(currentQuestion)}
                          disabled={loadingSolution}
                          className="text-purple-700 border-2 border-white bg-purple-100 hover:bg-purple-200"
                          style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}
                        >
                          {loadingSolution ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Lightbulb className="h-4 w-4 mr-1" />
                          )}
                          Solution
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-8">
                    <div className="leading-relaxed mb-6" style={{ fontSize: '1.1em', fontFamily: 'Arial, sans-serif' }}>
                      {currentQuestion.questionText}
                    </div>

                    {/* Answer Options */}
                    {(currentQuestion.questionType === "multiple-choice" || 
                      currentQuestion.questionType === "multiple_choice" || 
                      currentQuestion.questionType === "vocabulary" ||
                      currentQuestion.questionType === "reading_comprehension") && (
                      <RadioGroup
                        value={answers[currentQuestion.id] || ""}
                        onValueChange={handleAnswerChange}
                        className="space-y-3"
                      >
                        {currentQuestion.options && Array.isArray(currentQuestion.options) ? 
                          currentQuestion.options.map((option: string, index: number) => (
                            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-purple-50 border transition-colors">
                              <RadioGroupItem value={option} id={`option-${index}`} className="mt-1 radio-purple" />
                              <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer leading-relaxed" style={{ fontSize: '1.1em', fontFamily: 'Arial, sans-serif' }}>
                                {option}
                              </Label>
                            </div>
                          )) : (
                            <div className="text-red-500 p-3 bg-red-50 rounded-lg">
                              No options available for this question.
                              <div className="text-xs mt-2">Question type: {currentQuestion.questionType}</div>
                              <div className="text-xs">Options data: {JSON.stringify(currentQuestion.options)}</div>
                            </div>
                          )
                        }
                      </RadioGroup>
                    )}

                    {/* Insertion Question - Select position to insert sentence */}
                    {currentQuestion.questionType === "insertion" && (
                      <div className="space-y-4">
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                          <p className="text-sm text-orange-800 font-medium mb-2">
                            📍 Insertion Question: Select where the sentence best fits in the passage.
                          </p>
                          <p className="text-xs text-orange-600">
                            Select one of the four positions marked with [■] in the passage.
                          </p>
                        </div>
                        <RadioGroup
                          value={answers[currentQuestion.id] || ""}
                          onValueChange={handleAnswerChange}
                          className="space-y-3"
                        >
                          {['A', 'B', 'C', 'D'].map((position, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-orange-50 border transition-colors">
                              <RadioGroupItem value={position} id={`insertion-${index}`} className="mt-1 radio-purple" />
                              <Label htmlFor={`insertion-${index}`} className="flex-1 cursor-pointer leading-relaxed" style={{ fontSize: '1.1em', fontFamily: 'Arial, sans-serif' }}>
                                Position {position}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )}

                    {/* Summary Question - Multiple Selection (Select 3) */}
                    {currentQuestion.questionType === "summary" && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-800 font-medium mb-2">
                            📝 Summary Question: Select exactly 3 answer choices that express the most important ideas.
                          </p>
                          <p className="text-xs text-blue-600">
                            Selected: {selectedSummaryAnswers.length}/3
                          </p>
                        </div>
                        <div className="space-y-2">
                          {currentQuestion.options?.map((option: string, index: number) => (
                            <div key={index} className="flex items-start space-x-2">
                              <input
                                type="checkbox"
                                id={`summary-${index}`}
                                checked={selectedSummaryAnswers.includes(index.toString())}
                                onChange={(e) => handleSummaryAnswerChange(index.toString(), e.target.checked)}
                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <Label 
                                htmlFor={`summary-${index}`} 
                                className="text-sm cursor-pointer flex-1 py-1"
                              >
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category Question - Drag and Drop (5 points) */}
                    {currentQuestion.questionType === "category" && (
                      <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-green-800 font-medium mb-2">
                            🗂️ Categorization Question: Drag items into the appropriate categories.
                          </p>
                          <p className="text-xs text-green-600">
                            Total possible points: 5
                          </p>
                        </div>
                        
                        {/* Available Options */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-700 mb-3">Available Options:</h4>
                          <div className="flex flex-wrap gap-2">
                            {availableOptions.map((option, index) => (
                              <div
                                key={index}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('text/plain', option)}
                                className="bg-white px-3 py-2 rounded border border-gray-300 cursor-move hover:bg-gray-50 text-sm"
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Categories */}
                        <div className="grid gap-4">
                          {Object.entries(currentQuestion.categories || {}).map(([category, items]) => (
                            <div
                              key={category}
                              className="border-2 border-dashed border-gray-300 p-4 rounded-lg min-h-24"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const option = e.dataTransfer.getData('text/plain');
                                handleCategoryDrop(option, category);
                              }}
                            >
                              <h4 className="font-medium text-gray-700 mb-2">{category}</h4>
                              <div className="space-y-2">
                                {(categoryAnswers[category] || []).map((item, index) => (
                                  <div key={index} className="bg-blue-100 px-3 py-2 rounded border border-blue-300 flex justify-between items-center">
                                    <span className="text-sm">{item}</span>
                                    <button
                                      onClick={() => handleRemoveFromCategory(item, category)}
                                      className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel - Reading Passage */}
            <div className="w-1/2 p-6 bg-purple-50">
              <Card className="min-h-full">
                <CardContent className="p-0">
                  <div className="max-h-[calc(100vh-250px)] overflow-y-auto p-6">
                    {passageContent && passageContent.length > 0 ? (
                      <div className="space-y-4">
                        {/* Passage Title */}
                        {actualPassage?.title && (
                          <h2 className="text-xl text-gray-900 text-center mb-6" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {actualPassage.title}
                          </h2>
                        )}
                        
                        {/* Passage Content */}
                        <div className="space-y-6">
                          {passageParagraphs.map((paragraph, index) => {
                            const paragraphNumber = index + 1;
                            const isHighlighted = questionScope.includes(paragraphNumber);
                            
                            return (
                              <div 
                                key={index} 
                                className={`transition-all ${
                                  isHighlighted 
                                    ? 'bg-purple-50/30 pl-3 border-l-4 border-purple-400' 
                                    : ''
                                }`}
                              >
                                <div className="text-gray-800 leading-relaxed" style={{ fontSize: '18px', lineHeight: '1.8', fontFamily: 'Arial, sans-serif' }}>
                                  {paragraph}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>지문을 불러오는 중...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Full-width Summary Question Layout - TOEFL Official Style with Drag & Drop */}
        {isSummaryQuestion && currentQuestion && (
          <div className="w-full p-8 overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50">
            <Card className="max-w-none border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Arial, sans-serif' }}>
                      Question {currentQuestionIndex + 1} of {actualQuestions?.length || 0}
                    </CardTitle>
                    <p className="text-blue-100 mt-1">Prose Summary - Drag and Drop</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="text-lg px-4 py-2 bg-white/20 text-white border-0">
                      {currentQuestion.points || 2} points
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateSolution(currentQuestion)}
                      disabled={loadingSolution}
                      className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                    >
                      {loadingSolution ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Lightbulb className="h-4 w-4 mr-1" />
                      )}
                      AI Solution
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Directions */}
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">Directions:</h3>
                  <p className="text-blue-800 leading-relaxed" style={{ fontSize: '1.05em', fontFamily: 'Arial, sans-serif' }}>
                    An introductory sentence for a brief summary of the passage is provided below. Complete the summary by selecting the <strong>THREE</strong> answer choices that express the most important ideas in the passage. Some sentences do not belong in the summary because they express ideas that are not presented in the passage or are minor ideas in the passage.
                  </p>
                  <p className="text-blue-700 mt-3 font-semibold">This question is worth {currentQuestion.points || 2} points.</p>
                </div>

                {/* Introductory Statement */}
                <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
                  <p className="text-gray-800 text-lg leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {currentQuestion.questionText?.split('.')[0] || "Complete the summary by selecting the THREE answer choices."}
                  </p>
                </div>

                {/* Answer Slots - Drag answers here */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">ANSWER SLOTS</span>
                    <span className="text-gray-500 text-sm font-normal">Drag 3 answers here (order does not matter)</span>
                  </h4>
                  <div className="space-y-3">
                    {summarySlots.map((slotContent, slotIndex) => (
                      <div
                        key={slotIndex}
                        className={`min-h-[80px] p-4 rounded-xl border-2 border-dashed transition-all ${
                          slotContent 
                            ? 'bg-blue-50 border-blue-400' 
                            : 'bg-gray-50 border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                        onDragOver={handleSummaryDragOver}
                        onDrop={(e) => handleSummaryDropToSlot(e, slotIndex)}
                      >
                        {slotContent ? (
                          <div className="flex items-start justify-between gap-4">
                            <div
                              draggable
                              onDragStart={(e) => handleSummaryDragStart(e, slotContent)}
                              className="flex-1 cursor-move"
                            >
                              <p className="text-gray-800 leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
                                • {slotContent}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveFromSlot(slotIndex)}
                              className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <div className="text-center">
                              <ArrowDown className="w-6 h-6 mx-auto mb-1 opacity-50" />
                              <span className="text-sm">Drop answer {slotIndex + 1} here</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 text-center">
                    Selected: <span className="font-bold text-blue-600">{summarySlots.filter(s => s !== null).length}</span> / 3
                  </p>
                </div>

                {/* Answer Choices Bank */}
                <div 
                  className="space-y-4"
                  onDragOver={handleSummaryDragOver}
                  onDrop={handleSummaryDropToBank}
                >
                  <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm">ANSWER CHOICES</span>
                    <span className="text-gray-500 text-sm font-normal">Drag answers from here to the slots above</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableSummaryOptions.map((option, index) => {
                      const originalIndex = (currentQuestion.options as string[])?.indexOf(option) || index;
                      const letter = String.fromCharCode(65 + originalIndex);
                      return (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleSummaryDragStart(e, option)}
                          className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg cursor-move transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                              <span className="text-sm font-bold text-gray-600 group-hover:text-blue-600">{letter}</span>
                            </div>
                            <p className="flex-1 text-gray-700 leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
                              {option}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full-width Category Question Layout - TOEFL Official Style */}
        {isCategoryQuestion && !isSummaryQuestion && currentQuestion && (
          <div className="w-full p-8 overflow-y-auto bg-gradient-to-br from-slate-50 to-emerald-50">
            <Card className="max-w-none border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Arial, sans-serif' }}>
                      Question {currentQuestionIndex + 1} of {actualQuestions?.length || 0}
                    </CardTitle>
                    <p className="text-emerald-100 mt-1">Category Chart - Fill in the Table</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="text-lg px-4 py-2 bg-white/20 text-white border-0">
                      {currentQuestion.points || 3} points
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateSolution(currentQuestion)}
                      disabled={loadingSolution}
                      className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                    >
                      {loadingSolution ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Lightbulb className="h-4 w-4 mr-1" />
                      )}
                      AI Solution
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Directions */}
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                  <h3 className="text-lg font-bold text-emerald-900 mb-3">Directions:</h3>
                  <p className="text-emerald-800 leading-relaxed" style={{ fontSize: '1.05em', fontFamily: 'Arial, sans-serif' }}>
                    Select the appropriate phrases from the answer choices and match them to the category to which they relate. 
                    TWO of the answer choices will NOT be used.
                  </p>
                  <p className="text-emerald-700 mt-3 font-semibold">This question is worth {currentQuestion.points || 3} points.</p>
                </div>

                {/* Question Text */}
                <div className="bg-white p-6 rounded-xl border-2 border-gray-200 shadow-sm">
                  <p className="text-gray-800 text-lg leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {currentQuestion.questionText}
                  </p>
                </div>

                {/* Category Drop Zones */}
                <div className="space-y-6">
                  <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-sm">CATEGORIES</span>
                    <span className="text-gray-500 text-sm font-normal">Drag items into the appropriate category</span>
                  </h4>
                  <div className={`grid gap-6 ${Object.keys((currentQuestion as any).categories || {}).length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                    {Object.keys((currentQuestion as any).categories || {}).map((category, catIndex) => {
                      const categoryColors = [
                        { bg: 'bg-blue-50', border: 'border-blue-300', header: 'bg-blue-600', text: 'text-blue-600' },
                        { bg: 'bg-purple-50', border: 'border-purple-300', header: 'bg-purple-600', text: 'text-purple-600' },
                        { bg: 'bg-orange-50', border: 'border-orange-300', header: 'bg-orange-600', text: 'text-orange-600' },
                      ];
                      const color = categoryColors[catIndex % categoryColors.length];
                      const itemsInCategory = categoryAnswers[category] || [];
                      
                      return (
                        <div key={category} className="space-y-3">
                          <div className={`${color.header} text-white p-4 rounded-t-xl text-center font-bold text-lg`}>
                            {category}
                          </div>
                          <div
                            className={`${color.bg} ${color.border} border-2 border-dashed rounded-b-xl min-h-[200px] p-4 transition-all hover:shadow-lg`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const option = e.dataTransfer.getData('text/plain');
                              handleCategoryDrop(option, category);
                            }}
                          >
                            {itemsInCategory.length > 0 ? (
                              <div className="space-y-2">
                                {itemsInCategory.map((item, idx) => (
                                  <div 
                                    key={idx}
                                    draggable
                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', item)}
                                    className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between cursor-move group"
                                  >
                                    <span className="text-gray-800" style={{ fontFamily: 'Arial, sans-serif' }}>
                                      • {item}
                                    </span>
                                    <button
                                      onClick={() => handleRemoveFromCategory(item, category)}
                                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-all"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={`flex items-center justify-center h-full ${color.text} opacity-60`}>
                                <div className="text-center">
                                  <ArrowDown className="w-8 h-8 mx-auto mb-2" />
                                  <span className="text-sm">Drop items here</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className={`text-sm ${color.text} text-center font-medium`}>
                            {itemsInCategory.length} item{itemsInCategory.length !== 1 ? 's' : ''} placed
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Available Answer Choices */}
                <div 
                  className="space-y-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const option = e.dataTransfer.getData('text/plain');
                    // Check if already in available options
                    if (!availableOptions.includes(option)) {
                      // Find and remove from categories
                      const newCategoryAnswers = { ...categoryAnswers };
                      Object.keys(newCategoryAnswers).forEach(cat => {
                        newCategoryAnswers[cat] = newCategoryAnswers[cat].filter(item => item !== option);
                      });
                      setCategoryAnswers(newCategoryAnswers);
                      setAvailableOptions(prev => [...prev, option]);
                    }
                  }}
                >
                  <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm">ANSWER CHOICES</span>
                    <span className="text-gray-500 text-sm font-normal">
                      {availableOptions.length} remaining • Drag to categories above
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
                    {availableOptions.map((option, index) => {
                      const originalIndex = (currentQuestion.options as string[])?.indexOf(option) || index;
                      const letter = String.fromCharCode(65 + originalIndex);
                      return (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', option)}
                          className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-emerald-400 hover:shadow-lg cursor-move transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                              <span className="text-sm font-bold text-gray-600 group-hover:text-emerald-600">{letter}</span>
                            </div>
                            <p className="flex-1 text-gray-700 leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
                              {option}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {availableOptions.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-400">
                        <Check className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
                        <p>All items have been categorized!</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Test Completion Overlay */}
      {isTestCompleted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <Flag className="h-12 w-12 text-purple-600 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-purple-900" style={{ fontFamily: 'Arial, sans-serif', textTransform: 'uppercase' }}>Test Completed!</h3>
              <p className="text-gray-600 mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>
                Your answers have been submitted and are being processed.
              </p>
              <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Solution Dialog - Using new ToeflFeedbackPanel */}
      <Suspense fallback={null}>
        <FeedbackDialog
          open={showSolution}
          onOpenChange={setShowSolution}
          section="reading"
          isLoading={loadingSolution}
          explanation={solutionExplanation || "AI 설명을 생성 중입니다..."}
          questionText={currentSolutionQuestion?.questionText}
          correctAnswer={
            typeof currentSolutionQuestion?.correctAnswer === "string"
              ? currentSolutionQuestion.correctAnswer
              : undefined
          }
          userAnswer={currentSolutionQuestion ? answers[currentSolutionQuestion.id] : undefined}
          isCorrect={
            currentSolutionQuestion
              ? answers[currentSolutionQuestion.id] === currentSolutionQuestion.correctAnswer
              : undefined
          }
        />
        {showReport && (
          <ToeflReadingReportDialog
            open={showReport}
            onOpenChange={setShowReport}
            actualQuestions={actualQuestions}
            answers={answers}
            selectedSummaryAnswers={selectedSummaryAnswers}
            categoryAnswers={categoryAnswers}
            timeRemaining={timeRemaining}
          />
        )}
      </Suspense>
    </FullscreenWrapper>
    </SecurityWrapper>
  );
}
