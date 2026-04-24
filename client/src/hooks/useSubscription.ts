import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export function useSubscription() {
  const { user, isAuthenticated } = useAuth();

  const { data: subscription } = useQuery({
    queryKey: ["/api/user/subscription"],
    queryFn: async () => {
      const response = await fetch("/api/user/subscription", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        return response.json();
      }
      return null;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const tier = user?.membershipTier || 'guest';
  const status = user?.subscriptionStatus || 'inactive';

  const tierLevels: Record<string, number> = { guest: 0, light: 1, pro: 2, max: 3, master: 4 };
  const userTierLevel = tierLevels[tier] ?? 0;

  const isPaidMember = tier !== 'guest';
  const isActive = status === 'active' || status === 'trial';
  const isAdmin = user?.role === 'admin' || tier === 'master';

  // 기능별 접근 권한
  const canUseAI = isAdmin || (isPaidMember && isActive);
  const canGetAIFeedback = isAdmin || (isPaidMember && isActive);
  const canDoFullTest = isAdmin || (isActive && userTierLevel >= tierLevels.pro);
  const canUseGRE = isAdmin || (isPaidMember && isActive);
  const canUseAdvancedFeatures = isAdmin || (isActive && userTierLevel >= tierLevels.pro);
  const canUseCoaching = isAdmin || (isActive && userTierLevel >= tierLevels.max);

  const tierLabel: Record<string, string> = {
    guest: '비회원', light: '라이트', pro: '프로', max: '맥스', master: '마스터'
  };

  return {
    subscription,
    membershipTier: tier,
    subscriptionStatus: status,
    userTierLevel,
    isPaidMember,
    isActive,
    isAdmin,
    canUseAI,
    canGetAIFeedback,
    canDoFullTest,
    canUseGRE,
    canUseAdvancedFeatures,
    canUseCoaching,
    tierLabel: tierLabel[tier] || tier,
  };
}
