import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Lightbulb, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  GraduationCap,
  X
} from "lucide-react";

export type SectionType = "reading" | "listening" | "writing";

interface FeedbackSection {
  title: string;
  content: string;
  icon?: "lightbulb" | "target" | "trending" | "check" | "alert" | "book";
}

interface ToeflFeedbackPanelProps {
  section: SectionType;
  isLoading?: boolean;
  explanation: string;
  questionText?: string;
  correctAnswer?: string;
  userAnswer?: string;
  isCorrect?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
  compact?: boolean;
}

const sectionColors: Record<SectionType, {
  primary: string;
  light: string;
  border: string;
  text: string;
  gradient: string;
  badge: string;
}> = {
  reading: {
    primary: "rgb(126, 34, 206)", 
    light: "rgb(243, 232, 255)",
    border: "rgb(192, 132, 252)",
    text: "rgb(88, 28, 135)",
    gradient: "from-purple-50 to-purple-100",
    badge: "bg-purple-600"
  },
  listening: {
    primary: "rgb(219, 39, 119)",
    light: "rgb(252, 231, 243)",
    border: "rgb(244, 114, 182)",
    text: "rgb(157, 23, 77)",
    gradient: "from-pink-50 to-pink-100",
    badge: "bg-pink-600"
  },
  writing: {
    primary: "rgb(79, 70, 229)",
    light: "rgb(238, 242, 255)",
    border: "rgb(129, 140, 248)",
    text: "rgb(55, 48, 163)",
    gradient: "from-indigo-50 to-indigo-100",
    badge: "bg-indigo-600"
  }
};

const iconMap = {
  lightbulb: Lightbulb,
  target: Target,
  trending: TrendingUp,
  check: CheckCircle2,
  alert: AlertCircle,
  book: BookOpen
};

