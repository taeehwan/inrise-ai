import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { NewToeflIntroHeader, NewToeflLayout } from "@/components/NewToeflLayout";

interface SpeakingIntroStat {
  icon: ReactNode;
  label: string;
  sub: string;
}

interface SpeakingIntroCard {
  key: string;
  icon: ReactNode;
  title: string;
  count: string;
  description: string;
}

interface NewToeflSpeakingIntroViewProps {
  title: string;
  subtitle: string;
  stats: SpeakingIntroStat[];
  cards: SpeakingIntroCard[];
  onStart: () => void;
  startLabel: string;
  guideTitle: string;
  guideDescription: string;
  oldFormatTitle: string;
  oldFormatDescription: string;
}

export default function NewToeflSpeakingIntroView({
  title,
  subtitle,
  stats,
  cards,
  onStart,
  startLabel,
  guideTitle,
  guideDescription,
  oldFormatTitle,
  oldFormatDescription,
}: NewToeflSpeakingIntroViewProps) {
  return (
    <NewToeflLayout section="speaking" showReformBadge darkNav>
      <div className="w-full px-4 sm:px-8 lg:px-12 flex flex-col" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="grid lg:grid-cols-2 gap-6 items-stretch flex-1 py-8">
          <div className="flex flex-col gap-4 justify-center">
            <NewToeflIntroHeader section="speaking" title={title} subtitle={subtitle} />

            <div className="grid grid-cols-3 gap-2">
              {stats.map((stat) => (
                <div key={`${stat.label}-${stat.sub}`} className="sp-card p-3 text-center">
                  <div className="mx-auto mb-1 flex justify-center">{stat.icon}</div>
                  <p className="text-white font-bold text-xs">{stat.label}</p>
                  <p className="text-slate-500 text-xs">{stat.sub}</p>
                </div>
              ))}
            </div>

            <button className="btn-act amber" onClick={onStart} data-testid="button-start-speaking-test">
              <Play className="h-4 w-4" />
              {startLabel}
            </button>
          </div>

          <div className="sp-card p-5 flex flex-col" style={{ borderLeft: "none" }}>
            <p className="sp-section-label mb-1">Speaking</p>
            <h2 className="text-xl font-bold text-white mb-1">{guideTitle}</h2>
            <p className="text-slate-400 text-sm mb-4">{guideDescription}</p>

            <div
              className="p-3 rounded-xl mb-4"
              style={{
                border: "1px solid rgba(251,191,36,0.30)",
                background: "rgba(251,191,36,0.05)",
                borderLeft: "2px solid #FBBF24",
              }}
            >
              <h3 className="font-semibold mb-0.5 text-sm" style={{ color: "#FCD34D" }}>{oldFormatTitle}</h3>
              <p className="text-slate-400 text-xs">{oldFormatDescription}</p>
            </div>

            <div className="space-y-2">
              {cards.map((card) => (
                <div
                  key={card.key}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ border: "1px solid rgba(94,234,212,0.15)", background: "rgba(45,212,191,0.06)" }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg,#2DD4BF,#0F766E)" }}
                  >
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-semibold text-sm">{card.title}</span>
                      <span className="sp-score-badge">{card.count}</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{card.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </NewToeflLayout>
  );
}
