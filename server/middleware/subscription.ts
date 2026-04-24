import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export interface SubscriptionRequest extends AuthenticatedRequest {
  user?: {
    id: string;
    role: string;
    membershipTier: 'guest' | 'light' | 'pro' | 'max' | 'master';
    subscriptionStatus: 'active' | 'inactive' | 'trial' | 'cancelled' | 'past_due';
  } & any;
}

// 결제 회원만 접근 가능 (등급 승급 = 결제 완료로 간주)
export function requirePaidMember(req: SubscriptionRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  const { membershipTier } = req.user;
  const paidTiers = ['light', 'pro', 'max', 'master'];

  // 관리자가 승인한 유료 등급이면 접근 허용 (subscriptionStatus 무관)
  if (!paidTiers.includes(membershipTier)) {
    return res.status(403).json({ 
      error: '결제 회원만 접근 가능합니다.',
      requiredTier: 'light',
      currentTier: membershipTier
    });
  }

  next();
}

// 특정 등급 이상만 접근 가능 (등급 승급 = 결제 완료로 간주)
export function requireTier(minimumTier: 'light' | 'pro' | 'max') {
  const tierLevels = { guest: 0, light: 1, pro: 2, max: 3, master: 4 } as const;

  return (req: SubscriptionRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const { membershipTier } = req.user;
    const userLevel = tierLevels[membershipTier as keyof typeof tierLevels] ?? 0;
    const requiredLevel = tierLevels[minimumTier];

    // 관리자가 승인한 등급이면 접근 허용 (subscriptionStatus 무관)
    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: `${minimumTier} 이상 플랜이 필요합니다.`,
        requiredTier: minimumTier,
        currentTier: membershipTier
      });
    }

    next();
  };
}

// AI 기능 접근 제한 (결제 회원만)
export const requireAIAccess = requirePaidMember;

// 고급 AI 기능 접근 제한 (프로 이상)
export const requireAdvancedAI = requireTier('pro');

// 코칭 기능 접근 제한 (맥스 이상)
export const requireCoaching = requireTier('max');
