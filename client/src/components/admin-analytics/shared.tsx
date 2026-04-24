import { type CSSProperties, type ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  FlaskConical,
  Headphones,
  LogIn,
  Mic,
  PenTool,
  Trophy,
  X,
} from "lucide-react";

export const C = {
  cyan: "#00D4FF",
  violet: "#8B5CF6",
  amber: "#F59E0B",
  green: "#10B981",
  pink: "#EC4899",
  teal: "#14B8A6",
  blue: "#3B82F6",
  slate: "#64748B",
  red: "#EF4444",
  indigo: "#6366F1",
};

export const PIE_COLORS = [C.cyan, C.violet, C.amber, C.green, C.pink, C.teal, C.blue];

export const SECTION_COLORS: Record<string, string> = {
  reading: C.violet,
  listening: C.pink,
  speaking: C.teal,
  writing: C.blue,
  verbal: C.indigo,
  quantitative: C.amber,
  analytical: C.green,
};

export interface PeriodStats {
  visitors: number;
  uniqueVisitors: number;
  newSignups: number;
  testsCompleted: number;
  averageScore: number;
  revenue: number;
  newSubscriptions: number;
  successfulPayments: number;
}

export interface AnalyticsStats {
  today: PeriodStats;
  weekly: PeriodStats;
  monthly: PeriodStats;
  popularTests: Array<{
    testTitle: string;
    examType: string;
    section: string;
    attempts: number;
    averageScore: number;
  }>;
  userActivity: Array<{
    date: string;
    visitors: number;
    uniqueVisitors: number;
    testsCompleted: number;
  }>;
  recentActivity: Array<{
    id: string;
    userId?: string;
    userName?: string;
    action: string;
    page: string;
    timestamp: string;
    details?: any;
  }>;
  paymentStats: {
    totalRevenue: number;
    successfulPayments: number;
    failedPayments: number;
    averagePayment: number;
  };
  subscriptionStats: {
    total: number;
    active: number;
    byPlan: Record<string, number>;
    byStatus: Record<string, number>;
    newThisPeriod: number;
  };
  geographicStats: {
    topCountries: Array<{ country: string; count: number }>;
    totalCountries: number;
  };
  aiFeedbackStats?: {
    reading: number;
    listening: number;
    speaking: number;
    writing: number;
  };
}

export interface UserWithStats {
  id: string;
  username: string;
  email: string;
  membershipTier: string;
  subscriptionStatus: string;
  createdAt: string;
  lastActivity: string | null;
  totalActivities: number;
  featureStats: {
    ai_feedback_reading: number;
    ai_feedback_listening: number;
    ai_feedback_speaking: number;
    ai_feedback_writing: number;
    full_test_complete: number;
    test_start: number;
    login: number;
  };
}

export const TABS = ["Overview", "Users", "AI & Tests", "Revenue"] as const;
export type Tab = (typeof TABS)[number];
export type PeriodKey = "today" | "weekly" | "monthly";

export const fmtKRW = (n: number) => {
  if (n === 0) return "₩0";
  if (n >= 1000000) return `₩${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₩${Math.round(n / 1000)}K`;
  return `₩${n.toLocaleString()}`;
};

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  const dt = new Date(d);
  const diff = Math.floor((Date.now() - dt.getTime()) / 60000);
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  if (diff < 43200) return `${Math.floor(diff / 1440)}일 전`;
  return dt.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
};

export const shortDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
};

const TIER_META: Record<string, { label: string; color: string; dot: string }> = {
  guest: {
    label: "Guest",
    color: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
    dot: "bg-slate-400",
  },
  light: {
    label: "Light",
    color: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
    dot: "bg-sky-400",
  },
  pro: {
    label: "Pro",
    color: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
    dot: "bg-violet-400",
  },
  max: {
    label: "Max",
    color: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
    dot: "bg-indigo-400",
  },
  master: {
    label: "Master",
    color: "bg-purple-600/20 text-purple-300 border border-purple-600/30",
    dot: "bg-purple-500",
  },
};

export const getTier = (tier: string) => TIER_META[tier] || TIER_META.guest;

const ACT_META: Record<string, { label: string; icon: any; color: string }> = {
  login: { label: "로그인", icon: LogIn, color: "text-slate-400" },
  test_start: { label: "테스트 시작", icon: FlaskConical, color: "text-cyan-400" },
  ai_feedback_reading: { label: "Reading AI", icon: BookOpen, color: "text-violet-400" },
  ai_feedback_listening: { label: "Listening AI", icon: Headphones, color: "text-pink-400" },
  ai_feedback_speaking: { label: "Speaking AI", icon: Mic, color: "text-teal-400" },
  ai_feedback_writing: { label: "Writing AI", icon: PenTool, color: "text-blue-400" },
  full_test_complete: { label: "풀테스트 완료", icon: Trophy, color: "text-amber-400" },
};

