import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { C, TABS, type AnalyticsStats, type PeriodKey, type Tab } from "@/components/admin-analytics/shared";

const OverviewTab = lazy(() => import("@/components/admin-analytics/AdminAnalyticsOverviewTab"));
const UsersTab = lazy(() => import("@/components/admin-analytics/AdminAnalyticsUsersTab"));
const AITestsTab = lazy(() => import("@/components/admin-analytics/AdminAnalyticsAiTestsTab"));
const RevenueTab = lazy(() => import("@/components/admin-analytics/AdminAnalyticsRevenueTab"));

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [period, setPeriod] = useState<PeriodKey>("weekly");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: stats, isLoading, refetch } = useQuery<AnalyticsStats>({
    queryKey: ["/api/admin/analytics", period, refreshKey],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/${period}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    staleTime: 60000,
    refetchInterval: 300000,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#06060A", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      <div
        style={{
          padding: "18px 32px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          href="/admin-panel"
          style={{
            color: "rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          <Home size={14} /> 어드민
        </Link>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Analytics</span>
        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 3 }}>
          {(["today", "weekly", "monthly"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              style={{
                padding: "5px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                background: period === value ? "rgba(255,255,255,0.12)" : "transparent",
                color: period === value ? "#fff" : "rgba(255,255,255,0.4)",
                transition: "all 0.15s",
              }}
            >
              {{ today: "오늘", weekly: "주간", monthly: "월간" }[value]}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setRefreshKey((current) => current + 1);
            refetch();
          }}
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
          }}
        >
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>

      <div
        style={{
          padding: "0 32px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          gap: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "14px 20px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'Sora', sans-serif",
              color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.4)",
              boxShadow: activeTab === tab ? `0 -2px 0 0 ${C.cyan} inset` : "none",
              transition: "color 0.15s",
              position: "relative",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {isLoading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 300,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `2px solid ${C.cyan}`,
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        ) : (
          <Suspense fallback={<div style={{ color: "rgba(255,255,255,0.3)", minHeight: 240 }}>로딩 중...</div>}>
            {activeTab === "Overview" && <OverviewTab stats={stats} period={period} />}
            {activeTab === "Users" && <UsersTab stats={stats} />}
            {activeTab === "AI & Tests" && <AITestsTab stats={stats} />}
            {activeTab === "Revenue" && <RevenueTab stats={stats} />}
          </Suspense>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #1a1a2e; color: #fff; }
      `}</style>
    </div>
  );
}
