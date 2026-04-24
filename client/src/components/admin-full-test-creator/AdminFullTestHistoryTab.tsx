import { Activity, Calendar, CheckCircle, FileText, History, Pencil, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TestAuditLog } from "./shared";

interface Props {
  auditLogs: TestAuditLog[];
  isLoadingAuditLogs: boolean;
  onRefresh: () => void;
}

export default function AdminFullTestHistoryTab({ auditLogs, isLoadingAuditLogs, onRefresh }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">테스트 관리 활동 내역</h3>
              <p className="text-sm text-gray-400">생성, 수정, 삭제, 복원 등 모든 관리 활동이 기록됩니다</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} className="bg-white/10 border-white/10 text-gray-300 hover:bg-white/20">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAuditLogs ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>

        {isLoadingAuditLogs ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">아직 기록된 활동이 없습니다</p>
            <p className="text-sm text-gray-500 mt-1">테스트를 생성, 수정, 삭제하면 여기에 기록됩니다</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {auditLogs.map((log) => {
              const actionColors: Record<string, { bg: string; text: string; icon: typeof Plus }> = {
                create: { bg: "bg-green-500/20", text: "text-green-400", icon: Plus },
                update: { bg: "bg-blue-500/20", text: "text-blue-400", icon: Pencil },
                delete: { bg: "bg-red-500/20", text: "text-red-400", icon: Trash2 },
                restore: { bg: "bg-amber-500/20", text: "text-amber-400", icon: RotateCcw },
                approve: { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: CheckCircle },
                reject: { bg: "bg-orange-500/20", text: "text-orange-400", icon: X },
              };
              const actionLabels: Record<string, string> = {
                create: "생성",
                update: "수정",
                delete: "삭제",
                restore: "복원",
                approve: "승인",
                reject: "거부",
              };
              const config = actionColors[log.action] || { bg: "bg-gray-500/20", text: "text-gray-400", icon: FileText };
              const ActionIcon = config.icon;
              const formattedDate = new Date(log.createdAt).toLocaleString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={log.id} className="p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <ActionIcon className={`h-4 w-4 ${config.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-white">{log.testTitle}</span>
                          <Badge className={`${config.bg} ${config.text} border-0 text-xs`}>{actionLabels[log.action] || log.action}</Badge>
                          {log.examType && <Badge className="bg-white/10 text-gray-300 border-0 text-xs">{log.examType.toUpperCase()}</Badge>}
                          {log.section && <Badge className="bg-white/5 text-gray-400 border-0 text-xs">{log.section}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>{log.adminEmail}</span>
                          <span className="mx-1">•</span>
                          <Calendar className="h-3 w-3" />
                          <span>{formattedDate}</span>
                        </div>
                        {log.reason && <p className="mt-2 text-sm text-gray-400 bg-white/5 rounded-lg p-2">💬 {log.reason}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