export const getAct = (type: string) => ACT_META[type] || { label: type, icon: Activity, color: "text-slate-400" };

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${color}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <span
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontFamily: "'Sora', sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          color: "#fff",
          fontSize: 26,
          fontWeight: 700,
          fontFamily: "'Sora', sans-serif",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        color: "#e5e7eb",
      }}
    >
      <div style={{ marginBottom: 6, color: "rgba(255,255,255,0.5)" }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        color: "#e5e7eb",
      }}
    >
      <span style={{ color: payload[0].payload.fill }}>{payload[0].name}: </span>
      <span style={{ fontWeight: 600 }}>{payload[0].value}</span>
      <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>({payload[0].payload.pct}%)</span>
    </div>
  );
};

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      style={{
        color: "rgba(255,255,255,0.7)",
        fontSize: 11,
        fontFamily: "'Sora', sans-serif",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: 14,
        fontWeight: 600,
      }}
    >
      {children}
    </h3>
  );
}

export function ChartCard({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: 24,
        ...style,
      }}
    >
      {title && <SectionTitle>{title}</SectionTitle>}
      {children}
    </div>
  );
}

export function SimpleDonutChart({
  data,
  colors = PIE_COLORS,
  size = 160,
}: {
  data: Array<{ name: string; value: number; pct?: number }>;
  colors?: string[];
  size?: number;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const gradient = data.length
    ? `conic-gradient(${data
        .map((item, index) => {
          const start = total > 0 ? data.slice(0, index).reduce((sum, d) => sum + d.value, 0) / total * 100 : 0;
          const end = total > 0 ? data.slice(0, index + 1).reduce((sum, d) => sum + d.value, 0) / total * 100 : 0;
          return `${colors[index % colors.length]} ${start}% ${end}%`;
        })
        .join(", ")})`
    : "conic-gradient(rgba(255,255,255,0.08) 0 100%)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: gradient,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: size * 0.24,
            borderRadius: "50%",
            background: "#111827",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {total.toLocaleString()}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((item, index) => (
          <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: colors[index % colors.length],
                flexShrink: 0,
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.6)", flex: 1 }}>{item.name}</span>
            <span style={{ color: "#fff", fontWeight: 600 }}>{item.value}</span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>
              {item.pct ?? (total > 0 ? Math.round((item.value / total) * 100) : 0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleTrendChart({
  data,
  series,
  height = 220,
  mode = "line",
}: {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; color: string; label: string }>;
  height?: number;
  mode?: "line" | "bar";
}) {
  const width = 640;
  const padding = 24;
  const xStep = data.length > 1 ? (width - padding * 2) / (data.length - 1) : width - padding * 2;
  const maxValue = Math.max(
    1,
    ...data.flatMap((item) =>
      series.map((entry) => {
        const value = item[entry.key];
        return typeof value === "number" ? value : 0;
      }),
    ),
  );

  const getY = (value: number) => height - padding - (value / maxValue) * (height - padding * 2);
  const getX = (index: number) => padding + index * xStep;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = padding + (height - padding * 2) * ratio;
          return (
            <line
              key={ratio}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4 4"
            />
          );
        })}

        {mode === "line"
          ? series.map((entry) => {
              const points = data
                .map((item, index) => {
                  const value = item[entry.key];
                  return `${getX(index)},${getY(typeof value === "number" ? value : 0)}`;
                })
                .join(" ");

              return (
                <polyline
                  key={entry.key}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={points}
                />
              );
            })
          : data.map((item, index) => {
              const groupWidth = 24;
              const innerGap = 6;
              const totalWidth = series.length * groupWidth + (series.length - 1) * innerGap;
              const startX = getX(index) - totalWidth / 2;
              return series.map((entry, seriesIndex) => {
                const value = item[entry.key];
                const numeric = typeof value === "number" ? value : 0;
                const barHeight = (numeric / maxValue) * (height - padding * 2);
                return (
                  <rect
                    key={`${entry.key}-${index}`}
                    x={startX + seriesIndex * (groupWidth + innerGap)}
                    y={height - padding - barHeight}
                    width={groupWidth}
                    height={barHeight}
                    rx={4}
                    fill={entry.color}
                    opacity={0.9}
                  />
                );
              });
            })}

        {data.map((item, index) => (
          <text
            key={`label-${index}`}
            x={getX(index)}
            y={height - 6}
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize="11"
          >
            {String(item.date ?? "")}
          </text>
        ))}
      </svg>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {series.map((entry) => (
          <div key={entry.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color }} />
            <span style={{ color: "rgba(255,255,255,0.55)" }}>{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleHorizontalBars({
  data,
  colorFor,
}: {
  data: Array<{ name: string; value: number; colorKey?: string }>;
  colorFor?: (item: { name: string; value: number; colorKey?: string }, index: number) => string;
}) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {data.map((item, index) => {
        const width = `${Math.max(8, (item.value / maxValue) * 100)}%`;
        const color = colorFor ? colorFor(item, index) : PIE_COLORS[index % PIE_COLORS.length];
        return (
          <div key={item.name} style={{ display: "grid", gridTemplateColumns: "110px 1fr 40px", gap: 12, alignItems: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.name}
            </div>
            <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 9999, overflow: "hidden" }}>
              <div style={{ width, height: "100%", background: color, borderRadius: 9999 }} />
            </div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 600, textAlign: "right" }}>{item.value}</div>
          </div>
        );
      })}
    </div>
  );
}

