import { lazy, Suspense, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Headphones, 
  Mic, 
  PenTool, 
  Users, 
  BarChart3,
  Plus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TestList, type AdminStats } from "@/components/admin-dashboard/shared";

const DeferredOverviewTab = lazy(() => import("@/components/admin-dashboard/AdminDashboardOverviewTab"));
const DeferredUsersTab = lazy(() => import("@/components/admin-dashboard/AdminDashboardUsersTab"));

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    retry: false,
  });

  // Fetch all tests data
  const { data: readingTests = [], isLoading: readingLoading } = useQuery({
    queryKey: ['/api/admin/reading-tests'],
    retry: false,
  });

  const { data: listeningTests = [], isLoading: listeningLoading } = useQuery({
    queryKey: ['/api/admin/listening-tests'],
    retry: false,
  });

  const { data: speakingTests = [], isLoading: speakingLoading } = useQuery({
    queryKey: ['/api/admin/speaking-topics'],
    retry: false,
  });

  const { data: writingTests = [], isLoading: writingLoading } = useQuery({
    queryKey: ['/api/admin/writing-tests'],
    retry: false,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    retry: false,
  });

  // Calculate real stats from data
  const realStats: AdminStats = {
    reading: {
      total: (readingTests as any[]).length,
      active: (readingTests as any[]).filter((t: any) => t.isActive !== false).length,
      inactive: (readingTests as any[]).filter((t: any) => t.isActive === false).length,
    },
    listening: {
      total: (listeningTests as any[]).length,
      active: (listeningTests as any[]).filter((t: any) => t.isActive !== false).length,
      inactive: (listeningTests as any[]).filter((t: any) => t.isActive === false).length,
    },
    speaking: {
      total: (speakingTests as any[]).length,
      active: (speakingTests as any[]).filter((t: any) => t.isActive !== false).length,
      inactive: (speakingTests as any[]).filter((t: any) => t.isActive === false).length,
    },
    writing: {
      total: (writingTests as any[]).length,
      active: (writingTests as any[]).filter((t: any) => t.isActive !== false).length,
      inactive: (writingTests as any[]).filter((t: any) => t.isActive === false).length,
    },
    users: (users as any[]).length,
    totalAttempts: 0 // Will be calculated from actual attempts data
  };

  // Delete mutations for each test type
  const deleteReadingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/reading-tests/${id}`),
    onSuccess: () => {
      toast({ title: "성공", description: "Reading 테스트가 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reading-tests'] });
    },
    onError: () => {
      toast({ title: "오류", description: "삭제에 실패했습니다.", variant: "destructive" });
    }
  });

  const deleteSpeakingMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/speaking-topics/${id}`),
    onSuccess: () => {
      toast({ title: "성공", description: "Speaking 토픽이 삭제되었습니다." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/speaking-topics'] });
    },
    onError: () => {
      toast({ title: "오류", description: "삭제에 실패했습니다.", variant: "destructive" });
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">TOEFL 관리자 대시보드</h1>
        <p className="text-gray-600">모든 TOEFL 테스트 유형을 한 곳에서 관리하세요</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            개요
          </TabsTrigger>
          <TabsTrigger value="reading">
            <BookOpen className="h-4 w-4 mr-2" />
            Reading
          </TabsTrigger>
          <TabsTrigger value="listening">
            <Headphones className="h-4 w-4 mr-2" />
            Listening
          </TabsTrigger>
          <TabsTrigger value="speaking">
            <Mic className="h-4 w-4 mr-2" />
            Speaking
          </TabsTrigger>
          <TabsTrigger value="writing">
            <PenTool className="h-4 w-4 mr-2" />
            Writing
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            사용자
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Suspense fallback={<div className="text-sm text-muted-foreground">개요를 불러오는 중...</div>}>
            <DeferredOverviewTab realStats={realStats} onSelectTab={setActiveTab} />
          </Suspense>
        </TabsContent>

        <TabsContent value="reading" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Reading Tests 관리</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 Reading 테스트 추가
            </Button>
          </div>
          <TestList
            tests={readingTests as any[]}
            onEdit={(test) => console.log('Edit reading test:', test)}
            onDelete={(id) => deleteReadingMutation.mutate(id)}
            isLoading={readingLoading}
            testType="Reading"
          />
        </TabsContent>

        <TabsContent value="listening" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Listening Tests 관리</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 Listening 테스트 추가
            </Button>
          </div>
          <TestList
            tests={listeningTests as any[]}
            onEdit={(test) => console.log('Edit listening test:', test)}
            onDelete={(id) => console.log('Delete listening test:', id)}
            isLoading={listeningLoading}
            testType="Listening"
          />
        </TabsContent>

        <TabsContent value="speaking" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Speaking Tests 관리</h2>
            <Button onClick={() => setLocation('/admin/speaking-topics')}>
              <Plus className="h-4 w-4 mr-2" />
              새 Speaking 토픽 추가
            </Button>
          </div>
          <TestList
            tests={speakingTests as any[]}
            onEdit={() => setLocation('/admin/speaking-topics')}
            onDelete={(id) => deleteSpeakingMutation.mutate(id)}
            isLoading={speakingLoading}
            testType="Speaking"
          />
        </TabsContent>

        <TabsContent value="writing" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Writing Tests 관리</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새 Writing 테스트 추가
            </Button>
          </div>
          <TestList
            tests={writingTests as any[]}
            onEdit={(test) => console.log('Edit writing test:', test)}
            onDelete={(id) => console.log('Delete writing test:', id)}
            isLoading={writingLoading}
            testType="Writing"
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Suspense fallback={<div className="text-sm text-muted-foreground">사용자 목록을 불러오는 중...</div>}>
            <DeferredUsersTab users={users as any[]} isLoading={usersLoading} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
