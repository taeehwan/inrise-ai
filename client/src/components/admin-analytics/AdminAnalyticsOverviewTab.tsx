import { useQuery } from "@tanstack/react-query";
import { Activity, Eye, GraduationCap, Users } from "lucide-react";
import {
  C,
  ChartCard,
  KpiCard,
  SECTION_COLORS,
  SimpleHorizontalBars,
  SimpleTrendChart,
  shortDate,
  type AnalyticsStats,
  type PeriodKey,
} from "./shared";

export default function AdminAnalyticsOverviewTab({
  stats,
  period,
}: {
  stats: AnalyticsStats | undefined;
  period: PeriodKey;
}) {
  const { data: eventTrend } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/events/trend", 30],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics/events/trend?days=30");
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60000,
  });

  const { data: eventSummary } = useQuery<any>({
    queryKey: ["/api/admin/analytics/events/summary"],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics/events/summary?days=30");
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 60000,
  });

  const periodStats = stats?.[period];
  const activityData = (stats?.userActivity || []).map((day) => ({
    date: shortDate(day.date),
    방문자: day.visitors,
    고유방문자: day.uniqueVisitors,
    테스트: day.testsCompleted,
  }));

  const eventTrendData = (eventTrend || []).slice(-14).map((day) => ({
    date: shortDate(day.date),
    세션: day.session_start,
    페이지뷰: day.page_view,
    가입: day.signup,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard icon={Eye} label="방문자" value={(periodStats?.visitors || 0).toLocaleString()} color={C.cyan} />
        <KpiCard icon={Users} label="신규 가입" value={(periodStats?.newSignups || 0).toLocaleString()} color={C.violet} />
        <KpiCard
          icon={GraduationCap}
          label="테스트 완료"
          value={(periodStats?.testsCompleted || 0).toLocaleString()}
          color={C.green}
        />
        <KpiCard
          icon={Activity}
          label="세션 (30일)"
          value={(eventSummary?.uniqueSessions || 0).toLocaleString()}
          sub="새 이벤트 추적 기준"
          color={C.amber}
        />
      </div>

      <ChartCard title="방문자 & 테스트 트렌드">
        <SimpleTrendChart
          data={activityData}
          series={[
            { key: "방문자", color: C.cyan, label: "방문자" },
            { key: "테스트", color: C.green, label: "테스트" },
          ]}
          height={220}
        />
      </ChartCard>

      {eventTrend && eventTrend.length > 0 && (
        <ChartCard title="신규 이벤트 추적 (최근 14일)">
          <SimpleTrendChart
            data={eventTrendData}
            series={[
              { key: "세션", color: C.amber, label: "세션" },
              { key: "페이지뷰", color: C.cyan, label: "페이지뷰" },
              { key: "가입", color: C.violet, label: "가입" },
            ]}
            height={180}
          />
        </ChartCard>
      )}

      <ChartCard title="인기 테스트">
        {(stats?.popularTests || []).slice(0, 6).length === 0 ? (
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 24 }}>데이터 없음</div>
        ) : (
          <SimpleHorizontalBars
            data={(stats?.popularTests || []).slice(0, 6).map((test) => ({
              name: (test.testTitle || "").slice(0, 18),
              value: test.attempts,
              colorKey: test.section,
            }))}
            colorFor={(item) => SECTION_COLORS[item.colorKey || ""] || C.cyan}
          />
        )}
      </ChartCard>
    </div>
  );
}
