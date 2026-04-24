import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ActivityEvent, EVENT_CONFIG, SECTION_LABEL, timeAgo } from "./shared";

export default function ActivityFeedSection() {
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);

  // EventSource (below) streams real-time updates. Keep a long backup poll as a
  // safety net for dropped stream connections — 120s rather than 30s cuts request
  // volume 4x without meaningfully delaying recovery.
  const { data: recentData = [] } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/activity/recent"],
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const { data: highlightsData = [] } = useQuery<ActivityEvent[]>({
    queryKey: ["/api/activity/highlights"],
    refetchInterval: 120000,
    staleTime: 60000,
  });

  useEffect(() => {
    const evtSource = new EventSource("/api/activity/stream");
    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.id) {
          setLiveEvents((prev) => [data, ...prev].slice(0, 20));
        }
      } catch {}
    };
    return () => evtSource.close();
  }, []);

  const allEvents: ActivityEvent[] = [
    ...liveEvents,
    ...recentData.filter((r) => !liveEvents.find((l) => l.id === r.id)),
  ].slice(0, 20);

  const totalToday = allEvents.filter((e) => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  }).length;

  const highlights =
    highlightsData.length > 0 ? highlightsData : allEvents.filter((e) => e.isHighlight).slice(0, 3);

  return (
    <section className="relative z-10 py-16">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 10, height: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34D399" }} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#34D399",
                  animation: "ping 1.5s infinite",
                  opacity: 0.5,
                }}
              />
            </div>
            <span
              style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 16, color: "#fff" }}
            >
              실시간 활동
            </span>
            <span
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "1.5px",
                color: "#34D399",
                background: "rgba(52,211,153,0.12)",
                border: "1px solid rgba(52,211,153,0.3)",
                borderRadius: 4,
                padding: "2px 7px",
              }}
            >
              LIVE
            </span>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {[
              { num: String(allEvents.length || 0), label: "EVENTS" },
              { num: String(totalToday), label: "TODAY" },
              { num: String(highlights.length), label: "HIGHLIGHTS" },
              { num: String(allEvents.filter((e) => e.eventType === "full_test_complete").length), label: "FULL TEST" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: "#fff", lineHeight: 1 }}>
                  {s.num}
                </span>
                <span
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 9,
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "1.5px",
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 300, flexShrink: 0 }}>
            <div
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "3px",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Highlights
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {highlights.length === 0 ? (
                <div
                  style={{
                    background: "#111113",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    padding: "20px 16px",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{ fontFamily: "'Sora', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)" }}
                  >
                    첫 하이라이트를 기다리는 중...
                  </span>
                </div>
              ) : (
                highlights.map((ev) => {
                  const cfg = EVENT_CONFIG[ev.eventType] || EVENT_CONFIG.test_complete;
                  return (
                    <div
                      key={ev.id}
                      style={{
                        background: "#111113",
                        border: `1px solid ${cfg.color}22`,
                        borderLeft: `3px solid ${cfg.color}`,
                        borderRadius: 10,
                        padding: "14px 14px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                        <span
                          style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: 10,
                            fontWeight: 600,
                            color: cfg.color,
                            letterSpacing: "1.5px",
                            textTransform: "uppercase",
                          }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "'Sora', sans-serif",
                          fontSize: 13,
                          color: "#F4F4F5",
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {ev.displayName}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {ev.score != null && (
                          <span
                            style={{
                              fontFamily: "'Bebas Neue', sans-serif",
                              fontSize: 22,
                              color: cfg.color,
                              lineHeight: 1,
                            }}
                          >
                            {Math.round(ev.score)}
                          </span>
                        )}
                        {ev.section && (
                          <span
                            style={{
                              fontFamily: "'Oswald', sans-serif",
                              fontSize: 9,
                              color: "rgba(255,255,255,0.35)",
                              letterSpacing: "1.5px",
                            }}
                          >
                            {SECTION_LABEL[ev.section] || ev.section.toUpperCase()}
                          </span>
                        )}
                        {ev.streakDays && (
                          <span
                            style={{
                              fontFamily: "'Bebas Neue', sans-serif",
                              fontSize: 20,
                              color: cfg.color,
                            }}
                          >
                            {ev.streakDays}일
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Sora', sans-serif",
                          fontSize: 10,
                          color: "rgba(255,255,255,0.3)",
                          marginTop: 4,
                        }}
                      >
                        {timeAgo(ev.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: "3px",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              All Activity
            </div>
            <div
              style={{
                background: "#111113",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {allEvents.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                  <span
                    style={{ fontFamily: "'Sora', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)" }}
                  >
                    아직 활동이 없습니다 — 첫 번째가 되세요!
                  </span>
                </div>
              ) : (
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {allEvents.map((ev, i) => {
                    const cfg = EVENT_CONFIG[ev.eventType] || EVENT_CONFIG.test_complete;
                    return (
                      <div
                        key={ev.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "11px 16px",
                          borderBottom: i < allEvents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: `${cfg.color}18`,
                            border: `1px solid ${cfg.color}44`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: 13,
                          }}
                        >
                          {cfg.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
                            <span
                              style={{
                                fontFamily: "'Sora', sans-serif",
                                fontSize: 12,
                                color: "#F4F4F5",
                                fontWeight: 600,
                              }}
                            >
                              {ev.displayName}
                            </span>
                            {ev.section && (
                              <span
                                style={{
                                  fontFamily: "'Oswald', sans-serif",
                                  fontSize: 9,
                                  color: cfg.color,
                                  letterSpacing: "1px",
                                  background: `${cfg.color}15`,
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                }}
                              >
                                {SECTION_LABEL[ev.section] || ev.section.toUpperCase()}
                              </span>
                            )}
                            <span
                              style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: 9,
                                color: "rgba(255,255,255,0.3)",
                                letterSpacing: "0.8px",
                                background: "rgba(255,255,255,0.06)",
                                borderRadius: 3,
                                padding: "1px 5px",
                              }}
                            >
                              {cfg.label}
                            </span>
                          </div>
                          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                            {timeAgo(ev.createdAt)}
                          </div>
                        </div>
                        {ev.score != null && (
                          <span
                            style={{
                              fontFamily: "'Bebas Neue', sans-serif",
                              fontSize: 20,
                              color: cfg.color,
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            {Math.round(ev.score)}
                          </span>
                        )}
                        {ev.streakDays != null && (
                          <span
                            style={{
                              fontFamily: "'Bebas Neue', sans-serif",
                              fontSize: 18,
                              color: cfg.color,
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            {ev.streakDays}일
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
