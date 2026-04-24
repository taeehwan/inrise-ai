import { Link } from "wouter";
import { BookOpen, Calculator, ArrowRight, TrendingUp, Target, Sparkles, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SatSelection() {
  const { t } = useLanguage();

  return (
    <div className="sat-page">
      <div className="amb" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div className="o1" />
        <div className="o2" />
      </div>

      {/* Header */}
      <div style={{ position: "relative", padding: "22px 24px 14px", textAlign: "center", borderBottom: "1px solid rgba(200,60,80,.08)" }}>
        <span style={{ display: "inline-block", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.12em", color: "#DD3344", fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", padding: "3px 12px", borderRadius: 20, background: "rgba(221,51,68,.1)", marginBottom: 10 }}>
          {t("sat.hub.badge")}
        </span>
        <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: "clamp(26px,4vw,40px)", fontWeight: 600, color: "#fff", letterSpacing: "0.04em", marginBottom: 6, lineHeight: 1.15 }}>
          {t("sat.hub.title")}
        </h1>
        <p style={{ color: "rgba(255,255,255,.5)", fontSize: "0.85rem", maxWidth: 500, margin: "0 auto 12px" }}>
          {t("sat.hub.desc")}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          {[
            { icon: <Zap size={13} />, label: t("sat.hub.adaptiveTest") },
            { icon: <TrendingUp size={13} />, label: t("sat.hub.totalTime") },
            { icon: <Sparkles size={13} />, label: t("sat.hub.scoreScale") },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,.45)", fontSize: "0.75rem" }}>
              <span style={{ color: "#DD3344" }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 20px 24px" }}>

        {/* Section Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
          {/* Reading & Writing */}
          <div className="sec-card">
            <div className="cl1" />
            <div className="cl2" />
            <div className="sec-icon"><BookOpen size={18} /></div>
            <div className="sec-name">Reading & Writing</div>
            <div className="sec-sub">{t("sat.rw.desc")}</div>
            <div className="sec-stat"><TrendingUp size={13} />{t("sat.rw.time")}</div>
            <div className="sec-stat"><Target size={13} />{t("sat.rw.questions")}</div>
            <div className="sec-topics">
              {["Craft & Structure (28%)", "Information & Ideas (26%)", "Expression of Ideas (20%)", "Standard English Conventions (26%)"].map((topic, i) => (
                <div key={i} className="sec-topic">{topic}</div>
              ))}
            </div>
            <div className="sec-score">
              <div>
                <div className="sec-score-label" style={{ fontSize: "0.68rem", marginBottom: 2 }}>{t("sat.detail.maxScore")}</div>
                <div className="sec-score-val">800 pts</div>
              </div>
              <span style={{ fontSize: "0.68rem", background: "rgba(255,184,0,.1)", color: "#FFB800", borderRadius: 20, padding: "3px 10px", fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>
                {t("sat.detail.medium")}
              </span>
            </div>
            <Link href="/sat/reading-writing">
              <button className="btn-sec">
                {t("sat.hub.startTest")} <ArrowRight size={15} />
              </button>
            </Link>
          </div>

          {/* Math */}
          <div className="sec-card">
            <div className="cl1" />
            <div className="cl2" />
            <div className="sec-icon"><Calculator size={18} /></div>
            <div className="sec-name">Math</div>
            <div className="sec-sub">{t("sat.math.desc")}</div>
            <div className="sec-stat"><TrendingUp size={13} />{t("sat.math.time")}</div>
            <div className="sec-stat"><Target size={13} />{t("sat.math.questions")}</div>
            <div className="sec-topics">
              {["Algebra (35%)", "Advanced Math (35%)", "Problem Solving & Data Analysis (15%)", "Geometry & Trigonometry (15%)"].map((topic, i) => (
                <div key={i} className="sec-topic">{topic}</div>
              ))}
            </div>
            <div className="sec-score">
              <div>
                <div className="sec-score-label" style={{ fontSize: "0.68rem", marginBottom: 2 }}>{t("sat.detail.maxScore")}</div>
                <div className="sec-score-val">800 pts</div>
              </div>
              <span style={{ fontSize: "0.68rem", background: "rgba(255,184,0,.1)", color: "#FFB800", borderRadius: 20, padding: "3px 10px", fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.06em" }}>
                {t("sat.detail.medium")}
              </span>
            </div>
            <Link href="/sat/math">
              <button className="btn-sec">
                {t("sat.hub.startTest")} <ArrowRight size={15} />
              </button>
            </Link>
          </div>
        </div>

        {/* Info Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 14 }}>
          {/* Features */}
          <div className="info-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(221,51,68,.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#DD3344" }}>
                <Sparkles size={13} />
              </div>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.9rem", fontWeight: 500, color: "#fff", letterSpacing: "0.04em" }}>
                {t("sat.features.title")}
              </span>
            </div>
            {[
              { icon: <Zap size={13} />, title: t("sat.features.adaptive"), desc: t("sat.features.adaptiveDesc") },
              { icon: <BookOpen size={13} />, title: t("sat.features.shortPassage"), desc: t("sat.features.shortPassageDesc") },
              { icon: <Calculator size={13} />, title: t("sat.features.calculator"), desc: t("sat.features.calculatorDesc") },
            ].map((item, i) => (
              <div key={i} className="feat-row">
                <div className="feat-icon">{item.icon}</div>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,.8)", marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.4)", lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Structure */}
          <div className="info-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(221,51,68,.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#DD3344" }}>
                <Target size={13} />
              </div>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.9rem", fontWeight: 500, color: "#fff", letterSpacing: "0.04em" }}>
                {t("sat.structure.title")}
              </span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.4)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                {t("sat.structure.sectionStructure")}
              </div>
              {[
                { label: "Reading & Writing", val: `32 min ${t("sat.structure.modules")}` },
                { label: "Math", val: `35 min ${t("sat.structure.modules")}` },
                { label: t("sat.structure.totalTime"), val: t("sat.structure.totalTimeVal") },
              ].map((row, i) => (
                <div key={i} className="struct-row">
                  <span className="struct-label">{row.label}</span>
                  <span className="struct-val">{row.val}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.4)", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                {t("sat.structure.scoreSystem")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: t("sat.structure.totalRange"), val: "400-1600" },
                  { label: t("sat.structure.sectionScore"), val: "200-800" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center", padding: "10px 8px", background: "rgba(221,51,68,.06)", border: "1px solid rgba(221,51,68,.1)", borderRadius: 10 }}>
                    <div className="score-num">{s.val}</div>
                    <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,.4)", marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="cta-bar">
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: "1.1rem", fontWeight: 500, color: "#fff", marginBottom: 4 }}>
              {t("sat.cta.title")}
            </div>
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.45)" }}>
              {t("sat.cta.desc")}
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap" }}>
              {[t("sat.cta.realtimeFeedback"), t("sat.cta.adaptiveDifficulty"), t("sat.cta.detailedAnalysis")].map((label, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "rgba(255,255,255,.4)" }}>
                  <span style={{ color: "#DD3344", fontSize: 10 }}>●</span>{label}
                </div>
              ))}
            </div>
          </div>
          <Link href="/sat/reading-writing">
            <button className="btn-sat red" style={{ whiteSpace: "nowrap" }}>
              {t("sat.cta.startFree")} <ArrowRight size={15} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
