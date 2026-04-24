import React, { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  FileText, 
  Target, 
  BookOpen, 
  Volume2, 
  Mic, 
  PenTool,
  Brain,
  Trophy,
  Users,
  TrendingUp,
  Play,
  Star,
  Award,
  Zap,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  CheckCircle,
  BarChart3,
  Headphones,
  GraduationCap,
  Timer,
  Layers,
  Calculator
} from "lucide-react";
import { useState } from "react";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import { useAuth } from "@/hooks/useAuth";
import type { Test } from "@shared/schema";
import { UserProfileHeader } from "@/components/UserProfileHeader";
import { useLanguage } from "@/contexts/LanguageContext";
const DeferredTestsPortalView = lazy(() => import("@/components/tests/TestsPortalView"));
const DeferredTestsSectionView = lazy(() => import("@/components/tests/TestsSectionView"));

const PORTAL_CSS = `
@keyframes bloomIn {
  0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
  100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
}
@keyframes cd1 {
  0%   { transform: translate(-50%,-50%) scale(1); }
  15%  { transform: translate(-42%,-56%) scale(1.3); }
  40%  { transform: translate(-56%,-44%) scale(1.15); }
  65%  { transform: translate(-44%,-52%) scale(1.4); }
  100% { transform: translate(-50%,-50%) scale(1); }
}
@keyframes cd2 {
  0%   { transform: translate(-50%,-50%) scale(1.1); }
  20%  { transform: translate(-60%,-42%) scale(1.25); }
  50%  { transform: translate(-40%,-58%) scale(1.15); }
  80%  { transform: translate(-52%,-46%) scale(1.3); }
  100% { transform: translate(-50%,-50%) scale(1.1); }
}
@keyframes cd3 {
  0%   { transform: translate(-50%,-50%) scale(1.2); }
  30%  { transform: translate(-44%,-54%) scale(1.1); }
  60%  { transform: translate(-56%,-46%) scale(1.35); }
  100% { transform: translate(-50%,-50%) scale(1.2); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.portal-wrap {
  background: #06060A;
  min-height: 100vh;
  padding: 60px 24px 80px;
  font-family: 'Sora', sans-serif;
}
.portal-inner { max-width: 900px; margin: 0 auto; }
.portal-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 60px;
  animation: fadeUp .4s ease-out both;
}
.portal-nav a { text-decoration: none; }
.portal-nav-link {
  font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 500;
  letter-spacing: .08em; text-transform: uppercase;
  color: rgba(255,255,255,.45);
  text-decoration: none; transition: color .2s;
}
.portal-nav-link:hover { color: rgba(255,255,255,.8); }
.portal-header { text-align: center; animation: fadeUp .5s ease-out both; }
.portal-title {
  font-family: 'Oswald', sans-serif;
  font-size: clamp(32px, 5vw, 44px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #F4F4F5;
  margin: 0 0 12px;
}
.portal-subtitle {
  font-size: 15px;
  color: rgba(255,255,255,.45);
  margin: 0;
}
.portal-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 48px;
}
@media (max-width: 800px) {
  .portal-grid { grid-template-columns: 1fr; }
}
.ptile {
  background: #0E0E12;
  border: 1px solid rgba(255,255,255,.05);
  border-radius: 18px;
  padding: 36px 28px;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  min-height: 280px;
  transition: border-color .5s cubic-bezier(.4,0,.2,1), transform .5s cubic-bezier(.4,0,.2,1), box-shadow .5s cubic-bezier(.4,0,.2,1);
  cursor: pointer;
  text-decoration: none;
  display: flex;
  flex-direction: column;
}
.ptile:nth-child(1) { animation: fadeUp .5s ease-out .1s both; }
.ptile:nth-child(2) { animation: fadeUp .5s ease-out .2s both; }
.ptile:nth-child(3) { animation: fadeUp .5s ease-out .3s both; }
.ptile:hover { border-color: rgba(255,255,255,.10); transform: translateY(-6px); }
.ptile.toefl:hover { box-shadow: 0 12px 50px rgba(0,50,160,.15); }
.ptile.gre:hover   { box-shadow: 0 12px 50px rgba(80,30,160,.15); }
.ptile.sat:hover   { box-shadow: 0 12px 50px rgba(160,20,40,.12); }
.pcloud {
  position: absolute; border-radius: 50%; opacity: 0;
  pointer-events: none; transition: opacity .6s ease;
  top: 50%; left: 50%;
}
.ptile:hover .pcloud { opacity: 1; }
.ptile:hover .pc1 { animation: bloomIn .5s ease-out forwards, cd1 12s ease-in-out .5s infinite; }
.ptile:hover .pc2 { animation: bloomIn .6s ease-out .1s forwards, cd2 15s ease-in-out .7s infinite; }
.ptile:hover .pc3 { animation: bloomIn .7s ease-out .2s forwards, cd3 18s ease-in-out .9s infinite; }
.ptile.toefl .pc1 { background: radial-gradient(circle, rgba(0,50,160,.45), transparent 65%); }
.ptile.toefl .pc2 { background: radial-gradient(circle, rgba(0,80,200,.35), transparent 65%); }
.ptile.toefl .pc3 { background: radial-gradient(circle, rgba(0,40,140,.3),  transparent 65%); }
.ptile.gre   .pc1 { background: radial-gradient(circle, rgba(80,30,160,.45),  transparent 65%); }
.ptile.gre   .pc2 { background: radial-gradient(circle, rgba(120,50,220,.35), transparent 65%); }
.ptile.gre   .pc3 { background: radial-gradient(circle, rgba(60,20,140,.3),   transparent 65%); }
.ptile.sat   .pc1 { background: radial-gradient(circle, rgba(160,20,40,.4),   transparent 65%); }
.ptile.sat   .pc2 { background: radial-gradient(circle, rgba(200,30,60,.3),   transparent 65%); }
.ptile.sat   .pc3 { background: radial-gradient(circle, rgba(140,15,35,.25),  transparent 65%); }
.ptile-content { position: relative; z-index: 3; display: flex; flex-direction: column; height: 100%; }
.ptile-icon {
  font-size: 22px;
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
  transition: transform .3s;
}
.ptile:hover .ptile-icon { transform: scale(1.05); }
.ptile.toefl .ptile-icon { background: rgba(0,136,221,.08); }
.ptile.gre   .ptile-icon { background: rgba(0,170,102,.08); }
.ptile.sat   .ptile-icon { background: rgba(221,51,68,.08); }
.ptile-name-row {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
}
.ptile-name {
  font-family: 'Oswald', sans-serif; font-size: 26px; font-weight: 700;
  text-transform: uppercase; color: #F4F4F5; line-height: 1.1;
}
.ptile-badge {
  font-family: 'Bebas Neue', sans-serif; font-size: 11px;
  border-radius: 4px; padding: 2px 6px; margin-left: 7px;
  vertical-align: middle; letter-spacing: .05em;
}
.ptile.toefl .ptile-badge { background: rgba(0,187,255,.1);  color: rgba(0,187,255,.75); }
.ptile.gre   .ptile-badge { background: rgba(0,170,102,.1);  color: rgba(0,200,120,.75); }
.ptile.sat   .ptile-badge { background: rgba(221,51,68,.1);  color: rgba(221,80,90,.75); }
.ptile-count-box { text-align: right; }
.ptile-count {
  font-family: 'Bebas Neue', sans-serif; font-size: 42px; line-height: 1;
  transition: transform .3s;
}
.ptile:hover .ptile-count { transform: scale(1.05); }
.ptile.toefl .ptile-count { color: #0088DD; }
.ptile.gre   .ptile-count { color: #00AA66; }
.ptile.sat   .ptile-count { color: #DD3344; }
.ptile-count-label {
  font-family: 'Oswald', sans-serif; font-size: 9px;
  color: rgba(255,255,255,.38); text-transform: uppercase; letter-spacing: .12em;
}
.ptile-desc {
  font-size: 12px; color: rgba(255,255,255,.45);
  line-height: 1.7; margin-bottom: 16px;
}
.ptile-subjects {
  display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 20px;
}
.ptile-subj {
  font-family: 'Oswald', sans-serif; font-size: 9px; text-transform: uppercase;
  letter-spacing: .07em; padding: 3px 8px; border-radius: 4px;
  background: rgba(255,255,255,.025); color: rgba(255,255,255,.4);
  transition: background .25s, color .25s;
}
.ptile:hover .ptile-subj { background: rgba(255,255,255,.045); color: rgba(255,255,255,.65); }
.ptile-bottom {
  margin-top: auto; display: flex; justify-content: space-between; align-items: center;
  border-top: 1px solid rgba(255,255,255,.05); padding-top: 16px;
}
.ptile-enter {
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,.55);
  letter-spacing: .02em;
}
.ptile-arrow {
  font-size: 16px; color: rgba(255,255,255,.35);
  transition: transform .25s, color .25s;
}
.ptile:hover .ptile-arrow { transform: translateX(4px); color: rgba(255,255,255,.8); }
`;

