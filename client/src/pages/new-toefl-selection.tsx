import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Volume2, Mic, PenTool, ChevronDown, ArrowLeft, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { NewToeflReadingTest, NewToeflListeningTest, NewToeflSpeakingTest, NewToeflWritingTest } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";

const SECTIONS = [
  {
    key: "reading",
    label: "Reading",
    desc: "Academic passages & comprehension",
    icon: BookOpen,
    color: "#00BBFF",
    colorEnd: "#0066FF",
    glow: "rgba(0,187,255,0.18)",
    route: "/new-toefl/reading",
    listRoute: "/new-toefl/reading/list",
  },
  {
    key: "listening",
    label: "Listening",
    desc: "Lectures, conversations & note-taking",
    icon: Volume2,
    color: "#00E87B",
    colorEnd: "#00B4D8",
    glow: "rgba(0,232,123,0.18)",
    route: "/new-toefl/listening",
    listRoute: "/new-toefl/listening/list",
  },
  {
    key: "speaking",
    label: "Speaking",
    desc: "Integrated & independent tasks",
    icon: Mic,
    color: "#FFB800",
    colorEnd: "#FF8A00",
    glow: "rgba(255,184,0,0.18)",
    route: "/new-toefl/speaking",
    listRoute: "/new-toefl/speaking/list",
  },
  {
    key: "writing",
    label: "Writing",
    desc: "Academic & integrated essays",
    icon: PenTool,
    color: "#A78BFA",
    colorEnd: "#7C3AED",
    glow: "rgba(167,139,250,0.18)",
    route: "/new-toefl/writing",
    listRoute: "/new-toefl/writing/list",
  },
];

function diffLabel(d?: string | null) {
  if (d === "hard") return "HARD";
  if (d === "easy") return "EASY";
  return "MED";
}

