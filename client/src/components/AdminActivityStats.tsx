import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, BarChart2, Users, TrendingUp } from "lucide-react";

interface ActivityStats {
  totalActivities: number;
  totalDuration: number;
  activityTypes: Record<string, number>;
  userActivities: Record<string, number>;
  dailyActivities: Record<string, number>;
  averageDurationPerActivity: number;
}

export default function AdminActivityStats() {
  const { data: stats, isLoading } = useQuery<ActivityStats>({
    queryKey: ["/api/admin/activity-stats"],
    refetchInterval: 60000, // 1분마다 새로고침
  });

  if (isLoading || !stats) {
    return (
      <Card data-testid="card-activity-stats-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            사용자 활동 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-500 mt-2">로딩 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 가장 인기 있는 활동 타입 (상위 5개)
  const topActivities = Object.entries(stats.activityTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 가장 활동적인 사용자 (상위 5명)
  const topUsers = Object.entries(stats.userActivities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 최근 7일 활동 데이터
  const recentDays = Object.entries(stats.dailyActivities)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7);

  // 활동 타입 한글 변환
  const activityTypeLabels: Record<string, string> = {
    'page_view': '페이지 방문',
    'test_started': '테스트 시작',
    'test_completed': '테스트 완료',
    'ai_used': 'AI 기능 사용',
    'video_watched': '동영상 시청',
    'speaking_practice': '스피킹 연습',
    'writing_practice': '라이팅 연습'
  };

  const getActivityLabel = (type: string) => {
    return activityTypeLabels[type] || type;
  };

  // 총 사용 시간을 시간:분 형식으로 변환
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  return (
    <div className="space-y-6">
      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-activities">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">총 활동 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-blue-600" data-testid="text-total-activities">
                {stats.totalActivities.toLocaleString()}
              </span>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-duration">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">총 사용 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600" data-testid="text-total-duration">
                {formatDuration(stats.totalDuration)}
              </span>
              <Clock className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-users">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">활동 사용자 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-purple-600" data-testid="text-active-users">
                {Object.keys(stats.userActivities).length}
              </span>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-duration">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">평균 활동 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-orange-600" data-testid="text-avg-duration">
                {Math.round(stats.averageDurationPerActivity / 60)}분
              </span>
              <TrendingUp className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 인기 활동 타입 */}
        <Card data-testid="card-top-activities">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              인기 활동
            </CardTitle>
            <CardDescription>가장 많이 사용되는 기능</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topActivities.map(([type, count], index) => (
                <div 
                  key={type} 
                  className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
                  data-testid={`activity-type-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-medium text-gray-900">{getActivityLabel(type)}</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600" data-testid={`activity-count-${index}`}>
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
              {topActivities.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  활동 데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 최근 7일 활동 추이 */}
        <Card data-testid="card-recent-activity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              최근 활동 추이
            </CardTitle>
            <CardDescription>지난 7일간 일별 활동 수</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDays.map(([date, count], index) => {
                const maxCount = Math.max(...recentDays.map(([, c]) => c));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                
                return (
                  <div key={date} className="space-y-2" data-testid={`daily-activity-${index}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                      <span className="font-semibold text-gray-900" data-testid={`daily-count-${index}`}>
                        {count.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {recentDays.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  활동 데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
