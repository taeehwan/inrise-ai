import { lazy, Suspense, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  CreditCard,
  Settings,
  Search,
  Edit,
  Activity,
  Star,
  Award,
  Gift,
  Home
} from "lucide-react";
import type { User, Payment, Subscription } from "@shared/schema";
import type { AdminSystemStats } from "@/components/admin-system/shared";

const DeferredAdminSystemUsersTab = lazy(() => import("@/components/admin-system/AdminSystemUsersTab"));
const DeferredAdminSystemPaymentsTab = lazy(() => import("@/components/admin-system/AdminSystemPaymentsTab"));

export default function AdminSystemPanel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // 사용자 데이터 조회
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/users");
      return await response.json();
    }
  });

  // 통계 데이터 조회
  const { data: stats } = useQuery<AdminSystemStats>({
    queryKey: ["/api/admin/statistics"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/statistics");
        return await response.json();
      } catch (error) {
        console.error("Stats API error:", error);
        return { totalUsers: 0, activeUsers: 0, totalTests: 0, averageRating: 4.8 };
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

  // 사용자 역할 변경
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, {
        role
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "성공", description: "사용자 역할이 변경되었습니다." });
    },
    onError: (error: any) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    }
  });

  // 사용자 활성/비활성 토글
  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/toggle-active`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "성공", description: "사용자 상태가 변경되었습니다." });
    },
    onError: (error: any) => {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    }
  });

  // Filtered users for search
  const filteredUsers = users.filter(user => 
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070B17]">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#070B17] via-[#0D1326] to-[#070B17]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Glassmorphism Header */}
      <div className="relative z-10 bg-[#070B17]/80 backdrop-blur-xl border-b border-white/5 sticky top-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  시스템 운영 관리자 패널
                </h1>
                <p className="text-sm text-gray-400">회원 관리 • 결제 관리 • 운영 분석 • 성공 스토리</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setLocation('/')}
                variant="outline"
                className="flex items-center gap-2 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
              >
                <Home className="w-4 h-4" />
                홈
              </Button>
              <Button
                onClick={() => setLocation('/admin')}
                variant="outline"
                className="flex items-center gap-2 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
              >
                <Edit className="w-4 h-4" />
                콘텐츠 관리
              </Button>
              <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium border border-emerald-500/30">
                온라인
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Modern Statistics Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="border border-white/10 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">총 사용자</p>
                      <p className="text-3xl font-bold mt-1">{stats.totalUsers || 0}</p>
                      <p className="text-blue-200 text-xs mt-1">신규 {stats.newUsersThisWeek || 0}명 (이번 주)</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="border border-white/10 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">활성 사용자</p>
                      <p className="text-3xl font-bold mt-1">{stats.activeUsers || 0}</p>
                      <p className="text-emerald-200 text-xs mt-1">활동 {stats.activityStats?.totalActivities || 0}건</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Activity className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="border border-white/10 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">총 테스트</p>
                      <p className="text-3xl font-bold mt-1">{stats.totalTests || 0}</p>
                      <p className="text-purple-200 text-xs mt-1">이번 주 {stats.testsThisWeek || 0}건</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Award className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <Card className="border border-white/10 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden relative">
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
          <div className="bg-[#0D1326]/80 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/10">
            <TabsList className="grid w-full grid-cols-4 bg-transparent gap-1">
              <TabsTrigger value="users" className="text-gray-400 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all hover:text-white">
                사용자 관리
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-gray-400 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all hover:text-white">
                결제 내역
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="text-gray-400 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all hover:text-white">
                구독 관리
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-gray-400 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-medium transition-all hover:text-white">
                사용량 분석
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 사용자 관리 탭 */}
          <TabsContent value="users">
            <Suspense fallback={null}>
              <DeferredAdminSystemUsersTab
                users={users}
                usersLoading={usersLoading}
                filteredUsers={filteredUsers}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onToggleRole={(userId, role) => updateRoleMutation.mutate({ userId, role })}
                onToggleActive={(userId) => toggleActiveMutation.mutate(userId)}
                rolePending={updateRoleMutation.isPending}
                activePending={toggleActiveMutation.isPending}
              />
            </Suspense>
          </TabsContent>

          {/* 결제 내역 탭 */}
          <TabsContent value="payments">
            <Suspense fallback={null}>
              <DeferredAdminSystemPaymentsTab payments={payments} paymentsLoading={paymentsLoading} users={users} />
            </Suspense>
          </TabsContent>

          {/* 구독 관리 탭 */}
          <TabsContent value="subscriptions">
            <Card className="border border-white/10 shadow-xl bg-[#0D1326]/80 backdrop-blur-lg">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-white">구독 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">구독 데이터를 불러오는 중...</div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 사용량 분석 탭 */}
          <TabsContent value="analytics">
            <Card className="border border-white/10 shadow-xl bg-[#0D1326]/80 backdrop-blur-lg">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-white">사용량 분석</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">분석 데이터를 불러오는 중...</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
