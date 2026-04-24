import { lazy, Suspense, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  MessageSquare, 
  RefreshCw,
  Wrench
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NewToeflFeedbackRequest } from "@shared/schema";

const PendingFeedbackTab = lazy(() => import("@/components/admin-feedback/shared").then((module) => ({ default: module.PendingFeedbackTab })));
const ProcessedFeedbackTab = lazy(() => import("@/components/admin-feedback/shared").then((module) => ({ default: module.ProcessedFeedbackTab })));
const MaintenanceFeedbackTab = lazy(() => import("@/components/admin-feedback/shared").then((module) => ({ default: module.MaintenanceFeedbackTab })));

export default function AdminFeedback() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("pending");
  const [recalcResult, setRecalcResult] = useState<{ totalTests: number; totalUpdated: number; totalFailed: number } | null>(null);
  const [cacheClearResult, setCacheClearResult] = useState<{ deletedCacheRows: number; clearedTests: number } | null>(null);

  const { data: pendingRequests, isLoading } = useQuery<NewToeflFeedbackRequest[]>({
    queryKey: ["/api/admin/feedback/pending"]
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/feedback/${id}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback/pending"] });
      toast({
        title: "피드백 승인 완료",
        description: "인라이즈 피드백이 생성되어 학생에게 전달되었습니다."
      });
    },
    onError: (error: any) => {
      toast({
        title: "승인 실패",
        description: error.message || "피드백 승인에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/feedback/${id}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback/pending"] });
      toast({
        title: "피드백 거절됨",
        description: "피드백 요청이 거절되었습니다."
      });
    },
    onError: (error: any) => {
      toast({
        title: "거절 실패",
        description: error.message || "피드백 거절에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const cacheClearMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/clear-choose-response-cache");
      return response.json();
    },
    onSuccess: (data: any) => {
      setCacheClearResult({
        deletedCacheRows: data.deletedCacheRows || 0,
        clearedTests: data.clearedTests || 0,
      });
      toast({
        title: "캐시 초기화 완료",
        description: `${data.deletedCacheRows || 0}개 캐시 항목이 삭제되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "캐시 초기화 실패",
        description: error.message || "캐시 초기화에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/recalculate-build-sentence-answers", { forceRecalculate: true });
      return response.json();
    },
    onSuccess: (data: any) => {
      setRecalcResult({
        totalTests: data.results?.length || 0,
        totalUpdated: data.totalUpdated || 0,
        totalFailed: data.totalFailed || 0,
      });
      toast({
        title: "재계산 완료",
        description: `${data.totalUpdated || 0}개 문제 정답이 업데이트되었습니다.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "재계산 실패",
        description: error.message || "정답 재계산에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/admin">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              관리자 대시보드로 돌아가기
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">피드백 관리</h1>
              <p className="text-gray-300">학생들의 피드백 요청을 승인하고 인라이즈 피드백을 생성합니다</p>
            </div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="bg-white/10">
            <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <Clock className="mr-2 h-4 w-4" />
              대기 중 ({pendingRequests?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="processed" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <CheckCircle className="mr-2 h-4 w-4" />
              처리 완료
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">
              <Wrench className="mr-2 h-4 w-4" />
              유지보수
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4">
            <Suspense fallback={<div className="text-white/60 py-8">로딩 중...</div>}>
              {selectedTab === "pending" && (
                <PendingFeedbackTab
                  pendingRequests={pendingRequests}
                  isLoading={isLoading}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              )}
              {selectedTab === "processed" && <ProcessedFeedbackTab />}
              {selectedTab === "maintenance" && (
                <MaintenanceFeedbackTab
                  recalcResult={recalcResult}
                  cacheClearResult={cacheClearResult}
                  onRecalculate={() => recalcMutation.mutate()}
                  onClearCache={() => cacheClearMutation.mutate()}
                  isRecalculating={recalcMutation.isPending}
                  isClearingCache={cacheClearMutation.isPending}
                />
              )}
            </Suspense>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
