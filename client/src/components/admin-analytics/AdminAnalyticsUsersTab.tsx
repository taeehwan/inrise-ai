import { useMemo } from "react";
import { ChevronRight, Search, UserCheck, UserPlus, Users } from "lucide-react";
import {
  C,
  ChartCard,
  KpiCard,
  PIE_COLORS,
  SimpleDonutChart,
  SimpleTrendChart,
  UserDrawer,
  fmtDate,
  getTier,
  shortDate,
  useAdminUsersWithStats,
  useUsersTabState,
  type AnalyticsStats,
} from "./shared";

export default function AdminAnalyticsUsersTab({ stats }: { stats: AnalyticsStats | undefined }) {
  const { data: usersData } = useAdminUsersWithStats();
  const { search, setSearch, tierFilter, setTierFilter, selectedUser, setSelectedUser } = useUsersTabState();
  const users = usersData || [];

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const query = search.toLowerCase();
        const match =
          !query ||
          (user.username || "").toLowerCase().includes(query) ||
          (user.email || "").toLowerCase().includes(query);
        const tierMatched = tierFilter === "all" || user.membershipTier === tierFilter;
        return match && tierMatched;
      }),
    [search, tierFilter, users],
  );

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const user of users) {
      counts[user.membershipTier] = (counts[user.membershipTier] || 0) + 1;
    }
    return counts;
  }, [users]);

  const tierPieData = Object.entries(tierCounts).map(([name, value]) => ({
    name: getTier(name).label,
    value,
    pct: users.length > 0 ? Math.round((value / users.length) * 100) : 0,
  }));

  const signupTrend = (stats?.userActivity || []).map((day) => ({
    date: shortDate(day.date),
    방문자: day.visitors,
  }));

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.subscriptionStatus === "active").length;
  const newThisMonth = users.filter((user) => {
    if (!user.createdAt) return false;
    const createdAt = new Date(user.createdAt);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <KpiCard icon={Users} label="총 유저" value={totalUsers.toLocaleString()} color={C.cyan} />
        <KpiCard icon={UserCheck} label="구독 활성" value={activeUsers.toLocaleString()} color={C.green} />
        <KpiCard icon={UserPlus} label="이번 달 신규" value={newThisMonth.toLocaleString()} color={C.violet} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <ChartCard title="방문자 트렌드">
          <SimpleTrendChart
            data={signupTrend}
            series={[{ key: "방문자", color: C.violet, label: "방문자" }]}
            height={200}
          />
        </ChartCard>

        <ChartCard title="멤버십 티어 분포">
          {tierPieData.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 40 }}>데이터 없음</div>
          ) : (
            <SimpleDonutChart data={tierPieData} colors={PIE_COLORS} />
          )}
        </ChartCard>
      </div>

      <ChartCard>
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <h3
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 11,
              fontFamily: "'Sora', sans-serif",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 0,
              fontWeight: 600,
            }}
          >
            유저 목록 ({filtered.length})
          </h3>
          <div style={{ flex: 1 }} />
          <div style={{ position: "relative", width: 200 }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)" }}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="검색..."
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>
          <select
            value={tierFilter}
            onChange={(event) => setTierFilter(event.target.value)}
            style={{
              padding: "7px 12px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.7)",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="all">전체 티어</option>
            {["guest", "light", "pro", "max", "master"].map((tier) => (
              <option key={tier} value={tier}>
                {getTier(tier).label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filtered.slice(0, 40).map((user) => {
            const tier = getTier(user.membershipTier);
            return (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "rgba(255,255,255,0)";
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: `${C.violet}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.violet,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {(user.username || user.email || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.username || user.email?.split("@")[0]}
                  </div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: 11,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.email}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tier.color}`}>
                  <span className={`w-1 h-1 rounded-full ${tier.dot}`} />
                  {tier.label}
                </span>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, minWidth: 50, textAlign: "right" }}>
                  {fmtDate(user.lastActivity || user.createdAt)}
                </div>
                <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: 24 }}>유저 없음</div>
          )}
        </div>
      </ChartCard>

      {selectedUser && <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}
