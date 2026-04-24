import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  AlertTriangle, 
  XCircle,
} from "lucide-react";
import type { AdminStats, AdminUser as User, TestAuditLog } from "@/components/admin/shared";

const LazyAdminPanelMainView = lazy(() => import("@/components/admin/AdminPanelMainView"));

export default function AdminPanel() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(true);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [auditLogs, setAuditLogs] = useState<TestAuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [deletedTests, setDeletedTests] = useState<any[]>([]);
  const [loadingDeletedTests, setLoadingDeletedTests] = useState(false);

  const [accessDenied, setAccessDenied] = useState(false);
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "권한 없음",
        description: "로그인이 필요합니다.",
        variant: "destructive",
      });
    } else if (!isLoading && isAuthenticated && user) {
      if (user.role !== "admin") {
        setAccessDenied(true);
        toast({
          title: "접근 거부",
          description: "관리자 권한이 필요합니다.",
          variant: "destructive",
        });
      } else {
        loadStatistics();
        loadUsers();
      }
    }
  }, [isLoading, isAuthenticated, user, toast]);

  const loadStatistics = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch("/api/admin/statistics", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to load statistics:", error);
      toast({
        title: "오류",
        description: "통계 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const usersData = await response.json();
        const sortedUsers = Array.isArray(usersData) 
          ? usersData.sort((a: User, b: User) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
            })
          : [];
        setUsers(sortedUsers);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      toast({
        title: "오류",
        description: "사용자 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAuditLogs(true);
    try {
      const response = await fetch("/api/admin/test-audit-logs?limit=50", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const logs = await response.json();
        setAuditLogs(logs);
      }
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const loadDeletedTests = async () => {
    setLoadingDeletedTests(true);
    try {
      const response = await fetch("/api/admin/deleted-tests", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const tests = await response.json();
        setDeletedTests(tests);
      }
    } catch (error) {
      console.error("Failed to load deleted tests:", error);
    } finally {
      setLoadingDeletedTests(false);
    }
  };

  const handleToggleAuditHistory = () => {
    const nextShowAuditHistory = !showAuditHistory;
    setShowAuditHistory(nextShowAuditHistory);
    if (nextShowAuditHistory) {
      loadAuditLogs();
      loadDeletedTests();
    }
  };

  const restoreTest = async (testId: string) => {
    try {
      const response = await fetch(`/api/admin/tests/${testId}/restore`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        toast({ title: "성공", description: "테스트가 복구되었습니다." });
        loadDeletedTests();
        loadAuditLogs();
      } else {
        throw new Error("Failed to restore test");
      }
    } catch (error) {
      toast({ title: "오류", description: "테스트 복구에 실패했습니다.", variant: "destructive" });
    }
  };

  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) =>
      await apiRequest("PATCH", `/api/admin/users/${data.userId}/role`, { role: data.role }),
    onSuccess: () => {
      toast({ title: "성공", description: "사용자 역할이 업데이트되었습니다." });
      loadUsers();
    },
    onError: () => {
      toast({ title: "오류", description: "역할 업데이트에 실패했습니다.", variant: "destructive" });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async (data: { userId: string; tier: string }) =>
      await apiRequest("PATCH", `/api/admin/users/${data.userId}/tier`, { tier: data.tier }),
    onSuccess: () => {
      toast({ title: "성공", description: "회원 등급이 변경되었습니다." });
      loadUsers();
    },
    onError: () => {
      toast({ title: "오류", description: "등급 변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) =>
      await apiRequest("DELETE", `/api/admin/users/${userId}`),
    onSuccess: () => {
      toast({ title: "성공", description: "회원이 삭제되었습니다." });
      loadUsers();
    },
    onError: (error: any) => {
      toast({ 
        title: "오류", 
        description: error.message || "회원 삭제에 실패했습니다.", 
        variant: "destructive" 
      });
    },
  });

  const grantCreditMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: string; amount: number }) =>
      await apiRequest("POST", `/api/user/credits/add`, {
        userId,
        amount,
        type: 'bonus',
        description: '관리자 지급',
      }),
    onSuccess: (_data, { userId }) => {
      toast({ title: "크레딧 지급 완료", description: `${creditInputs[userId] || ''}크레딧이 지급되었습니다.` });
      setCreditInputs(prev => ({ ...prev, [userId]: '' }));
      loadUsers();
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.message || "크레딧 지급에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#064e3b]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-white">로딩 중...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#064e3b]">
        <Alert className="max-w-md bg-[#334155]/80 border-white/20 text-white backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-gray-200">
            로그인이 필요합니다. 관리자 계정으로 로그인해 주세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#064e3b]">
        <Alert className="max-w-md bg-red-900/50 border-red-500/30 text-white backdrop-blur-sm">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-gray-200">
            관리자 권한이 필요합니다. 일반 사용자는 접근할 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-2 text-white">관리자 패널 준비 중...</span>
        </div>
      }
    >
      <LazyAdminPanelMainView
        users={users}
        stats={stats}
        loadingUsers={loadingUsers}
        loadingStats={loadingStats}
        showUserManagement={showUserManagement}
        showAuditHistory={showAuditHistory}
        auditLogs={auditLogs}
        loadingAuditLogs={loadingAuditLogs}
        deletedTests={deletedTests}
        creditInputs={creditInputs}
        updateRoleMutation={updateRoleMutation}
        updateTierMutation={updateTierMutation}
        deleteUserMutation={deleteUserMutation}
        grantCreditMutation={grantCreditMutation}
        onNavigate={setLocation}
        onToggleUserManagement={() => setShowUserManagement((prev) => !prev)}
        onToggleAuditHistory={handleToggleAuditHistory}
        onRefreshAuditHistory={() => {
          loadAuditLogs();
          loadDeletedTests();
        }}
        onRestoreTest={restoreTest}
        setCreditInputs={setCreditInputs}
      />
    </Suspense>
  );
}
