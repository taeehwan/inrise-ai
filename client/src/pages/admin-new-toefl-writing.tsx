import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PenTool, ArrowLeft, Eye, EyeOff, Trash2, Plus, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { NewToeflWritingTest } from "@shared/schema";

type BuildSentenceItem = {
  contextSentence?: string;
  sentenceTemplate?: string;
};

type EmailTask = {
  scenario?: string;
};

type DiscussionTask = {
  title?: string;
};

export default function AdminNewToeflWritingPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: tests = [], isLoading: loadingTests, refetch } = useQuery<NewToeflWritingTest[]>({
    queryKey: ['/api/admin/new-toefl-writing'],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/new-toefl-writing/${id}`, { isActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-writing'] });
      toast({ title: "상태 변경 완료" });
    },
    onError: () => {
      toast({ title: "변경 실패", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/new-toefl-writing/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/new-toefl-writing'] });
      toast({ title: "삭제 완료" });
    },
    onError: () => {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">접근 권한이 없습니다</div>;
  }

  const activeCount = tests.filter(t => t.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                어드민
              </Button>
              <div className="flex items-center gap-2">
                <PenTool className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-gray-900 dark:text-white">New TOEFL Writing 관리 (2026)</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-100 text-green-800">
                활성: {activeCount}
              </Badge>
              <Badge className="bg-gray-100 text-gray-800">
                전체: {tests.length}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeCount === 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 font-medium">⚠️ 활성화된 Writing 테스트가 없습니다. Full Test에서 Writing 섹션을 사용하려면 최소 1개를 활성화하세요.</p>
          </div>
        )}

        {loadingTests ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : tests.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <PenTool className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-2">Writing 테스트가 없습니다</p>
              <p className="text-gray-400 text-sm">학생 제출 또는 AI 생성으로 테스트를 추가하세요</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => {
              const isExpanded = expandedId === test.id;
              const sentences = Array.isArray(test.buildSentences) ? test.buildSentences : [];
              return (
                <Card
                  key={test.id}
                  className={`border-2 transition-all ${test.isActive ? 'border-indigo-200 bg-white' : 'border-gray-200 bg-gray-50'}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${test.isActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                          <PenTool className={`h-5 w-5 ${test.isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold text-gray-900">{test.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={test.isActive ? "default" : "secondary"} className={test.isActive ? "bg-green-100 text-green-800 border-green-200" : ""}>
                              {test.isActive ? "활성" : "비활성"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {test.difficulty === 'easy' ? '쉬움' : test.difficulty === 'hard' ? '어려움' : '보통'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Build Sentence: {sentences.length}개
                            </span>
                            <span className="text-xs text-gray-400">
                              ID: {test.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : test.id)}
                          className="text-gray-500 hover:text-indigo-600"
                        >
                          {isExpanded ? '접기' : '상세보기'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMutation.mutate({ id: test.id, isActive: !test.isActive })}
                          disabled={toggleMutation.isPending}
                          className={test.isActive ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-green-600 border-green-200 hover:bg-green-50"}
                        >
                          {test.isActive ? (
                            <><EyeOff className="h-4 w-4 mr-1" />비활성화</>
                          ) : (
                            <><Eye className="h-4 w-4 mr-1" />활성화</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("이 테스트를 삭제하시겠습니까?")) {
                              deleteMutation.mutate(test.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="border-t border-gray-100 pt-4 space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">Build a Sentence ({sentences.length}개)</h3>
                          <div className="space-y-2">
                            {sentences.slice(0, 3).map((s: BuildSentenceItem, i: number) => (
                              <div key={i} className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                                {i + 1}. {s.contextSentence || s.sentenceTemplate || '문장 데이터'}
                              </div>
                            ))}
                            {sentences.length > 3 && (
                              <p className="text-xs text-gray-400">+ {sentences.length - 3}개 더...</p>
                            )}
                          </div>
                        </div>

                        {Boolean(test.emailTask) && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Write an Email</h3>
                            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                              {String((test.emailTask as EmailTask).scenario || '이메일 시나리오')}
                            </div>
                          </div>
                        )}

                        {Boolean(test.discussionTask) && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Academic Discussion</h3>
                            <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                              {String((test.discussionTask as DiscussionTask).title || '토론 주제')}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-gray-400">
                          생성: {test.createdAt ? new Date(test.createdAt).toLocaleDateString('ko-KR') : '-'}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