function parseExplanationSections(explanation: string): FeedbackSection[] {
  const sections: FeedbackSection[] = [];
  
  if (!explanation || explanation.trim() === "") {
    return sections;
  }

  const lines = explanation.split('\n').filter(line => line.trim());
  let currentSection: FeedbackSection | null = null;
  let currentContent: string[] = [];

  const sectionPatterns = [
    { pattern: /^(##?\s*)?(정답\s*해설|정답|Correct Answer|Answer)/i, title: "정답 해설", icon: "check" as const },
    { pattern: /^(##?\s*)?(해설|Explanation|설명)/i, title: "상세 해설", icon: "lightbulb" as const },
    { pattern: /^(##?\s*)?(왜\s*이\s*답|왜|Why|이유)/i, title: "왜 이 답인가?", icon: "target" as const },
    { pattern: /^(##?\s*)?(오답\s*분석|오답|Wrong|Incorrect)/i, title: "오답 분석", icon: "alert" as const },
    { pattern: /^(##?\s*)?(학습\s*팁|팁|Tip|전략|Strategy)/i, title: "학습 팁", icon: "trending" as const },
    { pattern: /^(##?\s*)?(핵심\s*포인트|핵심|Key|Point|요점)/i, title: "핵심 포인트", icon: "book" as const },
  ];

  for (const line of lines) {
    let matched = false;
    
    for (const { pattern, title, icon } of sectionPatterns) {
      if (pattern.test(line)) {
        if (currentSection && currentContent.length > 0) {
          sections.push({
            ...currentSection,
            content: currentContent.join('\n')
          });
        }
        currentSection = { title, content: "", icon };
        currentContent = [];
        const cleanedLine = line.replace(pattern, '').replace(/^[:\s-]+/, '').trim();
        if (cleanedLine) {
          currentContent.push(cleanedLine);
        }
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      currentContent.push(line);
    }
  }

  if (currentSection && currentContent.length > 0) {
    sections.push({
      ...currentSection,
      content: currentContent.join('\n')
    });
  }

  if (sections.length === 0 && currentContent.length > 0) {
    sections.push({
      title: "AI 해설",
      content: currentContent.join('\n'),
      icon: "lightbulb"
    });
  }

  return sections;
}

function formatContent(content: string): JSX.Element {
  const lines = content.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
          const bulletContent = trimmedLine.replace(/^[•\-*]\s*/, '');
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="text-current opacity-60 mt-1">•</span>
              <span className="flex-1">{bulletContent}</span>
            </div>
          );
        }
        
        if (/^\d+[.)]\s/.test(trimmedLine)) {
          const [num, ...rest] = trimmedLine.split(/[.)]\s/);
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="font-semibold text-current opacity-80 min-w-[1.5rem]">{num}.</span>
              <span className="flex-1">{rest.join('. ')}</span>
            </div>
          );
        }
        
        if (trimmedLine === '') {
          return <div key={index} className="h-2" />;
        }
        
        return (
          <p key={index} className="leading-relaxed">
            {trimmedLine}
          </p>
        );
      })}
    </div>
  );
}

export default function ToeflFeedbackPanel({
  section,
  isLoading = false,
  explanation,
  questionText,
  correctAnswer,
  userAnswer,
  isCorrect,
  onClose,
  showCloseButton = true,
  compact = false
}: ToeflFeedbackPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const colors = sectionColors[section];
  const parsedSections = parseExplanationSections(explanation);

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (isLoading) {
    return (
      <Card className={`border-2 bg-gradient-to-br ${colors.gradient} overflow-hidden`} style={{ borderColor: colors.border }}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div 
                className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
                style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
              />
              <Sparkles 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5"
                style={{ color: colors.primary }}
              />
            </div>
            <p className="text-lg font-medium" style={{ color: colors.text }}>
              AI가 해설을 생성하고 있습니다...
            </p>
            <p className="text-sm opacity-70" style={{ color: colors.text }}>
              잠시만 기다려주세요
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`border-2 overflow-hidden shadow-lg ${compact ? '' : 'max-w-3xl mx-auto'}`}
      style={{ borderColor: colors.border }}
      data-testid={`feedback-panel-${section}`}
    >
      <CardHeader 
        className={`bg-gradient-to-r ${colors.gradient} border-b py-4`}
        style={{ borderColor: colors.border }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.primary }}
            >
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold" style={{ color: colors.text }}>
                AI 해설
              </CardTitle>
              <p className="text-sm opacity-70" style={{ color: colors.text }}>
                {section === 'reading' && 'Reading Section'}
                {section === 'listening' && 'Listening Section'}
                {section === 'writing' && 'Writing Section'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCorrect !== undefined && (
              <Badge className={isCorrect ? "bg-green-500" : "bg-red-500"}>
                {isCorrect ? "정답" : "오답"}
              </Badge>
            )}
            {showCloseButton && onClose && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {(questionText || correctAnswer || userAnswer) && (
          <div 
            className="p-4 border-b"
            style={{ backgroundColor: `${colors.light}80`, borderColor: colors.border }}
          >
            {questionText && (
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-60" style={{ color: colors.text }}>
                  문제
                </p>
                <p className="text-sm font-medium" style={{ color: colors.text }}>
                  {questionText}
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userAnswer && (
                <div className={`p-3 rounded-lg ${isCorrect === false ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500">
                    내 답안
                  </p>
                  <p className={`text-sm font-medium ${isCorrect === false ? 'text-red-700' : 'text-gray-700'}`}>
                    {userAnswer}
                  </p>
                </div>
              )}
              
              {correctAnswer && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-green-600">
                    정답
                  </p>
                  <p className="text-sm font-medium text-green-700">
                    {correctAnswer}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {parsedSections.length > 0 ? (
            parsedSections.map((feedbackSection, index) => {
              const IconComponent = feedbackSection.icon ? iconMap[feedbackSection.icon] : Lightbulb;
              const isExpanded = expandedSections[index] !== false;
              
              return (
                <div 
                  key={index}
                  className="rounded-lg border overflow-hidden transition-all duration-200"
                  style={{ borderColor: `${colors.border}80` }}
                >
                  <button
                    onClick={() => toggleSection(index)}
                    className={`w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-opacity-80`}
                    style={{ backgroundColor: colors.light }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-1.5 rounded-md"
                        style={{ backgroundColor: `${colors.primary}20` }}
                      >
                        <IconComponent className="h-4 w-4" style={{ color: colors.primary }} />
                      </div>
                      <span className="font-semibold" style={{ color: colors.text }}>
                        {feedbackSection.title}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" style={{ color: colors.text }} />
                    ) : (
                      <ChevronDown className="h-4 w-4" style={{ color: colors.text }} />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div 
                      className="p-4 bg-white border-t text-gray-700 leading-relaxed"
                      style={{ borderColor: `${colors.border}40` }}
                    >
                      {formatContent(feedbackSection.content)}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: colors.light }}
            >
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: colors.primary }} />
                <div className="text-gray-700 leading-relaxed">
                  {formatContent(explanation)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div 
          className="px-5 py-3 border-t flex items-center justify-between"
          style={{ backgroundColor: `${colors.light}40`, borderColor: colors.border }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: colors.primary }} />
            <span className="text-xs" style={{ color: colors.text }}>
              AI 기반 해설 · GPT-5.2
            </span>
          </div>
          <Badge variant="outline" className="text-xs" style={{ borderColor: colors.border, color: colors.text }}>
            iNRISE
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function FeedbackDialog({
  open,
  onOpenChange,
  section,
  isLoading,
  explanation,
  questionText,
  correctAnswer,
  userAnswer,
  isCorrect
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SectionType;
  isLoading?: boolean;
  explanation: string;
  questionText?: string;
  correctAnswer?: string;
  userAnswer?: string;
  isCorrect?: boolean;
}) {
  const colors = sectionColors[section];
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4 animate-in fade-in-0 zoom-in-95 duration-200">
        <ToeflFeedbackPanel
          section={section}
          isLoading={isLoading}
          explanation={explanation}
          questionText={questionText}
          correctAnswer={correctAnswer}
          userAnswer={userAnswer}
          isCorrect={isCorrect}
          onClose={() => onOpenChange(false)}
          showCloseButton={true}
        />
      </div>
    </div>
  );
}
