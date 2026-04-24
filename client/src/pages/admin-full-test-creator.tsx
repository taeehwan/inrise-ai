import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { InsertTestSet, InsertTestSetComponent, Test, TestSet } from "@shared/schema";
import { AlertTriangle, ArrowLeft, GraduationCap, History, Layers, Plus, Settings } from "lucide-react";
import { Link } from "wouter";
import type { TestAuditLog, TestSetForm } from "@/components/admin-full-test-creator/shared";

const DeferredCreateTab = lazy(() => import("@/components/admin-full-test-creator/AdminFullTestCreateTab"));
const DeferredManageTab = lazy(() => import("@/components/admin-full-test-creator/AdminFullTestManageTab"));
const DeferredHistoryTab = lazy(() => import("@/components/admin-full-test-creator/AdminFullTestHistoryTab"));
const DeferredEditDialog = lazy(() => import("@/components/admin-full-test-creator/AdminFullTestEditDialog"));

export default function AdminFullTestCreator() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<TestSetForm>({
    title: "",
    examType: "toefl",
    description: "",
    selectedTests: [],
  });
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "manage" | "history">("create");
  const [activeExamTab, setActiveExamTab] = useState<"toefl" | "new-toefl" | "sat" | "gre">("toefl");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", duration: 0, isActive: true });
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const { data: availableTests = [] } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: existingTestSets = [] } = useQuery<TestSet[]>({
    queryKey: ["/api/test-sets"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: auditLogs = [], isLoading: isLoadingAuditLogs, refetch: refetchAuditLogs } = useQuery<TestAuditLog[]>({
    queryKey: ["/api/admin/test-audit-logs"],
    enabled: activeTab === "history",
  });

  const invalidateManagedQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/tests"], refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: ["/api/test-sets"], refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: ["/api/new-toefl/reading"], refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: ["/api/new-toefl/listening"], refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: ["/api/new-toefl/speaking"], refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: ["/api/new-toefl/writing"], refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: ["/api/ai/tests"], refetchType: "all" }),
    ]);
  };

  const createTestSetMutation = useMutation({
    mutationFn: async (data: { testSet: InsertTestSet; components: InsertTestSetComponent[] }) => apiRequest("POST", "/api/admin/test-sets", data),
    onSuccess: () => {
      toast({ title: "성공", description: "풀테스트가 성공적으로 생성되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/test-sets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setForm({ title: "", examType: "toefl", description: "", selectedTests: [] });
    },
    onError: () => toast({ title: "오류", description: "풀테스트 생성에 실패했습니다.", variant: "destructive" }),
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (test: Test) => {
      await apiRequest("DELETE", `/api/admin/tests/${test.id}`);
      return test.id;
    },
    onMutate: async (test: Test) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tests"] });
      const previousTests = queryClient.getQueryData<Test[]>(["/api/tests"]);
      queryClient.setQueryData<Test[]>(["/api/tests"], (old) => old?.map((t) => (t.id === test.id ? { ...t, isActive: false } : t)));
      return { previousTests };
    },
    onSuccess: async () => {
      toast({ title: "성공", description: "테스트가 성공적으로 삭제되었습니다." });
      await invalidateManagedQueries();
    },
    onError: (_error, _test, context) => {
      if (context?.previousTests) queryClient.setQueryData(["/api/tests"], context.previousTests);
      toast({ title: "오류", description: "테스트 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (testIds: string[]) => {
      await apiRequest("POST", "/api/admin/tests/bulk-delete", { testIds });
      return testIds;
    },
    onMutate: async (testIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tests"] });
      const previousTests = queryClient.getQueryData<Test[]>(["/api/tests"]);
      queryClient.setQueryData<Test[]>(["/api/tests"], (old) => old?.map((t) => (testIds.includes(t.id) ? { ...t, isActive: false } : t)));
      return { previousTests };
    },
    onSuccess: async (_data, deletedIds) => {
      toast({ title: "성공", description: `${deletedIds.length}개 테스트가 삭제되었습니다.` });
      setSelectedTestIds(new Set());
      setShowBulkDeleteDialog(false);
      await invalidateManagedQueries();
    },
    onError: (_error, _ids, context) => {
      if (context?.previousTests) queryClient.setQueryData(["/api/tests"], context.previousTests);
      setShowBulkDeleteDialog(false);
      toast({ title: "오류", description: "일괄 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const restoreTestMutation = useMutation({
    mutationFn: async (testId: string) => apiRequest("POST", `/api/admin/tests/${testId}/restore`),
    onSuccess: async () => {
      toast({ title: "성공", description: "테스트가 복원되었습니다." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/tests"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["/api/test-sets"], refetchType: "all" }),
      ]);
    },
    onError: () => toast({ title: "오류", description: "테스트 복원에 실패했습니다.", variant: "destructive" }),
  });

  const deleteTestSetMutation = useMutation({
    mutationFn: async (testSetId: string) => apiRequest("DELETE", `/api/admin/test-sets/${testSetId}`),
    onSuccess: async () => {
      toast({ title: "성공", description: "풀테스트가 성공적으로 삭제되었습니다." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/test-sets"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["/api/tests"], refetchType: "all" }),
      ]);
    },
    onError: () => toast({ title: "오류", description: "풀테스트 삭제에 실패했습니다.", variant: "destructive" }),
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({ test, updates }: { test: Test; updates: Partial<Test> }) => apiRequest("PATCH", `/api/admin/tests/${test.id}`, updates),
    onSuccess: async () => {
      toast({ title: "성공", description: "테스트가 성공적으로 수정되었습니다." });
      setEditingTest(null);
      await invalidateManagedQueries();
    },
    onError: () => toast({ title: "오류", description: "테스트 수정에 실패했습니다.", variant: "destructive" }),
  });

  const handleEditTest = (test: Test) => {
    setEditingTest(test);
    setEditForm({
      title: test.title,
      description: test.description,
      duration: test.duration,
      isActive: test.isActive !== false,
    });
  };

  const handleSaveEdit = () => {
    if (!editingTest) return;
    updateTestMutation.mutate({
      test: editingTest,
      updates: {
        title: editForm.title,
        description: editForm.description,
        duration: editForm.duration,
        isActive: editForm.isActive,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || form.selectedTests.length === 0) {
      toast({ title: "입력 오류", description: "모든 필드를 입력하고 최소 하나의 테스트를 선택해주세요.", variant: "destructive" });
      return;
    }

    const testSetData: InsertTestSet = {
      title: form.title,
      examType: form.examType,
      description: form.description,
      totalDuration: availableTests.filter((test) => form.selectedTests.includes(test.id)).reduce((sum, test) => sum + test.duration, 0),
    };
    const components: InsertTestSetComponent[] = form.selectedTests.map((testId, index) => ({
      testSetId: "",
      testId,
      orderIndex: index,
      isRequired: true,
    }));
    createTestSetMutation.mutate({ testSet: testSetData, components });
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({ title: "권한 없음", description: "로그인이 필요합니다.", variant: "destructive" });
    } else if (!isLoading && isAuthenticated && user && user.role !== "admin") {
      setAccessDenied(true);
      toast({ title: "접근 거부", description: "관리자 권한이 필요합니다.", variant: "destructive" });
    }
  }, [isLoading, isAuthenticated, user, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070B17] flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full" />
          <div className="absolute inset-0 animate-ping w-12 h-12 border border-purple-400 rounded-full opacity-30" />
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#070B17] flex items-center justify-center">
        <Alert className="max-w-md bg-red-500/10 backdrop-blur-xl border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <AlertDescription className="text-red-300">관리자 권한이 필요합니다. 로그인하신 계정을 확인해주세요.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B17] overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#070B17] via-[#0D1326] to-[#070B17]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px]" />
      </div>

      <nav className="sticky top-0 z-50 bg-[#070B17]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-6">
              <Link href="/admin">
                <Button variant="ghost" className="group flex items-center gap-3 text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300 rounded-xl">
                  <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                  <span className="font-medium">관리자 홈</span>
                </Button>
              </Link>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">풀테스트 관리 센터</h1>
                  <p className="text-sm text-gray-400">TOEFL · SAT · GRE 완전 테스트 생성</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 mb-6">
            <GraduationCap className="h-10 w-10 text-purple-400" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">Full Test Creator</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">공식 시험 규격에 맞는 풀테스트를 생성하여 실전과 동일한 환경을 제공합니다</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/5 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10">
            <button onClick={() => setActiveTab("create")} className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${activeTab === "create" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`} data-testid="tab-create">
              <div className="flex items-center gap-2"><Plus className="h-4 w-4" /><span>풀테스트 생성</span></div>
            </button>
            <button onClick={() => setActiveTab("manage")} className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${activeTab === "manage" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`} data-testid="tab-manage">
              <div className="flex items-center gap-2"><Settings className="h-4 w-4" /><span>테스트 관리</span></div>
            </button>
            <button onClick={() => setActiveTab("history")} className={`relative px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${activeTab === "history" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`} data-testid="tab-history">
              <div className="flex items-center gap-2"><History className="h-4 w-4" /><span>활동 내역</span></div>
            </button>
          </div>
        </div>

        {activeTab === "create" && (
          <Suspense fallback={null}>
            <DeferredCreateTab form={form} setForm={setForm} availableTests={availableTests} existingTestSets={existingTestSets} onSubmit={handleSubmit} createPending={createTestSetMutation.isPending} />
          </Suspense>
        )}
        {activeTab === "manage" && (
          <Suspense fallback={null}>
            <DeferredManageTab
              availableTests={availableTests}
              existingTestSets={existingTestSets}
              activeExamTab={activeExamTab}
              setActiveExamTab={setActiveExamTab}
              expandedSections={expandedSections}
              setExpandedSections={setExpandedSections}
              selectedTestIds={selectedTestIds}
              setSelectedTestIds={setSelectedTestIds}
              showBulkDeleteDialog={showBulkDeleteDialog}
              setShowBulkDeleteDialog={setShowBulkDeleteDialog}
              onEditTest={handleEditTest}
              onDeleteTest={(test) => deleteTestMutation.mutate(test)}
              onRestoreTest={(id) => restoreTestMutation.mutate(id)}
              onDeleteTestSet={(id) => deleteTestSetMutation.mutate(id)}
              bulkDeletePending={bulkDeleteMutation.isPending}
              onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
            />
          </Suspense>
        )}
        {activeTab === "history" && (
          <Suspense fallback={null}>
            <DeferredHistoryTab auditLogs={auditLogs} isLoadingAuditLogs={isLoadingAuditLogs} onRefresh={() => refetchAuditLogs()} />
          </Suspense>
        )}
      </div>

      <Suspense fallback={null}>
        <DeferredEditDialog editingTest={editingTest} setEditingTest={setEditingTest} editForm={editForm} setEditForm={setEditForm} onSave={handleSaveEdit} isPending={updateTestMutation.isPending} />
      </Suspense>
    </div>
  );
}
