import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  Search,
  FileText,
  Clock,
  User,
  BookOpen,
  Headphones,
  Mic,
  PenTool,
  GraduationCap,
  Eye,
  Calendar,
  Users,
  TrendingUp,
  Award,
  Sparkles,
  Brain,
  Calculator,
  Download,
  BarChart3,
  Play,
  Pause,
  Volume2,
  Send,
  MessageSquare,
  Wand2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StudentResult } from "@/components/admin-student-results/shared";

const AdminStudentResultsCharts = lazy(() => import("@/components/charts/AdminStudentResultsCharts"));
const AdminStudentResultDetailDialog = lazy(() => import("@/components/admin-student-results/AdminStudentResultDetailDialog"));
const AdminStudentMessageDialog = lazy(() => import("@/components/admin-student-results/AdminStudentMessageDialog"));

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function AdminStudentResultsPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [mainTab, setMainTab] = useState("toefl");
  const [sectionTab, setSectionTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const analyticsFallback = (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm">
          <CardContent className="h-[248px] flex items-center justify-center text-sm text-gray-400">
            차트 로딩 중...
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const { data: results = [], isLoading: loadingResults, isError, refetch } = useQuery<StudentResult[]>({
    queryKey: ['/api/admin/student-results', mainTab, sectionTab],
    queryFn: async () => {
      const response = await fetch(`/api/admin/student-results?section=${sectionTab}&examType=${mainTab}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch results');
      return response.json();
    },
    enabled: isAuthenticated && user?.role === "admin",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/admin-login");
      return;
    }

    if (!isLoading && isAuthenticated && user?.role !== "admin") {
      toast({
        title: "접근 거부",
        description: "관리자 권한이 필요합니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        navigate("/");
      }, 1500);
      return;
    }
  }, [isLoading, isAuthenticated, user, toast, navigate]);

  useEffect(() => {
    setSectionTab("all");
  }, [mainTab]);

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'reading': return <BookOpen className="h-4 w-4" />;
      case 'listening': return <Headphones className="h-4 w-4" />;
      case 'speaking': return <Mic className="h-4 w-4" />;
      case 'writing': return <PenTool className="h-4 w-4" />;
      case 'verbal': return <Brain className="h-4 w-4" />;
      case 'quantitative': return <Calculator className="h-4 w-4" />;
      case 'analytical': return <PenTool className="h-4 w-4" />;
      case 'feedback': return <MessageSquare className="h-4 w-4" />;
      default: return <GraduationCap className="h-4 w-4" />;
    }
  };

  const getSectionGradient = (section: string) => {
    switch (section) {
      case 'reading': return 'from-purple-500 to-violet-600';
      case 'listening': return 'from-pink-500 to-rose-600';
      case 'speaking': return 'from-teal-500 to-cyan-600';
      case 'writing': return 'from-blue-500 to-indigo-600';
      case 'verbal': return 'from-indigo-500 to-purple-600';
      case 'quantitative': return 'from-orange-500 to-red-600';
      case 'analytical': return 'from-emerald-500 to-teal-600';
      case 'feedback': return 'from-amber-500 to-yellow-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getSectionBadgeStyle = (section: string) => {
    switch (section) {
      case 'reading': return 'bg-purple-500/20 text-purple-300 border border-purple-400/30';
      case 'listening': return 'bg-pink-500/20 text-pink-300 border border-pink-400/30';
      case 'speaking': return 'bg-teal-500/20 text-teal-300 border border-teal-400/30';
      case 'writing': return 'bg-blue-500/20 text-blue-300 border border-blue-400/30';
      case 'verbal': return 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30';
      case 'quantitative': return 'bg-orange-500/20 text-orange-300 border border-orange-400/30';
      case 'analytical': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
      case 'feedback': return 'bg-amber-500/20 text-amber-300 border border-amber-400/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-400/30';
    }
  };

  const getSectionNameKorean = (section: string) => {
    switch (section) {
      case 'reading': return '리딩';
      case 'listening': return '리스닝';
      case 'speaking': return '스피킹';
      case 'writing': return '라이팅';
      case 'verbal': return 'Verbal';
      case 'quantitative': return 'Quantitative';
      case 'analytical': return 'Analytical Writing';
      case 'feedback': return '피드백 요청';
      default: return section;
    }
  };

  const getStatusKorean = (status?: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'in_progress': return '진행중';
      case 'submitted': return '제출됨';
      case 'pending': return '대기중';
      case 'approved': return '승인됨';
      case 'rejected': return '거부됨';
      default: return status || '제출됨';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  const filteredResults = results.filter(result => {
    const resultExamType = result.examType?.toLowerCase() || '';
    const matchesMainTab = mainTab === 'all' || 
      resultExamType === mainTab.toLowerCase() ||
      (mainTab === 'new-toefl' && (resultExamType === 'new-toefl' || resultExamType === 'toefl')) ||
      (mainTab === 'toefl' && (resultExamType === 'toefl' || resultExamType === 'new-toefl'));
    const matchesSectionTab = sectionTab === 'all' || result.section?.toLowerCase() === sectionTab.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      result.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.testId?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMainTab && matchesSectionTab && matchesSearch;
  });

  const handleViewDetails = (result: StudentResult) => {
    setSelectedResult(result);
    setShowDetailDialog(true);
  };

  const handleOpenMessage = (result: StudentResult) => {
    setSelectedResult(result);
    setMessageSubject("");
    setMessageBody("");
    setShowMessageDialog(true);
  };

  const handleGenerateAIDraft = async () => {
    if (!selectedResult) return;
    setIsGeneratingDraft(true);
    try {
      const response = await fetch('/api/admin/ai-draft-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentName: selectedResult.userName,
          section: selectedResult.section,
          examType: selectedResult.examType,
          score: selectedResult.score,
          feedback: selectedResult.feedback,
          transcription: selectedResult.transcription,
          essayText: selectedResult.essayText,
        }),
      });
      if (!response.ok) throw new Error('AI 초안 생성 실패');
      const data = await response.json();
      setMessageSubject(data.subject || '');
      setMessageBody(data.message || '');
      toast({ title: "AI 초안 생성 완료", description: "내용을 확인하고 수정 후 발송하세요." });
    } catch (error: any) {
      toast({ title: "AI 초안 생성 실패", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResult) throw new Error('학생을 선택해주세요');
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fromUserId: user?.id,
          toUserId: selectedResult.userId,
          subject: messageSubject,
          message: messageBody,
        }),
      });
      if (!response.ok) throw new Error('메시지 발송 실패');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "메시지 발송 완료", description: `${selectedResult?.userName}에게 메시지를 보냈습니다.` });
      setShowMessageDialog(false);
      setMessageSubject("");
      setMessageBody("");
    },
    onError: (error: any) => {
      toast({ title: "메시지 발송 실패", description: error.message, variant: "destructive" });
    },
  });

  const approveFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/feedback/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('AI 피드백 생성 실패');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "AI 피드백 생성 완료", description: "피드백이 승인되어 학생에게 공개됩니다." });
      if (selectedResult) {
        setSelectedResult({ ...selectedResult, feedback: data.feedback, status: 'approved', score: data.totalScore });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/admin/student-results'] });
    },
    onError: (error: any) => {
      toast({ title: "AI 피드백 생성 실패", description: error.message, variant: "destructive" });
    },
  });

  const totalResults = filteredResults.length;
  const completedResults = filteredResults.filter(r => r.status === 'completed').length;
  const avgScore = filteredResults.filter(r => r.score != null).reduce((acc, r) => acc + (r.score || 0), 0) / Math.max(filteredResults.filter(r => r.score != null).length, 1);

  const toeflSections = [
    { value: 'all', label: '전체', icon: null },
    { value: 'reading', label: '리딩', icon: <BookOpen className="h-4 w-4 mr-1" /> },
    { value: 'listening', label: '리스닝', icon: <Headphones className="h-4 w-4 mr-1" /> },
    { value: 'speaking', label: '스피킹', icon: <Mic className="h-4 w-4 mr-1" /> },
    { value: 'writing', label: '라이팅', icon: <PenTool className="h-4 w-4 mr-1" /> },
  ];

  const greSections = [
    { value: 'all', label: '전체', icon: null },
    { value: 'verbal', label: 'Verbal', icon: <Brain className="h-4 w-4 mr-1" /> },
    { value: 'quantitative', label: 'Quantitative', icon: <Calculator className="h-4 w-4 mr-1" /> },
    { value: 'analytical', label: 'Analytical Writing', icon: <PenTool className="h-4 w-4 mr-1" /> },
  ];

  const satSections = [
    { value: 'all', label: '전체', icon: null },
    { value: 'reading_writing', label: 'Reading & Writing', icon: <BookOpen className="h-4 w-4 mr-1" /> },
    { value: 'math', label: 'Math', icon: <Calculator className="h-4 w-4 mr-1" /> },
  ];

  const currentSections = mainTab === 'gre' ? greSections : mainTab === 'sat' ? satSections : toeflSections;

  const getScoreDistribution = () => {
    const scoredResults = filteredResults.filter(r => r.score != null && r.score !== undefined);
    const ranges = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ];
    scoredResults.forEach(r => {
      const score = r.score || 0;
      const rangeItem = ranges.find(range => score >= range.min && score <= range.max);
      if (rangeItem) rangeItem.count++;
    });
    return ranges;
  };

  const getSectionDistribution = () => {
    const sectionCounts: Record<string, number> = {};
    filteredResults.forEach(r => {
      const section = r.section || 'unknown';
      sectionCounts[section] = (sectionCounts[section] || 0) + 1;
    });
    return Object.entries(sectionCounts).map(([name, value]) => ({ name: getSectionNameKorean(name), value }));
  };

  const getDailyTrend = () => {
    const last7Days: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      last7Days[key] = 0;
    }
    filteredResults.forEach(r => {
      const date = new Date(r.completedAt || r.startedAt || r.createdAt || '');
      const key = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      if (last7Days[key] !== undefined) last7Days[key]++;
    });
    return Object.entries(last7Days).map(([date, count]) => ({ date, count }));
  };

  const handleExportCSV = () => {
    const headers = ['학생명', '이메일', '섹션', '시험유형', '점수', '상태', '소요시간(초)', '제출일'];
    const rows = filteredResults.map(r => [
      r.userName,
      r.userEmail,
      getSectionNameKorean(r.section),
      r.examType.toUpperCase(),
      r.score?.toString() || '-',
      getStatusKorean(r.status),
      r.timeSpent?.toString() || '-',
      formatDate(r.completedAt || r.startedAt || r.createdAt)
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `student_results_${mainTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "내보내기 완료",
      description: `${filteredResults.length}개의 결과가 CSV로 저장되었습니다.`,
    });
  };

  const handlePlayAudio = async (url: string) => {
    if (audioRef.current) {
      if (isPlaying && audioRef.current.src === url) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = url;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error: any) {
          console.error('Audio playback failed:', error);
          if (error.name === 'NotAllowedError') {
            toast({
              title: "오디오 재생 오류",
              description: "브라우저에서 오디오 재생을 허용해주세요.",
              variant: "destructive"
            });
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#1e3a5f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#1e3a5f]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin")}
              className="text-gray-700 hover:text-blue-600"
              data-testid="button-back"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              관리자 페이지로
            </Button>
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 px-3 py-1">
                관리자 패널
              </Badge>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 px-6 py-2 text-sm font-medium shadow-lg">
            <Users className="w-4 h-4 mr-2 inline" />
            학생 분석
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            학생 시험 결과
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            모든 섹션에서 학생들이 제출한 시험 결과를 확인하고 분석하세요
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">총 결과</p>
                  <p className="text-3xl font-bold text-white mt-1">{totalResults}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">완료됨</p>
                  <p className="text-3xl font-bold text-white mt-1">{completedResults}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm font-medium">평균 점수</p>
                  <p className="text-3xl font-bold text-white mt-1">{avgScore.toFixed(1)}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="border-b border-white/10 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-400" />
                  결과 대시보드
                </CardTitle>
                <CardDescription className="text-gray-400 mt-1">
                  학생 제출물을 필터링하고 검색하세요
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="이름, 이메일 또는 테스트 ID로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-72 bg-[#1e293b] border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500"
                    data-testid="input-search"
                  />
                </div>
                <Badge variant="outline" className="text-blue-300 border-blue-400/30 bg-blue-500/10 px-4 py-2" data-testid="badge-result-count">
                  {filteredResults.length}개 결과
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Tabs value={mainTab} onValueChange={setMainTab} className="flex-1">
                <TabsList className="grid grid-cols-4 w-full max-w-xl bg-[#1e293b]/80 p-1 rounded-xl">
                  <TabsTrigger 
                    value="toefl" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg text-gray-400 font-semibold" 
                    data-testid="tab-toefl"
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    TOEFL
                  </TabsTrigger>
                  <TabsTrigger 
                    value="new-toefl" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-lg text-gray-400 font-semibold" 
                    data-testid="tab-new-toefl"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    NEW TOEFL
                  </TabsTrigger>
                  <TabsTrigger 
                    value="gre" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-lg text-gray-400 font-semibold" 
                    data-testid="tab-gre"
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    GRE
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sat" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-lg text-gray-400 font-semibold" 
                    data-testid="tab-sat"
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    SAT
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className={`${showAnalytics ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'} text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg`}
                  data-testid="button-analytics"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  분석
                </Button>
                <Button
                  onClick={handleExportCSV}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90"
                  data-testid="button-export"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV 내보내기
                </Button>
              </div>
            </div>

            <div className="mb-6">
              <div className={`inline-flex p-1 bg-[#1e293b]/60 rounded-xl gap-1`}>
                {currentSections.map((section) => (
                  <Button
                    key={section.value}
                    variant="ghost"
                    onClick={() => setSectionTab(section.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sectionTab === section.value ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    data-testid={`tab-section-${section.value}`}
                  >
                    {section.icon}
                    {section.label}
                  </Button>
                ))}
              </div>
            </div>

            {showAnalytics && (
              <Suspense fallback={analyticsFallback}>
                <AdminStudentResultsCharts
                  scoreDistribution={getScoreDistribution()}
                  sectionDistribution={getSectionDistribution()}
                  dailyTrend={getDailyTrend()}
                  colors={CHART_COLORS}
                />
              </Suspense>
            )}

            <div className="mt-0">
                {loadingResults ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                ) : isError ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-red-400 text-lg font-semibold">데이터를 불러오지 못했습니다</p>
                    <p className="text-gray-500 text-sm mt-1 mb-4">서버 연결을 확인하거나 다시 시도해주세요</p>
                    <Button
                      onClick={() => refetch()}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:opacity-90"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      다시 시도
                    </Button>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-[#1e293b] rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-lg font-semibold">제출된 결과가 없습니다</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {searchQuery ? '검색어 또는 필터 조건을 조정해보세요' : '아직 학생들이 시험을 제출하지 않았습니다'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent" data-testid="table-header-row">
                          <TableHead className="text-gray-400 font-semibold" data-testid="header-student">학생</TableHead>
                          <TableHead className="text-gray-400 font-semibold" data-testid="header-section">섹션</TableHead>
                          <TableHead className="text-gray-400 font-semibold" data-testid="header-exam">시험</TableHead>
                          <TableHead className="text-gray-400 font-semibold" data-testid="header-score">점수</TableHead>
                          <TableHead className="text-gray-400 font-semibold" data-testid="header-time">소요 시간</TableHead>
                          <TableHead className="text-gray-400 font-semibold" data-testid="header-status">상태</TableHead>
                          <TableHead className="text-gray-400 font-semibold" data-testid="header-date">날짜</TableHead>
                          <TableHead className="text-gray-400 font-semibold" data-testid="header-actions">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((result) => (
                          <TableRow key={result.id} className="border-white/10 hover:bg-white/5 transition-colors" data-testid={`row-result-${result.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                  <User className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <div className="font-medium text-white">{result.userName}</div>
                                  <div className="text-xs text-gray-500">{result.userEmail}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge className={getSectionBadgeStyle(result.section)}>
                                  <span className="flex items-center gap-1">
                                    {getSectionIcon(result.section)}
                                    {getSectionNameKorean(result.section)}
                                  </span>
                                </Badge>
                                {result.resultType === 'feedback-request' && result.questionType && (
                                  <span className="text-xs text-gray-500 truncate max-w-[120px]" title={result.questionType}>
                                    {result.questionType}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-gray-300 border-gray-600">
                                {result.examType.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {result.score !== null && result.score !== undefined ? (
                                <span className="font-bold text-white text-lg">{result.score}</span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-gray-400">
                                <Clock className="h-3 w-3" />
                                {formatDuration(result.timeSpent)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={result.status === 'completed' 
                                  ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'}
                              >
                                {getStatusKorean(result.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-gray-400">
                                <Calendar className="h-3 w-3" />
                                {formatDate(result.completedAt || result.startedAt || result.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleViewDetails(result)}
                                  className={`bg-gradient-to-r ${getSectionGradient(result.section)} hover:opacity-90 text-white shadow-lg`}
                                  data-testid={`button-view-${result.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  보기
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenMessage(result)}
                                  className="border-purple-400/40 text-purple-300 hover:bg-purple-500/20 hover:text-purple-200"
                                  data-testid={`button-message-${result.id}`}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
      </div>

      <Suspense fallback={null}>
        <AdminStudentResultDetailDialog
          open={showDetailDialog}
          onOpenChange={setShowDetailDialog}
          selectedResult={selectedResult}
          isPlaying={isPlaying}
          onPlayAudio={handlePlayAudio}
          onOpenMessage={() => {
            setShowDetailDialog(false);
            setMessageSubject("");
            setMessageBody("");
            setShowMessageDialog(true);
          }}
          onApproveFeedback={(id) => approveFeedbackMutation.mutate(id)}
          isApproving={approveFeedbackMutation.isPending}
          getSectionIcon={getSectionIcon}
          getSectionGradient={getSectionGradient}
          getSectionBadgeStyle={getSectionBadgeStyle}
          getSectionNameKorean={getSectionNameKorean}
          formatDate={formatDate}
          formatDuration={formatDuration}
        />
      </Suspense>

      <Suspense fallback={null}>
        <AdminStudentMessageDialog
          open={showMessageDialog}
          onOpenChange={setShowMessageDialog}
          selectedResult={selectedResult}
          messageSubject={messageSubject}
          messageBody={messageBody}
          onSubjectChange={setMessageSubject}
          onBodyChange={setMessageBody}
          onGenerateDraft={handleGenerateAIDraft}
          onSend={() => sendMessageMutation.mutate()}
          isGeneratingDraft={isGeneratingDraft}
          isSending={sendMessageMutation.isPending}
        />
      </Suspense>
    </div>
  );
}
