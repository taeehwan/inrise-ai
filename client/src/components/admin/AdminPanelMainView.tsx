import { Link } from "wouter";
import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardList,
  FileAudio,
  History,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  Star,
  Trash2,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
  Wand2,
  X,
  Edit,
} from "lucide-react";
import type { AdminMutation, AdminStats, AdminUser, TestAuditLog } from "./shared";

interface AdminPanelMainViewProps {
  users: AdminUser[];
  stats: AdminStats | null;
  loadingUsers: boolean;
  loadingStats: boolean;
  showUserManagement: boolean;
  showAuditHistory: boolean;
  auditLogs: TestAuditLog[];
  loadingAuditLogs: boolean;
  deletedTests: any[];
  creditInputs: Record<string, string>;
  updateRoleMutation: AdminMutation<{ userId: string; role: string }>;
  updateTierMutation: AdminMutation<{ userId: string; tier: string }>;
  deleteUserMutation: AdminMutation<string>;
  grantCreditMutation: AdminMutation<{ userId: string; amount: number }>;
  onNavigate: (path: string) => void;
  onToggleUserManagement: () => void;
  onToggleAuditHistory: () => void;
  onRefreshAuditHistory: () => void;
  onRestoreTest: (testId: string) => void;
  setCreditInputs: Dispatch<SetStateAction<Record<string, string>>>;
}