export default function NewTOEFLSelection() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data: readingTests = [] } = useQuery<NewToeflReadingTest[]>({
    queryKey: ["/api/new-toefl/reading"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: listeningTests = [] } = useQuery<NewToeflListeningTest[]>({
    queryKey: ["/api/new-toefl/listening"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: speakingTests = [] } = useQuery<NewToeflSpeakingTest[]>({
    queryKey: ["/api/new-toefl/speaking"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const { data: writingTests = [] } = useQuery<NewToeflWritingTest[]>({
    queryKey: ["/api/new-toefl/writing"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const activeReadingTests = readingTests.filter((t: any) => t.isActive);
  const activeListeningTests = listeningTests.filter((t: any) => t.isActive);
  const activeSpeakingTests = speakingTests.filter((t: any) => t.isActive);
  const activeWritingTests = writingTests.filter((t: any) => t.isActive);

  const testsBySection: Record<string, any[]> = {
    reading: activeReadingTests,
    listening: activeListeningTests,
    speaking: activeSpeakingTests,
    writing: activeWritingTests,
  };

  const totalTests = activeReadingTests.length + activeListeningTests.length + activeSpeakingTests.length + activeWritingTests.length;

  const toggleSection = (section: string) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  return (
    <div style={{ background: "#08080A", minHeight: "100vh", fontFamily: "'Sora', sans-serif", position: "relative", overflow: "hidden" }}>

      {/* ── Background Layer ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-10%", left: "20%", width: 600, height: 600, background: "conic-gradient(from 0deg, #00BBFF22, #7C3AED22, transparent)", borderRadius: "50%", filter: "blur(140px)", opacity: 0.15 }} />
        <div style={{ position: "absolute", top: "40%", right: "5%", width: 480, height: 480, background: "conic-gradient(from 120deg, #00E87B22, #00BBFF22, transparent)", borderRadius: "50%", filter: "blur(140px)", opacity: 0.15 }} />
        <div style={{ position: "absolute", bottom: "5%", left: "5%", width: 400, height: 400, background: "conic-gradient(from 240deg, #A78BFA22, #FFB80022, transparent)", borderRadius: "50%", filter: "blur(140px)", opacity: 0.15 }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.025 }}>
          <filter id="fn2">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#fn2)" />
        </svg>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.012 }}>
          <defs>
            <pattern id="grid2" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <radialGradient id="gridMask2" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask id="gm2">
              <rect width="100%" height="100%" fill="url(#gridMask2)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid2)" mask="url(#gm2)" />
        </svg>
      </div>

      {/* ── Nav ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,8,10,0.82)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <Link href="/">
            <button
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 500, transition: "color 0.15s", padding: "6px 10px", borderRadius: 8 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)"; (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <ArrowLeft size={14} />
              {t("newToefl.home")}
            </button>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(79,70,229,0.15)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 999, padding: "4px 12px" }}>
            <Sparkles size={11} style={{ color: "#818CF8" }} />
            <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 11, color: "#A5B4FC", letterSpacing: "1.5px" }}>{t("newToefl.badge2026")}</span>
          </div>
        </div>
      </nav>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        {/* ── Hero ── */}
        <section style={{ paddingTop: 36, paddingBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 28, height: 2, background: "#00BBFF" }} />
            <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 500, fontSize: 11, color: "#00BBFF", letterSpacing: "5px", textTransform: "uppercase" }}>iNRISE TOEFL Academy</span>
          </div>

          <h1 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "clamp(30px,4vw,48px)", lineHeight: 1.05, textTransform: "uppercase", color: "#F4F4F5", marginBottom: 10, letterSpacing: "-0.5px" }}>
            NEW TOEFL{" "}
            <span style={{ background: "linear-gradient(90deg,#00BBFF,#7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>iBT</span>
            {" "}PRACTICE
          </h1>

          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", maxWidth: 520, lineHeight: 1.7, marginBottom: 20 }}>
            {t("newToefl.headerDesc")}
          </p>

          {/* Stats */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 48, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { num: totalTests > 0 ? String(totalTests) : "51", label: "TOTAL TESTS", color: "#00BBFF" },
              { num: "4", label: "SECTIONS", color: "#00E87B" },
              { num: "2H", label: "FULL TEST", color: "#FFB800" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, lineHeight: 1, color: s.color, letterSpacing: "1px" }}>{s.num}</span>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.35)", letterSpacing: "2px", textTransform: "uppercase" }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: "linear-gradient(to right,rgba(255,255,255,0.06),rgba(255,255,255,0.12),rgba(255,255,255,0.06))" }} />
        </section>

        {/* ── Full Test Bar ── */}
        <section style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              padding: "20px 24px",
              background: "#111113",
              borderRadius: 12,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              borderLeft: "3px solid #00BBFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", border: "1px solid #00BBFF", borderRadius: 4 }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: "#00BBFF", letterSpacing: "2px" }}>FULL</span>
              </div>
              <div>
                <p style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, color: "#F4F4F5", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Full Length Test</p>
                <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Reading → Listening → Speaking → Writing · 약 2시간</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/new-toefl/full-test")}
              data-testid="button-start-full-test"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#08080A",
                background: "#00BBFF",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                cursor: "pointer",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,187,255,0.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
            >
              {t("newToefl.startExam")} →
            </button>
          </div>
        </section>

        {/* ── Section Cards ── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 500, fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: "3px", textTransform: "uppercase" }}>SECTIONS</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {SECTIONS.map((sec) => {
              const sectionTests = testsBySection[sec.key] || [];
              const isActive = activeSection === sec.key;
              const Icon = sec.icon;
              return (
                <div key={sec.key} style={{ display: "flex", flexDirection: "column" }}>
                  {/* Card */}
                  <div
                    onClick={() => toggleSection(sec.key)}
                    data-testid={`card-new-toefl-${sec.key}`}
                    style={{
                      background: isActive ? "#18181B" : "#111113",
                      border: `1px solid ${isActive ? sec.color + "44" : "rgba(255,255,255,0.06)"}`,
                      borderBottom: isActive ? "none" : undefined,
                      borderRadius: isActive ? "12px 12px 0 0" : 12,
                      padding: "20px 18px 18px",
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.boxShadow = `0 8px 32px ${sec.glow}`;
                      el.style.borderColor = isActive ? `${sec.color}66` : `${sec.color}44`;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.boxShadow = "none";
                      el.style.borderColor = isActive ? `${sec.color}44` : "rgba(255,255,255,0.06)";
                    }}
                  >
                    {/* Active top bar */}
                    {isActive && (
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${sec.color},${sec.colorEnd})` }} />
                    )}
                    <div style={{ marginBottom: 14 }}>
                      <Icon size={20} style={{ color: sec.color }} />
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, lineHeight: 1, color: sec.color, marginBottom: 6 }}>
                      {sectionTests.length > 0 ? sectionTests.length : "--"}
                    </div>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, color: "#F4F4F5", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                      {sec.label}
                    </div>
                    <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5, marginBottom: 12 }}>
                      {sec.desc}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <ChevronDown size={14} style={{ color: sec.color, opacity: 0.7, transform: isActive ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s" }} />
                    </div>
                  </div>

                  {/* Dropdown */}
                  <div
                    style={{
                      background: "#18181B",
                      borderLeft: isActive ? `1px solid ${sec.color}44` : "none",
                      borderRight: isActive ? `1px solid ${sec.color}44` : "none",
                      borderBottom: isActive ? `1px solid ${sec.color}44` : "none",
                      borderTop: "none",
                      borderRadius: "0 0 12px 12px",
                      overflow: "hidden",
                      maxHeight: isActive ? 420 : 0,
                      transition: "max-height 0.3s ease",
                    }}
                  >
                    {isActive && (
                      <div style={{ padding: "8px 0 4px" }}>
                        {sectionTests.length === 0 ? (
                          <div style={{ padding: "16px 18px", fontFamily: "'Sora', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                            {t("newToefl.preparing")}
                          </div>
                        ) : (
                          sectionTests.slice(0, 5).map((test: any) => (
                            <div
                              key={test.id}
                              data-testid={`test-item-${sec.key}-${test.id}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "9px 18px",
                                borderBottom: "1px solid rgba(255,255,255,0.04)",
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                            >
                              <div style={{ width: 7, height: 7, borderRadius: "50%", background: sec.color, flexShrink: 0, opacity: 0.85 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, color: "#F4F4F5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                                  {test.title}
                                </span>
                                {test.moduleNumber != null && (
                                  <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                                    {t("newToefl.module")} {test.moduleNumber}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 500, fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "1px", flexShrink: 0 }}>
                                {diffLabel(test.difficulty)}
                              </span>
                              <button
                                data-testid={`button-start-${sec.key}-${test.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`${sec.route}?testId=${test.id}`);
                                }}
                                style={{
                                  fontFamily: "'Oswald', sans-serif",
                                  fontWeight: 600,
                                  fontSize: 10,
                                  letterSpacing: "1px",
                                  textTransform: "uppercase",
                                  color: sec.color,
                                  background: "transparent",
                                  border: `1px solid ${sec.color}55`,
                                  borderRadius: 4,
                                  padding: "3px 8px",
                                  cursor: "pointer",
                                  flexShrink: 0,
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${sec.color}15`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                              >
                                {t("newToefl.start")}
                              </button>
                            </div>
                          ))
                        )}
                        {sectionTests.length > 0 && (
                          <div style={{ padding: "10px 18px 10px" }}>
                            <button
                              data-testid={`button-view-all-${sec.key}`}
                              onClick={(e) => { e.stopPropagation(); navigate(sec.listRoute); }}
                              style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = sec.color; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)"; }}
                            >
                              {t("newToefl.viewMore")} ({sectionTests.length}) →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 500, fontSize: 13, color: "rgba(255,255,255,0.25)", letterSpacing: "1px", textTransform: "uppercase" }}>© 2026 iNRISE</span>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.18)", letterSpacing: "3px", textTransform: "uppercase" }}>The World is Yours</span>
        </footer>

      </div>
    </div>
  );
}
