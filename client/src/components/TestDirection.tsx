import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Headphones, 
  Mic, 
  Edit3, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Calculator,
  PenTool
} from "lucide-react";

type ToeflSection = "reading" | "listening" | "speaking" | "writing";
type GreSection = "analyticalWriting" | "verbal1" | "verbal2" | "quantitative1" | "quantitative2";
type SectionType = ToeflSection | GreSection;

interface TestDirectionProps {
  section: SectionType;
  testType: "toefl" | "newToefl" | "gre";
  duration: number;
  questionCount: number;
  onStart: () => void;
  currentSection: number;
  totalSections: number;
}

const sectionIcons: Record<string, any> = {
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
  writing: Edit3,
  analyticalWriting: PenTool,
  verbal1: BookOpen,
  verbal2: BookOpen,
  quantitative1: Calculator,
  quantitative2: Calculator,
};

const sectionColors: Record<string, string> = {
  reading: "from-purple-600 to-purple-800",
  listening: "from-pink-600 to-pink-800",
  speaking: "from-teal-600 to-teal-800",
  writing: "from-blue-600 to-blue-800",
  analyticalWriting: "from-amber-600 to-amber-800",
  verbal1: "from-indigo-600 to-indigo-800",
  verbal2: "from-violet-600 to-violet-800",
  quantitative1: "from-emerald-600 to-emerald-800",
  quantitative2: "from-green-600 to-green-800",
};

const sectionTitles: Record<string, string> = {
  reading: "Reading Section",
  listening: "Listening Section",
  speaking: "Speaking Section",
  writing: "Writing Section",
  analyticalWriting: "Analytical Writing",
  verbal1: "Verbal Reasoning - Section 1",
  verbal2: "Verbal Reasoning - Section 2",
  quantitative1: "Quantitative Reasoning - Section 1",
  quantitative2: "Quantitative Reasoning - Section 2",
};