export default function AdminPanelMainView({
  users,
  stats,
  loadingUsers,
  loadingStats,
  showUserManagement,
  showAuditHistory,
  auditLogs,
  loadingAuditLogs,
  deletedTests,
  creditInputs,
  updateRoleMutation,
  updateTierMutation,
  deleteUserMutation,
  grantCreditMutation,
  onNavigate,
  onToggleUserManagement,
  onToggleAuditHistory,
  onRefreshAuditHistory,
  onRestoreTest,
  setCreditInputs,
}: AdminPanelMainViewProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <nav className="sticky top-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 font-medium">
                <ArrowLeft className="mr-2 h-4 w-4" />
                홈으로
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Badge className="bg-white/10 text-white border border-white/10 px-4 py-1.5 font-medium">
                <Shield className="w-3.5 h-3.5 mr-2" />
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-emerald-500 text-sm font-medium tracking-wide uppercase">System Active</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">관리자 패널</h1>
          <p className="text-zinc-500">시스템 통계 및 사용자 관리</p>
        </div>

        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">빠른 작업</h2>
            <div className="h-px flex-1 bg-white/10 ml-4"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <button
              onClick={() => onNavigate("/admin/full-test-creator")}
              className="group relative h-28 bg-[#141419] hover:bg-[#1a1a22] border border-white/5 hover:border-indigo-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300"
            >
              <div className="w-10 h-10 bg-indigo-500/10 group-hover:bg-indigo-500/20 rounded-lg flex items-center justify-center transition-all">
                <Plus className="h-5 w-5 text-indigo-400" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white">테스트 관리</span>
            </button>

            <Dialog>
              <DialogTrigger asChild>
                <button className="group relative h-28 bg-[#141419] hover:bg-[#1a1a22] border border-white/5 hover:border-purple-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300">
                  <div className="w-10 h-10 bg-purple-500/10 group-hover:bg-purple-500/20 rounded-lg flex items-center justify-center transition-all">
                    <Wand2 className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white">문제 생성</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-[#141419] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-white">문제 생성</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  <Button
                    onClick={() => onNavigate("/ai-test-creator")}
                    className="h-14 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between px-4 rounded-lg text-white"
                  >
                    <div className="flex items-center gap-3">
                      <Wand2 className="h-5 w-5 text-purple-400" />
                      <span>테스트 생성</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </Button>
                  <Button
                    onClick={() => onNavigate("/admin/speaking-topics")}
                    className="h-14 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between px-4 rounded-lg text-white"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-emerald-400" />
                      <span>TOPIC 문제 생성</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {[
              { path: "/admin/analytics", icon: BarChart3, label: "통계 관리", color: "orange" },
              { path: "/admin/achievements", icon: Trophy, label: "성적향상 후기", color: "amber" },
              { path: "/admin/settings", icon: Settings, label: "시스템 설정", color: "zinc" },
              { path: "/admin/reviews", icon: MessageSquare, label: "후기 관리", color: "rose" },
              { path: "/admin/audio-files", icon: FileAudio, label: "음성 파일", color: "teal" },
              { path: "/admin/student-results", icon: ClipboardList, label: "학생 제출물", color: "emerald" },
            ].map((item) => {
              const Icon = item.icon;
              const colorClasses: Record<string, string> = {
                orange: "hover:border-orange-500/30 bg-orange-500/10 group-hover:bg-orange-500/20 text-orange-400",
                amber: "hover:border-amber-500/30 bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-400",
                zinc: "hover:border-zinc-500/30 bg-zinc-500/10 group-hover:bg-zinc-500/20 text-zinc-400",
                rose: "hover:border-rose-500/30 bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-400",
                teal: "hover:border-teal-500/30 bg-teal-500/10 group-hover:bg-teal-500/20 text-teal-400",
                emerald: "hover:border-emerald-500/30 bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400",
              };
              const [hoverBorder, bg, text] = colorClasses[item.color].split(" ");
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`group relative h-28 bg-[#141419] hover:bg-[#1a1a22] border border-white/5 ${hoverBorder} rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300`}
                >
                  <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center transition-all`}>
                    <Icon className={`h-5 w-5 ${text}`} />
                  </div>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={onToggleUserManagement}
              className={`group relative h-28 ${showUserManagement ? "bg-blue-500/10 border-blue-500/30" : "bg-[#141419] border-white/5"} hover:bg-blue-500/10 border hover:border-blue-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300`}
            >
              <div className={`w-10 h-10 ${showUserManagement ? "bg-blue-500/30" : "bg-blue-500/10"} group-hover:bg-blue-500/20 rounded-lg flex items-center justify-center transition-all`}>
                <UserCog className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white">사용자 관리</span>
              {showUserManagement && <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>}
            </button>

            <button
              onClick={onToggleAuditHistory}
              className={`group relative h-28 ${showAuditHistory ? "bg-cyan-500/10 border-cyan-500/30" : "bg-[#141419] border-white/5"} hover:bg-cyan-500/10 border hover:border-cyan-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-300`}
            >
              <div className={`w-10 h-10 ${showAuditHistory ? "bg-cyan-500/30" : "bg-cyan-500/10"} group-hover:bg-cyan-500/20 rounded-lg flex items-center justify-center transition-all`}>
                <History className="h-5 w-5 text-cyan-400" />
              </div>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white">관리 히스토리</span>
              {showAuditHistory && <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full"></div>}
            </button>
          </div>
        </div>

        {showAuditHistory && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-cyan-400" />
                테스트 관리 히스토리
              </h2>
              <button
                onClick={onRefreshAuditHistory}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loadingAuditLogs ? "animate-spin" : ""}`} />
                새로고침
              </button>
            </div>

            {deletedTests.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-400" />
                  삭제된 테스트 ({deletedTests.length}개) - 복구 가능
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deletedTests.slice(0, 6).map((test: any) => (
                    <div
                      key={test.id}
                      className="bg-[#141419] border border-red-500/20 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{test.title}</p>
                        <p className="text-xs text-zinc-500">
                          {test.examType} · {test.section || test.type}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestoreTest(test.id)}
                        className="ml-3 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        복구
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#141419] border border-white/5 rounded-xl p-5">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">최근 관리 활동</h3>
              {loadingAuditLogs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>아직 기록된 활동이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => {
                    const actionConfig: Record<string, { icon: any; color: string; label: string }> = {
                      create: { icon: Plus, color: "text-emerald-400 bg-emerald-500/10", label: "생성" },
                      update: { icon: Edit, color: "text-blue-400 bg-blue-500/10", label: "수정" },
                      delete: { icon: Trash2, color: "text-red-400 bg-red-500/10", label: "삭제" },
                      approve: { icon: Check, color: "text-green-400 bg-green-500/10", label: "승인" },
                      reject: { icon: X, color: "text-orange-400 bg-orange-500/10", label: "거부" },
                      restore: { icon: RotateCcw, color: "text-cyan-400 bg-cyan-500/10", label: "복구" },
                    };
                    const config = actionConfig[log.action] || actionConfig.update;
                    const IconComponent = config.icon;

                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-4 p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-lg transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">
                            <span className="font-medium">{log.testTitle}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {config.label}
                            </Badge>
                          </p>
                          <p className="text-xs text-zinc-500">
                            {log.adminEmail} · {log.examType} · {log.section || log.testType}
                          </p>
                        </div>
                        <div className="text-xs text-zinc-500 text-right">
                          {new Date(log.createdAt).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">통계 현황</h2>
            <div className="h-px flex-1 bg-white/10 ml-4"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "총 사용자",
                icon: Users,
                value: stats?.users?.total || 0,
                subtitle: `활성 ${stats?.users?.active || 0} · 관리자 ${stats?.users?.admins || 0}`,
                color: "blue",
              },
              {
                title: "등록 테스트",
                icon: BarChart3,
                value: stats?.tests?.total || 0,
                subtitle: `TOEFL ${stats?.tests?.toefl || 0} · GRE ${stats?.tests?.gre || 0}`,
                color: "purple",
              },
              {
                title: "테스트 시도",
                icon: TrendingUp,
                value: stats?.attempts?.total || 0,
                subtitle: `이번 주 ${stats?.attempts?.thisWeek || 0} · 완료 ${stats?.attempts?.completed || 0}`,
                color: "emerald",
              },
              {
                title: "리뷰 평점",
                icon: Star,
                value: `${(stats?.reviews?.averageRating || 0).toFixed(1)}★`,
                subtitle: `총 ${stats?.reviews?.total || 0}개 리뷰`,
                color: "amber",
              },
            ].map((item) => {
              const Icon = item.icon;
              const colorMap: Record<string, string> = {
                blue: "bg-blue-500/10 text-blue-400 hover:border-blue-500/20",
                purple: "bg-purple-500/10 text-purple-400 hover:border-purple-500/20",
                emerald: "bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/20",
                amber: "bg-amber-500/10 text-amber-400 hover:border-amber-500/20",
              };
              const [bg, text, hover] = colorMap[item.color].split(" ");
              return (
                <div key={item.title} className={`bg-[#141419] border border-white/5 rounded-xl p-5 ${hover} transition-all`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-zinc-500 text-sm font-medium">{item.title}</span>
                    <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${text}`} />
                    </div>
                  </div>
                  {loadingStats ? (
                    <div className="h-8 bg-white/5 rounded animate-pulse"></div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-white mb-1">{item.value}</div>
                      <p className="text-xs text-zinc-500">{item.subtitle}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {showUserManagement && (
          <div className="bg-[#141419] border border-white/5 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">사용자 관리</h3>
                  <p className="text-sm text-zinc-500">가입일순 (최신 → 과거)</p>
                </div>
              </div>
              <Badge className="bg-white/5 text-zinc-400 border border-white/10">{users.length}명</Badge>
            </div>
            <div className="p-4">
              {loadingUsers ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-zinc-500 text-sm">로딩 중...</p>
                </div>
              ) : users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user, index) => (
                    <div key={user.id} className="group flex items-center justify-between p-4 bg-[#0a0a0f] border border-white/5 rounded-lg hover:border-white/10 transition-all">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-white truncate">
                              {user.username || user.firstName || user.email.split("@")[0]}
                            </h4>
                            {user.role === "admin" && (
                              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full font-medium">Admin</span>
                            )}
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                user.membershipTier === "master"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : user.membershipTier === "max"
                                    ? "bg-purple-500/10 text-purple-400"
                                    : user.membershipTier === "pro"
                                      ? "bg-blue-500/10 text-blue-400"
                                      : user.membershipTier === "light"
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "bg-zinc-500/10 text-zinc-400"
                              }`}
                            >
                              {user.membershipTier?.toUpperCase() || "GUEST"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-zinc-500 truncate">{user.email}</span>
                            <span className="text-xs text-zinc-600">
                              {new Date(user.createdAt).toLocaleDateString("ko-KR")} 가입
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={user.membershipTier || "guest"}
                          onValueChange={(tier) => updateTierMutation.mutate({ userId: user.id, tier })}
                          disabled={updateTierMutation.isPending}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs font-medium border border-white/10 bg-transparent text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#141419] border-white/10 text-white">
                            <SelectItem value="guest">GUEST</SelectItem>
                            <SelectItem value="light">LIGHT</SelectItem>
                            <SelectItem value="pro">PRO</SelectItem>
                            <SelectItem value="max">MAX</SelectItem>
                            <SelectItem value="master">MASTER</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                          <span className="text-xs text-emerald-400/80 font-mono min-w-[28px] text-right">
                            💰{(user as any).credits?.balance ?? 0}
                          </span>
                          <input
                            type="number"
                            min="1"
                            placeholder="10"
                            value={creditInputs[user.id] ?? ""}
                            onChange={(e) => setCreditInputs((prev) => ({ ...prev, [user.id]: e.target.value }))}
                            className="w-14 h-8 text-xs text-center bg-white/5 border border-white/10 rounded text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() => {
                              const amount = Number(creditInputs[user.id] || 10);
                              if (amount > 0) grantCreditMutation.mutate({ userId: user.id, amount });
                            }}
                            disabled={grantCreditMutation.isPending}
                          >
                            지급
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 px-3 text-xs ${user.role === "admin" ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"}`}
                          onClick={() =>
                            updateRoleMutation.mutate({
                              userId: user.id,
                              role: user.role === "admin" ? "user" : "admin",
                            })
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          {user.role === "admin" ? "해제" : "승격"}
                        </Button>

                        {user.role !== "admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => {
                              if (confirm(`${user.email} 회원을 삭제하시겠습니까?`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Users className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">등록된 사용자가 없습니다</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
