import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { NewToeflIntroHeader, NewToeflLayout } from "@/components/NewToeflLayout";

interface IntroStat {
  icon: ReactNode;
  label: string;
  sub: string;
}

interface IntroCategory {
  key: string;
  icon: ReactNode;
  title: string;
  description: string;
  count: number;
}

interface NewToeflListeningIntroViewProps {
  title: string;
  stats: IntroStat[];
  categories: IntroCategory[];
  onStart: () => void;
}

export default function NewToeflListeningIntroView({
  title,
  stats,
  categories,
  onStart,
}: NewToeflListeningIntroViewProps) {
  return (
    <NewToeflLayout section="listening" darkNav>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Bebas+Neue&family=Sora:wght@300;400;500;600;700&display=swap');
        .ls-card { background: #0C1220; border: 1px solid rgba(0,200,100,.08); border-radius: 16px; }
        .ls-card:hover { border-color: rgba(0,232,123,.16); }
        .ls-orb-1 { position:fixed; top:-20vh; left:-15vw; width:55vw; height:55vw; border-radius:50%; background:radial-gradient(circle, rgba(0,150,80,.18), transparent 65%); filter:blur(36px); pointer-events:none; z-index:0; }
        .ls-orb-2 { position:fixed; bottom:-15vh; right:-10vw; width:45vw; height:45vw; border-radius:50%; background:radial-gradient(circle, rgba(0,180,100,.12), transparent 65%); filter:blur(30px); pointer-events:none; z-index:0; }
        .ls-body { font-family:'Sora',sans-serif; }
        .ls-label { font-family:'Oswald',sans-serif; letter-spacing:.06em; text-transform:uppercase; }
        .ls-start-btn { background:linear-gradient(135deg,#00B85F,#00E87B); border:none; border-radius:12px; color:#000; font-weight:700; font-size:16px; width:100%; padding:16px; cursor:pointer; transition:opacity .2s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .ls-start-btn:hover { opacity:.9; }
      `}</style>
      <div className="ls-orb-1" />
      <div className="ls-orb-2" />
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12 flex flex-col" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="grid lg:grid-cols-2 gap-6 items-stretch flex-1 py-8">
          <div className="flex flex-col gap-4 justify-center">
            <NewToeflIntroHeader section="listening" title={title} subtitle="2026 Adaptive Format" />

            <div className="grid grid-cols-3 gap-2">
              {stats.map((item) => (
                <div key={`${item.label}-${item.sub}`} className="ls-card p-3 text-center">
                  <div className="mb-1 flex justify-center">{item.icon}</div>
                  <p className="text-white font-semibold text-xs ls-body">{item.label}</p>
                  <p className="text-white/50 text-xs ls-body">{item.sub}</p>
                </div>
              ))}
            </div>

            <button className="ls-start-btn" onClick={onStart} data-testid="button-start-listening-test">
              <Play className="h-4 w-4" />
              Listening 시험 시작하기
            </button>
          </div>

          <div className="ls-card shadow-2xl p-5 flex flex-col" style={{ borderLeft: "none" }}>
            <h2 className="text-xl font-bold text-white mb-1 ls-body">LISTENING 유형 안내</h2>
            <p className="text-white/60 text-sm mb-4 ls-body">3가지 유형의 청취 과제가 순서대로 출제됩니다</p>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.key} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(0,180,100,.06)", border: "1px solid rgba(0,200,120,.12)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#00B85F,#00E87B)" }}>
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-sm ls-body">{cat.title}</h3>
                      <span className="text-xs text-white/40 ls-label">{cat.count}Q</span>
                    </div>
                    <p className="text-white/60 text-xs mt-0.5 ls-body">{cat.description}</p>
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
