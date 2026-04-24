import { lazy, Suspense, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  CreditCard,
  Settings,
  Search,
  Edit,
  Trash2,
  Plus,
  Star,
  Award,
  Activity,
  DollarSign,
  Calendar,
  TrendingUp,
  Gift,
  Brain,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import type { 
  User, 
  Payment, 
  Subscription, 
  SuccessStory, 
  SuccessStats, 
  Program, 
  UserProgramAccess, 
  AiUsage, 
  UserActivity 
} from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
const DeferredAdminPanelDialogs = lazy(() => import("@/components/admin/AdminPanelDialogs"));

type AdminStats = {
  totalUsers?: number;
  activeUsers?: number;
  totalRevenue?: number;
  totalTests?: number;
  averageRating?: number;
};

type UsageSummary = {
  totalRequests?: number;
  totalTokens?: number;
  totalDuration?: number;
  averageDurationPerSession?: number;
  averageTokensPerRequest?: number;
  featureUsage?: Record<string, number>;
};

type ActivitySummary = {
  totalActivities?: number;
  totalDuration?: number;
  averageDurationPerActivity?: number;
  activityTypes?: Record<string, number>;
};

type AdminAiTest = {
  id: string;
  title?: string | null;
  examType?: string | null;
  section?: string | null;
  questionCount?: number | null;
  hasTemplateData?: boolean | null;
  createdAt?: string | Date | null;
};

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // 인증 확인 - 로그인되지 않았거나 관리자가 아니면 에러 화면 표시
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">인증 오류</h2>
          <p className="text-gray-600 mb-6">
            권한이 없어서 볼 수 없습니다. 다시 로그인해주세요.
          </p>
          <Button onClick={() => setLocation("/login")} className="w-full">
            로그인
          </Button>
        </div>
      </div>
    );
  }

  // 사용자 데이터 조회 (타입 수정)
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/users");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json() as User[];
      } catch (error) {
        console.error("Users API error:", error);
        return [];
      }
    },
    retry: false
  });

  // 결제 데이터 조회
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/admin/payments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/payments");
      return await response.json();
    }
  });

  // 구독 데이터 조회
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/admin/subscriptions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/subscriptions");
      return await response.json();
    }
  });

  // 통계 데이터 조회
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/statistics"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/statistics");
        return await response.json();
      } catch (error) {
        console.error("Stats API error:", error);
        return { totalUsers: 0, activeUsers: 0, totalRevenue: 0 };
      }
    },
    retry: false
  });

  // Success Stories 데이터 조회
  const { data: successStories = [], isLoading: storiesLoading } = useQuery<SuccessStory[]>({
    queryKey: ["/api/admin/success-stories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/success-stories");
      return await response.json();
    }
  });

  const { data: successStats } = useQuery<SuccessStats>({
    queryKey: ["/api/success-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/success-stats");
      return await response.json();
    }
  });

  // Programs 데이터 조회
  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/admin/programs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/programs");
      return await response.json();
    }
  });

  // AI Usage 통계 조회
  const { data: aiUsageStats } = useQuery<UsageSummary>({
    queryKey: ["/api/admin/ai-usage-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/ai-usage-stats");
      return await response.json();
    }
  });

  // Activity 통계 조회
  const { data: activityStats } = useQuery<ActivitySummary>({
    queryKey: ["/api/admin/activity-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/activity-stats");
      return await response.json();
    }
  });

  // AI Tests management
  const { data: aiTests = [], isLoading: aiTestsLoading } = useQuery<AdminAiTest[]>({
    queryKey: ["/api/admin/ai-tests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/ai-tests");
      return await response.json();
    },
    enabled: isAdmin,
    refetchInterval: 30000 // Auto refresh every 30 seconds
  });

  const deleteAiTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      return apiRequest("DELETE", `/api/admin/ai-tests/${testId}`);
    },
    onSuccess: () => {
      toast({
        title: "삭제 완료",
        description: "AI 생성 테스트가 성공적으로 삭제되었습니다."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-tests"] });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error.message || "AI 테스트 삭제 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  });

  // Mutations for user management
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) =>
      await apiRequest(`/api/admin/users/${data.userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: data.role })
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "사용자 역할이 업데이트되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "오류", description: "역할 업데이트에 실패했습니다.", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: string) =>
      await apiRequest(`/api/admin/users/${userId}/toggle-active`, {
        method: "PATCH"
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "사용자 활성 상태가 변경되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "오류", description: "상태 변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async (data: { userId: string; tier: string }) =>
      await apiRequest(`/api/admin/users/${data.userId}/tier`, {
        method: "PATCH",
        body: JSON.stringify({ tier: data.tier })
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "회원 등급이 변경되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: () => {
      toast({ title: "오류", description: "등급 변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) =>
      await apiRequest(`/api/admin/users/${userId}`, {
        method: "DELETE"
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "회원이 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "오류", 
        description: error.message || "회원 삭제에 실패했습니다.", 
        variant: "destructive" 
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) =>
      apiRequest(`/api/admin/subscriptions/${subscriptionId}/cancel`, {
        method: "PUT",
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "구독이 취소되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
    },
    onError: () => {
      toast({ title: "오류", description: "구독 취소에 실패했습니다.", variant: "destructive" });
    },
  });

  // State for dialogs
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<SuccessStory | null>(null);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [selectedUserForAnalysis, setSelectedUserForAnalysis] = useState<User | null>(null);
  const [selectedUserForProgram, setSelectedUserForProgram] = useState<User | null>(null);
  const [programAccessDialogOpen, setProgramAccessDialogOpen] = useState(false);
  const [userAiUsage, setUserAiUsage] = useState<UsageSummary | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/admin/programs/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "프로그램이 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
    },
    onError: () => {
      toast({ title: "오류", description: "프로그램 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/admin/success-stories/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "성공 스토리가 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/success-stories"] });
    },
    onError: () => {
      toast({ title: "오류", description: "성공 스토리 삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  // Event handlers
  const handleEditStory = (story: SuccessStory) => {
    setEditingStory(story);
    setStoryDialogOpen(true);
  };

  const handleCreateStory = () => {
    setEditingStory(null);
    setStoryDialogOpen(true);
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setProgramDialogOpen(true);
  };

  const handleCreateProgram = () => {
    setEditingProgram(null);
    setProgramDialogOpen(true);
  };

  const fetchUserAnalysis = async (user: User) => {
    setSelectedUserForAnalysis(user);
    try {
      const [aiUsageResponse, activityResponse] = await Promise.all([
        apiRequest("GET", `/api/admin/user-ai-usage/${user.id}`),
        apiRequest("GET", `/api/admin/user-activity/${user.id}`)
      ]);
      setUserAiUsage(await aiUsageResponse.json());
      setUserActivity(await activityResponse.json());
    } catch (error) {
      toast({ title: "오류", description: "사용자 분석 데이터를 가져오는데 실패했습니다.", variant: "destructive" });
    }
  };

  // Filtered users for search — memoized so unrelated state changes (dialog opens,
  // mutation settles) don't re-scan the entire users array on every render.
  const filteredUsers = useMemo(() => {
    const needle = searchTerm.toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      user.firstName?.toLowerCase().includes(needle) ||
      user.lastName?.toLowerCase().includes(needle) ||
      user.email.toLowerCase().includes(needle)
    );
  }, [users, searchTerm]);

  // Count derivations (rendered in the header tiles) — also memoized so the
  // header doesn't re-filter on every keystroke / unrelated re-render.
  const userCounts = useMemo(
    () => ({
      active: users.filter((u) => u.isActive).length,
      admins: users.filter((u) => u.role === "admin").length,
    }),
    [users],
  );

  const problematicAiTests = useMemo(
    () => aiTests.filter((test: AdminAiTest) => test.hasTemplateData),
    [aiTests],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  시스템 운영 관리자 패널
                </h1>
                <p className="text-sm text-gray-500">회원 관리 • 결제 관리 • 운영 분석 • 성공 스토리</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setLocation('/admin')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                콘텐츠 관리
              </Button>
              <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                온라인
              </div>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">

        {/* Modern Statistics Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">총 사용자</p>
                      <p className="text-3xl font-bold mt-1">{stats.totalUsers || 0}</p>
                      <p className="text-blue-200 text-xs mt-1">+12% 이번 달</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">활성 사용자</p>
                      <p className="text-3xl font-bold mt-1">{stats.activeUsers || 0}</p>
                      <p className="text-emerald-200 text-xs mt-1">+8% 이번 달</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Activity className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">총 테스트</p>
                      <p className="text-3xl font-bold mt-1">{stats.totalTests || 0}</p>
                      <p className="text-purple-200 text-xs mt-1">+25% 이번 달</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Award className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">평균 평점</p>
                      <p className="text-3xl font-bold mt-1">{stats.averageRating?.toFixed(1) || '4.8'}</p>
                      <p className="text-orange-200 text-xs mt-1">★★★★★</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Star className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <Tabs defaultValue="users" className="space-y-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-gray-200/60">
            <TabsList className="grid w-full grid-cols-7 bg-transparent gap-1">
              <TabsTrigger value="users" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all">
                사용자 관리
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all">
                결제 내역
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all">
                구독 관리
              </TabsTrigger>
              <TabsTrigger value="programs" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all">
                프로그램 관리
              </TabsTrigger>
              <TabsTrigger value="ai-tests" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all">
                <Brain className="h-4 w-4 mr-1" />
                AI 테스트
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all">
                사용량 분석
              </TabsTrigger>
              <TabsTrigger value="success-stories" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all">
                성공 스토리
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 사용자 관리 탭 */}
          <TabsContent value="users">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">사용자 관리</h3>
                      <p className="text-sm text-gray-500 font-normal">총 {users.length}명의 사용자</p>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="사용자 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-80 bg-white/50 border-gray-200 focus:bg-white transition-colors"
                        data-testid="input-user-search"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                        활성: {userCounts.active}
                      </div>
                      <div className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                        관리자: {userCounts.admins}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="text-center py-16">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">사용자 데이터를 불러오는 중...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">검색 결과가 없습니다.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredUsers.map((user: User, index) => (
                      <div key={user.id} className={`p-6 hover:bg-gray-50/50 transition-colors ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/20'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg
                                ${user.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                                {user.firstName?.charAt(0) || user.username?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
                                ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 text-lg">
                                  {user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}` 
                                    : user.username}
                                </h4>
                                <Badge variant={user.role === "admin" ? "default" : "outline"} className={
                                  user.role === "admin" ? "bg-purple-100 text-purple-700 border-purple-200" : ""
                                }>
                                  {user.role === "admin" ? "👑 관리자" : "👤 사용자"}
                                </Badge>
                              </div>
                              <p className="text-gray-600 text-sm">{user.email}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>📅 가입일: {new Date(user.createdAt).toLocaleDateString()}</span>
                                {user.country && <span>🌍 {user.country}</span>}
                                {user.targetExam && <span>📚 목표: {user.targetExam.toUpperCase()}</span>}
                                <Badge variant="outline" className={
                                  user.membershipTier === 'master' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-300 font-bold' :
                                  user.membershipTier === 'max' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                  user.membershipTier === 'pro' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                  user.membershipTier === 'light' ? 'bg-green-100 text-green-700 border-green-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }>
                                  {user.membershipTier?.toUpperCase() || 'GUEST'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 min-w-16">회원 등급:</span>
                              <Select
                                value={user.membershipTier || 'guest'}
                                onValueChange={(tier) => updateTierMutation.mutate({ userId: user.id, tier })}
                                disabled={updateTierMutation.isPending}
                              >
                                <SelectTrigger className="w-32 h-9 text-sm font-medium border-2" data-testid={`select-tier-${user.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="guest">GUEST</SelectItem>
                                  <SelectItem value="light">LIGHT 💡</SelectItem>
                                  <SelectItem value="pro">PRO ⚡</SelectItem>
                                  <SelectItem value="max">MAX 🚀</SelectItem>
                                  <SelectItem value="master">MASTER 👑</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                variant={user.role === "admin" ? "destructive" : "default"}
                                size="sm"
                                onClick={() => updateRoleMutation.mutate({
                                  userId: user.id,
                                  role: user.role === "admin" ? "guest" : "admin"
                                })}
                                disabled={updateRoleMutation.isPending}
                                className="font-medium"
                                data-testid={`button-toggle-role-${user.id}`}
                              >
                                {user.role === "admin" ? "👑 Admin 해제" : "👑 Admin 승격"}
                              </Button>
                              
                              {user.role !== "admin" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleActiveMutation.mutate(user.id)}
                                    disabled={toggleActiveMutation.isPending}
                                    className={user.isActive ? "text-red-600 hover:text-red-700 border-red-200" : "text-green-600 hover:text-green-700 border-green-200"}
                                    data-testid={`button-toggle-active-${user.id}`}
                                  >
                                    {user.isActive ? "🚫 비활성화" : "✅ 활성화"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUserForProgram(user);
                                      setProgramAccessDialogOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 border-blue-200"
                                    data-testid={`button-manage-programs-${user.id}`}
                                  >
                                    <Gift className="w-4 h-4 mr-1" />
                                    프로그램
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`⚠️ 경고: ${user.email} 회원을 완전히 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!`)) {
                                        deleteUserMutation.mutate(user.id);
                                      }
                                    }}
                                    disabled={deleteUserMutation.isPending}
                                    data-testid={`button-delete-${user.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    회원 삭제
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 결제 내역 탭 */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  결제 내역
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="text-center py-8">로딩 중...</div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">결제 내역이 없습니다.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>사용자</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>결제일</TableHead>
                        <TableHead>플랜</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment: Payment) => {
                        const user = users.find(u => u.id === payment.userId);
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {user ? `${user.firstName} ${user.lastName}` : payment.userId}
                            </TableCell>
                            <TableCell>₩{payment.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={
                                payment.status === "done" ? "default" :
                                payment.status === "waiting_for_deposit" ? "secondary" : "destructive"
                              }>
                                {payment.status === "done" ? "완료" :
                                 payment.status === "waiting_for_deposit" ? "대기" : "실패"}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{payment.subscriptionId || payment.method || '미지정'}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 구독 관리 탭 */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  구독 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscriptionsLoading ? (
                  <div className="text-center py-8">로딩 중...</div>
                ) : subscriptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">활성 구독이 없습니다.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>사용자</TableHead>
                        <TableHead>플랜</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>시작일</TableHead>
                        <TableHead>만료일</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((subscription: Subscription) => {
                        const user = users.find(u => u.id === subscription.userId);
                        return (
                          <TableRow key={subscription.id}>
                            <TableCell>
                              {user ? `${user.firstName} ${user.lastName}` : subscription.userId}
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">{subscription.planName || subscription.planId}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                                {subscription.status === "active" ? "활성" : "비활성"}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(subscription.billingCycleStart).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {subscription.billingCycleEnd ? new Date(subscription.billingCycleEnd).toLocaleDateString() : "무제한"}
                            </TableCell>
                            <TableCell>
                              {subscription.status === "active" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => cancelSubscriptionMutation.mutate(subscription.id)}
                                  disabled={cancelSubscriptionMutation.isPending}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`button-cancel-subscription-${subscription.id}`}
                                >
                                  취소
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 프로그램 관리 탭 */}
          <TabsContent value="programs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    프로그램 관리
                  </CardTitle>
                  <Button onClick={handleCreateProgram} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    새 프로그램 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {programsLoading ? (
                  <div className="text-center py-8">로딩 중...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>프로그램명</TableHead>
                        <TableHead>시험 타입</TableHead>
                        <TableHead>난이도</TableHead>
                        <TableHead>필요 멤버십</TableHead>
                        <TableHead>가격</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {programs.map((program: Program) => (
                        <TableRow key={program.id}>
                          <TableCell className="font-medium">{program.name}</TableCell>
                          <TableCell>{program.examType.toUpperCase()}</TableCell>
                          <TableCell>
                            <Badge variant={
                              program.difficulty === "easy" ? "secondary" :
                              program.difficulty === "medium" ? "default" : "destructive"
                            }>
                              {program.difficulty === "easy" ? "쉬움" :
                               program.difficulty === "medium" ? "보통" : "어려움"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {program.membershipRequired === "guest" ? "게스트" :
                               program.membershipRequired === "light" ? "라이트" :
                               program.membershipRequired === "pro" ? "프로" : "맥스"}
                            </Badge>
                          </TableCell>
                          <TableCell>₩{program.price}</TableCell>
                          <TableCell>
                            <Badge variant={program.isActive ? "default" : "secondary"}>
                              {program.isActive ? "활성" : "비활성"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditProgram(program)}
                                data-testid={`button-edit-program-${program.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteProgramMutation.mutate(program.id)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-program-${program.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI 사용량 분석 탭 */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* AI 사용량 통계 */}
              {aiUsageStats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      AI 기능 사용량 통계
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">총 요청 수</p>
                        <p className="text-2xl font-bold text-blue-700">{aiUsageStats.totalRequests || 0}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">총 토큰 사용량</p>
                        <p className="text-2xl font-bold text-green-700">{aiUsageStats.totalTokens?.toLocaleString() || 0}</p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">평균 세션 시간</p>
                        <p className="text-2xl font-bold text-purple-700">{Math.round(aiUsageStats.averageDurationPerSession || 0)}분</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm text-orange-600 font-medium">요청당 평균 토큰</p>
                        <p className="text-2xl font-bold text-orange-700">{aiUsageStats.averageTokensPerRequest || 0}</p>
                      </div>
                    </div>
                    
                    {aiUsageStats.featureUsage && Object.keys(aiUsageStats.featureUsage).length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-3">기능별 사용량</h4>
                        <div className="space-y-2">
                          {Object.entries(aiUsageStats.featureUsage).map(([feature, count]) => (
                            <div key={feature} className="flex justify-between items-center">
                              <span className="text-sm">{feature}</span>
                              <Badge variant="outline">{count as number}회</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 활동 통계 */}
              {activityStats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      사용자 활동 통계
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <p className="text-sm text-indigo-600 font-medium">총 활동 수</p>
                        <p className="text-2xl font-bold text-indigo-700">{activityStats.totalActivities || 0}</p>
                      </div>
                      <div className="bg-pink-50 p-4 rounded-lg">
                        <p className="text-sm text-pink-600 font-medium">총 학습 시간</p>
                        <p className="text-2xl font-bold text-pink-700">{Math.round((activityStats.totalDuration || 0) / 60)}시간</p>
                      </div>
                      <div className="bg-teal-50 p-4 rounded-lg">
                        <p className="text-sm text-teal-600 font-medium">활동당 평균 시간</p>
                        <p className="text-2xl font-bold text-teal-700">{Math.round(activityStats.averageDurationPerActivity || 0)}분</p>
                      </div>
                    </div>

                    {activityStats.activityTypes && Object.keys(activityStats.activityTypes).length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-3">활동 유형별 분포</h4>
                        <div className="space-y-2">
                          {Object.entries(activityStats.activityTypes).map(([type, count]) => (
                            <div key={type} className="flex justify-between items-center">
                              <span className="text-sm">{type}</span>
                              <Badge variant="outline">{count as number}회</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 사용자별 분석 */}
              <Card>
                <CardHeader>
                  <CardTitle>사용자별 상세 분석</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {users.slice(0, 6).map((user: User) => (
                        <div 
                          key={user.id} 
                          className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                          onClick={() => fetchUserAnalysis(user)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              <Badge variant="outline" className="mt-1">
                                {user.role === "admin" ? "관리자" : user.role}
                              </Badge>
                            </div>
                            <Button variant="outline" size="sm">
                              분석 보기
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedUserForAnalysis && userAiUsage && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-3">
                          {selectedUserForAnalysis.firstName} {selectedUserForAnalysis.lastName} 분석 결과
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">AI 요청 수</p>
                            <p className="text-lg font-bold">{userAiUsage.totalRequests || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">사용 토큰</p>
                            <p className="text-lg font-bold">{userAiUsage.totalTokens?.toLocaleString() || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">총 사용 시간</p>
                            <p className="text-lg font-bold">{Math.round((userAiUsage.totalDuration || 0) / 60)}분</p>
                          </div>
                        </div>
                        
                        {userAiUsage.featureUsage && Object.keys(userAiUsage.featureUsage).length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-600 mb-2">주로 사용한 기능</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(userAiUsage.featureUsage)
                                .sort(([,a], [,b]) => (b as number) - (a as number))
                                .slice(0, 3)
                                .map(([feature, count]) => (
                                <Badge key={feature} variant="secondary">
                                  {feature}: {count as number}회
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 성공 스토리 관리 탭 */}
          <TabsContent value="success-stories">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    성공 스토리 관리
                  </CardTitle>
                  <Button onClick={handleCreateStory} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    새 후기 등록
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {storiesLoading ? (
                  <div className="text-center py-8">로딩 중...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>국가</TableHead>
                        <TableHead>점수</TableHead>
                        <TableHead>평점</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {successStories.map((story: SuccessStory) => (
                        <TableRow key={story.id}>
                          <TableCell className="font-medium">{story.name}</TableCell>
                          <TableCell>{story.country}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{story.score}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{story.rating}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={story.isActive ? "default" : "secondary"}>
                              {story.isActive ? "활성" : "비활성"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditStory(story)}
                                data-testid={`button-edit-story-${story.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteStoryMutation.mutate(story.id)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-story-${story.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Tests 관리 탭 */}
          <TabsContent value="ai-tests">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI 생성 테스트 관리
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1">
                      총 {aiTests.length}개 테스트
                    </Badge>
                    <Button 
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-tests"] })}
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      새로고침
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {aiTestsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    로딩 중...
                  </div>
                ) : aiTests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    생성된 AI 테스트가 없습니다.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>테스트 제목</TableHead>
                        <TableHead>시험 유형</TableHead>
                        <TableHead>섹션</TableHead>
                        <TableHead>문제 수</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>생성일</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiTests.map((test: AdminAiTest) => (
                        <TableRow key={test.id}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {test.title || test.id}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="uppercase">
                              {test.examType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {test.section}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{test.questionCount || 0}개</span>
                              {test.questionCount === 0 && (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {test.hasTemplateData ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                재생성 필요
                              </Badge>
                            ) : (
                              <Badge variant="default" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                정상
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {test.createdAt ? new Date(test.createdAt).toLocaleDateString('ko-KR') : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const testUrl = `/toefl-${test.section}?testId=${test.id}`;
                                  window.open(testUrl, '_blank');
                                }}
                              >
                                <Search className="h-3 w-3 mr-1" />
                                보기
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const editUrl = `/ai-test-creator?edit=${test.id}&examType=${test.examType}&section=${test.section}`;
                                  window.open(editUrl, '_blank');
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                편집
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`"${test.title || test.id}" 테스트를 삭제하시겠습니까?`)) {
                                    deleteAiTestMutation.mutate(test.id);
                                  }
                                }}
                                disabled={deleteAiTestMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                삭제
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* 템플릿 데이터 경고 */}
                {problematicAiTests.length > 0 && (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-orange-800">재생성이 필요한 테스트가 있습니다</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          일부 테스트에 템플릿 데이터("첫 번째 선택지", "두 번째 선택지")가 포함되어 있습니다.
                          이러한 테스트들은 삭제하고 AI Test Creator에서 다시 생성하는 것을 권장합니다.
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (confirm(`템플릿 데이터가 포함된 ${problematicAiTests.length}개 테스트를 모두 삭제하시겠습니까?`)) {
                                problematicAiTests.forEach((test: AdminAiTest) => {
                                  deleteAiTestMutation.mutate(test.id);
                                });
                              }
                            }}
                            disabled={deleteAiTestMutation.isPending}
                          >
                            문제 테스트 일괄 삭제
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('/ai-test-creator', '_blank')}
                          >
                            AI Test Creator로 이동
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Suspense fallback={null}>
          {storyDialogOpen || programDialogOpen || programAccessDialogOpen ? (
            <DeferredAdminPanelDialogs
              storyDialogOpen={storyDialogOpen}
              setStoryDialogOpen={setStoryDialogOpen}
              editingStory={editingStory}
              setEditingStory={setEditingStory}
              programDialogOpen={programDialogOpen}
              setProgramDialogOpen={setProgramDialogOpen}
              editingProgram={editingProgram}
              setEditingProgram={setEditingProgram}
              programAccessDialogOpen={programAccessDialogOpen}
              setProgramAccessDialogOpen={setProgramAccessDialogOpen}
              selectedUserForProgram={selectedUserForProgram}
              programs={programs}
            />
          ) : null}
        </Suspense>
      </div>
    </div>
  );
}
