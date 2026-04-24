import { ReactNode } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Lock, Star, Zap, ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface SubscriptionGuardProps {
  children: ReactNode;
  requiredTier?: 'light' | 'pro' | 'max';
  feature?: string;
  description?: string;
  variant?: 'page' | 'inline' | 'compact';
}

const TIER_CONFIG = {
  light: {
    label: '라이트',
    color: 'from-sky-500 to-cyan-500',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
    text: 'text-sky-300',
    icon: <Zap className="w-3 h-3" />,
  },
  pro: {
    label: '프로',
    color: 'from-violet-500 to-purple-600',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    icon: <Star className="w-3 h-3" />,
  },
  max: {
    label: '맥스',
    color: 'from-indigo-500 to-violet-600',
    border: 'border-indigo-500/30',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-300',
    icon: <Crown className="w-3 h-3" />,
  },
};

const CURRENT_TIER_CONFIG: Record<string, { label: string; color: string }> = {
  guest: { label: '비회원', color: 'text-slate-400' },
  light: { label: '라이트', color: 'text-sky-400' },
  pro: { label: '프로', color: 'text-violet-400' },
  max: { label: '맥스', color: 'text-indigo-400' },
  master: { label: '마스터', color: 'text-purple-400' },
};

export default function SubscriptionGuard({
  children,
  requiredTier = 'light',
  feature = '이 기능',
  description,
  variant = 'page',
}: SubscriptionGuardProps) {
  const { canGetAIFeedback, canDoFullTest, canUseAdvancedFeatures, canUseCoaching, membershipTier, isAdmin } = useSubscription();

  const hasAccess = () => {
    if (isAdmin) return true;
    switch (requiredTier) {
      case 'light': return canGetAIFeedback;
      case 'pro': return canDoFullTest || canUseAdvancedFeatures;
      case 'max': return canUseCoaching;
      default: return false;
    }
  };

  if (hasAccess()) return <>{children}</>;

  const cfg = TIER_CONFIG[requiredTier];
  const currentCfg = CURRENT_TIER_CONFIG[membershipTier] || CURRENT_TIER_CONFIG.guest;
  const desc = description || `${feature}은(는) ${cfg.label} 이상 플랜에서 이용 가능합니다.`;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.border} ${cfg.bg} backdrop-blur-sm`}>
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${cfg.color} text-white flex-shrink-0`}>
          <Lock className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white">{feature} 잠금</p>
          <p className={`text-[11px] ${cfg.text}`}>{cfg.label} 이상 플랜 필요</p>
        </div>
        <Link href="/subscription">
          <Button size="sm" className={`h-7 text-xs px-3 bg-gradient-to-r ${cfg.color} text-white border-0 flex-shrink-0`}>
            업그레이드
          </Button>
        </Link>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} backdrop-blur-sm p-5`}>
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cfg.color} text-white flex-shrink-0`}>
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-white">{feature} 잠금</h3>
              <Badge className={`text-[10px] border ${cfg.border} ${cfg.bg} ${cfg.text} px-1.5 py-0 flex items-center gap-1`}>
                {cfg.icon}{cfg.label}+ 필요
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mb-3">{desc}</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">
                현재: <span className={currentCfg.color}>{currentCfg.label}</span>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span className={`text-[11px] ${cfg.text}`}>필요: {cfg.label}</span>
            </div>
          </div>
          <Link href="/subscription">
            <Button size="sm" className={`h-8 text-xs px-4 bg-gradient-to-r ${cfg.color} text-white border-0`}>
              {membershipTier === 'guest' ? '구독하기' : '업그레이드'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-8 text-center shadow-2xl">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center mx-auto mb-5`}>
          <Lock className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">{feature} 이용 불가</h2>
        <p className="text-slate-400 text-sm mb-6">{desc}</p>

        <div className="flex items-center justify-center gap-6 mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-center">
            <p className="text-[11px] text-slate-500 mb-1">현재 플랜</p>
            <Badge className={`text-xs border border-white/10 bg-white/5 ${currentCfg.color}`}>
              {currentCfg.label}
            </Badge>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="text-center">
            <p className="text-[11px] text-slate-500 mb-1">필요 플랜</p>
            <Badge className={`text-xs border ${cfg.border} ${cfg.bg} ${cfg.text} flex items-center gap-1`}>
              {cfg.icon}{cfg.label}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild className={`w-full bg-gradient-to-r ${cfg.color} text-white border-0 h-11`}>
            <Link href="/subscription">
              {membershipTier === 'guest' ? '구독하기' : '플랜 업그레이드'}
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full text-slate-400 hover:text-white h-9 text-sm">
            <Link href="/">홈으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