const sectionIcons = {
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
  writing: PenTool,
  verbal: Brain,
  quantitative: Target,
  analytical: PenTool
};

const sectionColors = {
  reading: "from-purple-500 to-purple-600",
  listening: "from-pink-500 to-pink-600", 
  speaking: "from-teal-500 to-teal-600",
  writing: "from-indigo-500 to-indigo-600",
  verbal: "from-purple-600 to-purple-700",
  quantitative: "from-indigo-600 to-indigo-700",
  analytical: "from-violet-600 to-fuchsia-600"
};

const sectionBgColors = {
  reading: "from-purple-50 to-purple-100",
  listening: "from-pink-50 to-pink-100", 
  speaking: "from-teal-50 to-teal-100",
  writing: "from-indigo-50 to-indigo-100",
  verbal: "from-purple-50 to-purple-100",
  quantitative: "from-indigo-50 to-indigo-100",
  analytical: "from-violet-50 to-fuchsia-50"
};

const sectionGradients = {
  reading: "from-purple-500 to-purple-600",
  listening: "from-pink-500 to-pink-600", 
  speaking: "from-teal-500 to-teal-600",
  writing: "from-indigo-500 to-indigo-600",
  verbal: "from-purple-600 to-purple-700",
  quantitative: "from-indigo-600 to-indigo-700",
  analytical: "from-violet-600 to-fuchsia-600"
};

const sectionBgGradients = {
  reading: "from-purple-50 to-purple-100",
  listening: "from-pink-50 to-pink-100", 
  speaking: "from-teal-50 to-teal-100",
  writing: "from-indigo-50 to-indigo-100",
  verbal: "from-purple-50 to-purple-100",
  quantitative: "from-indigo-50 to-indigo-100",
  analytical: "from-violet-50 to-fuchsia-50"
};

const sectionButtonStyles = {
  reading: "bg-purple-600 text-white hover:bg-purple-500 border-purple-500",
  listening: "bg-pink-600 text-white hover:bg-pink-500 border-pink-500",
  speaking: "bg-teal-600 text-white hover:bg-teal-500 border-teal-500",
  writing: "bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-500",
  verbal: "bg-purple-600 text-white hover:bg-purple-500 border-purple-500",
  quantitative: "bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-500",
  analytical: "bg-violet-600 text-white hover:bg-violet-500 border-violet-500"
};

const sectionMetadata = {
  reading: {
    title: "Reading",
    korean: "읽기",
    description: "학술 지문 읽기 및 이해력 평가",
    time: "60분"
  },
  listening: {
    title: "Listening", 
    korean: "듣기",
    description: "강의 및 대화 듣기 및 이해력 평가",
    time: "60분"
  },
  speaking: {
    title: "Speaking",
    korean: "말하기", 
    description: "독립형 및 통합형 말하기 과제",
    time: "20분"
  },
  writing: {
    title: "Writing",
    korean: "쓰기",
    description: "독립형 및 통합형 쓰기 과제", 
    time: "50분"
  },
  verbal: {
    title: "Verbal Reasoning",
    korean: "언어추론",
    description: "어휘 및 논리적 사고력 평가",
    time: "60분"
  },
  quantitative: {
    title: "Quantitative Reasoning", 
    korean: "수리추론",
    description: "수학적 문제해결능력 평가",
    time: "70분"
  },
  analytical: {
    title: "Analytical Writing",
    korean: "분석적 글쓰기",
    description: "논리적 분석 및 논증 글쓰기",
    time: "60분"
  }
};

