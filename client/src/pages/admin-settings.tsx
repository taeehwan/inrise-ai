import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings,
  RefreshCw,
  AlertTriangle,
  Home,
} from "lucide-react";
import type { SystemStatus } from "@/components/admin-settings/shared";

const DeferredAdminSettingsStatusTab = lazy(
  () => import("@/components/admin-settings/AdminSettingsStatusTab"),
);
const DeferredAdminSettingsMaintenanceTab = lazy(
  () => import("@/components/admin-settings/AdminSettingsMaintenanceTab"),
);
const DeferredAdminSettingsSecurityTab = lazy(
  () => import("@/components/admin-settings/AdminSettingsSecurityTab"),
);
const DeferredAdminSettingsDataTab = lazy(
  () => import("@/components/admin-settings/AdminSettingsDataTab"),
);

export default function AdminSettings() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === "admin") {
      loadSystemStatus();
    }
  }, [isLoading, isAuthenticated, user]);

  const loadSystemStatus = async () => {
    setLoadingStatus(true);
    try {
      // 시뮬레이션된 시스템 상태 (실제 구현에서는 API 호출)
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSystemStatus({
        database: {
          status: 'online',
          connection: true,
          responseTime: 45
        },
        api: {
          status: 'online',
          uptime: '72h 15m',
          requestCount: 15420
        },
        storage: {
          used: 2.4,
          total: 10,
          percentage: 24
        },
        memory: {
          used: 1.8,
          total: 4,
          percentage: 45
        }
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "시스템 상태를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const refreshSystemStatus = async () => {
    setRefreshing(true);
    await loadSystemStatus();
    setRefreshing(false);
    toast({
      title: "새로고침 완료",
      description: "시스템 상태가 업데이트되었습니다.",
    });
  };

  const clearCache = async () => {
    toast({
      title: "캐시 정리 중",
      description: "시스템 캐시를 정리하고 있습니다...",
    });
    
    // 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "완료",
      description: "시스템 캐시가 성공적으로 정리되었습니다.",
    });
  };

  const optimizeDatabase = async () => {
    toast({
      title: "데이터베이스 최적화 중",
      description: "데이터베이스를 최적화하고 있습니다...",
    });
    
    // 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    toast({
      title: "완료",
      description: "데이터베이스 최적화가 완료되었습니다.",
    });
  };

  const exportData = async () => {
    toast({
      title: "데이터 내보내기",
      description: "시스템 데이터를 내보내고 있습니다...",
    });
    
    // 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "완료",
      description: "데이터 내보내기가 완료되었습니다.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-2">로딩 중...</span>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            관리자 권한이 필요합니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header Navigation */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-blue-200/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                  시스템 설정
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1 tracking-wide">시스템 관리 및 설정</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline"
                onClick={refreshSystemStatus}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 rounded-xl font-medium"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation("/admin")}
                className="flex items-center space-x-2 px-6 py-3 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 rounded-xl font-medium"
              >
                <Home className="h-4 w-4" />
                <span>관리자 패널</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-2">
            <TabsTrigger value="status" className="rounded-xl font-semibold">시스템 상태</TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-xl font-semibold">시스템 관리</TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl font-semibold">보안 설정</TabsTrigger>
            <TabsTrigger value="data" className="rounded-xl font-semibold">데이터 관리</TabsTrigger>
          </TabsList>

          {/* 시스템 상태 탭 */}
          <TabsContent value="status" className="space-y-6">
            <Suspense fallback={null}>
              <DeferredAdminSettingsStatusTab
                loadingStatus={loadingStatus}
                systemStatus={systemStatus}
              />
            </Suspense>
          </TabsContent>

          {/* 시스템 관리 탭 */}
          <TabsContent value="maintenance" className="space-y-6">
            <Suspense fallback={null}>
              <DeferredAdminSettingsMaintenanceTab
                onClearCache={clearCache}
                onOptimizeDatabase={optimizeDatabase}
              />
            </Suspense>
          </TabsContent>

          {/* 보안 설정 탭 */}
          <TabsContent value="security" className="space-y-6">
            <Suspense fallback={null}>
              <DeferredAdminSettingsSecurityTab />
            </Suspense>
          </TabsContent>

          {/* 데이터 관리 탭 */}
          <TabsContent value="data" className="space-y-6">
            <Suspense fallback={null}>
              <DeferredAdminSettingsDataTab onExportData={exportData} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
