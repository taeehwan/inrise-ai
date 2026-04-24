import { FlaskConical, Star, Trophy, Zap } from "lucide-react";
import {
  C,
  ChartCard,
  KpiCard,
  SimpleDonutChart,
  SimpleHorizontalBars,
  SimpleTrendChart,
  shortDate,
  useAdminUsersWithStats,
  type AnalyticsStats,
} from "./shared";

export default function AdminAnalyticsAiTestsTab({ stats }: { stats: AnalyticsStats | undefined }) {
  const { data: usersData } = useAdminUsersWithStats();
  const users = usersData || [];

  const aiTotals = users.reduce(
    (acc, user) => {
      acc.reading += user.featureStats?.ai_feedback_reading || 0;
      acc.listening += user.featureStats?.ai_feedback_listening || 0;
      acc.speaking += user.featureStats?.ai_feedback_speaking || 0;
      acc.writing += user.featureStats?.ai_feedback_writing || 0;
      return acc;
    },
    { reading: 0, listening: 0, speaking: 0, writing: 0 },
  );

  const aiFeedbackData = [
    { name: "Reading", value: aiTotals.reading, fill: C.violet },
    { name: "Listening", value: aiTotals.listening, fill: C.pink },
    { name: "Speaking", value: aiTotals.speaking, fill: C.teal },
    { name: "Writing", value: aiTotals.writing, fill: C.blue },
  ];
  const aiTotal = aiFeedbackData.reduce((sum, item) => sum + item.value, 0);
  const testTrend = (stats?.userActivity || []).map((day) => ({
    date: shortDate(day.date),
    테스트완료: day.testsCompleted,
  }));
  const totalTests = users.reduce((sum, user) => sum + (user.featureStats?.test_start || 0), 0);
  const totalFullTests = users.reduce((sum, user) => sum + (user.featureStats?.full_test_complete || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard icon={Zap} label="AI 피드백 총계" value={aiTotal.toLocaleString()} color={C.violet} />
        <KpiCard icon={FlaskConical} label="테스트 시작" value={totalTests.toLocaleString()} color={C.cyan} />
        <KpiCard icon={Trophy} label="풀테스트 완료" value={totalFullTests.toLocaleString()} color={C.amber} />
        <KpiCard
          icon={Star}
          label="평균 점수"
          value={stats?.monthly.averageScore ? `${Math.round(stats.monthly.averageScore)}점` : "-"}
          color={C.green}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="섹션별 AI 피드백 사용">
          <SimpleHorizontalBars
            data={aiFeedbackData.map((item) => ({
              name: item.name,
              value: item.value,
            }))}
            colorFor={(_, index) => aiFeedbackData[index]?.fill || C.violet}
          />
        </ChartCard>

        <ChartCard title="AI 피드백 섹션 비율">
          {aiTotal === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 50 }}>데이터 없음</div>
          ) : (
            <SimpleDonutChart
              data={aiFeedbackData.map((item) => ({
                name: item.name,
                value: item.value,
                pct: aiTotal > 0 ? Math.round((item.value / aiTotal) * 100) : 0,
              }))}
              colors={aiFeedbackData.map((item) => item.fill)}
            />
          )}
        </ChartCard>
      </div>

      <ChartCard title="테스트 완료 트렌드">
        <SimpleTrendChart
          data={testTrend}
          series={[{ key: "테스트완료", color: C.green, label: "테스트 완료" }]}
          height={200}
        />
      </ChartCard>

      <ChartCard title="인기 테스트 상세">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {(stats?.popularTests || []).slice(0, 8).map((test, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: index % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: `${C.cyan}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.cyan,
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {test.testTitle}
                </div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                  {test.examType?.toUpperCase()} · {test.section}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{(test.attempts || 0).toLocaleString()}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>시도</div>
              </div>
              <div style={{ textAlign: "right", minWidth: 50 }}>
                <div style={{ color: C.green, fontSize: 13 }}>{test.averageScore ? `${Math.round(test.averageScore)}점` : "-"}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>평균</div>
              </div>
            </div>
          ))}
          {(stats?.popularTests || []).length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 24 }}>데이터 없음</div>
          )}
        </div>
      </ChartCard>
    </div>
  );
}
