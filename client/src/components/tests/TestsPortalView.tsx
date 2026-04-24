import { Link } from "wouter";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import { PORTAL_CSS } from "./shared";

interface TestsPortalViewProps {
  t: (key: string) => string;
  toeflCount: number;
  greCount: number;
  satCount: number;
}

export default function TestsPortalView({ t, toeflCount, greCount, satCount }: TestsPortalViewProps) {
  return (
    <div className="portal-wrap">
      <style>{PORTAL_CSS}</style>
      <div className="portal-inner">
        <nav className="portal-nav">
          <Link href="/">
            <img src={logoPath} alt="iNRISE" style={{ height: 40, filter: "brightness(0) invert(1)", opacity: 0.9 }} />
          </Link>
          <Link href="/" className="portal-nav-link">← Home</Link>
        </nav>
        <div className="portal-header">
          <h1 className="portal-title">{t("tests.pageTitle")}</h1>
          <p className="portal-subtitle">{t("tests.pageDesc")}</p>
        </div>
        <div className="portal-grid">
          <Link href="/new-toefl" style={{ textDecoration: "none", display: "block" }}>
            <div className="ptile toefl">
              <div className="pcloud pc1" style={{ width: 400, height: 400, filter: "blur(26px)" }} />
              <div className="pcloud pc2" style={{ width: 280, height: 280, filter: "blur(20px)", top: "20%", left: "65%" }} />
              <div className="pcloud pc3" style={{ width: 300, height: 300, filter: "blur(22px)", top: "70%", left: "40%" }} />
              <div className="ptile-content">
                <div className="ptile-icon">◎</div>
                <div className="ptile-name-row">
                  <div className="ptile-name">TOEFL <span className="ptile-badge">2026</span></div>
                  <div className="ptile-count-box">
                    <div className="ptile-count">{toeflCount || "—"}</div>
                    <div className="ptile-count-label">{t("tests.testsLabel")}</div>
                  </div>
                </div>
                <div className="ptile-desc">{t("tests.toefl.desc")}<br />{t("tests.toefl.desc2")}</div>
                <div className="ptile-subjects">{["Reading", "Listening", "Speaking", "Writing"].map((s) => <span key={s} className="ptile-subj">{s}</span>)}</div>
                <div className="ptile-bottom"><span className="ptile-enter">{t("tests.startBtn")}</span><span className="ptile-arrow">→</span></div>
              </div>
            </div>
          </Link>

          <Link href="/tests/gre" style={{ textDecoration: "none", display: "block" }}>
            <div className="ptile gre">
              <div className="pcloud pc1" style={{ width: 400, height: 400, filter: "blur(26px)" }} />
              <div className="pcloud pc2" style={{ width: 280, height: 280, filter: "blur(20px)", top: "20%", left: "65%" }} />
              <div className="pcloud pc3" style={{ width: 300, height: 300, filter: "blur(22px)", top: "70%", left: "40%" }} />
              <div className="ptile-content">
                <div className="ptile-icon">◈</div>
                <div className="ptile-name-row">
                  <div className="ptile-name">GRE <span className="ptile-badge">2024-25</span></div>
                  <div className="ptile-count-box">
                    <div className="ptile-count">{greCount || "—"}</div>
                    <div className="ptile-count-label">{t("tests.testsLabel")}</div>
                  </div>
                </div>
                <div className="ptile-desc">{t("tests.gre.desc")}</div>
                <div className="ptile-subjects">{["Verbal", "Quantitative", "Analytical"].map((s) => <span key={s} className="ptile-subj">{s}</span>)}</div>
                <div className="ptile-bottom"><span className="ptile-enter">{t("tests.startBtn")}</span><span className="ptile-arrow">→</span></div>
              </div>
            </div>
          </Link>

          <Link href="/sat" style={{ textDecoration: "none", display: "block" }}>
            <div className="ptile sat">
              <div className="pcloud pc1" style={{ width: 400, height: 400, filter: "blur(26px)" }} />
              <div className="pcloud pc2" style={{ width: 280, height: 280, filter: "blur(20px)", top: "20%", left: "65%" }} />
              <div className="pcloud pc3" style={{ width: 300, height: 300, filter: "blur(22px)", top: "70%", left: "40%" }} />
              <div className="ptile-content">
                <div className="ptile-icon">◇</div>
                <div className="ptile-name-row">
                  <div className="ptile-name">SAT <span className="ptile-badge">2024</span></div>
                  <div className="ptile-count-box">
                    <div className="ptile-count">{satCount || "—"}</div>
                    <div className="ptile-count-label">{t("tests.testsLabel")}</div>
                  </div>
                </div>
                <div className="ptile-desc">{t("tests.sat.desc")}</div>
                <div className="ptile-subjects">{["Reading & Writing", "Math"].map((s) => <span key={s} className="ptile-subj">{s}</span>)}</div>
                <div className="ptile-bottom"><span className="ptile-enter">{t("tests.startBtn")}</span><span className="ptile-arrow">→</span></div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
