import { ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, BookOpen, Headphones, Mic, PenTool } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export type ToeflSection = "reading" | "listening" | "speaking" | "writing";

interface SectionTheme {
  name: string;
  gradient: string;
  bgGradient: string;
  badgeGradient: string;
  accentColor: string;
  hoverColor: string;
  icon: typeof BookOpen;
  progressColor: string;
}

const sectionThemes: Record<ToeflSection, SectionTheme> = {
  reading: {
    name: "Reading Section",
    gradient: "from-[#0078FF] to-[#00BBFF]",
    bgGradient: "from-[#070B14] to-[#070B14]",
    badgeGradient: "from-[#0078FF] to-[#00BBFF]",
    accentColor: "blue",
    hoverColor: "hover:text-[#00BBFF]",
    icon: BookOpen,
    progressColor: "bg-[#00BBFF]"
  },
  listening: {
    name: "Listening Section",
    gradient: "from-cyan-500 to-teal-600",
    bgGradient: "from-[#0f172a] via-[#1e293b] to-[#134e4a]",
    badgeGradient: "from-cyan-500 to-teal-500",
    accentColor: "cyan",
    hoverColor: "hover:text-cyan-600",
    icon: Headphones,
    progressColor: "bg-cyan-500"
  },
  speaking: {
    name: "Speaking Section",
    gradient: "from-[#2DD4BF] to-[#0F766E]",
    bgGradient: "from-[#08130F] to-[#0A1A14]",
    badgeGradient: "from-[#2DD4BF] to-[#0F766E]",
    accentColor: "teal",
    hoverColor: "hover:text-[#2DD4BF]",
    icon: Mic,
    progressColor: "bg-[#2DD4BF]"
  },
  writing: {
    name: "Writing Section",
    gradient: "from-[#A78BFA] to-[#5B21B6]",
    bgGradient: "from-[#0E0A1F] to-[#12082E]",
    badgeGradient: "from-[#A78BFA] to-[#5B21B6]",
    accentColor: "violet",
    hoverColor: "hover:text-[#A78BFA]",
    icon: PenTool,
    progressColor: "bg-[#A78BFA]"
  }
};

interface NewToeflLayoutProps {
  section: ToeflSection;
  children: ReactNode;
  isTestMode?: boolean;
  timeRemaining?: number;
  progress?: number;
  currentTaskLabel?: string;
  showReformBadge?: boolean;
  rightContent?: ReactNode;
  darkNav?: boolean;
}

export function NewToeflLayout({
  section,
  children,
  isTestMode = false,
  timeRemaining,
  progress,
  currentTaskLabel,
  showReformBadge = false,
  rightContent,
  darkNav = false
}: NewToeflLayoutProps) {
  const theme = sectionThemes[section];
  const Icon = theme.icon;
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const darkNavBg = section === 'speaking'
    ? "bg-[#08130F]/95 backdrop-blur-md border-b border-[#5EEAD4]/10 shadow-lg shadow-black/40"
    : section === 'writing'
    ? "bg-[#0E0A1F]/95 backdrop-blur-md border-b border-[#C4B5FD]/10 shadow-lg shadow-black/40"
    : "bg-[#0C1220]/95 backdrop-blur-md border-b border-white/8 shadow-lg shadow-black/30";
  const lightNavBg = "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm";
  const navBg = isLight ? lightNavBg : (darkNav ? darkNavBg : "bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg");
  const navTextColor = isLight ? "text-gray-700" : (darkNav ? "text-white/80" : "text-gray-700");
  const timerTextColor = isLight ? "text-gray-700" : (darkNav ? "text-white" : "text-gray-700");

  const pageBg = isLight ? "from-[#FAFBFC] to-[#F3F4F6]" : theme.bgGradient;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${pageBg}`}>
      <nav className={`sticky top-0 z-50 ${navBg}`}>
        <div className="w-full px-4 sm:px-8 lg:px-12">
          <div className={`flex items-center justify-between ${isTestMode ? 'h-14' : 'h-16'}`}>
            <div className="flex items-center gap-4">
              <Link href="/new-toefl">
                <Button variant="ghost" className={`${navTextColor} ${theme.hoverColor}`} data-testid="button-back-nav">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  New TOEFL
                </Button>
              </Link>
              {isTestMode && currentTaskLabel && (
                <Badge className={`px-3 py-1 bg-gradient-to-r ${theme.badgeGradient} text-white border-0`}>
                  {currentTaskLabel}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {showReformBadge && (
                <Badge className="bg-red-500/80 text-white border-0 px-2 py-0.5 text-xs">완전 개편</Badge>
              )}
              {isTestMode && timeRemaining !== undefined && (
                <div className={`flex items-center gap-2 ${timerTextColor}`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
                </div>
              )}
              {rightContent}
              {!isTestMode && (
                <Badge className={`bg-gradient-to-r ${theme.badgeGradient} text-white border-0 px-3 py-1`}>
                  {theme.name}
                </Badge>
              )}
            </div>
          </div>
          {isTestMode && progress !== undefined && (
            <Progress value={progress} className={`h-1 [&>div]:${theme.progressColor}`} />
          )}
        </div>
      </nav>

      {children}
    </div>
  );
}

export function NewToeflLoadingState({ section }: { section: ToeflSection }) {
  const theme = sectionThemes[section];
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const colorMap: Record<ToeflSection, string> = {
    reading: "border-[#00BBFF]",
    listening: "border-cyan-400",
    speaking: "border-[#2DD4BF]",
    writing: "border-[#A78BFA]"
  };
  const loadingBg = isLight ? "from-[#FAFBFC] to-[#F3F4F6]" : theme.bgGradient;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${loadingBg} flex items-center justify-center`}>
      <div className="text-center">
        <div className={`h-12 w-12 animate-spin rounded-full border-4 ${colorMap[section]} border-t-transparent mx-auto mb-4`} />
        <p className="dark:text-white text-gray-700 text-lg">테스트 데이터를 불러오는 중...</p>
      </div>
    </div>
  );
}

export function NewToeflIntroHeader({ 
  section, 
  title,
  subtitle 
}: { 
  section: ToeflSection;
  title: string;
  subtitle: string;
}) {
  const theme = sectionThemes[section];
  const Icon = theme.icon;

  return (
    <div className="text-center mb-4">
      <div className={`w-14 h-14 bg-gradient-to-br ${theme.gradient} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl`}>
        <Icon className="h-7 w-7 text-white" />
      </div>
      <h1 className="text-2xl font-bold dark:text-white text-gray-900 mb-1">{title}</h1>
      <p className="text-sm dark:text-gray-400 text-gray-500">{subtitle}</p>
    </div>
  );
}

export { sectionThemes };
