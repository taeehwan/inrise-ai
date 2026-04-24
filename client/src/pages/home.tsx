import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Award, BookOpen, ChevronDown, ChevronRight, Heart, LogIn, Moon, Sparkles, Sun, Target } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import type { Test } from "@shared/schema";
import { UserProfileHeader } from "@/components/UserProfileHeader";
import { useTheme } from "@/components/theme-provider";
const DeferredSuccessStoriesCarousel = lazy(
  () => import("@/components/home/SuccessStoriesCarousel"),
);
const DeferredActivityFeedSection = lazy(
  () => import("@/components/home/ActivityFeedSection"),
);

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isAdmin, membershipTier } = useSubscription();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
    
  const goToLogin = () => navigate("/login");

  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
    enabled: isAuthenticated,
  });

  const toeflTests = tests.filter(test => test.examType === "toefl");
  const greTests = tests.filter(test => test.examType === "gre");

  return (
    <div className="min-h-screen bg-[#06060A] overflow-hidden">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: '#06060A' }} />
        <div className="absolute rounded-full" style={{ width: 700, height: 700, top: '10%', left: '-8%', background: 'radial-gradient(circle, rgba(0,55,140,0.13) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute rounded-full" style={{ width: 600, height: 600, bottom: '5%', right: '-5%', background: 'radial-gradient(circle, rgba(80,40,160,0.10) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Navigation - Glassmorphism */}
      <nav className="sticky top-0 z-50 bg-[#070B17]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <Link href="/">
                <img 
                  src={logoPath} 
                  alt="INRISE" 
                  className="h-8 sm:h-10 md:h-12 w-auto max-w-[120px] sm:max-w-[150px] md:max-w-none cursor-pointer hover:scale-105 transition-transform duration-300"
                />
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="theme-toggle"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                title={resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
              >
                {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <LanguageSelector />
              
              {/* TESTS Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="text-gray-300 font-medium px-3 py-2 rounded-md transition-all duration-200 text-sm flex items-center gap-1 hover:text-white hover:bg-white/5 hover:scale-[1.02]"
                  >
                    TESTS
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-[#0D1326]/95 backdrop-blur-xl border border-white/10">
                  <DropdownMenuItem 
                    className="text-gray-300 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer font-medium"
                    onClick={() => isAuthenticated ? navigate("/tests/toefl") : goToLogin()}
                  >
                    <BookOpen className="h-4 w-4 mr-2 text-blue-400" />
                    TOEFL
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-gray-300 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer font-medium"
                    onClick={() => isAuthenticated ? navigate("/new-toefl") : goToLogin()}
                  >
                    <Sparkles className="h-4 w-4 mr-2 text-emerald-400" />
                    <span className="flex items-center gap-2">
                      NEW TOEFL
                      <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">2026</span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-gray-300 hover:text-purple-400 hover:bg-purple-500/10 cursor-pointer font-medium"
                    onClick={() => isAuthenticated ? navigate("/gre") : goToLogin()}
                  >
                    <Award className="h-4 w-4 mr-2 text-purple-400" />
                    GRE
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-gray-300 hover:text-orange-400 hover:bg-orange-500/10 cursor-pointer font-medium"
                    onClick={() => isAuthenticated ? navigate("/sat") : goToLogin()}
                    data-testid="link-tests-sat"
                  >
                    <Target className="h-4 w-4 mr-2 text-orange-400" />
                    SAT
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {isAuthenticated ? (
                <>
                  <Link href="/my-page">
                    <Button 
                      variant="ghost" 
                      className="text-gray-300 font-medium px-3 py-2 rounded-md transition-all duration-200 text-sm hover:text-white hover:bg-white/5 hover:scale-[1.02]"
                      data-testid="button-my-page"
                    >
                      {t('nav.mypage')}
                    </Button>
                  </Link>
                  <Link href="/study-plan">
                    <Button 
                      variant="ghost" 
                      className="text-gray-300 font-medium px-3 py-2 rounded-md transition-all duration-200 text-sm hover:text-white hover:bg-white/5 hover:scale-[1.02]"
                      data-testid="button-study-plan"
                    >
                      {t('nav.studyPlan')}
                    </Button>
                  </Link>
                  <Link href="/reviews">
                    <Button 
                      variant="ghost" 
                      className="text-gray-300 font-medium px-3 py-2 rounded-md transition-all duration-200 text-sm hover:text-white hover:bg-white/5 hover:scale-[1.02]"
                      data-testid="button-reviews"
                    >
                      {t('nav.reviews')}
                    </Button>
                  </Link>
                  <UserProfileHeader variant="dark" />
                </>
              ) : (
                <Button 
                  className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-[1.02] overflow-hidden group"
                  onClick={() => goToLogin()}
                >
                  <span className="relative z-10 flex items-center">
                    <LogIn className="mr-2 h-4 w-4" />
                    {t('nav.login')}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Quick Access */}
      {isAuthenticated && user?.role === 'admin' && (
        <div className="relative z-10 bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500/80 to-purple-600/80 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">⚙️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-semibold text-white/90">{t('nav.adminMode')}</p>
                  <p className="text-xs text-white/50">{t('nav.adminModeDesc')}</p>
                </div>
              </div>
              <Link href="/admin">
                <Button className="bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-md transition-all duration-200 text-sm hover:scale-[1.02]">
                  {t('nav.openAdminPanel')}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ════ LANDING v11 — global keyframes ════ */}
      <style>{`
        @keyframes cloudDrift1 {
          0%   { transform: translate(-50%,-50%) scale(1.20) }
          25%  { transform: translate(-42%,-56%) scale(1.35) }
          50%  { transform: translate(-56%,-44%) scale(1.15) }
          75%  { transform: translate(-46%,-53%) scale(1.30) }
          100% { transform: translate(-50%,-50%) scale(1.20) }
        }
        @keyframes cloudDrift2 {
          0%   { transform: translate(-50%,-50%) scale(1.10) }
          33%  { transform: translate(-60%,-42%) scale(1.25) }
          66%  { transform: translate(-40%,-58%) scale(1.15) }
          100% { transform: translate(-50%,-50%) scale(1.10) }
        }
        @keyframes cloudDrift3 {
          0%   { transform: translate(-50%,-50%) scale(1.30) }
          20%  { transform: translate(-44%,-54%) scale(1.15) }
          60%  { transform: translate(-56%,-46%) scale(1.25) }
          100% { transform: translate(-50%,-50%) scale(1.30) }
        }
        @keyframes gradShift {
          0%, 100% { background-position: 0% 50% }
          50%       { background-position: 100% 50% }
        }
        @keyframes marqueeScroll {
          from { transform: translateX(0) }
          to   { transform: translateX(-50%) }
        }
        @keyframes tickerScroll {
          from { transform: translateX(0) }
          to   { transform: translateX(-50%) }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes blinkDot {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.15 }
        }
        @keyframes shimmerSweep {
          from { transform: translateX(-120%) skewX(-15deg) }
          to   { transform: translateX(350%) skewX(-15deg) }
        }
        /* Hero cloud bloom */
        .hero-panel { position: relative; overflow: hidden; }
        .hero-cloud { position: absolute; border-radius: 50%; opacity: 0;
          transition: opacity 0.7s ease; pointer-events: none; }
        .hero-panel:hover .hero-cloud-1 { opacity: 1; animation: cloudDrift1 14s ease-in-out infinite; }
        .hero-panel:hover .hero-cloud-2 { opacity: 1; animation: cloudDrift2 18s ease-in-out infinite; }
        .hero-panel:hover .hero-cloud-3 { opacity: 1; animation: cloudDrift3 12s ease-in-out infinite; }
        .hero-panel:hover { border-color: rgba(255,255,255,0.10) !important; box-shadow: 0 0 60px rgba(0,85,187,0.12); }
        /* btn-bloom */
        .btn-bloom { position: relative; overflow: hidden; cursor: pointer;
          transition: transform 0.3s ease, box-shadow 0.3s ease, letter-spacing 0.3s ease;
          display: inline-flex; align-items: center; justify-content: center; }
        .btn-blob { position: absolute; border-radius: 50%; opacity: 0;
          transition: opacity 0.4s ease; pointer-events: none; }
        .btn-bloom:hover { transform: translateY(-4px) scale(1.03); letter-spacing: 0.03em;
          box-shadow: 0 0 50px rgba(0,187,255,0.25), 0 0 80px rgba(0,187,255,0.15), 0 0 160px rgba(0,187,255,0.08); }
        .btn-bloom:hover .btn-blob-1 { opacity: 1; animation: cloudDrift1 9s ease-in-out infinite; }
        .btn-bloom:hover .btn-blob-2 { opacity: 1; animation: cloudDrift2 7s ease-in-out infinite; }
        .btn-bloom:hover .btn-blob-3 { opacity: 1; animation: cloudDrift3 11s ease-in-out infinite; }
        .btn-bloom:hover .btn-blob-4 { opacity: 1; animation: cloudDrift1 8s ease-in-out infinite reverse; }
        .btn-bloom:hover .btn-blob-5 { opacity: 1; animation: cloudDrift2 10s ease-in-out infinite; }
        .btn-shimmer { position: absolute; top: 0; left: 0; width: 40%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          opacity: 0; pointer-events: none; }
        .btn-bloom:hover .btn-shimmer { opacity: 1; animation: shimmerSweep 0.8s ease forwards; }
        .btn-bloom .btn-text { position: relative; z-index: 2; display: flex; align-items: center; gap: 6px; }
        .btn-bloom:hover .btn-text { text-shadow: 0 0 16px rgba(0,187,255,0.8), 0 0 40px rgba(0,187,255,0.4); }
        /* Marquee */
        .marquee-wrap { overflow: hidden; position: relative; }
        .marquee-track { display: flex; animation: marqueeScroll 60s linear infinite; width: max-content; }
        .marquee-wrap:hover .marquee-track { animation-play-state: paused; }
        .uni-bar { transition: transform 0.25s, filter 0.25s; }
        .uni-item:hover .uni-bar { transform: scaleY(1.3); filter: brightness(1.5) drop-shadow(0 0 5px currentColor); }
        .uni-item:hover .uni-name { color: #fff !important; }
        /* Live ticker */
        .ticker-wrap { overflow: hidden; }
        .ticker-track { display: flex; animation: tickerScroll 40s linear infinite; width: max-content; }
        .ticker-wrap:hover .ticker-track { animation-play-state: paused; }
        /* Review grid */
        .review-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        @media (max-width: 1000px) { .review-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px)  { .review-grid { grid-template-columns: 1fr; } }
        /* Why grid */
        .why-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 900px) { .why-grid { grid-template-columns: 1fr; } }
        /* CTA cloud bloom */
        .cta-inner { position: relative; overflow: hidden;
          transition: transform 0.4s ease, box-shadow 0.4s ease; }
        .cta-cloud { position: absolute; border-radius: 50%; opacity: 0;
          transition: opacity 0.7s ease; pointer-events: none; }
        .cta-inner:hover { transform: translateY(-4px); box-shadow: 0 20px 80px rgba(0,85,187,0.2); }
        .cta-inner:hover .cta-cloud-1 { opacity: 1; animation: cloudDrift1 15s ease-in-out infinite; }
        .cta-inner:hover .cta-cloud-2 { opacity: 1; animation: cloudDrift2 18s ease-in-out infinite; }
        .cta-inner:hover .cta-cloud-3 { opacity: 1; animation: cloudDrift3 13s ease-in-out infinite; }
        .cta-inner:hover .cta-title { text-shadow: 0 0 30px rgba(255,255,255,0.25); }
        /* Hero type */
        .hero-big { font-size: clamp(60px, 9vw, 110px); }
        .hero-sub { font-size: clamp(32px, 4.5vw, 54px); }
        @media (max-width: 900px) { .hero-big { font-size: 60px !important; } }
        /* fade-up sections */
        .section-fade   { animation: fadeUp 0.7s ease both; }
        .section-fade-2 { animation: fadeUp 0.7s 0.12s ease both; }
        .section-fade-3 { animation: fadeUp 0.7s 0.24s ease both; }
        .section-fade-4 { animation: fadeUp 0.7s 0.36s ease both; }
        .section-fade-5 { animation: fadeUp 0.7s 0.48s ease both; }
        .section-fade-6 { animation: fadeUp 0.7s 0.60s ease both; }
        .section-fade-7 { animation: fadeUp 0.7s 0.72s ease both; }
        /* why-card top-line on hover */
        .why-card { border-top: 2px solid transparent; transition: border-color 0.3s, transform 0.3s, border-bottom-color 0.3s; }
        .why-card-blue:hover  { border-top-color: #00BBFF; transform: translateY(-4px); }
        .why-card-green:hover { border-top-color: #00E87B; transform: translateY(-4px); }
        .why-card-amber:hover { border-top-color: #FFB800; transform: translateY(-4px); }
      `}</style>

      {/* ── § 1  HERO PANEL ── */}
      <section
        className="hero-panel section-fade"
        style={{ position: 'relative', zIndex: 10, background: '#0E0E12', padding: '80px 0 96px', textAlign: 'center' }}
      >
            {/* cloud blobs */}
            <div className="hero-cloud hero-cloud-1" style={{ width: 700, height: 700, left: '20%', top: '50%', background: 'radial-gradient(circle, rgba(0,85,187,0.32) 0%, transparent 70%)', filter: 'blur(60px)' }} />
            <div className="hero-cloud hero-cloud-2" style={{ width: 550, height: 550, left: '75%', top: '25%', background: 'radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 70%)', filter: 'blur(55px)' }} />
            <div className="hero-cloud hero-cloud-3" style={{ width: 600, height: 600, left: '55%', top: '80%', background: 'radial-gradient(circle, rgba(0,187,255,0.16) 0%, transparent 70%)', filter: 'blur(65px)' }} />

            <div style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
              {/* sub-headline */}
              <p className="hero-sub" style={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 900, color: '#E4E4E7', lineHeight: 1.2, marginBottom: 4 }}>
                {t('landing.hero.sub')}
              </p>
              {/* big headline */}
              <h1
                className="hero-big"
                style={{
                  fontFamily: '"Oswald", sans-serif',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  lineHeight: 1.05,
                  paddingBottom: 8,
                  background: 'linear-gradient(135deg, #001A5E 0%, #0055BB 45%, #0088FF 70%, #001A5E 100%)',
                  backgroundSize: '300% 300%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradShift 10s ease infinite',
                  filter: 'drop-shadow(0 0 50px rgba(0,40,120,0.9)) drop-shadow(0 0 100px rgba(0,40,120,0.6)) drop-shadow(0 0 4px rgba(0,60,160,0.8))',
                }}
              >
                {t('landing.hero.big')}
              </h1>
              {/* exam tags */}
              <p style={{ fontFamily: '"Oswald", sans-serif', fontSize: 20, letterSpacing: '0.18em', fontWeight: 600, color: 'rgba(255,255,255,0.40)', marginBottom: 20, marginTop: 10 }}>
                TOEFL · GRE · IELTS · SAT
              </p>
              {/* sub-copy */}
              <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 15, lineHeight: 1.75, maxWidth: 500, margin: '0 auto 36px', fontFamily: '"Sora", sans-serif' }}>
                {t('landing.hero.copy1')}<br />
                {t('landing.hero.copy2')}
              </p>
              {/* buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href={isAuthenticated ? "/tests" : "/login"}>
                  <button
                    className="btn-bloom"
                    style={{ background: '#151519', border: '1px solid rgba(255,255,255,0.10)', padding: '14px 32px', borderRadius: 12, color: '#F4F4F5', fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: 15 }}
                  >
                    <div className="btn-blob btn-blob-1" style={{ width: 200, height: 200, left: '20%', top: '50%', background: 'radial-gradient(circle, rgba(0,187,255,0.42) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
                    <div className="btn-blob btn-blob-2" style={{ width: 160, height: 160, left: '72%', top: '25%', background: 'radial-gradient(circle, rgba(0,100,255,0.35) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
                    <div className="btn-blob btn-blob-3" style={{ width: 180, height: 180, left: '55%', top: '80%', background: 'radial-gradient(circle, rgba(167,139,250,0.30) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
                    <div className="btn-blob btn-blob-4" style={{ width: 120, height: 120, left: '88%', top: '55%', background: 'radial-gradient(circle, rgba(0,232,123,0.25) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
                    <div className="btn-blob btn-blob-5" style={{ width: 140, height: 140, left: '8%',  top: '70%', background: 'radial-gradient(circle, rgba(0,150,255,0.30) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
                    <div className="btn-shimmer" />
                    <span className="btn-text">{t('hero.startTest')}</span>
                  </button>
                </Link>
                <Link href="/reviews">
                  <button
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', padding: '14px 28px', borderRadius: 12, color: 'rgba(255,255,255,0.65)', fontFamily: '"Sora", sans-serif', fontWeight: 500, fontSize: 15, cursor: 'pointer', transition: 'all 0.25s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)'; }}
                  >
                    {t('landing.hero.browse')}
                  </button>
                </Link>
              </div>
            </div>
      </section>

      {/* ── § 2  UNIVERSITY MARQUEE ── */}
      <section className="relative z-10 py-14 section-fade-2">
        <div className="max-w-6xl mx-auto px-4 mb-6 text-center">
          <p style={{ fontFamily: '"Oswald", sans-serif', fontSize: 14, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.38)' }}>
            <span style={{ color: '#00E87B', fontSize: 20, fontWeight: 700, marginRight: 6 }}>TOP STUDENTS</span>
            {t('landing.marquee.label')}
          </p>
        </div>
        <div className="relative marquee-wrap">
          <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, #06060A, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #06060A, transparent)' }} />
          <div className="marquee-track py-3">
            {[
              { name: 'Harvard',     color: '#A51C30' },
              { name: 'Wharton',     color: '#011F5B' },
              { name: 'Stanford',    color: '#8C1515' },
              { name: 'Duke',        color: '#003087' },
              { name: 'Dartmouth',   color: '#00693E' },
              { name: 'Princeton',   color: '#FF6600' },
              { name: 'Columbia',    color: '#0066CC' },
              { name: 'Tsinghua',    color: '#660874' },
              { name: 'Keio',        color: '#B71C1C' },
              { name: 'Waseda',      color: '#7B1E30' },
              { name: 'Hitotsubashi',color: '#003366' },
              { name: '서울대',      color: '#003366' },
              { name: '연세대',      color: '#003478' },
              { name: '고려대',      color: '#8B0000' },
              { name: 'POSTECH',     color: '#CF0A2C' },
              { name: 'KAIST',       color: '#004C97' },
              { name: 'Harvard',     color: '#A51C30' },
              { name: 'Wharton',     color: '#011F5B' },
              { name: 'Stanford',    color: '#8C1515' },
              { name: 'Duke',        color: '#003087' },
              { name: 'Dartmouth',   color: '#00693E' },
              { name: 'Princeton',   color: '#FF6600' },
              { name: 'Columbia',    color: '#0066CC' },
              { name: 'Tsinghua',    color: '#660874' },
              { name: 'Keio',        color: '#B71C1C' },
              { name: 'Waseda',      color: '#7B1E30' },
              { name: 'Hitotsubashi',color: '#003366' },
              { name: '서울대',      color: '#003366' },
              { name: '연세대',      color: '#003478' },
              { name: '고려대',      color: '#8B0000' },
              { name: 'POSTECH',     color: '#CF0A2C' },
              { name: 'KAIST',       color: '#004C97' },
            ].map((uni, idx) => (
              <span key={idx} className="uni-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 24px', cursor: 'default' }}>
                <span
                  className="uni-bar"
                  style={{ display: 'inline-block', width: 8, height: 32, borderRadius: 2, backgroundColor: uni.color }}
                />
                <span
                  className="uni-name"
                  style={{ fontFamily: '"Oswald", sans-serif', fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', transition: 'color 0.25s' }}
                >
                  {uni.name}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <DeferredSuccessStoriesCarousel />
      </Suspense>

      <Suspense fallback={null}>
        <DeferredActivityFeedSection />
      </Suspense>

      {/* ── § 3  TESTIMONIAL CARDS ── */}
      <section className="relative z-10 py-16 px-4 sm:px-8 section-fade-3">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p style={{ fontFamily: '"Oswald", sans-serif', fontSize: 11, letterSpacing: '0.2em', color: '#00E87B', marginBottom: 10, textTransform: 'uppercase' }}>{t('landing.reviews.eyebrow')}</p>
            <h2 style={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 900, fontSize: 'clamp(24px,4vw,36px)', color: '#F4F4F5', lineHeight: 1.3 }}>
              {t('landing.reviews.title1')}<br />
              <span style={{ color: '#00BBFF' }}>{t('landing.reviews.titleBlue')}</span>{t('landing.reviews.titleEnd')}
            </h2>
          </div>
          <div className="review-grid">
            {[
              { name: '장오선', tag: '학생', period: '약 4개월', before: null, after: 120, isPerfect: true, textKey: 'home.review.0.text' },
              { name: '김호연', tag: '일본 국립대', period: '1.5개월', before: 65, after: 95, isPerfect: false, textKey: 'home.review.1.text' },
              { name: '이승찬', tag: 'POSTECH', period: '1개월', before: 101, after: 112, isPerfect: false, textKey: 'home.review.2.text' },
              { name: '배주호', tag: 'KAIST', period: '3회 수업', before: 96, after: 110, isPerfect: false, textKey: 'home.review.3.text' },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  background: '#0E0E12',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: '20px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'border-color 0.25s, transform 0.25s',
                  cursor: 'default',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.18)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
              >
                {/* score change */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#00E87B', fontSize: 12 }}>▲</span>
                  <span style={{ background: 'rgba(0,232,123,0.15)', border: '1px solid rgba(0,232,123,0.3)', color: '#00E87B', fontSize: 11, fontFamily: '"Oswald", sans-serif', padding: '2px 8px', borderRadius: 4 }}>
                    {r.isPerfect ? t('landing.reviews.perfect') : `+${r.after - (r.before ?? 0)}${t('landing.reviews.rise')}`}
                  </span>
                  {r.isPerfect && (
                    <span style={{ background: 'rgba(255,184,0,0.15)', border: '1px solid rgba(255,184,0,0.3)', color: '#FFB800', fontSize: 10, fontFamily: '"Oswald", sans-serif', padding: '2px 6px', borderRadius: 4 }}>PERFECT</span>
                  )}
                </div>
                {/* score display */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  {r.before !== null && (
                    <>
                      <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 32, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>{r.before}</span>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>→</span>
                    </>
                  )}
                  <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 48, color: '#00E87B', letterSpacing: 1, lineHeight: 1 }}>{r.after}</span>
                </div>
                {/* name + tag + period */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#F4F4F5', fontSize: 13, fontWeight: 700 }}>{r.name}</span>
                  <span style={{ background: 'rgba(0,187,255,0.12)', border: '1px solid rgba(0,187,255,0.25)', color: '#00BBFF', fontSize: 10, fontFamily: '"Oswald", sans-serif', padding: '1px 6px', borderRadius: 4 }}>{r.tag}</span>
                  <span style={{ fontFamily: '"Oswald", sans-serif', color: '#00E87B', fontSize: 11 }}>{r.period}</span>
                </div>
                {/* stars */}
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#FFB800', fontSize: 12 }}>★</span>)}
                </div>
                {/* text */}
                <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 13, lineHeight: 1.7, fontFamily: '"Sora", sans-serif', margin: 0 }}>
                  "{t(r.textKey)}"
                </p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/reviews">
              <button
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', padding: '10px 24px', borderRadius: 8, color: 'rgba(255,255,255,0.55)', fontFamily: '"Sora", sans-serif', fontSize: 13, cursor: 'pointer', transition: 'all 0.25s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.30)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)'; }}
              >
                {t('landing.reviews.seeAll')}
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── § 4  LIVE TICKER ── */}
      <section className="relative z-10 py-10 section-fade-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-6xl mx-auto px-4 mb-4 flex items-center gap-3">
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#00E87B', animation: 'blinkDot 1.4s ease-in-out infinite' }} />
          <span style={{ fontFamily: '"Oswald", sans-serif', fontSize: 13, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.55)' }}>{t('landing.live.label')}</span>
          <span style={{ background: 'rgba(0,232,123,0.15)', border: '1px solid rgba(0,232,123,0.3)', color: '#00E87B', fontSize: 9, fontFamily: '"Oswald", sans-serif', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.1em' }}>LIVE</span>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-track">
            {[
              { name: '박**', actionKey: 'toeflComplete',      score: '98',  timeN: 0  },
              { name: '이**', actionKey: 'greVerbalFeedback',   score: '160', timeN: 1  },
              { name: '김**', actionKey: 'writingComplete',     score: '24/30', timeN: 3 },
              { name: '정**', actionKey: 'readingPerfect',      score: '30/30', timeN: 5 },
              { name: '최**', actionKey: 'listeningComplete',   score: '27',  timeN: 7  },
              { name: '강**', actionKey: 'speakingFeedback',    score: '26',  timeN: 9  },
              { name: '조**', actionKey: 'greQuantComplete',    score: '168', timeN: 12 },
              { name: '윤**', actionKey: 'toeflGoal',           score: '110', timeN: 15 },
              { name: '박**', actionKey: 'toeflComplete',      score: '98',  timeN: 0  },
              { name: '이**', actionKey: 'greVerbalFeedback',   score: '160', timeN: 1  },
              { name: '김**', actionKey: 'writingComplete',     score: '24/30', timeN: 3 },
              { name: '정**', actionKey: 'readingPerfect',      score: '30/30', timeN: 5 },
              { name: '최**', actionKey: 'listeningComplete',   score: '27',  timeN: 7  },
              { name: '강**', actionKey: 'speakingFeedback',    score: '26',  timeN: 9  },
              { name: '조**', actionKey: 'greQuantComplete',    score: '168', timeN: 12 },
              { name: '윤**', actionKey: 'toeflGoal',           score: '110', timeN: 15 },
            ].map((item, idx) => (
              <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 28px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: '"Sora", sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{item.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, fontFamily: '"Sora", sans-serif' }}>{t(`landing.live.action.${item.actionKey}`)}</span>
                <span style={{ fontFamily: '"Bebas Neue", sans-serif', fontSize: 18, color: '#00E87B', letterSpacing: 1 }}>{item.score}</span>
                <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, fontFamily: '"Sora", sans-serif' }}>{item.timeN === 0 ? t('landing.live.justnow') : `${item.timeN}${t('landing.live.minuteAgo')}`}</span>
                {idx % 8 !== 7 && <span style={{ display: 'inline-block', width: 1, height: 18, background: 'rgba(255,255,255,0.10)', margin: '0 4px' }} />}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── § 5  WHY iNRISE ── */}
      <section className="relative z-10 py-20 px-4 sm:px-8 section-fade-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p style={{ fontFamily: '"Oswald", sans-serif', fontSize: 11, letterSpacing: '0.2em', color: '#00E87B', marginBottom: 10, textTransform: 'uppercase' }}>{t('landing.why.eyebrow')}</p>
            <h2 style={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 900, fontSize: 'clamp(24px,4vw,32px)', color: '#F4F4F5', lineHeight: 1.4 }}>
              {t('landing.why.titlePre')}<span style={{ color: '#00BBFF' }}>iNRISE</span>{t('landing.why.titlePost')}
            </h2>
          </div>
          <div className="why-grid">
            {[
              {
                icon: '◎',
                titleKey: 'landing.why.card1.title',
                descKey: 'landing.why.card1.desc',
                cls: 'why-card-blue',
                accent: '#00BBFF',
              },
              {
                icon: '📊',
                titleKey: 'landing.why.card2.title',
                descKey: 'landing.why.card2.desc',
                cls: 'why-card-green',
                accent: '#00E87B',
              },
              {
                icon: '⚡',
                titleKey: 'landing.why.card3.title',
                descKey: 'landing.why.card3.desc',
                cls: 'why-card-amber',
                accent: '#FFB800',
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`why-card ${card.cls}`}
                style={{
                  background: '#0E0E12',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: '28px 24px',
                  transition: 'border-top-color 0.3s, transform 0.3s',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 14 }}>{card.icon}</div>
                <h3 style={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 700, fontSize: 17, color: '#F4F4F5', marginBottom: 10 }}>{t(card.titleKey)}</h3>
                <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7 }}>{t(card.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── § 6  CTA CLOUD BLOOM ── */}
      <section
        className="cta-inner section-fade-6"
        style={{ position: 'relative', zIndex: 10, background: '#0E0E12', padding: '96px 0', textAlign: 'center' }}
      >
        {/* clouds */}
        <div className="cta-cloud cta-cloud-1" style={{ width: 650, height: 650, left: '15%', top: '50%', background: 'radial-gradient(circle, rgba(0,85,187,0.30) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="cta-cloud cta-cloud-2" style={{ width: 500, height: 500, left: '78%', top: '25%', background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)', filter: 'blur(55px)' }} />
        <div className="cta-cloud cta-cloud-3" style={{ width: 550, height: 550, left: '55%', top: '80%', background: 'radial-gradient(circle, rgba(0,187,255,0.14) 0%, transparent 70%)', filter: 'blur(65px)' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 640, margin: '0 auto', padding: '0 24px' }}>
          <h2
            className="cta-title"
            style={{ fontFamily: '"Noto Sans KR", sans-serif', fontWeight: 900, fontSize: 'clamp(22px,4vw,34px)', color: '#F4F4F5', lineHeight: 1.4, marginBottom: 14, transition: 'text-shadow 0.4s' }}
          >
            {t('landing.cta.title1')}<br />{t('landing.cta.title2')}
          </h2>
          <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, marginBottom: 32 }}>
            {t('landing.cta.sub')}
          </p>
          <Link href={isAuthenticated ? "/tests" : "/login"}>
            <button
              className="btn-bloom"
              style={{ background: '#151519', border: '1px solid rgba(255,255,255,0.10)', padding: '15px 36px', borderRadius: 12, color: '#F4F4F5', fontFamily: '"Sora", sans-serif', fontWeight: 600, fontSize: 16 }}
            >
              <div className="btn-blob btn-blob-1" style={{ width: 200, height: 200, left: '20%', top: '50%', background: 'radial-gradient(circle, rgba(0,187,255,0.42) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
              <div className="btn-blob btn-blob-2" style={{ width: 160, height: 160, left: '72%', top: '25%', background: 'radial-gradient(circle, rgba(0,100,255,0.35) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
              <div className="btn-blob btn-blob-3" style={{ width: 180, height: 180, left: '55%', top: '80%', background: 'radial-gradient(circle, rgba(167,139,250,0.30) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
              <div className="btn-blob btn-blob-4" style={{ width: 120, height: 120, left: '88%', top: '55%', background: 'radial-gradient(circle, rgba(0,232,123,0.25) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
              <div className="btn-blob btn-blob-5" style={{ width: 140, height: 140, left: '8%',  top: '70%', background: 'radial-gradient(circle, rgba(0,150,255,0.30) 0%, transparent 70%)', transform: 'translate(-50%,-50%)' }} />
              <div className="btn-shimmer" />
              <span className="btn-text">{t('landing.cta.button')}</span>
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <img src={logoPath} alt="INRISE" className="h-8 w-auto opacity-70" loading="lazy" />
              <span className="text-gray-500 text-sm">© iNRISE. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/reviews" className="text-gray-500 hover:text-white text-sm transition-colors">{t('home.footer.reviews')}</Link>
              <Link href="/subscription" className="text-gray-500 hover:text-white text-sm transition-colors">{t('home.footer.pricing')}</Link>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="text-[11px] text-gray-400 leading-relaxed text-center md:text-left space-y-1">
              <p>All trademarks are the property of their respective owners.</p>
              <p>TOEFL® is a registered trademark of ETS, used under license. The Eight-Point logo is a trademark of ETS. iNRISE is not affiliated with, endorsed or approved by ETS.</p>
              <p>GRE® is a registered trademark of ETS. iNRISE is not affiliated with or endorsed by ETS.</p>
              <p>SAT® is a registered trademark of the College Board. iNRISE is not affiliated with or endorsed by the College Board.</p>
              <p>IELTS™ is a registered trademark of University of Cambridge ESOL, the British Council, and IDP Education Australia. iNRISE is not affiliated with or endorsed by these organizations.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
