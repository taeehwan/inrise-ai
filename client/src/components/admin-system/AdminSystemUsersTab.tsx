import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";
import type { User } from "@shared/schema";
import type { AdminSystemUserTabProps } from "@/components/admin-system/shared";

export default function AdminSystemUsersTab({
  users,
  usersLoading,
  filteredUsers,
  searchTerm,
  setSearchTerm,
  onToggleRole,
  onToggleActive,
  rolePending,
  activePending,
}: AdminSystemUserTabProps) {
  return (
    <Card className="border border-white/10 shadow-xl bg-[#0D1326]/80 backdrop-blur-lg">
      <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/5 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">사용자 관리</h3>
              <p className="text-sm text-gray-400 font-normal">총 {users.length}명의 사용자</p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
              <Input
                placeholder="사용자 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80 bg-[#070B17]/50 border-white/10 text-white placeholder:text-gray-500 focus:bg-[#070B17]/80 focus:border-blue-500/50 transition-colors"
                data-testid="input-user-search"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/30">
                활성: {users.filter((u) => u.isActive).length}
              </div>
              <div className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium border border-purple-500/30">
                관리자: {users.filter((u) => u.role === "admin").length}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {usersLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">사용자 데이터를 불러오는 중...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredUsers.map((user: User, index) => (
              <div
                key={user.id}
                className={`p-6 hover:bg-white/5 transition-colors ${index % 2 === 0 ? "bg-[#070B17]/30" : "bg-[#0D1326]/30"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                          user.role === "admin" ? "bg-gradient-to-br from-purple-500 to-purple-600" : "bg-gradient-to-br from-blue-500 to-blue-600"
                        }`}
                      >
                        {(user.firstName?.charAt(0) || user.username?.charAt(0) || user.email.charAt(0)).toUpperCase()}
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0D1326] ${
                          user.isActive ? "bg-emerald-500" : "bg-gray-500"
                        }`}
                      ></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white text-lg">
                          {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || user.email}
                        </h4>
                        <Badge
                          variant={user.role === "admin" ? "default" : "outline"}
                          className={
                            user.role === "admin"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                              : "bg-white/5 text-gray-300 border-white/10"
                          }
                        >
                          {user.role === "admin" ? "👑 관리자" : "👤 사용자"}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>📅 가입일: {new Date(user.createdAt).toLocaleDateString()}</span>
                        {user.country && <span>🌍 {user.country}</span>}
                        {user.targetExam && <span>📚 목표: {user.targetExam.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={user.role === "admin" ? "destructive" : "default"}
                      size="sm"
                      onClick={() => onToggleRole(user.id, user.role === "admin" ? "guest" : "admin")}
                      disabled={rolePending}
                      className={
                        user.role === "admin"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      }
                      data-testid={`button-toggle-role-${user.id}`}
                    >
                      {user.role === "admin" ? "👑 Admin 해제" : "👑 Admin 승격"}
                    </Button>

                    {user.role !== "admin" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleActive(user.id)}
                        disabled={activePending}
                        className={
                          user.isActive
                            ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        }
                        data-testid={`button-toggle-active-${user.id}`}
                      >
                        {user.isActive ? "🚫 비활성화" : "✅ 활성화"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

