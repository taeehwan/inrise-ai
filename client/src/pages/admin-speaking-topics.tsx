import { lazy, Suspense, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Edit, Plus, Sparkles, MessageSquare, PenTool, Brain, Layers, ArrowLeft, CheckSquare, Square, Eye, EyeOff, AlertTriangle, Clock, Mic } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  AdminSpeakingTopicsTab,
  TestQuestion,
  TestQuestionForm,
} from "@/components/admin-speaking-topics/shared";

const DeferredAdminSpeakingTopicsGenerateDialog = lazy(
  () => import("@/components/admin-speaking-topics/AdminSpeakingTopicsGenerateDialog"),
);
const DeferredAdminSpeakingTopicsFormDialog = lazy(
  () => import("@/components/admin-speaking-topics/AdminSpeakingTopicsFormDialog"),
);

export default function AdminSpeakingTopics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TestQuestion | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [topicsText, setTopicsText] = useState("");
  const [currentTestType, setCurrentTestType] = useState<AdminSpeakingTopicsTab>("toefl-speaking");
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [greTaskType, setGreTaskType] = useState<"issue" | "argument">("issue");
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  // API endpoints
  const getApiEndpoint = () => {
    return currentTestType === "toefl-speaking" 
      ? "/api/admin/speaking-topics" 
      : "/api/admin/gre/writing-topics";
  };

  // Fetch topics
  const { data: topics = [], isLoading, error } = useQuery({
    queryKey: [getApiEndpoint()],
    queryFn: async () => {
      const response = await fetch(getApiEndpoint(), {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      
      // Transform GRE Writing data to match TestQuestion interface
      if (currentTestType === "gre-writing" && Array.isArray(data)) {
        return data.map((item: any) => ({
          id: item.id,
          title: item.title,
          examType: "gre" as const,
          section: "writing" as const,
          type: item.taskType === "analyze_argument" ? "argument" : "issue",
          questionText: item.prompt,
          description: item.instructions,
          responseTime: (item.timeLimit || 30) * 60, // Convert minutes to seconds
          preparationTime: 0,
          isActive: item.isActive,
          createdAt: item.createdAt,
          sampleAnswer: item.sampleEssay
        }));
      }
      
      return Array.isArray(data) ? data : [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: TestQuestionForm) => apiRequest('POST', getApiEndpoint(), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getApiEndpoint()] });
      setIsDialogOpen(false);
      toast({ title: "토픽이 성공적으로 생성되었습니다." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: TestQuestionForm & { id: string }) => 
      apiRequest('PUT', `${getApiEndpoint()}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getApiEndpoint()] });
      setIsDialogOpen(false);
      setEditingTopic(null);
      toast({ title: "토픽이 성공적으로 수정되었습니다." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `${getApiEndpoint()}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getApiEndpoint()] });
      toast({ title: "토픽이 삭제되었습니다." });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        topics: topicsText.split('\n').filter(t => t.trim()),
        examType: currentTestType === "toefl-speaking" ? "toefl" : "gre",
        section: currentTestType === "toefl-speaking" ? "speaking" : "writing"
      };
      
      // Add taskType for GRE Writing
      if (currentTestType === "gre-writing") {
        payload.taskType = greTaskType;
      }
      
      return apiRequest('POST', '/api/ai/generate-topics', payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [getApiEndpoint()] });
      setIsGenerateDialogOpen(false);
      setTopicsText("");
      setGreTaskType("issue");
      toast({ 
        title: "AI 토픽 생성 완료", 
        description: `${data.items?.length || 0}개의 토픽이 생성되었습니다.`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "생성 실패", 
        description: error.message || "토픽 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    },
  });

  const handleAddNew = () => {
    setEditingTopic(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (topic: TestQuestion) => {
    setEditingTopic(topic);
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TestQuestionForm) => {
    if (editingTopic) {
      updateMutation.mutate({ ...data, id: editingTopic.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleGenerate = () => {
    if (!topicsText.trim()) {
      toast({ title: "토픽을 입력하세요", variant: "destructive" });
      return;
    }
    
    const topicLines = topicsText.split('\n').filter(t => t.trim());
    const topicCount = topicLines.length;
    
    if (topicCount === 0) {
      toast({ title: "토픽을 입력하세요", variant: "destructive" });
      return;
    }
    
    // Warn for large batches
    if (topicCount > 50) {
      const confirmed = window.confirm(
        `⚠️ ${topicCount}개의 토픽을 생성하려고 합니다.\n\n` +
        `대량 생성 시 시간이 오래 걸리고 일부 실패할 수 있습니다.\n` +
        `권장: 한 번에 50개 이하씩 나누어 생성\n\n` +
        `계속 진행하시겠습니까?`
      );
      
      if (!confirmed) return;
    }
    
    toast({ 
      title: "생성 시작", 
      description: `${topicCount}개의 ${currentTestType === "gre-writing" ? "GRE Writing" : "TOEFL Speaking"} 토픽을 생성합니다...`
    });
    
    generateMutation.mutate();
  };

  // Tab change handler
  const handleTabChange = (value: string) => {
    setCurrentTestType(value as "toefl-speaking" | "gre-writing");
    setIsDialogOpen(false);
    setIsGenerateDialogOpen(false);
    setSelectedTopics(new Set()); // Clear selection when switching tabs
    setEditingTopic(null);
  };

  // Selection handlers
  const toggleSelection = (topicId: string) => {
    setSelectedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTopics.size === topics.length && topics.length > 0) {
      setSelectedTopics(new Set());
    } else {
      setSelectedTopics(new Set(topics.map(t => t.id)));
    }
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (topicIds: string[]) => {
      const results = await Promise.allSettled(
        topicIds.map(id => apiRequest('DELETE', `${getApiEndpoint()}/${id}`))
      );
      
      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        throw new Error(`${failedCount}개 토픽 삭제 실패`);
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getApiEndpoint()] });
      setSelectedTopics(new Set());
      toast({ title: "선택한 토픽이 모두 삭제되었습니다." });
    },
    onError: (error: any) => {
      toast({ 
        title: "삭제 실패", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleBulkDelete = () => {
    if (selectedTopics.size === 0) {
      toast({ title: "토픽을 선택하세요", variant: "destructive" });
      return;
    }

    const confirmed = window.confirm(
      `선택한 ${selectedTopics.size}개의 토픽을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
    );

    if (confirmed) {
      bulkDeleteMutation.mutate(Array.from(selectedTopics));
    }
  };

  const handleBulkToggleActive = (isActive: boolean) => {
    if (selectedTopics.size === 0) {
      toast({ title: "토픽을 선택하세요", variant: "destructive" });
      return;
    }

    const confirmed = window.confirm(
      `선택한 ${selectedTopics.size}개의 토픽을 ${isActive ? '활성화' : '비활성화'} 하시겠습니까?`
    );

    if (confirmed) {
      Promise.allSettled(
        Array.from(selectedTopics).map(id => {
          // Use the new status endpoint for admin approval
          return apiRequest('PATCH', `/api/admin/speaking-topics/${id}/status`, { isActive });
        })
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: [getApiEndpoint()] });
        setSelectedTopics(new Set());
        toast({ title: `선택한 토픽이 ${isActive ? '활성화' : '비활성화'}되었습니다.` });
      });
    }
  };

  // TTS generation handler
  const handleGenerateTTS = async (listeningScript: string) => {
    setIsGeneratingTTS(true);
    try {
      const response = await fetch('/api/ai/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ script: listeningScript })
      });

      if (!response.ok) {
        throw new Error('TTS generation failed');
      }

      const data = await response.json();
      
      toast({ 
        title: "음성 생성 완료!", 
        description: "Listening Script가 음성으로 변환되었습니다." 
      });
      return data.audioUrl as string | undefined;
    } catch (error) {
      console.error('TTS generation error:', error);
      toast({ 
        title: "음성 생성 실패", 
        description: "다시 시도해주세요.",
        variant: "destructive" 
      });
      return undefined;
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <div className="relative bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center space-x-6">
              <Link href="/admin" className="group flex items-center space-x-3 text-slate-700 hover:text-indigo-600 transition-all duration-300">
                <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 group-hover:from-indigo-500/20 group-hover:to-purple-500/20 transition-all duration-300">
                  <ArrowLeft className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  관리자 홈
                </span>
              </Link>
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500">
                  <Mic className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    말하기 & 쓰기 관리 센터
                  </h1>
                  <p className="text-slate-600">TOEFL 스피킹 및 GRE 라이팅 토픽 관리</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto p-6 lg:p-8 space-y-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 mb-6">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              말하기 & 쓰기 토픽 관리
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            TOEFL 스피킹과 GRE 라이팅 문제를 생성하고 관리하여 
            <br className="hidden sm:block" />
            학습자들에게 다양한 연습 기회를 제공합니다
          </p>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50">
          <CardHeader className="pb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500">
                <Layers className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                토픽 관리 대시보드
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTestType} onValueChange={handleTabChange}>
              <div className="flex justify-center mb-8">
                <TabsList className="inline-flex bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-white/50">
                  <TabsTrigger 
                    value="toefl-speaking" 
                    className={`relative px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 ${
                      currentTestType === "toefl-speaking"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg transform scale-105"
                        : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-5 w-5" />
                      <span>TOEFL Speaking</span>
                    </div>
                    {currentTestType === "toefl-speaking" && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/20 to-teal-400/20 animate-pulse"></div>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="gre-writing" 
                    className={`relative px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 ${
                      currentTestType === "gre-writing"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg transform scale-105"
                        : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <PenTool className="h-5 w-5" />
                      <span>GRE Writing</span>
                    </div>
                    {currentTestType === "gre-writing" && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-400/20 to-teal-400/20 animate-pulse"></div>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TOEFL Speaking Tab */}
              <TabsContent value="toefl-speaking" className="mt-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      TOEFL Speaking Topics
                    </h3>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setIsGenerateDialogOpen(true)}
                      className="group relative h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                      <div className="relative z-10 flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                        <span>AI 자동 생성</span>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={handleAddNew}
                      className="group relative h-12 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                      <div className="relative z-10 flex items-center space-x-2">
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        <span>통합형 지문 추가</span>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Topics List */}
                <div className="mt-8">
                  {isLoading && currentTestType === "toefl-speaking" ? (
                    <div className="text-center py-16">
                      <div className="relative">
                        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                        <div className="absolute inset-0 animate-ping w-12 h-12 border border-blue-300 rounded-full opacity-20 mx-auto"></div>
                      </div>
                      <p className="mt-4 text-lg text-slate-600">토픽을 불러오는 중...</p>
                    </div>
                  ) : error && currentTestType === "toefl-speaking" ? (
                    <div className="text-center py-16">
                      <div className="mb-4 p-4 rounded-full bg-red-100 w-fit mx-auto">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                      </div>
                      <p className="text-lg text-red-600 font-semibold">데이터를 불러오는 중 오류가 발생했습니다.</p>
                      <p className="text-slate-500 mt-2">관리자 권한을 확인하거나 페이지를 새로고침해보세요.</p>
                    </div>
                  ) : currentTestType === "toefl-speaking" && (!Array.isArray(topics) || topics.length === 0) ? (
                    <div className="text-center py-16">
                      <div className="mb-4 p-4 rounded-full bg-slate-100 w-fit mx-auto">
                        <MessageSquare className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-lg text-slate-600">등록된 TOEFL Speaking 토픽이 없습니다.</p>
                      <p className="text-slate-500 mt-2">새 토픽을 추가하거나 AI로 자동 생성해보세요.</p>
                    </div>
                  ) : currentTestType === "toefl-speaking" ? (
                    <>
                      {/* Bulk Action Toolbar */}
                      {topics.length > 0 && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2"
                                data-testid="button-select-all"
                              >
                                {selectedTopics.size === topics.length && topics.length > 0 ? (
                                  <><CheckSquare className="h-4 w-4" /> 전체 해제</>
                                ) : (
                                  <><Square className="h-4 w-4" /> 전체 선택</>
                                )}
                              </Button>
                              {selectedTopics.size > 0 && (
                                <span className="text-sm text-blue-700 font-semibold">
                                  {selectedTopics.size}개 선택됨
                                </span>
                              )}
                            </div>
                            {selectedTopics.size > 0 && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBulkToggleActive(true)}
                                  className="flex items-center gap-2 text-green-600 hover:text-green-700"
                                  data-testid="button-bulk-activate"
                                >
                                  <Eye className="h-4 w-4" />
                                  활성화
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBulkToggleActive(false)}
                                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                                  data-testid="button-bulk-deactivate"
                                >
                                  <EyeOff className="h-4 w-4" />
                                  비활성화
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleBulkDelete}
                                  disabled={bulkDeleteMutation.isPending}
                                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                                  data-testid="button-bulk-delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  삭제
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Topics Cards with Checkboxes */}
                      <div className="space-y-6">
                        {Array.isArray(topics) && topics.map((topic: TestQuestion) => (
                          <Card key={topic.id} className={`group bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border-l-4 transition-all duration-300 hover:shadow-xl hover:transform hover:scale-[1.02] ${
                            selectedTopics.has(topic.id)
                              ? 'border-l-blue-600 bg-blue-50/50'
                              : 'border-l-blue-500'
                          }`}>
                            <CardContent className="p-6">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedTopics.has(topic.id)}
                                  onCheckedChange={() => toggleSelection(topic.id)}
                                  className="mt-1"
                                  data-testid={`checkbox-topic-${topic.id}`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="font-bold text-xl text-slate-800">{topic.title}</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                      topic.type === 'independent' 
                                        ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200' 
                                        : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200'
                                    }`}>
                                      {topic.type === 'independent' ? 'Independent' : 'Integrated'}
                                    </span>
                                    {!topic.isActive && (
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        비활성화됨
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-700 mb-4 text-lg leading-relaxed">{topic.questionText}</p>
                                  <div className="flex items-center gap-6 text-slate-600">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-orange-500" />
                                      <span className="font-medium">준비: {topic.preparationTime}초</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Mic className="h-4 w-4 text-green-500" />
                                      <span className="font-medium">응답: {topic.responseTime}초</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex space-x-3 ml-6">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={async () => {
                                      try {
                                        const newStatus = !topic.isActive;
                                        await apiRequest('PATCH', `/api/admin/speaking-topics/${topic.id}/status`, { 
                                          isActive: newStatus 
                                        });
                                        queryClient.invalidateQueries({ queryKey: [getApiEndpoint()] });
                                        toast({ 
                                          title: newStatus ? "토픽이 활성화되었습니다" : "토픽이 비활성화되었습니다" 
                                        });
                                      } catch (error) {
                                        toast({ 
                                          title: "상태 변경 실패", 
                                          variant: "destructive" 
                                        });
                                      }
                                    }}
                                    className={`h-10 w-10 rounded-xl border-2 transition-all duration-300 group-hover:transform group-hover:scale-110 ${
                                      topic.isActive 
                                        ? 'border-green-200 bg-green-50 hover:border-green-400' 
                                        : 'border-gray-200 bg-gray-50 hover:border-gray-400'
                                    }`}
                                    title={topic.isActive ? "비활성화" : "활성화"}
                                    data-testid={`button-toggle-status-${topic.id}`}
                                  >
                                    {topic.isActive ? (
                                      <Eye className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <EyeOff className="w-4 h-4 text-gray-600" />
                                    )}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleEdit(topic)}
                                    className="h-10 w-10 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group-hover:transform group-hover:scale-110"
                                    data-testid={`button-edit-${topic.id}`}
                                  >
                                    <Edit className="w-4 h-4 text-slate-600 hover:text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm("정말로 이 토픽을 삭제하시겠습니까?")) {
                                        deleteMutation.mutate(topic.id);
                                      }
                                    }}
                                    disabled={deleteMutation.isPending}
                                    className="h-10 w-10 rounded-xl border-2 border-slate-200 hover:border-red-400 hover:bg-red-50 transition-all duration-300 group-hover:transform group-hover:scale-110"
                                    data-testid={`button-delete-${topic.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-slate-600 hover:text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </TabsContent>

              {/* GRE Writing Tab */}
              <TabsContent value="gre-writing" className="mt-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500">
                      <PenTool className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      GRE Writing Topics
                    </h3>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setIsGenerateDialogOpen(true)}
                      className="group relative h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                      <div className="relative z-10 flex items-center space-x-2">
                        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                        <span>AI 자동 생성</span>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={handleAddNew}
                      className="group relative h-12 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                      <div className="relative z-10 flex items-center space-x-2">
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        <span>통합형 지문 추가</span>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Topics List */}
                <div className="mt-4">
                  {isLoading && currentTestType === "gre-writing" ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="mt-2 text-gray-600">토픽을 불러오는 중...</p>
                    </div>
                  ) : error && currentTestType === "gre-writing" ? (
                    <div className="text-center py-8">
                      <p className="text-red-600">데이터를 불러오는 중 오류가 발생했습니다.</p>
                      <p className="text-sm text-gray-500 mt-2">관리자 권한을 확인하거나 페이지를 새로고침해보세요.</p>
                    </div>
                  ) : currentTestType === "gre-writing" && (!Array.isArray(topics) || topics.length === 0) ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">등록된 토픽이 없습니다.</p>
                    </div>
                  ) : currentTestType === "gre-writing" ? (
                    <>
                      {/* Bulk Action Toolbar */}
                      {topics.length > 0 && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2"
                                data-testid="button-select-all"
                              >
                                {selectedTopics.size === topics.length && topics.length > 0 ? (
                                  <><CheckSquare className="h-4 w-4" /> 전체 해제</>
                                ) : (
                                  <><Square className="h-4 w-4" /> 전체 선택</>
                                )}
                              </Button>
                              {selectedTopics.size > 0 && (
                                <span className="text-sm text-purple-700 font-semibold">
                                  {selectedTopics.size}개 선택됨
                                </span>
                              )}
                            </div>
                            {selectedTopics.size > 0 && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBulkToggleActive(true)}
                                  className="flex items-center gap-2 text-green-600 hover:text-green-700"
                                  data-testid="button-bulk-activate"
                                >
                                  <Eye className="h-4 w-4" />
                                  활성화
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBulkToggleActive(false)}
                                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                                  data-testid="button-bulk-deactivate"
                                >
                                  <EyeOff className="h-4 w-4" />
                                  비활성화
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleBulkDelete}
                                  disabled={bulkDeleteMutation.isPending}
                                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                                  data-testid="button-bulk-delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  삭제
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Topics Cards with Checkboxes */}
                      <div className="space-y-4">
                        {Array.isArray(topics) && topics.map((topic: TestQuestion) => (
                          <Card key={topic.id} className={`border-l-4 transition-all ${
                            selectedTopics.has(topic.id)
                              ? 'border-l-purple-600 bg-purple-50/50'
                              : 'border-l-purple-500'
                          }`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedTopics.has(topic.id)}
                                  onCheckedChange={() => toggleSelection(topic.id)}
                                  className="mt-1"
                                  data-testid={`checkbox-topic-${topic.id}`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-lg">{topic.title}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      topic.type === 'issue' 
                                        ? 'bg-orange-100 text-orange-700' 
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                      {topic.type === 'issue' ? 'Issue Task' : 'Argument Task'}
                                    </span>
                                    {!topic.isActive && (
                                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        비활성화됨
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-700 mb-2">{topic.questionText}</p>
                                  <div className="text-sm text-gray-500">
                                    <span>작성 시간: {Math.floor(topic.responseTime / 60)}분</span>
                                  </div>
                                </div>
                                <div className="flex space-x-2 ml-4">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={async () => {
                                      try {
                                        const newStatus = !topic.isActive;
                                        await apiRequest('PATCH', `/api/admin/speaking-topics/${topic.id}/status`, { 
                                          isActive: newStatus 
                                        });
                                        queryClient.invalidateQueries({ queryKey: [getApiEndpoint()] });
                                        toast({ 
                                          title: newStatus ? "토픽이 활성화되었습니다" : "토픽이 비활성화되었습니다" 
                                        });
                                      } catch (error) {
                                        toast({ 
                                          title: "상태 변경 실패", 
                                          variant: "destructive" 
                                        });
                                      }
                                    }}
                                    className={`h-9 w-9 rounded-lg ${
                                      topic.isActive 
                                        ? 'bg-green-50 hover:bg-green-100 text-green-600' 
                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                                    }`}
                                    title={topic.isActive ? "비활성화" : "활성화"}
                                    data-testid={`button-toggle-status-${topic.id}`}
                                  >
                                    {topic.isActive ? (
                                      <Eye className="w-4 h-4" />
                                    ) : (
                                      <EyeOff className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleEdit(topic)} data-testid={`button-edit-${topic.id}`}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm("정말로 이 토픽을 삭제하시겠습니까?")) {
                                        deleteMutation.mutate(topic.id);
                                      }
                                    }}
                                    disabled={deleteMutation.isPending}
                                    data-testid={`button-delete-${topic.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={null}>
        <DeferredAdminSpeakingTopicsGenerateDialog
          open={isGenerateDialogOpen}
          onOpenChange={setIsGenerateDialogOpen}
          currentTestType={currentTestType}
          topicsText={topicsText}
          setTopicsText={setTopicsText}
          greTaskType={greTaskType}
          setGreTaskType={setGreTaskType}
          isPending={generateMutation.isPending}
          onGenerate={handleGenerate}
        />
      </Suspense>

      <Suspense fallback={null}>
        <DeferredAdminSpeakingTopicsFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          currentTestType={currentTestType}
          editingTopic={editingTopic}
          isPending={createMutation.isPending || updateMutation.isPending}
          isGeneratingTTS={isGeneratingTTS}
          onSubmit={onSubmit}
          onGenerateTTS={handleGenerateTTS}
        />
      </Suspense>
    </div>
  );
}
