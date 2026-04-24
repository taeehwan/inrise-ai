import { Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminSettingsMaintenanceTabProps {
  onClearCache: () => Promise<void>;
  onOptimizeDatabase: () => Promise<void>;
}

export default function AdminSettingsMaintenanceTab({
  onClearCache,
  onOptimizeDatabase,
}: AdminSettingsMaintenanceTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card className="rounded-2xl border border-blue-100/50 bg-white/90 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            <span>캐시 관리</span>
          </CardTitle>
          <CardDescription>시스템 캐시를 정리하여 성능을 향상시킵니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onClearCache} className="w-full">
            캐시 정리
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-blue-100/50 bg-white/90 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-green-600" />
            <span>데이터베이스 최적화</span>
          </CardTitle>
          <CardDescription>데이터베이스를 최적화하여 속도를 개선합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onOptimizeDatabase} variant="outline" className="w-full">
            최적화 실행
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