export function UserDrawer({ user, onClose }: { user: UserWithStats; onClose: () => void }) {
  const { data: activities } = useQuery<any[]>({
    queryKey: ["/api/admin/user-activity", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/user-activity/${user.id}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const tier = getTier(user.membershipTier);
  const aiTotal =
    (user.featureStats?.ai_feedback_reading || 0) +
    (user.featureStats?.ai_feedback_listening || 0) +
    (user.featureStats?.ai_feedback_speaking || 0) +
    (user.featureStats?.ai_feedback_writing || 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 420,
          height: "100vh",
          background: "#0D0E14",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          overflowY: "auto",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, fontFamily: "'Sora', sans-serif" }}>
              {user.username || user.email?.split("@")[0]}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>{user.email}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tier.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
            {tier.label}
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 12,
              background: user.subscriptionStatus === "active" ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)",
              color: user.subscriptionStatus === "active" ? "#10B981" : "#64748B",
              border: `1px solid ${
                user.subscriptionStatus === "active" ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.3)"
              }`,
            }}
          >
            {user.subscriptionStatus}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "AI 피드백", value: aiTotal, color: C.violet },
            { label: "테스트 시작", value: user.featureStats?.test_start || 0, color: C.cyan },
            { label: "풀테스트 완료", value: user.featureStats?.full_test_complete || 0, color: C.amber },
            { label: "총 활동", value: user.totalActivities || 0, color: C.green },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: `${item.color}11`,
                border: `1px solid ${item.color}33`,
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div style={{ color: item.color, fontSize: 22, fontWeight: 700 }}>{item.value}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <ChartCard title="AI 피드백 섹션별">
          {[
            { label: "Reading", val: user.featureStats?.ai_feedback_reading || 0, color: C.violet },
            { label: "Listening", val: user.featureStats?.ai_feedback_listening || 0, color: C.pink },
            { label: "Speaking", val: user.featureStats?.ai_feedback_speaking || 0, color: C.teal },
            { label: "Writing", val: user.featureStats?.ai_feedback_writing || 0, color: C.blue },
          ].map((section) => (
            <div key={section.label} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  marginBottom: 5,
                }}
              >
                <span>{section.label}</span>
                <span style={{ color: section.color }}>{section.val}</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    background: section.color,
                    width: `${aiTotal > 0 ? Math.round((section.val / aiTotal) * 100) : 0}%`,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </ChartCard>

        <ChartCard title="최근 활동">
          {(activities || []).slice(0, 12).map((activity: any, index: number) => {
            const meta = getAct(activity.activityType);
            const Icon = meta.icon;
            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <Icon size={14} className={meta.color} />
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, flex: 1 }}>{meta.label}</span>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{fmtDate(activity.createdAt)}</span>
              </div>
            );
          })}
          {(!activities || activities.length === 0) && (
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: "16px 0" }}>
              활동 없음
            </div>
          )}
        </ChartCard>

        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
          가입: {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ko-KR") : "-"}
          {user.lastActivity && ` · 마지막: ${fmtDate(user.lastActivity)}`}
        </div>
      </div>
    </div>
  );
}

export function useAdminUsersWithStats() {
  return useQuery<UserWithStats[]>({
    queryKey: ["/api/admin/users-with-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users-with-stats");
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 60000,
  });
}

export function useUsersTabState() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);

  return { search, setSearch, tierFilter, setTierFilter, selectedUser, setSelectedUser };
}