// Helper function to get the correct test link
function getTestLink(test: Test): string {
  const isTestSet = test.id && test.id.startsWith("testset-");
  
  // TestSet은 통합 테스트 응시 화면으로  
  if (isTestSet) {
    return `/test-taking/${test.id}`;
  }
  
  // 모든 테스트 (AI 생성 포함)를 섹션별 전용 인터페이스로 라우팅
  if (test.examType === "toefl") {
    switch (test.section) {
      case "reading":
        return `/toefl-reading?testId=${test.id}`;
      case "listening":
        return `/toefl-listening?testId=${test.id}`;
      case "speaking":
        return `/toefl-speaking?testId=${test.id}`;
      case "writing":
        return `/toefl-writing?testId=${test.id}`;
      default:
        return "/tests";
    }
  } else if (test.examType === "gre") {
    switch (test.section) {
      case "analytical":
        return "/gre/analytical-writing";
      case "verbal":
        return "/gre/verbal-reasoning";
      case "quantitative":
        return "/gre/quantitative-reasoning";
      default:
        return "/gre";
    }
  }
  return "/tests";
}

export default function Tests() {
  const { examType } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [greExpandedSection, setGreExpandedSection] = useState<string | null>(null);
  
  const [location] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const sectionFilter = urlParams.get('section');
  
  // Debug logging
  console.log('🔍 Tests page debug:', { examType, sectionFilter, location });
  
  const { data: tests = [], isLoading } = useQuery<Test[]>({
    queryKey: examType ? ["/api/tests", examType, sectionFilter] : ["/api/tests", sectionFilter],
    queryFn: async () => {
      const url = new URL("/api/tests", window.location.origin);
      if (examType) {
        url.searchParams.set("examType", examType);
      }
      if (sectionFilter) {
        url.searchParams.set("section", sectionFilter);
      }
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("테스트를 불러오는데 실패했습니다");
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30초 후 stale로 간주
    refetchOnWindowFocus: true, // 윈도우 포커스 시 다시 가져오기
    refetchOnMount: true, // 컴포넌트 마운트 시 다시 가져오기
  });

  // Fetch AI generated tests for GRE
  const { data: aiTests = [] } = useQuery<any[]>({
    queryKey: ["/api/ai-tests", examType],
    queryFn: async () => {
      if (examType !== "gre") return [];
      const response = await fetch("/api/ai-tests?examType=gre");
      if (!response.ok) return [];
      return response.json();
    },
    enabled: examType === "gre",
    staleTime: 30 * 1000,
  });

  // GRE-specific test lists (for compact selection UI)
  const { data: greVerbalTests = [], isLoading: greVerbalLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/verbal/tests'],
    staleTime: 0,
    refetchOnMount: true,
    enabled: examType === "gre",
  });
  const { data: greQuantTests = [], isLoading: greQuantLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/quantitative/tests'],
    staleTime: 0,
    refetchOnMount: true,
    enabled: examType === "gre",
  });
  const { data: greWritingTopics = [], isLoading: greWritingLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/writing-topics'],
    staleTime: 0,
    refetchOnMount: true,
    enabled: examType === "gre",
  });

  // Remove duplicates based on id and deduplicate data
  const uniqueTests = tests.reduce((acc: Test[], test: Test) => {
    const existingIndex = acc.findIndex(t => t.id === test.id);
    if (existingIndex === -1 && test.id != null) {
      acc.push(test);
    }
    return acc;
  }, []);

  // Convert AI tests to Test format and merge with regular tests
  const convertedAITests: Test[] = aiTests.map((aiTest: any) => ({
    id: aiTest.id,
    title: aiTest.title || `AI ${aiTest.testType} Test`,
    examType: "gre" as const,
    section: aiTest.section || "verbal",
    difficulty: aiTest.difficulty || "medium",
    duration: aiTest.duration || 30,
    questionCount: aiTest.questions?.length || 0,
    description: aiTest.description || "AI Generated Test",
    isActive: aiTest.isActive ?? true,
    createdAt: aiTest.createdAt ? new Date(aiTest.createdAt) : new Date(),
  }));

  // Merge AI tests with regular tests for GRE
  const allTests = examType === "gre" ? [...uniqueTests, ...convertedAITests] : uniqueTests;

  const filteredTests = sectionFilter 
    ? allTests.filter(test => test.section === sectionFilter)
    : allTests;

  const toeflTests = filteredTests.filter(test => test.examType === "toefl");
  const greTests = filteredTests.filter(test => test.examType === "gre");
  
  // Debug logging
  if (sectionFilter === 'listening') {
    console.log('🔍 Listening filter debug:');
    console.log('- Total tests from API:', tests.length);
    console.log('- Unique tests:', uniqueTests.length);
    console.log('- Filtered by section:', filteredTests.length);
    console.log('- TOEFL tests:', toeflTests.length);
    console.log('- Sample test:', tests.find(t => t.section === 'listening'));
  }

  // SAT test counts for portal view
  const { data: satRwTests = [] } = useQuery<any[]>({
    queryKey: ['/api/sat-reading-writing/tests'],
    queryFn: async () => {
      const r = await fetch('/api/sat-reading-writing/tests');
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !examType,
    staleTime: 60 * 1000,
  });
  const { data: satMathTests = [] } = useQuery<any[]>({
    queryKey: ['/api/sat-math/tests'],
    queryFn: async () => {
      const r = await fetch('/api/sat-math/tests');
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !examType,
    staleTime: 60 * 1000,
  });
  const satCount = (satRwTests?.length || 0) + (satMathTests?.length || 0);

  if (isLoading) {
    return null;
  }

  // Cloud Bloom portal view when no examType selected
  if (!examType) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full" aria-label="Loading tests" />
          </div>
        }
      >
        <DeferredTestsPortalView
          t={t}
          toeflCount={toeflTests.length}
          greCount={greTests.length}
          satCount={satCount}
        />
      </Suspense>
    );
  }

  // Handle section-specific views for both TOEFL and GRE
  if (sectionFilter) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full" aria-label="Loading section" />
          </div>
        }
      >
        <DeferredTestsSectionView
          examType={examType === "toefl" ? "toefl" : "gre"}
          sectionFilter={sectionFilter}
          tests={examType === "toefl" ? toeflTests : greTests}
        />
      </Suspense>
    );
  }

  // Render TOEFL-specific layout
  if (examType === "toefl") {
    const fullTests = toeflTests.filter(test => test.id?.includes("full-set") || test.title?.includes("Complete"));
    const sectionTests = toeflTests.filter(test => !test.id?.includes("full-set") && !test.title?.includes("Complete"));
    
    const groupedSectionTests = {
      reading: sectionTests.filter(test => test.section === "reading"),
      listening: sectionTests.filter(test => test.section === "listening"),
      speaking: sectionTests.filter(test => test.section === "speaking"),
      writing: sectionTests.filter(test => test.section === "writing")
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900">
        {/* Modern Navigation */}
        <nav className="bg-blue-950/80 backdrop-blur-xl border-b border-blue-800/30 shadow-2xl sticky top-0 z-50 h-20">
          <div className="container mx-auto px-6 h-full flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <img 
                src={logoPath} 
                alt="iNRISE" 
                className="h-12 transition-transform duration-300 group-hover:scale-105 brightness-0 invert"
              />
            </Link>
            
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-blue-200 hover:text-white transition-colors duration-200 font-medium">
                홈
              </Link>
              <Link href="/study-plan" className="text-blue-200 hover:text-white transition-colors duration-200 font-medium">
                학습계획
              </Link>
              <Link href="/tests" className="text-white font-bold border-b-2 border-blue-400 pb-1">
                실전 모의고사
              </Link>
              <Link href="/performance-analytics" className="text-blue-200 hover:text-white transition-colors duration-200 font-medium">
                성적분석
              </Link>
              
              <UserProfileHeader variant="dark" />
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-10">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-8">
              <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mr-6 shadow-2xl border-4 border-blue-400/30">
                <Target className="h-14 w-14 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-7xl font-black text-white mb-3 tracking-tight">
                  TOEFL iBT
                </h1>
                <p className="text-2xl text-blue-200 font-light">실전 모의고사 시스템</p>
              </div>
            </div>
            
            <p className="text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              <span className="font-bold text-cyan-300">실제 시험 환경과 동일한 조건</span>에서 체계적인 훈련을 통해 
              <span className="font-bold text-blue-300"> 목표 점수를 달성</span>하세요
            </p>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
              <div className="bg-blue-900/40 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-blue-700/30">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Layers className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-blue-300 mb-3">{toeflTests.length}</div>
                <div className="text-blue-100 font-semibold text-lg">총 실전 모의고사</div>
                <div className="text-sm text-blue-300/70 mt-2">최신 출제 경향 반영</div>
              </div>
              
              <div className="bg-blue-900/40 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-blue-700/30">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Timer className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-cyan-300 mb-3">4</div>
                <div className="text-blue-100 font-semibold text-lg">핵심 영역</div>
                <div className="text-sm text-blue-300/70 mt-2">Reading • Listening • Speaking • Writing</div>
              </div>
              
              <div className="bg-blue-900/40 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-blue-700/30">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-sky-300 mb-3">95%</div>
                <div className="text-blue-100 font-semibold text-lg">목표 달성률</div>
                <div className="text-sm text-blue-300/70 mt-2">6개월 기준 통계</div>
              </div>
            </div>
          </div>

          {/* Test Selection Modules */}
          <div className="space-y-12">
            {/* Full Test Module */}
            <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-3xl p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-xl border-2 border-white/30">
                    <GraduationCap className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-5xl font-black text-white mb-3 tracking-tight">FULL TEST</h2>
                    <p className="text-blue-100 text-xl font-light">
                      4개 영역 통합 실전 모의고사 • 실제 시험 환경 완벽 재현
                    </p>
                  </div>
                </div>
                <div className="text-center text-white bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20">
                  <div className="text-4xl font-bold mb-1">{fullTests.length}</div>
                  <div className="text-blue-100 font-medium text-sm">Available Sets</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {fullTests.length > 0 ? (
                  fullTests.map((test) => (
                    <div key={test.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">{test.title}</h3>
                          <p className="text-blue-100 text-lg">Reading • Listening • Speaking • Writing</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">180분</div>
                          <div className="text-blue-100 text-sm">Total Time</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <span className="font-medium">76-110 문제</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5" />
                            <span className="font-medium">120점 만점</span>
                          </div>
                        </div>
                        
                        <Link href={getTestLink(test)}>
                          <Button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500 font-bold px-8 py-3 rounded-xl transition-all duration-300 group-hover:scale-105 shadow-lg">
                            <Play className="h-5 w-5 mr-2" />
                            시작하기
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-white/10 backdrop-blur-sm rounded-2xl p-12 border border-white/20 text-center">
                    <GraduationCap className="h-16 w-16 text-white/60 mx-auto mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-4">Full Test 준비 중</h3>
                    <p className="text-blue-100 text-lg">완전한 TOEFL 실전 모의고사가 곧 출시됩니다</p>
                  </div>
                )}
              </div>
            </div>

            {/* Section Tests Module */}
            <div>
              <div className="text-center mb-12">
                <h2 className="text-5xl font-black text-white mb-4 tracking-tight">SECTION TESTS</h2>
                <p className="text-xl text-blue-200 max-w-3xl mx-auto font-light">
                  영역별 집중 훈련을 통해 <span className="font-bold text-cyan-300">약점을 보완</span>하고 
                  <span className="font-bold text-blue-300"> 강점을 극대화</span>하세요
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {Object.entries(groupedSectionTests).map(([sectionName, sectionTestList]) => {
                  const sectionInfo = {
                    reading: { title: "Reading", korean: "리딩", time: "60-80분", description: "학술 지문 독해 및 분석" },
                    listening: { title: "Listening", korean: "리스닝", time: "60-90분", description: "강의 및 대화 청취 이해" },
                    speaking: { title: "Speaking", korean: "스피킹", time: "20분", description: "구술 표현 및 의견 전달" },
                    writing: { title: "Writing", korean: "라이팅", time: "50분", description: "학술적 글쓰기 및 논증" }
                  }[sectionName] || { title: sectionName, korean: sectionName, time: "N/A", description: "" };
                  
                  const SectionIcon = sectionIcons[sectionName as keyof typeof sectionIcons] || BookOpen;
                  const gradientColor = sectionColors[sectionName as keyof typeof sectionColors];
                  const bgGradient = sectionBgColors[sectionName as keyof typeof sectionBgColors];
                  const buttonStyle = sectionButtonStyles[sectionName as keyof typeof sectionButtonStyles];
                  
                  const sectionPageUrl = {
                    reading: '/toefl-reading',
                    listening: '/toefl-listening',
                    speaking: '/toefl-speaking',
                    writing: '/toefl-writing'
                  }[sectionName] || `/tests/toefl?section=${sectionName}`;
                  
                  return (
                    <div key={sectionName} className="bg-gradient-to-br from-blue-900/30 to-slate-900/30 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden border border-blue-700/30 hover:border-blue-500/50 transition-all duration-500 group">
                      {/* Section Header - Clickable */}
                      <Link href={sectionPageUrl}>
                        <div className={`bg-gradient-to-r ${gradientColor} p-8 relative overflow-hidden cursor-pointer hover:brightness-110 transition-all duration-300`}>
                          <div className="absolute inset-0 bg-black/10"></div>
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/20">
                                <SectionIcon className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <h3 className="text-3xl font-bold text-white mb-1">{sectionInfo.title}</h3>
                                <p className="text-white/90 text-lg font-medium">{sectionInfo.korean}</p>
                              </div>
                            </div>
                            <div className="text-center text-white bg-white/10 backdrop-blur-sm px-4 py-3 rounded-2xl border border-white/20">
                              <div className="text-2xl font-bold mb-1">{sectionTestList.length}</div>
                              <div className="text-white/80 text-xs font-medium">개 테스트</div>
                            </div>
                          </div>
                          
                          <div className="mt-6 flex items-center justify-between relative z-10">
                            <p className="text-white/90 text-lg font-light">{sectionInfo.description}</p>
                            <div className="flex items-center gap-2 text-white bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20">
                              <Clock className="h-5 w-5" />
                              <span className="font-semibold">{sectionInfo.time}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      
                      {/* Section Content */}
                      <div className="p-8">
                        {sectionTestList.length > 0 ? (
                          <div className="space-y-4">
                            {sectionTestList.slice(0, 10).map((test) => (
                              <div key={test.id} className="bg-gradient-to-br from-blue-800/20 to-slate-800/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-600/20 hover:border-blue-500/40 hover:shadow-xl transition-all duration-300 group/item">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-xl font-bold text-white mb-2">{test.title}</h4>
                                    <div className="flex items-center gap-4 text-sm text-blue-200">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        <span className="font-medium">{test.questionCount || 10}개 문제</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span className="font-medium">{test.duration || sectionInfo.time}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <Link href={getTestLink(test)}>
                                    <Button className={`bg-gradient-to-r ${gradientColor} text-white hover:shadow-2xl transition-all duration-300 group-hover/item:scale-110 px-8 py-3 rounded-xl font-bold text-base shadow-lg`}>
                                      <Play className="h-5 w-5 mr-2" />
                                      시작
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            ))}
                            
                            {sectionTestList.length > 10 && (
                              <Link href={`/tests/toefl?section=${sectionName}`}>
                                <Button className={`w-full mt-6 h-14 text-lg font-bold transition-all bg-gradient-to-r ${gradientColor} text-white hover:opacity-90 hover:shadow-lg`}>
                                  {sectionTestList.length - 10}개 더 보기
                                  <ChevronRight className="h-5 w-5 ml-2" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <SectionIcon className="h-20 w-20 text-blue-600/50 mx-auto mb-6" />
                            <h4 className="text-2xl font-bold text-white mb-3">{sectionInfo.title} 테스트 준비 중</h4>
                            <p className="text-blue-300">곧 새로운 {sectionInfo.korean} 테스트가 추가됩니다</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render GRE-specific layout — compact, no-scroll design
  if (examType === "gre") {
    const greSections = [
      {
        id: 'verbal',
        title: 'Verbal Reasoning',
        icon: '📖',
        accentColor: '#00BBFF',
        topLine: '#00BBFF',
        iconBg: 'rgba(0,187,255,.08)',
        desc: t('gre.verbal.desc'),
        duration: t('gre.verbal.duration'),
        tests: greVerbalTests,
        isLoading: greVerbalLoading,
        startPath: (id: string) => `/gre/verbal-reasoning?testId=${id}`,
        defaultPath: '/gre/verbal-reasoning',
        description: 'Reading Comprehension · Text Completion · Sentence Equivalence',
      },
      {
        id: 'quantitative',
        title: 'Quantitative Reasoning',
        icon: '📊',
        accentColor: '#00E87B',
        topLine: '#00E87B',
        iconBg: 'rgba(0,232,123,.08)',
        desc: t('gre.quant.desc'),
        duration: t('gre.quant.duration'),
        tests: greQuantTests,
        isLoading: greQuantLoading,
        startPath: (id: string) => `/gre/quantitative-reasoning?testId=${id}`,
        defaultPath: '/gre/quantitative-reasoning',
        description: 'Quantitative Comparison · Problem Solving · Data Interpretation',
      },
      {
        id: 'writing',
        title: 'Analytical Writing',
        icon: '✍️',
        accentColor: '#A78BFA',
        topLine: '#A78BFA',
        iconBg: 'rgba(167,139,250,.1)',
        desc: t('gre.aw.desc'),
        duration: t('gre.aw.duration'),
        tests: greWritingTopics,
        isLoading: greWritingLoading,
        startPath: (_id: string) => `/gre/analytical-writing`,
        defaultPath: '/gre/analytical-writing',
        description: 'Analyze an Issue · Analyze an Argument',
      },
    ];

    const diffBadge = (d: string) => {
      if (d === 'easy') return { bg: 'rgba(0,232,123,.12)', color: '#00E87B' };
      if (d === 'hard') return { bg: 'rgba(255,80,80,.12)', color: '#FF6B6B' };
      return { bg: 'rgba(255,184,0,.12)', color: '#FFB800' };
    };

    const GRE_HUB_CSS = `
@keyframes gHueShift { 0%,100%{filter:hue-rotate(0deg)}50%{filter:hue-rotate(30deg)} }
@keyframes gBloom { 0%{transform:translate(-50%,-50%) scale(0);opacity:0} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
@keyframes gcd1 { 0%{transform:translate(-50%,-50%) scale(1.2)} 25%{transform:translate(-40%,-55%) scale(1.4)} 50%{transform:translate(-55%,-45%) scale(1.15)} 75%{transform:translate(-45%,-52%) scale(1.35)} 100%{transform:translate(-50%,-50%) scale(1.2)} }
@keyframes gcd2 { 0%{transform:translate(-50%,-50%) scale(1.1)} 33%{transform:translate(-60%,-42%) scale(1.3)} 66%{transform:translate(-42%,-58%) scale(1.2)} 100%{transform:translate(-50%,-50%) scale(1.1)} }
@keyframes gcd3 { 0%{transform:translate(-50%,-50%) scale(1.3)} 40%{transform:translate(-45%,-54%) scale(1.1)} 70%{transform:translate(-56%,-46%) scale(1.4)} 100%{transform:translate(-50%,-50%) scale(1.3)} }
@keyframes gFadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
.ghub-card { background:#140F24; border:1px solid rgba(140,110,230,.1); border-radius:18px; padding:0;
  position:relative; overflow:hidden; isolation:isolate; display:flex; flex-direction:column;
  transition:border-color .4s,transform .4s,box-shadow .4s; cursor:pointer; }
.ghub-card:hover { border-color:rgba(167,139,250,.3); transform:translateY(-5px); box-shadow:0 12px 50px rgba(109,40,217,.12); }
.ghub-gc { position:absolute; border-radius:50%; opacity:0; pointer-events:none; transition:opacity .6s; top:50%; left:50%; }
.ghub-card:hover .ghub-gc { opacity:1; }
.ghub-card:hover .ghub-gc1 { animation:gBloom .5s ease-out forwards,gcd1 8s ease-in-out .5s infinite; }
.ghub-card:hover .ghub-gc2 { animation:gBloom .6s ease-out .1s forwards,gcd2 12s ease-in-out .7s infinite; }
.ghub-card:hover .ghub-gc3 { animation:gBloom .7s ease-out .2s forwards,gcd3 15s ease-in-out .9s infinite; }
.ghub-gc1 { background:radial-gradient(circle,rgba(124,58,237,.3),transparent 65%); filter:blur(25px); }
.ghub-gc2 { background:radial-gradient(circle,rgba(139,92,246,.25),transparent 65%); filter:blur(22px); }
.ghub-gc3 { background:radial-gradient(circle,rgba(109,40,217,.2),transparent 65%); filter:blur(20px); }
.ghub-card:nth-child(1) { animation:gFadeUp .5s ease-out .1s both; }
.ghub-card:nth-child(2) { animation:gFadeUp .5s ease-out .2s both; }
.ghub-card:nth-child(3) { animation:gFadeUp .5s ease-out .3s both; }
.gtest-row { display:flex; align-items:center; justify-content:space-between;
  background:rgba(255,255,255,.03); border-radius:10px; padding:10px 14px; margin-bottom:6px;
  transition:background .2s; }
.gtest-row:hover { background:rgba(255,255,255,.055); }
.gtest-start-btn { font-family:'Oswald',sans-serif; font-size:11px; font-weight:600;
  letter-spacing:.08em; text-transform:uppercase; color:#A78BFA; cursor:pointer;
  background:rgba(124,58,237,.12); border:1px solid rgba(167,139,250,.25);
  border-radius:6px; padding:4px 10px; transition:background .2s,color .2s; white-space:nowrap; }
.gtest-start-btn:hover { background:rgba(124,58,237,.25); color:#C4B5FD; }
`;

    return (
      <div style={{background:'#0D0A18', minHeight:'100vh', fontFamily:'Sora,sans-serif'}}>
        <style>{GRE_HUB_CSS}</style>

        {/* Ambient orbs */}
        <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
          <div style={{position:'absolute',width:800,height:600,top:'-10%',left:'-5%',
            background:'radial-gradient(ellipse,rgba(109,40,217,.15),transparent 75%)',filter:'blur(80px)'}} />
          <div style={{position:'absolute',width:600,height:600,top:'40%',right:'-10%',
            background:'radial-gradient(circle,rgba(139,92,246,.1),transparent 70%)',filter:'blur(100px)'}} />
          <div style={{position:'absolute',width:700,height:500,bottom:'-5%',left:'30%',
            background:'radial-gradient(ellipse,rgba(124,58,237,.08),transparent 70%)',filter:'blur(60px)'}} />
        </div>

        {/* Nav */}
        <nav style={{position:'sticky',top:0,zIndex:50,background:'rgba(20,15,36,.92)',
          backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(140,110,230,.12)',
          padding:'0 24px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <Link href="/tests">
            <img src={logoPath} alt="iNRISE" style={{height:34,filter:'brightness(0) invert(1)',opacity:.85}} />
          </Link>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontFamily:'Oswald,sans-serif',fontSize:12,letterSpacing:'.1em',
              textTransform:'uppercase',color:'rgba(167,139,250,.8)'}}>GRE</span>
            <UserProfileHeader variant="dark" />
          </div>
        </nav>

        {/* Content */}
        <div style={{position:'relative',zIndex:1,maxWidth:1020,margin:'0 auto',padding:'48px 20px 80px'}}>
          {/* Header */}
          <div style={{textAlign:'center',marginBottom:48,animation:'gFadeUp .5s ease-out both'}}>
            <h1 style={{fontFamily:'Oswald,sans-serif',fontWeight:700,fontSize:'clamp(28px,4vw,44px)',
              textTransform:'uppercase',letterSpacing:'.05em',color:'#FFFFFF',margin:'0 0 10px'}}>
              GRE{' '}
              <span style={{background:'linear-gradient(135deg,#6D28D9,#A78BFA)',
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
                animation:'gHueShift 10s ease-in-out infinite'}}>
                {t('gre.hub.title')}
              </span>
            </h1>
            <p style={{color:'rgba(255,255,255,.45)',fontFamily:'Sora,sans-serif',fontSize:14,margin:0}}>
              {t('gre.hub.desc')}
            </p>
          </div>

          {/* 3-card grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
            {greSections.map((section) => {
              const isExpanded = greExpandedSection === section.id;
              const previewTests = section.tests.slice(0, 3);
              const extraTests = section.tests.slice(3);
              const hasMore = section.tests.length > 3;

              return (
                <div key={section.id} className="ghub-card">
                  {/* Cloud blobs */}
                  <div className="ghub-gc ghub-gc1" style={{width:360,height:360}} />
                  <div className="ghub-gc ghub-gc2" style={{width:280,height:280,top:'20%',left:'70%'}} />
                  <div className="ghub-gc ghub-gc3" style={{width:300,height:300,top:'70%',left:'35%'}} />

                  {/* Top accent line */}
                  <div style={{height:2,background:section.topLine,flexShrink:0}} />

                  {/* Card content */}
                  <div style={{position:'relative',zIndex:3,padding:'24px 22px',display:'flex',flexDirection:'column',flex:1}}>
                    {/* Header row */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                      <div>
                        <div style={{width:46,height:46,borderRadius:12,background:section.iconBg,
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:12}}>
                          {section.icon}
                        </div>
                        <div style={{fontFamily:'Oswald,sans-serif',fontWeight:700,fontSize:20,
                          textTransform:'uppercase',color:'#F4F4F5',letterSpacing:'.03em'}}>
                          {section.title}
                        </div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>
                          {section.desc} · {section.duration}
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'Bebas Neue,sans-serif',fontSize:38,
                          color:section.accentColor,lineHeight:1}}>
                          {section.tests.length}
                        </div>
                        <div style={{fontFamily:'Oswald,sans-serif',fontSize:9,
                          color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:'.1em'}}>
                          {t('gre.testsLabel')}
                        </div>
                      </div>
                    </div>

                    <div style={{fontSize:10,color:'rgba(255,255,255,.3)',fontFamily:'Oswald,sans-serif',
                      textTransform:'uppercase',letterSpacing:'.06em',marginBottom:14}}>
                      {section.description}
                    </div>

                    {/* Test list */}
                    <div style={{flex:1}}>
                      {section.isLoading ? (
                        <div style={{display:'flex',justifyContent:'center',padding:'24px 0'}}>
                          <div style={{width:20,height:20,borderRadius:'50%',border:'2px solid',
                            borderColor:`${section.accentColor} transparent`,animation:'spin 1s linear infinite'}} />
                        </div>
                      ) : section.tests.length === 0 ? (
                        <div style={{textAlign:'center',padding:'24px 0'}}>
                          <p style={{color:'rgba(255,255,255,.35)',fontSize:12,marginBottom:12}}>
                            {t('gre.hub.empty')}
                          </p>
                          <Link href={section.defaultPath}>
                            <button className="gtest-start-btn">▶ {t('gre.hub.startNow')}</button>
                          </Link>
                        </div>
                      ) : (
                        <>
                          {previewTests.map((test: any) => {
                            const badge = diffBadge(test.difficulty || 'med');
                            return (
                              <div key={test.id} className="gtest-row">
                                <div style={{flex:1,minWidth:0,marginRight:10}}>
                                  <div style={{fontSize:12,color:'rgba(255,255,255,.8)',fontWeight:600,
                                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                    {test.title}
                                  </div>
                                  <div style={{display:'flex',gap:6,alignItems:'center',marginTop:3}}>
                                    {test.difficulty && (
                                      <span style={{fontSize:9,fontFamily:'Oswald,sans-serif',
                                        textTransform:'uppercase',letterSpacing:'.07em',
                                        background:badge.bg,color:badge.color,
                                        padding:'1px 6px',borderRadius:4}}>
                                        {test.difficulty.toUpperCase()}
                                      </span>
                                    )}
                                    {test.questionCount > 0 && (
                                      <span style={{fontSize:10,color:'rgba(255,255,255,.3)'}}>
                                        {test.questionCount}{t('gre.questions')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Link href={section.startPath(test.id)}>
                                  <button className="gtest-start-btn">▶ {t('gre.hub.start')}</button>
                                </Link>
                              </div>
                            );
                          })}

                          {isExpanded && extraTests.length > 0 && (
                            <>
                              {extraTests.map((test: any) => {
                                const badge = diffBadge(test.difficulty || 'med');
                                return (
                                  <div key={test.id} className="gtest-row">
                                    <div style={{flex:1,minWidth:0,marginRight:10}}>
                                      <div style={{fontSize:12,color:'rgba(255,255,255,.8)',fontWeight:600,
                                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                        {test.title}
                                      </div>
                                      <div style={{display:'flex',gap:6,alignItems:'center',marginTop:3}}>
                                        {test.difficulty && (
                                          <span style={{fontSize:9,fontFamily:'Oswald,sans-serif',
                                            textTransform:'uppercase',letterSpacing:'.07em',
                                            background:badge.bg,color:badge.color,
                                            padding:'1px 6px',borderRadius:4}}>
                                            {test.difficulty.toUpperCase()}
                                          </span>
                                        )}
                                        {test.questionCount > 0 && (
                                          <span style={{fontSize:10,color:'rgba(255,255,255,.3)'}}>
                                            {test.questionCount}{t('gre.questions')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Link href={section.startPath(test.id)}>
                                      <button className="gtest-start-btn">▶ {t('gre.hub.start')}</button>
                                    </Link>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{marginTop:16,borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:12,
                      display:'flex',gap:8,justifyContent:'space-between',alignItems:'center'}}>
                      {hasMore && (
                        <button
                          style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',
                            borderRadius:8,padding:'7px 12px',color:'rgba(255,255,255,.5)',
                            fontFamily:'Sora,sans-serif',fontSize:11,cursor:'pointer',transition:'background .2s'}}
                          onClick={() => setGreExpandedSection(prev => prev === section.id ? null : section.id)}
                        >
                          {isExpanded ? '▲ 접기' : `▼ +${section.tests.length - 3}개`}
                        </button>
                      )}
                      <Link href={section.defaultPath} style={{flex:1,display:'block'}}>
                        <button style={{width:'100%',background:'rgba(124,58,237,.12)',
                          border:'1px solid rgba(167,139,250,.2)',borderRadius:8,padding:'7px 12px',
                          color:'#A78BFA',fontFamily:'Oswald,sans-serif',fontSize:12,fontWeight:600,
                          textTransform:'uppercase',letterSpacing:'.06em',cursor:'pointer',
                          transition:'background .2s,box-shadow .2s'}}
                          onMouseEnter={e => { (e.target as HTMLElement).style.background='rgba(124,58,237,.22)'; (e.target as HTMLElement).style.boxShadow='0 0 16px rgba(109,40,217,.2)'; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.background='rgba(124,58,237,.12)'; (e.target as HTMLElement).style.boxShadow='none'; }}>
                          {`→ ${t('gre.hub.startNow')}`}
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Default view for all tests or other exam types
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900">
      {/* Rest of the original component for non-TOEFL views */}
      <nav className="bg-blue-950/80 backdrop-blur-xl border-b border-blue-800/30 shadow-2xl sticky top-0 z-50 h-20">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <img 
              src={logoPath} 
              alt="iNRISE" 
              className="h-12 transition-transform duration-300 group-hover:scale-105 brightness-0 invert"
            />
          </Link>
          
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-blue-200 hover:text-white transition-colors duration-200 font-medium">
              홈
            </Link>
            <Link href="/study-plan" className="text-blue-200 hover:text-white transition-colors duration-200 font-medium">
              학습계획
            </Link>
            <Link href="/tests" className="text-white font-bold border-b-2 border-blue-400 pb-1">
              실전 모의고사
            </Link>
            <Link href="/performance-analytics" className="text-blue-200 hover:text-white transition-colors duration-200 font-medium">
              성적분석
            </Link>
            
            <UserProfileHeader variant="dark" />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-20">
          <h1 className="text-7xl font-black text-white mb-6 tracking-tight">실전 모의고사</h1>
          <p className="text-2xl text-blue-200 max-w-4xl mx-auto font-light">
            TOEFL, GRE, SAT 실전 모의고사로 목표 점수를 달성하세요
          </p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex justify-center mb-16">
            <TabsList className="bg-blue-900/40 backdrop-blur-lg border border-blue-700/30 shadow-2xl h-18 p-2 rounded-3xl">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white text-blue-200 font-bold px-12 py-5 rounded-2xl transition-all duration-200 text-lg"
              >
                <Zap className="h-6 w-6 mr-3" />
                전체 시험
              </TabsTrigger>
              <TabsTrigger 
                value="toefl"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-blue-600 data-[state=active]:text-white text-blue-200 font-bold px-12 py-5 rounded-2xl transition-all duration-200 text-lg"
              >
                <Target className="h-6 w-6 mr-3" />
                TOEFL
              </TabsTrigger>
              <TabsTrigger 
                value="gre"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-700 data-[state=active]:to-purple-600 data-[state=active]:text-white text-blue-200 font-bold px-12 py-5 rounded-2xl transition-all duration-200 text-lg"
              >
                <Brain className="h-6 w-6 mr-3" />
                GRE
              </TabsTrigger>
              <TabsTrigger 
                value="sat"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-red-500 data-[state=active]:text-white text-blue-200 font-bold px-12 py-5 rounded-2xl transition-all duration-200 text-lg"
              >
                <GraduationCap className="h-6 w-6 mr-3" />
                SAT
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="space-y-8">
            {/* TOEFL - Main Featured Card (Full Width) */}
            <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-3xl p-10 shadow-2xl relative overflow-hidden border-2 border-blue-500/30">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-xl border-2 border-white/30">
                    <Target className="h-12 w-12 text-white" />
                  </div>
                  <div>
                    <h2 className="text-5xl font-black text-white tracking-tight">TOEFL</h2>
                    <p className="text-white/90 text-xl font-light mt-2">4개 영역 통합 실전 모의고사</p>
                    <p className="text-white/70 text-base mt-1">Reading • Listening • Speaking • Writing</p>
                  </div>
                </div>
                <div className="text-center text-white bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20">
                  <div className="text-4xl font-bold mb-1">{toeflTests.length}</div>
                  <div className="text-white/80 font-medium text-sm">Available Tests</div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 relative z-10">
                <Link href="/tests/toefl">
                  <div className="bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 rounded-2xl p-6 transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">기존 TOEFL</h3>
                        <p className="text-white/80">Classic TOEFL iBT Format</p>
                      </div>
                      <ChevronRight className="h-8 w-8 text-white group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </Link>
                <Link href="/new-toefl">
                  <div className="bg-gradient-to-r from-emerald-500/30 to-teal-500/30 backdrop-blur-sm hover:from-emerald-500/40 hover:to-teal-500/40 border border-emerald-400/30 rounded-2xl p-6 transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-2xl font-bold text-white">NEW TOEFL</h3>
                          <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">2026</span>
                        </div>
                        <p className="text-white/80">2026 Official Format</p>
                      </div>
                      <ChevronRight className="h-8 w-8 text-white group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* GRE and SAT Cards - Side by Side */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* GRE Card */}
              <Link href="/tests/gre">
                <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-600 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02] group cursor-pointer relative overflow-hidden border-2 border-purple-500/30 h-full">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/30">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center text-white bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20">
                      <div className="text-2xl font-bold">{greTests.length}</div>
                      <div className="text-white/80 font-medium text-xs">Tests</div>
                    </div>
                  </div>
                  
                  <h2 className="text-4xl font-black text-white mb-3 relative z-10 tracking-tight">GRE</h2>
                  <p className="text-white/90 text-lg mb-4 relative z-10 font-light">3개 영역 종합 실전 모의고사</p>
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div className="text-white/80 text-sm">
                      Analytical • Verbal • Quantitative
                    </div>
                    <ChevronRight className="h-8 w-8 text-white group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* SAT Card */}
              <Link href="/sat">
                <div className="bg-gradient-to-br from-rose-600 via-red-500 to-rose-400 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02] group cursor-pointer relative overflow-hidden border-2 border-rose-400/30 h-full">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/30">
                      <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center text-white bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20">
                      <div className="text-lg font-bold">NEW</div>
                      <div className="text-white/80 font-medium text-xs">2024-25</div>
                    </div>
                  </div>
                  
                  <h2 className="text-4xl font-black text-white mb-3 relative z-10 tracking-tight">SAT</h2>
                  <p className="text-white/90 text-lg mb-4 relative z-10 font-light">2개 섹션 적응형 디지털 시험</p>
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div className="text-white/80 text-sm">
                      Reading & Writing • Math
                    </div>
                    <ChevronRight className="h-8 w-8 text-white group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="toefl">
            <div className="text-center">
              <Link href="/tests/toefl">
                <Button className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white text-2xl font-black px-16 py-8 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 shadow-xl">
                  TOEFL 실전 모의고사 바로가기
                  <ChevronRight className="h-7 w-7 ml-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="gre">
            <div className="text-center">
              <Link href="/tests/gre">
                <Button className="bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white text-2xl font-black px-16 py-8 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 shadow-xl">
                  GRE 실전 모의고사 바로가기
                  <ChevronRight className="h-7 w-7 ml-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="sat">
            <div className="text-center">
              <Link href="/sat">
                <Button className="bg-gradient-to-r from-rose-600 to-red-500 text-white text-2xl font-black px-16 py-8 rounded-3xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 shadow-xl">
                  SAT 실전 모의고사 바로가기
                  <ChevronRight className="h-7 w-7 ml-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
