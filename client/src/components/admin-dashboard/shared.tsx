import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users, BarChart3, Eye, Plus } from "lucide-react";

export interface TestStats {
  total: number;
  active: number;
  inactive: number;
}

export interface AdminStats {
  reading: TestStats;
  listening: TestStats;
  speaking: TestStats;
  writing: TestStats;
  users: number;
  totalAttempts: number;
}

export interface UserLike {
  id: string;
  username?: string;
  role?: string;
  email?: string;
  createdAt?: string | number | Date;
}

export function TestCard({
  title,
  icon: Icon,
  stats,
  onManage,
  onAdd,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  stats: TestStats;
  onManage: () => void;
  onAdd: () => void;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge variant="outline">{stats.total}개</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-green-600">활성: {stats.active}개</span>
            <span className="text-gray-500">비활성: {stats.inactive}개</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={onAdd} size="sm" className="flex-1">
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
            <Button onClick={onManage} variant="outline" size="sm" className="flex-1">
              관리
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestList({
  tests,
  onEdit,
  onDelete,
  isLoading,
  testType,
}: {
  tests: Array<Record<string, unknown>>;
  onEdit: (test: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  testType: string;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="mt-2 text-gray-600">테스트를 불러오는 중...</p>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">등록된 {testType} 테스트가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tests.map((test) => {
        const id = String(test.id ?? "");
        const title = String(test.title ?? "");
        const type = typeof test.type === "string" ? test.type : undefined;
        const isActive = test.isActive !== false;
        const description = typeof test.description === "string" ? test.description : "";
        const questionText = typeof test.questionText === "string" ? test.questionText : "";
        const preparationTime = test.preparationTime;
        const responseTime = test.responseTime;
        const timeLimit = test.timeLimit;
        const difficulty = typeof test.difficulty === "string" ? test.difficulty : "";

        return (
          <Card key={id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-lg">{title}</span>
                    {type && (
                      <Badge variant={type === "independent" ? "default" : "secondary"}>{type}</Badge>
                    )}
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "활성" : "비활성"}
                    </Badge>
                  </div>
                  {description && <p className="text-gray-700 mb-2">{description}</p>}
                  {questionText && (
                    <p className="text-gray-600 text-sm mb-2">{questionText.substring(0, 100)}...</p>
                  )}
                  <div className="text-sm text-gray-500 space-x-4">
                    {typeof preparationTime === "number" && <span>준비: {preparationTime}초</span>}
                    {typeof responseTime === "number" && <span>응답: {responseTime}초</span>}
                    {typeof timeLimit === "number" && <span>시간: {timeLimit}분</span>}
                    {difficulty && <span>난이도: {difficulty}</span>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button onClick={() => onEdit(test)} variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => onDelete(id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function OverviewStatsCards({ realStats }: { realStats: AdminStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            총 사용자
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{realStats.users}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            총 테스트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {realStats.reading.total +
              realStats.listening.total +
              realStats.speaking.total +
              realStats.writing.total}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            활성 테스트
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {realStats.reading.active +
              realStats.listening.active +
              realStats.speaking.active +
              realStats.writing.active}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
