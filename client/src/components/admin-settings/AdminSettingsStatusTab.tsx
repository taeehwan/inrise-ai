import { Activity, CheckCircle, Database, HardDrive, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemStatus } from "./shared";

interface AdminSettingsStatusTabProps {
  loadingStatus: boolean;
  systemStatus: SystemStatus | null;
}

export default function AdminSettingsStatusTab({
  loadingStatus,
  systemStatus,
}: AdminSettingsStatusTabProps) {
  if (loadingStatus) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-2xl">
            <CardContent className="p-6">
              <div className="h-20 animate-pulse rounded bg-gray-200" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!systemStatus) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="rounded-2xl border-blue-200 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200/70 shadow-lg transition-all duration-300 hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-blue-900">데이터베이스</CardTitle>
          <div className="rounded-xl bg-blue-600 p-2">
            <Database className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-blue-900">온라인</span>
          </div>
          <p className="text-xs text-blue-700">응답시간: {systemStatus.database.responseTime}ms</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-green-200 bg-gradient-to-br from-green-50 via-green-100 to-green-200/70 shadow-lg transition-all duration-300 hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-green-900">API 서버</CardTitle>
          <div className="rounded-xl bg-green-600 p-2">
            <Server className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">정상</span>
          </div>
          <p className="text-xs text-green-700">가동시간: {systemStatus.api.uptime}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-purple-200 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200/70 shadow-lg transition-all duration-300 hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-purple-900">스토리지</CardTitle>
          <div className="rounded-xl bg-purple-600 p-2">
            <HardDrive className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-1 text-2xl font-bold text-purple-900">{systemStatus.storage.percentage}%</div>
          <p className="text-xs text-purple-700">
            {systemStatus.storage.used}GB / {systemStatus.storage.total}GB 사용
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200/70 shadow-lg transition-all duration-300 hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-amber-900">메모리</CardTitle>
          <div className="rounded-xl bg-amber-600 p-2">
            <Activity className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-1 text-2xl font-bold text-amber-900">{systemStatus.memory.percentage}%</div>
          <p className="text-xs text-amber-700">
            {systemStatus.memory.used}GB / {systemStatus.memory.total}GB 사용
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