const getDirections = (section: string, testType: string) => {
  if (testType === "toefl") {
    switch (section) {
      case "reading":
        return {
          title: "Reading Section",
          duration: "35 minutes",
          description: "This section measures your ability to understand academic passages in English.",
          instructions: [
            "You will read 2 passages and answer 10 questions about each passage.",
            "Most questions are worth 1 point, but the last question in each set is worth more than 1 point.",
            "You can click on Review to see which questions you have answered and which you have not answered.",
            "When you are ready to continue, click on Continue to go to the next question.",
          ],
          tips: [
            "Read each passage carefully before answering the questions.",
            "You may take notes while reading.",
            "You can refer back to the passage while answering questions.",
          ],
        };
      case "listening":
        return {
          title: "Listening Section",
          duration: "36 minutes",
          description: "This section measures your ability to understand conversations and lectures in English.",
          instructions: [
            "You will listen to 3 lectures and 2 conversations.",
            "You will hear each lecture or conversation only one time.",
            "After each lecture or conversation, you will answer questions about it.",
            "Most questions are worth 1 point, but some questions may be worth more.",
          ],
          tips: [
            "Listen carefully—you cannot replay the audio.",
            "Take notes while listening.",
            "Answer questions based on what the speakers say or imply.",
          ],
        };
      case "speaking":
        return {
          title: "Speaking Section",
          duration: "16 minutes",
          description: "This section measures your ability to speak about a variety of topics in English.",
          instructions: [
            "You will complete 4 speaking tasks.",
            "Task 1 asks for your opinion on a familiar topic.",
            "Tasks 2-4 combine reading, listening, and speaking.",
            "You will have preparation time before each response.",
          ],
          tips: [
            "Speak clearly and at a natural pace.",
            "Use the preparation time to organize your thoughts.",
            "Try to speak for the full response time.",
          ],
        };
      case "writing":
        return {
          title: "Writing Section",
          duration: "29 minutes",
          description: "This section measures your ability to write in English in an academic setting.",
          instructions: [
            "You will complete 2 writing tasks.",
            "Task 1: Read a passage, listen to a lecture, then write a summary (20 minutes).",
            "Task 2: Write a response to an online discussion (10 minutes).",
            "Your responses will be typed using the keyboard.",
          ],
          tips: [
            "Read and listen carefully before writing.",
            "Organize your ideas before you start writing.",
            "Leave time to review and edit your writing.",
          ],
        };
      default:
        return null;
    }
  } else if (testType === "newToefl") {
    // New TOEFL 2026
    switch (section) {
      case "reading":
        return {
          title: "Reading Section",
          duration: "~27 minutes",
          description: "This section measures your ability to understand written English in academic and daily life contexts.",
          instructions: [
            "This is an adaptive section with 2 modules.",
            "You will complete tasks like 'Complete the Words', 'Read in Daily Life', and 'Read an Academic Text'.",
            "The difficulty of the second module depends on your performance in the first module.",
            "Answer all questions to the best of your ability.",
          ],
          tips: [
            "Read each passage carefully.",
            "The content includes both academic texts and everyday materials like emails and announcements.",
            "Take your time with each question.",
          ],
        };
      case "listening":
        return {
          title: "Listening Section",
          duration: "~27 minutes",
          description: "This section measures your ability to understand spoken English in various contexts.",
          instructions: [
            "This is an adaptive section with 2 modules.",
            "You will hear conversations, announcements, and academic discussions.",
            "Audio plays only once—listen carefully.",
            "The difficulty adjusts based on your performance.",
          ],
          tips: [
            "Listen for main ideas and supporting details.",
            "Take notes while listening.",
            "Pay attention to the speakers' tone and attitude.",
          ],
        };
      case "writing":
        return {
          title: "Writing Section",
          duration: "~12 minutes",
          description: "This section measures your ability to write in English for practical and academic purposes.",
          instructions: [
            "You will complete 2 writing tasks.",
            "Task 1: Write an email based on a given scenario.",
            "Task 2: Write a response to an academic discussion (10 minutes).",
            "Type your responses using the keyboard.",
          ],
          tips: [
            "Read the prompts carefully.",
            "Organize your ideas before writing.",
            "Check your grammar and spelling.",
          ],
        };
      case "speaking":
        return {
          title: "Speaking Section",
          duration: "~8 minutes",
          description: "This section measures your ability to speak English spontaneously.",
          instructions: [
            "You will complete 2 types of tasks.",
            "Listen and Repeat: Repeat 7 sentences accurately.",
            "Virtual Interview: Answer 4 questions about a topic (45 seconds each).",
            "Important: There is NO preparation time for the interview questions.",
          ],
          tips: [
            "Speak clearly and at a natural pace.",
            "For Listen and Repeat, focus on pronunciation and rhythm.",
            "Answer interview questions spontaneously—don't hesitate.",
          ],
        };
      default:
        return null;
    }
  } else if (testType === "gre") {
    switch (section) {
      case "analyticalWriting":
        return {
          title: "Analytical Writing",
          duration: "30 minutes",
          description: "This section measures your critical thinking and analytical writing skills.",
          instructions: [
            "You will write one essay: 'Analyze an Issue'.",
            "You will be presented with a claim and asked to evaluate it.",
            "Develop your position with reasons and examples.",
            "There is no right or wrong answer—clarity and logic matter most.",
          ],
          tips: [
            "Plan your essay before you start writing.",
            "Use specific examples to support your argument.",
            "Leave time to proofread your essay.",
            "Focus on clear organization: introduction, body paragraphs, conclusion.",
          ],
        };
      case "verbal1":
        return {
          title: "Verbal Reasoning - Section 1",
          duration: "18 minutes",
          description: "This section measures your ability to analyze written material and synthesize information.",
          instructions: [
            "You will answer 12 questions.",
            "Question types include Text Completion, Sentence Equivalence, and Reading Comprehension.",
            "Some questions have more than one correct answer—select all that apply.",
            "You can skip questions and return to them later within this section.",
          ],
          tips: [
            "Read passages carefully before answering questions.",
            "For Text Completion, consider context clues.",
            "For Sentence Equivalence, look for words that create similar meanings.",
          ],
        };
      case "verbal2":
        return {
          title: "Verbal Reasoning - Section 2",
          duration: "23 minutes",
          description: "This adaptive section adjusts difficulty based on your Section 1 performance.",
          instructions: [
            "You will answer 15 questions.",
            "The difficulty level is based on your performance in Section 1.",
            "Question types are the same as Section 1.",
            "Manage your time carefully—this section has more questions.",
          ],
          tips: [
            "Stay calm regardless of perceived difficulty.",
            "Harder questions mean you did well in Section 1.",
            "Continue to use elimination strategies.",
          ],
        };
      case "quantitative1":
        return {
          title: "Quantitative Reasoning - Section 1",
          duration: "21 minutes",
          description: "This section measures your problem-solving ability using mathematical concepts.",
          instructions: [
            "You will answer 12 questions.",
            "Question types include Quantitative Comparison, Multiple Choice, and Numeric Entry.",
            "An on-screen calculator is available.",
            "You can skip questions and return to them later.",
          ],
          tips: [
            "Use the on-screen calculator for complex calculations.",
            "For Quantitative Comparison, look for shortcuts.",
            "Estimate when exact calculation isn't necessary.",
            "Check units and labels in word problems.",
          ],
        };
      case "quantitative2":
        return {
          title: "Quantitative Reasoning - Section 2",
          duration: "26 minutes",
          description: "This adaptive section adjusts difficulty based on your Section 1 performance.",
          instructions: [
            "You will answer 15 questions.",
            "The difficulty level is based on your performance in Section 1.",
            "Question types are the same as Section 1.",
            "Manage your time—this section has more questions.",
          ],
          tips: [
            "If questions seem harder, that's a good sign!",
            "Double-check arithmetic on easy-looking problems.",
            "Don't spend too long on any single question.",
          ],
        };
      default:
        return null;
    }
  }
  return null;
};

export default function TestDirection({
  section,
  testType,
  duration,
  questionCount,
  onStart,
  currentSection,
  totalSections,
}: TestDirectionProps) {
  const Icon = sectionIcons[section];
  const colorClass = sectionColors[section];
  const directions = getDirections(section, testType);

  if (!directions) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className={`bg-gradient-to-r ${colorClass} rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Icon className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">{directions.title}</CardTitle>
                <p className="text-white/80 mt-1">
                  Section {currentSection} of {totalSections}
                </p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-lg px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {directions.duration}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div>
            <p className="text-slate-300 text-lg leading-relaxed">
              {directions.description}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Directions
            </h3>
            <ul className="space-y-3">
              {directions.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-300">
                  <span className="flex-shrink-0 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-sm text-white">
                    {index + 1}
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
            <h4 className="text-white font-medium">Tips for Success:</h4>
            <ul className="space-y-2">
              {directions.tips.map((tip, index) => (
                <li key={index} className="flex items-center gap-2 text-slate-300 text-sm">
                  <ChevronRight className="h-4 w-4 text-green-400" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={onStart}
              size="lg"
              className={`bg-gradient-to-r ${colorClass} hover:opacity-90 text-white px-12 py-6 text-lg rounded-xl`}
              data-testid="button-start-section"
            >
              Continue
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
