import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminSettingsDataTabProps {
  onExportData: () => Promise<void>;
}

export default function AdminSettingsDataTab({ onExportData }: AdminSettingsDataTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card className="rounded-2xl border border-blue-100/50 bg-white/90 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>데이터 내보내기</span>
          </CardTitle>
          <CardDescription>시스템 데이터를 안전하게 백업합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onExportData} className="w-full">
            데이터 내보내기
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-red-100/50 bg-white/90 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            <span>데이터 정리</span>
          </CardTitle>
          <CardDescription>불필요한 데이터를 안전하게 정리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="w-full">
            정리 실행
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
