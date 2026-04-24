import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Clock, Trophy, BookOpen, ChevronRight, Headphones, Mic, PenTool } from "lucide-react";

interface AttemptSummary {
  id: string;
  testId: string;
  totalScore: number | null;
  timeSpent: number | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  examType: string;
  section: string;
  testTitle: string;
  correctAnswers: number;
  totalQuestions: number;
}

const SECTION_META: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  reading: { icon: BookOpen, color: '#00C8C8', bg: 'rgba(0,200,200,.12)', label: 'Reading' },
  listening: { icon: Headphones, color: '#00C864', bg: 'rgba(0,200,100,.12)', label: 'Listening' },
  speaking: { icon: Mic, color: '#2DD4BF', bg: 'rgba(45,212,191,.12)', label: 'Speaking' },
  writing: { icon: PenTool, color: '#7C3AED', bg: 'rgba(124,58,237,.12)', label: 'Writing' },
};

export default function TestHistory() {
  const { data: attempts, isLoading } = useQuery<AttemptSummary[]>({
    queryKey: ['/api/user/test-attempts'],
  });

  const sorted = (attempts || [])
    .filter(a => a.status === 'completed')
    .slice()
    .sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime());

  return (
    <div className="th-page">
      <style>{`
        .th-page {
          --th-bg: #0B1120;
          --th-surface: #111827;
          --th-border: rgba(148,163,184,.12);
          --th-text-primary: #F1F5F9;
          --th-text-secondary: #CBD5E1;
          --th-text-muted: #64748B;
          --th-accent: #60A5FA;
          min-height: 100vh;
          background: var(--th-bg);
          color: var(--th-text-primary);
          font-family: Arial, 'Malgun Gothic', sans-serif;
        }
        .th-header {
          background: var(--th-surface);
          border-bottom: 1px solid var(--th-border);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .th-back {
          color: var(--th-text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          font-size: 14px;
          transition: color .15s;
        }
        .th-back:hover { color: var(--th-accent); }
        .th-title { font-size: 18px; font-weight: 700; }
        .th-container { max-width: 800px; margin: 0 auto; padding: 24px 16px 60px; }
        .th-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--th-text-muted);
        }
        .th-empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(96,165,250,.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .th-row {
          background: var(--th-surface);
          border: 1px solid var(--th-border);
          border-radius: 12px;
          padding: 16px 18px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: border-color .15s, background .15s;
          text-decoration: none;
          color: inherit;
        }
        .th-row:hover {
          border-color: rgba(96,165,250,.25);
          background: rgba(96,165,250,.03);
        }
        .th-section-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .th-info { flex: 1; min-width: 0; }
        .th-info-title {
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .th-info-meta {
          font-size: 12px;
          color: var(--th-text-muted);
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .th-score {
          font-size: 20px;
          font-weight: 700;
          flex-shrink: 0;
          min-width: 50px;
          text-align: right;
        }
        .th-chevron { color: var(--th-text-muted); flex-shrink: 0; }
        .th-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
        }
        .th-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .th-stat-card {
          background: var(--th-surface);
          border: 1px solid var(--th-border);
          border-radius: 10px;
          padding: 16px;
          text-align: center;
        }
        .th-stat-val { font-size: 24px; font-weight: 700; color: var(--th-accent); }
        .th-stat-label { font-size: 12px; color: var(--th-text-muted); margin-top: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .th-stats { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="th-header">
        <Link href="/my-page">
          <a className="th-back"><ArrowLeft size={16} /> 마이페이지</a>
        </Link>
        <div className="th-title">테스트 히스토리</div>
      </div>

      <div className="th-container">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(96,165,250,.3)', borderTop: '3px solid #60A5FA', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--th-text-muted)' }}>로딩 중...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="th-empty">
            <div className="th-empty-icon"><Trophy size={28} style={{ color: '#60A5FA' }} /></div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>아직 완료된 테스트가 없습니다</p>
            <p style={{ fontSize: 13 }}>테스트를 완료하면 여기에 결과가 표시됩니다.</p>
            <Link href="/new-toefl">
              <a style={{ color: '#60A5FA', marginTop: 16, display: 'inline-block', fontWeight: 600 }}>테스트 시작하기 →</a>
            </Link>
          </div>
        ) : (
          <>
            <div className="th-stats">
              <div className="th-stat-card">
                <div className="th-stat-val">{sorted.length}</div>
                <div className="th-stat-label">총 테스트</div>
              </div>
              <div className="th-stat-card">
                <div className="th-stat-val">
                  {sorted.length > 0 ? Math.round(sorted.reduce((s, a) => s + (a.totalScore || 0), 0) / sorted.length) : 0}
                </div>
                <div className="th-stat-label">평균 점수</div>
              </div>
              <div className="th-stat-card">
                <div className="th-stat-val">
                  {sorted.length > 0 ? Math.max(...sorted.map(a => a.totalScore || 0)) : 0}
                </div>
                <div className="th-stat-label">최고 점수</div>
              </div>
            </div>

            {sorted.map(att => {
              const meta = SECTION_META[att.section] || SECTION_META.reading;
              const Icon = meta.icon;
              const date = new Date(att.completedAt || att.startedAt);
              const scoreColor = (att.totalScore || 0) >= 25 ? '#34D399' : (att.totalScore || 0) >= 15 ? '#60A5FA' : '#F87171';

              return (
                <Link key={att.id} href={`/test/result/${att.id}`}>
                  <a className="th-row">
                    <div className="th-section-icon" style={{ background: meta.bg }}>
                      <Icon size={20} style={{ color: meta.color }} />
                    </div>
                    <div className="th-info">
                      <div className="th-info-title">{att.testTitle}</div>
                      <div className="th-info-meta">
                        <span className="th-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                        <span>{date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                        {att.timeSpent ? <span><Clock size={11} style={{ display: 'inline', verticalAlign: -1 }} /> {att.timeSpent}분</span> : null}
                        {att.totalQuestions > 0 && <span>{att.correctAnswers}/{att.totalQuestions}</span>}
                      </div>
                    </div>
                    <div className="th-score" style={{ color: scoreColor }}>{att.totalScore ?? '—'}</div>
                    <ChevronRight size={18} className="th-chevron" />
                  </a>
                </Link>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
