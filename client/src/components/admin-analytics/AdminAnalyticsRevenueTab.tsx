import { CheckCircle2, CreditCard, TrendingUp, Users } from "lucide-react";
import {
  C,
  ChartCard,
  KpiCard,
  PIE_COLORS,
  SimpleDonutChart,
  SimpleTrendChart,
  fmtKRW,
  shortDate,
  type AnalyticsStats,
} from "./shared";

export default function AdminAnalyticsRevenueTab({ stats }: { stats: AnalyticsStats | undefined }) {
  const subscriptionStats = stats?.subscriptionStats;
  const paymentStats = stats?.paymentStats;

  const statusPieData = Object.entries(subscriptionStats?.byStatus || {}).map(([name, value]) => ({
    name,
    value: value as number,
    pct: subscriptionStats?.total ? Math.round(((value as number) / subscriptionStats.total) * 100) : 0,
  }));

  const planPieData = Object.entries(subscriptionStats?.byPlan || {}).map(([name, value]) => ({
    name,
    value: value as number,
    pct: subscriptionStats?.total ? Math.round(((value as number) / subscriptionStats.total) * 100) : 0,
  }));

  const revenueTrend = (stats?.userActivity || []).map((day) => ({
    date: shortDate(day.date),
    테스트: day.testsCompleted,
    방문자: day.visitors,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard icon={CreditCard} label="총 수익" value={fmtKRW(paymentStats?.totalRevenue || 0)} color={C.green} />
        <KpiCard icon={CheckCircle2} label="성공 결제" value={(paymentStats?.successfulPayments || 0).toLocaleString()} color={C.cyan} />
        <KpiCard icon={Users} label="활성 구독" value={(subscriptionStats?.active || 0).toLocaleString()} color={C.violet} />
        <KpiCard
          icon={TrendingUp}
          label="이번 기간 신규"
          value={(subscriptionStats?.newThisPeriod || 0).toLocaleString()}
          color={C.amber}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="구독 상태 분포">
          {statusPieData.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 50 }}>데이터 없음</div>
          ) : (
            <SimpleDonutChart data={statusPieData} colors={PIE_COLORS} />
          )}
        </ChartCard>

        <ChartCard title="구독 플랜 분포">
          {planPieData.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 50 }}>데이터 없음</div>
          ) : (
            <SimpleDonutChart
              data={planPieData}
              colors={planPieData.map((_, index) => PIE_COLORS[(index + 2) % PIE_COLORS.length])}
            />
          )}
        </ChartCard>
      </div>

      <ChartCard title="활동 트렌드 (방문자 / 테스트 완료)">
        <SimpleTrendChart
          data={revenueTrend}
          series={[
            { key: "테스트", color: C.green, label: "테스트" },
            { key: "방문자", color: C.cyan, label: "방문자" },
          ]}
          height={200}
        />
      </ChartCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <ChartCard>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 8 }}>실패 결제</div>
          <div style={{ color: C.red, fontSize: 24, fontWeight: 700 }}>{(paymentStats?.failedPayments || 0).toLocaleString()}</div>
        </ChartCard>
        <ChartCard>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 8 }}>평균 결제액</div>
          <div style={{ color: C.amber, fontSize: 24, fontWeight: 700 }}>{fmtKRW(paymentStats?.averagePayment || 0)}</div>
        </ChartCard>
        <ChartCard>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 8 }}>구독 총 수</div>
          <div style={{ color: C.cyan, fontSize: 24, fontWeight: 700 }}>{(subscriptionStats?.total || 0).toLocaleString()}</div>
        </ChartCard>
      </div>
    </div>
  );
}
