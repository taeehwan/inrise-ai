import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSettingsSecurityTab() {
  return (
    <Card className="rounded-2xl border border-blue-100/50 bg-white/90 shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-red-600" />
          <span>보안 설정</span>
        </CardTitle>
        <CardDescription>시스템 보안 관련 설정을 관리합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-green-50 p-4">
          <div>
            <p className="font-medium text-green-900">SSL 인증서</p>
            <p className="text-sm text-green-700">활성화됨 - 만료일: 2025-12-31</p>
          </div>
          <Badge variant="default" className="bg-green-600">
            활성
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-blue-50 p-4">
          <div>
            <p className="font-medium text-blue-900">방화벽 상태</p>
            <p className="text-sm text-blue-700">모든 포트 보호됨</p>
          </div>
          <Badge variant="default" className="bg-blue-600">
            정상
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-purple-50 p-4">
          <div>
            <p className="font-medium text-purple-900">API 키 보안</p>
            <p className="text-sm text-purple-700">암호화된 저장소 사용</p>
          </div>
          <Badge variant="default" className="bg-purple-600">
            보안
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
